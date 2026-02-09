from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import engine
from .models import Base
from .routes import jobs, pages, settings as settings_routes
from .queue import shutdown_queues

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router)
app.include_router(pages.router)
app.include_router(settings_routes.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.on_event("shutdown")
def _shutdown():
    shutdown_queues()


static_dir = Path(__file__).resolve().parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
