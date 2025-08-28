from datetime import date, datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict
from typing import Optional

class TarefaStatus(str, Enum):
    pendente = "pendente"
    em_andamento = "em_andamento"
    concluida = "concluida"
    cancelada = "cancelada"

class TarefaBase(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    status: Optional[TarefaStatus] = None
    vencimento: Optional[date] = None
    empresa_id: Optional[int] = None

class TarefaCreate(TarefaBase):
    pass

class TarefaUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    status: Optional[TarefaStatus] = None
    vencimento: Optional[date] = None
    empresa_id: Optional[int] = None

class TarefaStatusUpdate(BaseModel):
    status: TarefaStatus

class TarefaOut(TarefaBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    criado_em: datetime
    atualizado_em: datetime
