from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class JobCreate(BaseModel):
    title: Optional[str] = ""
    notes: Optional[str] = ""
    tags: Optional[List[str]] = None
    priority: Optional[int] = 0
    config: Optional[Dict[str, Any]] = None
    api_key: Optional[str] = None


class JobUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    priority: Optional[int] = None
    config: Optional[Dict[str, Any]] = None
    api_key: Optional[str] = None


class JobOut(BaseModel):
    id: str
    title: str
    status: str
    total_pages: int
    done_pages: int
    config: Dict[str, Any]
    cover_path: str
    notes: str
    tags: List[str]
    priority: int
    locked: bool
    api_key_last4: str

    class Config:
        from_attributes = True


class JobStatus(BaseModel):
    id: str
    status: str
    total_pages: int
    done_pages: int
    pages_done_pct: float = 0


class PageOut(BaseModel):
    id: str
    job_id: str
    page_index: int
    status: str
    error: str
    original_path: str
    json_path: str
    output_path: str
    meta: Dict[str, Any]

    class Config:
        from_attributes = True


class SettingsOut(BaseModel):
    config: Dict[str, Any]
    api_key_last4: str
    api_key_set: bool


class SettingsUpdate(BaseModel):
    config: Dict[str, Any]
    api_key: Optional[str] = None


class RerunRequest(BaseModel):
    stage: str


class JsonUpdateRequest(BaseModel):
    content: Dict[str, Any]
