from pathlib import Path
from .config import settings


def job_dir(job_id: str) -> Path:
    return Path(settings.data_dir) / "jobs" / job_id


def ensure_job_dirs(job_id: str) -> dict:
    base = job_dir(job_id)
    dirs = {
        "base": base,
        "original": base / "original",
        "json": base / "json",
        "output": base / "output",
        "intermediate": base / "intermediate",
        "logs": base / "logs",
    }
    for p in dirs.values():
        p.mkdir(parents=True, exist_ok=True)
    return {k: str(v) for k, v in dirs.items()}


def page_original_path(job_id: str, page_index: int, ext: str) -> str:
    return str(job_dir(job_id) / "original" / f"{page_index:04d}.{ext}")


def page_json_path(job_id: str, page_index: int) -> str:
    return str(job_dir(job_id) / "json" / f"{page_index:04d}.json")


def page_output_path(job_id: str, page_index: int, ext: str = "png") -> str:
    return str(job_dir(job_id) / "output" / f"{page_index:04d}.{ext}")
