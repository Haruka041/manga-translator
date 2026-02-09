import io
import zipfile
from pathlib import Path
from typing import List

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from natsort import natsorted

from ..db import get_db
from ..models import Job, Page
from ..schemas import JobCreate, JobOut, JobUpdate, PageOut
from ..storage import ensure_job_dirs, page_original_path, page_json_path
from ..queue import queue_stage_a
from ..settings_store import get_global_settings, default_config
from ..secrets_vault import encrypt_secret, last4, SecretVaultError

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def _create_page(db: Session, job: Job, page_index: int, img_path: str) -> Page:
    page = Page(
        job_id=job.id,
        page_index=page_index,
        status="queued",
        original_path=img_path,
        json_path=page_json_path(job.id, page_index),
    )
    db.add(page)
    return page


def _save_image_bytes(img_bytes: bytes, out_path: str) -> None:
    Path(out_path).write_bytes(img_bytes)


def _extract_zip_to_pages(db: Session, job: Job, zf: zipfile.ZipFile) -> int:
    names = [n for n in zf.namelist() if n.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))]
    names = natsorted(names)
    if not names:
        raise HTTPException(status_code=400, detail="No images found in archive")

    for idx, name in enumerate(names):
        ext = name.split(".")[-1].lower()
        img_path = page_original_path(job.id, idx + 1, ext)
        _save_image_bytes(zf.read(name), img_path)
        _create_page(db, job, idx + 1, img_path)

    return len(names)


def _extract_pdf_to_pages(db: Session, job: Job, data: bytes) -> int:
    try:
        from pdf2image import convert_from_bytes
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"pdf2image not available: {e}")

    images = convert_from_bytes(data)
    if not images:
        raise HTTPException(status_code=400, detail="No pages rendered from PDF")

    for idx, img in enumerate(images):
        img_path = page_original_path(job.id, idx + 1, "png")
        img.save(img_path, format="PNG")
        _create_page(db, job, idx + 1, img_path)

    return len(images)


def _merge_config(base: dict, override: dict | None) -> dict:
    if not override:
        return dict(base)
    merged = dict(base)
    merged.update(override)
    return merged


@router.get("", response_model=List[JobOut])
def list_jobs(db: Session = Depends(get_db)):
    return db.query(Job).order_by(Job.created_at.desc()).all()


@router.post("", response_model=JobOut)
def create_job(payload: JobCreate, db: Session = Depends(get_db)):
    global_settings = get_global_settings(db)
    base_cfg = default_config()
    if global_settings.config:
        base_cfg.update(global_settings.config)
    cfg = _merge_config(base_cfg, payload.config)

    job = Job(
        title=payload.title or "",
        notes=payload.notes or "",
        tags=payload.tags or [],
        priority=payload.priority or 0,
        status="queued",
        config=cfg,
        api_key_encrypted=global_settings.api_key_encrypted,
        api_key_last4=global_settings.api_key_last4,
    )
    if payload.api_key:
        try:
            job.api_key_encrypted = encrypt_secret(payload.api_key)
            job.api_key_last4 = last4(payload.api_key)
        except SecretVaultError as e:
            raise HTTPException(status_code=400, detail=str(e))

    db.add(job)
    db.commit()
    db.refresh(job)
    ensure_job_dirs(job.id)
    return job


@router.patch("/{job_id}", response_model=JobOut)
def update_job(job_id: str, payload: JobUpdate, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.locked:
        raise HTTPException(status_code=409, detail="Job is locked")
    if job.locked:
        raise HTTPException(status_code=409, detail="Job is locked")
    if job.locked or job.status in ("running", "done"):
        raise HTTPException(status_code=409, detail="Job is locked")

    if payload.title is not None:
        job.title = payload.title
    if payload.notes is not None:
        job.notes = payload.notes
    if payload.tags is not None:
        job.tags = payload.tags
    if payload.priority is not None:
        job.priority = payload.priority
    if payload.config is not None:
        base_cfg = default_config()
        if job.config:
            base_cfg.update(job.config)
        base_cfg.update(payload.config)
        job.config = base_cfg
    if payload.api_key is not None:
        try:
            job.api_key_encrypted = encrypt_secret(payload.api_key)
            job.api_key_last4 = last4(payload.api_key)
        except SecretVaultError as e:
            raise HTTPException(status_code=400, detail=str(e))

    db.commit()
    db.refresh(job)
    return job


@router.post("/{job_id}/import", response_model=JobOut)
def import_archive(job_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.locked:
        raise HTTPException(status_code=409, detail="Job is locked")

    ensure_job_dirs(job.id)
    data = file.file.read()
    filename = file.filename or ""

    if filename.lower().endswith((".cbz", ".zip")):
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            count = _extract_zip_to_pages(db, job, zf)
    elif filename.lower().endswith(".pdf"):
        count = _extract_pdf_to_pages(db, job, data)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    job.total_pages = count
    job.status = "ready"
    db.commit()
    db.refresh(job)
    return job


@router.post("/{job_id}/pages", response_model=JobOut)
def upload_pages(job_id: str, files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    ensure_job_dirs(job.id)
    page_index = 1
    existing = db.query(Page).filter(Page.job_id == job.id).count()
    if existing:
        page_index = existing + 1

    for f in files:
        ext = (f.filename or "").split(".")[-1].lower() or "png"
        img_path = page_original_path(job.id, page_index, ext)
        _save_image_bytes(f.file.read(), img_path)
        _create_page(db, job, page_index, img_path)
        page_index += 1

    job.total_pages = db.query(Page).filter(Page.job_id == job.id).count()
    job.status = "ready"
    db.commit()
    db.refresh(job)
    return job


@router.post("/{job_id}/run", response_model=JobOut)
def run_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    pages = db.query(Page).filter(Page.job_id == job.id).all()
    if not pages:
        raise HTTPException(status_code=400, detail="No pages to process")

    for page in pages:
        if page.status in ("queued", "failed"):
            queue_stage_a.enqueue("app.workers.stage_a.run_stage_a", page.id)

    job.status = "running"
    job.locked = True
    db.commit()
    db.refresh(job)
    return job


@router.post("/{job_id}/cover")
def upload_cover(job_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    ext = (file.filename or "").split(".")[-1].lower() or "png"
    base = Path(ensure_job_dirs(job.id)["base"])
    cover_path = base / f"cover.{ext}"
    cover_path.write_bytes(file.file.read())
    job.cover_path = str(cover_path)
    db.commit()
    return {"ok": True}


@router.get("/{job_id}/cover")
def get_cover(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job or not job.cover_path:
        raise HTTPException(status_code=404, detail="Cover not found")
    return FileResponse(job.cover_path)


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/{job_id}/pages", response_model=List[PageOut])
def list_pages(job_id: str, db: Session = Depends(get_db)):
    return db.query(Page).filter(Page.job_id == job_id).order_by(Page.page_index).all()


@router.get("/{job_id}/export")
def export_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    base = Path(ensure_job_dirs(job.id)["base"])
    out_dir = base / "output"
    if not out_dir.exists():
        raise HTTPException(status_code=404, detail="No output found")

    cbz_path = base / f"{job.id}.cbz"
    with zipfile.ZipFile(cbz_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        images = natsorted([p for p in out_dir.iterdir() if p.suffix.lower() in (".png", ".jpg", ".jpeg")])
        for img in images:
            zf.write(img, arcname=img.name)

    return FileResponse(cbz_path)
