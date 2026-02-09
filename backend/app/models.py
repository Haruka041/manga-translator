import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, Integer, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from .db import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, default="")
    status = Column(String, default="queued")
    config = Column(JSON, default=dict)
    cover_path = Column(String, default="")
    notes = Column(String, default="")
    tags = Column(JSON, default=list)
    priority = Column(Integer, default=0)
    locked = Column(Boolean, default=False)
    api_key_encrypted = Column(String, default="")
    api_key_last4 = Column(String, default="")
    total_pages = Column(Integer, default=0)
    done_pages = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    pages = relationship("Page", back_populates="job", cascade="all, delete-orphan")


class Page(Base):
    __tablename__ = "pages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String, ForeignKey("jobs.id"))
    page_index = Column(Integer, default=0)
    status = Column(String, default="queued")
    error = Column(String, default="")

    original_path = Column(String, default="")
    json_path = Column(String, default="")
    output_path = Column(String, default="")
    meta = Column(JSON, default=dict)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    job = relationship("Job", back_populates="pages")


class GlobalSettings(Base):
    __tablename__ = "global_settings"

    id = Column(Integer, primary_key=True, default=1)
    config = Column(JSON, default=dict)
    api_key_encrypted = Column(String, default="")
    api_key_last4 = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
