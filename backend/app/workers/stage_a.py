import json
from pathlib import Path
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import Page, Job
from ..llm_gateway import call_stage_a
from ..storage import page_json_path
from ..config import settings
from ..settings_store import resolve_job_config


def _load_prompt() -> str:
    prompt_path = Path(__file__).resolve().parent.parent / "prompts" / "gem1.txt"
    return prompt_path.read_text(encoding="utf-8")


def _load_schema() -> dict:
    schema_path = Path(__file__).resolve().parent.parent / "prompts" / "json_schema.json"
    return json.loads(schema_path.read_text(encoding="utf-8"))


def _build_context(job: Job, page: Page, db: Session) -> str:
    # Opportunistic context: use previous/next page JSON if available
    context_parts = []
    prev_page = (
        db.query(Page)
        .filter(Page.job_id == job.id, Page.page_index == page.page_index - 1)
        .first()
    )
    next_page = (
        db.query(Page)
        .filter(Page.job_id == job.id, Page.page_index == page.page_index + 1)
        .first()
    )

    def summarize_json(p: Page) -> str:
        if not p or not p.json_path:
            return ""
        try:
            data = json.loads(Path(p.json_path).read_text(encoding="utf-8"))
            texts = []
            for item in data.get("items", []):
                cn = item.get("cn_text")
                jp = item.get("jp_text")
                if cn:
                    texts.append(cn)
                elif jp:
                    texts.append(jp)
            summary = " ".join(texts)
            return summary[:500]
        except Exception:
            return ""

    prev_summary = summarize_json(prev_page)
    next_summary = summarize_json(next_page)

    if prev_summary:
        context_parts.append(f"上一页摘要: {prev_summary}")
    if next_summary:
        context_parts.append(f"下一页摘要: {next_summary}")

    # Add config hints
    cfg = job.config or {}
    context_parts.append(f"reading_direction={cfg.get('reading_direction','auto')}")
    return "\n".join(context_parts)


def run_stage_a(page_id: str) -> None:
    db = SessionLocal()
    try:
        page = db.query(Page).filter(Page.id == page_id).first()
        if not page:
            return
        job = db.query(Job).filter(Job.id == page.job_id).first()
        if not job:
            return

        page.status = "A_running"
        db.commit()

        prompt = _load_prompt()
        context_text = _build_context(job, page, db)
        cfg, api_key = resolve_job_config(db, job)
        use_schema = cfg.get("model_a_use_schema", settings.model_a_use_schema)
        schema = _load_schema() if use_schema else None
        if not api_key:
            raise ValueError("API key is missing")
        json_data = call_stage_a(
            page.original_path,
            prompt,
            context_text,
            schema=schema,
            cfg=cfg,
            api_key=api_key,
        )

        # Save JSON
        json_path = page_json_path(job.id, page.page_index)
        Path(json_path).write_text(json.dumps(json_data, ensure_ascii=False, indent=2), encoding="utf-8")
        page.json_path = json_path
        page.status = "A_done"
        db.commit()

        # Enqueue stage B if auto
        if job.config.get("qa_mode", settings.qa_mode) == "auto":
            from ..queue import queue_stage_b

            queue_stage_b.enqueue("app.workers.stage_b.run_stage_b", page.id)

    except Exception as e:
        page = db.query(Page).filter(Page.id == page_id).first()
        if page:
            page.status = "failed"
            page.error = str(e)
            db.commit()
    finally:
        db.close()
