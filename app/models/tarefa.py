from datetime import datetime, date
from enum import Enum
from sqlalchemy import String, Text, Enum as SAEnum, ForeignKey, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class TarefaStatus(str, Enum):
    pendente = "pendente"
    em_andamento = "em_andamento"
    concluida = "concluida"
    cancelada = "cancelada"

class Tarefa(Base):
    __tablename__ = "tarefas"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, index=True)
    titulo: Mapped[str] = mapped_column(String(200), index=True)
    descricao: Mapped[str | None] = mapped_column(Text(), nullable=True)
    status: Mapped[TarefaStatus] = mapped_column(SAEnum(TarefaStatus), default=TarefaStatus.pendente, index=True)
    vencimento: Mapped[date | None] = mapped_column(Date, nullable=True)
    empresa_id: Mapped[int | None] = mapped_column(ForeignKey("empresas.id", ondelete="SET NULL"), nullable=True, index=True)
    empresa = relationship("Empresa", back_populates="tarefas")

    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
