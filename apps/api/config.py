from pydantic_settings import BaseSettings
from typing import list


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str
    OPENAI_API_KEY: str
    PINECONE_API_KEY: str
    PINECONE_INDEX_NAME: str = "careercoach-resumes"
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]
    SENTRY_DSN: str = ""

    class Config:
        env_file = "../../.env"


settings = Settings()
