from fastapi import APIRouter
from app.api.routes import empresas, tarefas

api_router = APIRouter()
api_router.include_router(empresas.router)
api_router.include_router(tarefas.router)
