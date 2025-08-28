from pydantic_settings import BaseSettings
from pydantic import Field
import os

class Settings(BaseSettings):
    app_name: str = Field(default="Check Tarefas (FastAPI)")
    database_url: str = Field(default="sqlite:///./check_tarefas.db", alias="DATABASE_URL")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    
    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    class Config:
        env_file = ".env"
        extra = "ignore"

# Para o Render, ajustar a URL do PostgreSQL se necessário
settings = Settings()

# Se estiver em produção e a URL contiver postgres://, converter para postgresql://
if settings.is_production and settings.database_url.startswith("postgres://"):
    settings.database_url = settings.database_url.replace("postgres://", "postgresql://", 1)
