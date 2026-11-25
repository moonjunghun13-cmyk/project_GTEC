from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ENV_FILE = Path(__file__).resolve().parents[4] / ".env"


class Settings(BaseSettings):
    APP_NAME: str = "한국어 리뷰 감정 분석 시스템"
    DEBUG: bool = True

    DATABASE_URL: str
    USER_NAME: str
    PASSWORD: str

    MODEL_PATH: str = "./models/sentiment_model"
    MAX_LENGTH: int = 256

    AI_INTERNAL_KEY: str = ""
    AI_DEMO_SEED_ENABLED: bool = False
    AI_WEEKLY_RETRAIN_ENABLED: bool = False

    model_config = SettingsConfigDict(
        env_file=BACKEND_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()