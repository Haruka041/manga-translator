from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import settings


class Base(DeclarativeBase):
    pass


def _ensure_sqlite_path(url: str) -> None:
    if not url.startswith("sqlite"):
        return
    # sqlite:////abs/path.db or sqlite:///./rel/path.db
    path = url.replace("sqlite:///", "", 1)
    if path.startswith("/"):
        db_path = Path(path)
    else:
        db_path = Path(path).resolve()
    db_path.parent.mkdir(parents=True, exist_ok=True)


def _make_engine():
    url = settings.database_url
    connect_args = {}
    if url.startswith("sqlite"):
        _ensure_sqlite_path(url)
        connect_args = {"check_same_thread": False}
    return create_engine(url, pool_pre_ping=True, connect_args=connect_args)


engine = _make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
