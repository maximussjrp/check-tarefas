from fastapi import FastAPI
from app.core.config import settings
from app.db.session import engine
from app.db.base import Base
from app.api import api_init as api

app = FastAPI(title=settings.app_name)

@app.on_event("startup")
def on_startup():
    # cria as tabelas automaticamente
    Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"message": "Bem-vindo ao Check Tarefas (FastAPI)!"}

app.include_router(api.api_router)
