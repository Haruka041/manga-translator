import json
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Page
from ..schemas import PageOut, JsonUpdateRequest
from ..queue import queue_stage_a, queue_stage_b

router = APIRouter(prefix="/api/pages", tags=["pages"])


@router.get("/{page_id}/json")
def get_page_json(page_id: str, db: Session = Depends(get_db)):
    page = db.query(Page).filter(Page.id == page_id).first()
    if not page or not page.json_path:
        raise HTTPException(status_code=404, detail="JSON not found")
    return json.loads(Path(page.json_path).read_text(encoding="utf-8"))


@router.patch("/{page_id}/json")
def update_page_json(page_id: str, payload: JsonUpdateRequest, db: Session = Depends(get_db)):
    page = db.query(Page).filter(Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    Path(page.json_path).write_text(json.dumps(payload.content, ensure_ascii=False, indent=2), encoding="utf-8")
    page.status = "A_done"
    db.commit()
    return {"ok": True}


@router.post("/{page_id}/rerun")
def rerun_page(page_id: str, stage: str = "B", db: Session = Depends(get_db)):
    page = db.query(Page).filter(Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    if stage.upper() == "A":
        queue_stage_a.enqueue("app.workers.stage_a.run_stage_a", page.id)
    else:
        queue_stage_b.enqueue("app.workers.stage_b.run_stage_b", page.id)
    return {"ok": True}


@router.get("/{page_id}/image")
def get_page_image(page_id: str, variant: str = "original", db: Session = Depends(get_db)):
    page = db.query(Page).filter(Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    path = page.original_path if variant == "original" else page.output_path
    if not path:
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path)


@router.get("/{page_id}", response_model=PageOut)
def get_page(page_id: str, db: Session = Depends(get_db)):
    page = db.query(Page).filter(Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page
