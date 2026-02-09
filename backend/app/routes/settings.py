from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import SettingsOut, SettingsUpdate
from ..settings_store import get_global_settings, update_global_settings, default_config
from ..secrets_vault import SecretVaultError

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsOut)
def get_settings(db: Session = Depends(get_db)):
    row = get_global_settings(db)
    cfg = default_config()
    if row.config:
        cfg.update(row.config)
    return SettingsOut(
        config=cfg,
        api_key_last4=row.api_key_last4,
        api_key_set=bool(row.api_key_encrypted),
    )


@router.put("", response_model=SettingsOut)
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    try:
        cfg = default_config()
        cfg.update(payload.config or {})
        row = update_global_settings(db, cfg, payload.api_key)
    except SecretVaultError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SettingsOut(
        config=row.config,
        api_key_last4=row.api_key_last4,
        api_key_set=bool(row.api_key_encrypted),
    )
