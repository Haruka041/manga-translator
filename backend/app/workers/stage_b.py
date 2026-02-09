import json
from pathlib import Path
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import Page, Job
from ..llm_gateway import call_stage_b
from ..storage import page_output_path
from ..config import settings
from ..settings_store import resolve_job_config


def _load_prompt() -> str:
    prompt_path = Path(__file__).resolve().parent.parent / "prompts" / "gem2.txt"
    return prompt_path.read_text(encoding="utf-8")


def _filter_items_for_auto(json_data: dict) -> dict:
    items = json_data.get("items", [])
    filtered = []
    for item in items:
        if item.get("needs_user_confirm"):
            continue
        if item.get("action") == "replace" and item.get("cn_text") in (None, ""):
            continue
        filtered.append(item)
    new_data = dict(json_data)
    new_data["items"] = filtered
    return new_data


def run_stage_b(page_id: str) -> None:
    db = SessionLocal()
    try:
        page = db.query(Page).filter(Page.id == page_id).first()
        if not page:
            return
        job = db.query(Job).filter(Job.id == page.job_id).first()
        if not job:
            return

        if not page.json_path:
            page.status = "blocked"
            page.error = "Missing JSON"
            db.commit()
            return

        page.status = "B_running"
        db.commit()

        prompt = _load_prompt()
        json_data = json.loads(Path(page.json_path).read_text(encoding="utf-8"))
        cfg, api_key = resolve_job_config(db, job)

        # QA handling
        qa_mode = cfg.get("qa_mode", settings.qa_mode)
        if qa_mode == "strict":
            needs = any(
                item.get("needs_user_confirm")
                or (item.get("action") == "replace" and item.get("cn_text") in (None, ""))
                for item in json_data.get("items", [])
            )
            if needs:
                page.status = "blocked"
                page.error = "Needs user confirm"
                db.commit()
                return
        else:
            json_data = _filter_items_for_auto(json_data)

        if not api_key:
            raise ValueError("API key is missing")
        img_bytes = call_stage_b(page.original_path, prompt, json_data, cfg=cfg, api_key=api_key)
        out_path = page_output_path(job.id, page.page_index, "png")
        Path(out_path).write_bytes(img_bytes)
        page.output_path = out_path
        page.status = "done"

        # update job progress
        job.done_pages = db.query(Page).filter(Page.job_id == job.id, Page.status == "done").count()
        if job.done_pages == job.total_pages:
            job.status = "done"
        db.commit()

    except Exception as e:
        page = db.query(Page).filter(Page.id == page_id).first()
        if page:
            page.status = "failed"
            page.error = str(e)
            db.commit()
    finally:
        db.close()
