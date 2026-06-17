from pydantic import BaseSettings, validator

class Settings(BaseSettings):
    APP_NAME: str = "Food AI Video Generator"
    APP_ENV: str = "development"
    DEBUG: bool = True

    DATABASE_URL: str = "sqlite:///./data/app.db"
    DOWNLOAD_DIR: str = "./data/videos"
    MOCK_VIDEO_PATH: str = "./data/mock/sample.mp4"

    KLING_MOCK_MODE: bool = True
    KLING_ACCESS_KEY: str | None = None
    KLING_SECRET_KEY: str | None = None
    KLING_API_BASE_URL: str | None = None
    KLING_MODEL_NAME: str | None = None
    KLING_REQUEST_TIMEOUT: int = 60
    KLING_POLL_INTERVAL_SECONDS: int = 5
    KLING_MAX_POLL_MINUTES: int = 20

    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4.1-mini"
    USE_GPT_PROMPT_BUILDER: bool = False
    OPENAI_REQUEST_TIMEOUT: int = 45

    HOST: str = "127.0.0.1"
    PORT: int = 8000
    ALLOWED_ORIGINS: str = "http://127.0.0.1:8000"

    @validator("DEBUG", pre=True)
    def parse_debug(cls, value):
        if isinstance(value, bool):
            return value
        if value is None:
            return False
        normalized = str(value).strip().lower()
        if normalized in {"1", "true", "yes", "on", "debug", "development"}:
            return True
        if normalized in {"0", "false", "no", "off", "release", "production"}:
            return False
        return False

    @validator("KLING_MOCK_MODE", "USE_GPT_PROMPT_BUILDER", pre=True)
    def parse_bool_like(cls, value):
        if isinstance(value, bool):
            return value
        if value is None:
            return False
        normalized = str(value).strip().lower()
        if normalized in {"1", "true", "yes", "on"}:
            return True
        if normalized in {"0", "false", "no", "off"}:
            return False
        return value

    class Config:
        env_file = ".env"

settings = Settings()
