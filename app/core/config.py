from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    app_name: str = Field(default="Check Tarefas (FastAPI)")
    database_url: str = Field(default="sqlite:///./check_tarefas.db", alias="DATABASE_URL")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
