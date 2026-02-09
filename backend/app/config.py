from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Core
    app_name: str = "mangat"
    environment: str = "dev"
    base_url: str = "http://localhost:8000"

    # Storage
    data_dir: str = "./data"

    # DB
    database_url: str = "sqlite:///./data/mangat.db"

    # Queue
    queue_stage_a: str = "stage-a"
    queue_stage_b: str = "stage-b"
    queue_qa: str = "qa"
    stage_a_concurrency: int = 6
    stage_b_concurrency: int = 4

    # Model Gateway (OpenAI-compatible)
    openai_base_url: str = "https://api.openai.com"
    openai_api_key: str = ""
    model_a: str = "gemini-3-pro-preview"
    model_b: str = "gemini-3-pro-image-preview"
    model_a_use_schema: bool = True
    master_key: str = ""

    # Protocols: chat_completions | responses | images_edits
    model_a_protocol: str = "chat_completions"
    model_b_protocol: str = "images_edits"
    model_b_endpoint: str = "/v1/images/edits"

    # Behavior
    qa_mode: str = "auto"  # auto | strict
    reading_direction: str = "auto"  # auto | rtl | ltr
    output_format: str = "cbz"
    stage_a_timeout: int = 120
    stage_b_timeout: int = 300
    retries: int = 1

    # Files
    keep_all_artifacts: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
