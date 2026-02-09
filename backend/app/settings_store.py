from typing import Dict, Any
from sqlalchemy.orm import Session
from .models import GlobalSettings
from .config import settings
from .secrets_vault import encrypt_secret, last4, decrypt_secret


def default_config() -> Dict[str, Any]:
    return {
        "openai_base_url": settings.openai_base_url,
        "model_a": settings.model_a,
        "model_b": settings.model_b,
        "model_a_protocol": settings.model_a_protocol,
        "model_b_protocol": settings.model_b_protocol,
        "model_b_endpoint": settings.model_b_endpoint,
        "model_a_use_schema": settings.model_a_use_schema,
        "qa_mode": settings.qa_mode,
        "reading_direction": settings.reading_direction,
        "output_format": settings.output_format,
        "stage_a_timeout": settings.stage_a_timeout,
        "stage_b_timeout": settings.stage_b_timeout,
        "retries": settings.retries,
        "stage_a_concurrency": settings.stage_a_concurrency,
        "stage_b_concurrency": settings.stage_b_concurrency,
        "keep_all_artifacts": settings.keep_all_artifacts,
    }


def get_global_settings(db: Session) -> GlobalSettings:
    row = db.query(GlobalSettings).first()
    if row:
        return row

    cfg = default_config()
    encrypted = encrypt_secret(settings.openai_api_key) if settings.openai_api_key else ""
    row = GlobalSettings(
        id=1,
        config=cfg,
        api_key_encrypted=encrypted,
        api_key_last4=last4(settings.openai_api_key),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_global_settings(db: Session, config: Dict[str, Any], api_key: str | None) -> GlobalSettings:
    row = get_global_settings(db)
    row.config = config
    if api_key is not None:
        row.api_key_encrypted = encrypt_secret(api_key)
        row.api_key_last4 = last4(api_key)
    db.commit()
    db.refresh(row)
    return row


def resolve_job_config(db: Session, job) -> tuple[Dict[str, Any], str]:
    global_settings = get_global_settings(db)
    cfg = default_config()
    if global_settings.config:
        cfg.update(global_settings.config)
    if job.config:
        cfg.update(job.config)

    api_key_enc = job.api_key_encrypted or global_settings.api_key_encrypted
    api_key = decrypt_secret(api_key_enc) if api_key_enc else ""
    return cfg, api_key
