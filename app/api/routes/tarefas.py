from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db.session import get_db
from app.models.tarefa import Tarefa, TarefaStatus
from app.schemas.tarefa import TarefaCreate, TarefaOut, TarefaUpdate, TarefaStatusUpdate

router = APIRouter(prefix="/tarefas", tags=["Tarefas"])

@router.post("", response_model=TarefaOut, status_code=201)
def criar_tarefa(payload: TarefaCreate, db: Session = Depends(get_db)):
    tarefa = Tarefa(
        titulo=payload.titulo,
        descricao=payload.descricao,
        status=payload.status or TarefaStatus.pendente,
        vencimento=payload.vencimento,
        empresa_id=payload.empresa_id,
    )
    db.add(tarefa)
    db.commit()
    db.refresh(tarefa)
    return tarefa

@router.get("", response_model=list[TarefaOut])
def listar_tarefas(
    db: Session = Depends(get_db),
    status: TarefaStatus | None = Query(default=None),
    empresa_id: int | None = Query(default=None),
    q: str | None = Query(default=None, description="Busca em título/descrição"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
):
    query = db.query(Tarefa)
    if status:
        query = query.filter(Tarefa.status == status)
    if empresa_id:
        query = query.filter(Tarefa.empresa_id == empresa_id)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Tarefa.titulo.ilike(like), Tarefa.descricao.ilike(like)))

    query = query.order_by(Tarefa.id.desc())
    itens = query.offset((page - 1) * page_size).limit(page_size).all()
    return itens

@router.get("/{tarefa_id}", response_model=TarefaOut)
def obter_tarefa(tarefa_id: int, db: Session = Depends(get_db)):
    tarefa = db.get(Tarefa, tarefa_id)
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    return tarefa

@router.put("/{tarefa_id}", response_model=TarefaOut)
def atualizar_tarefa(tarefa_id: int, payload: TarefaUpdate, db: Session = Depends(get_db)):
    tarefa = db.get(Tarefa, tarefa_id)
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")

    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(tarefa, campo, valor)

    db.commit()
    db.refresh(tarefa)
    return tarefa

@router.patch("/{tarefa_id}/status", response_model=TarefaOut)
def atualizar_status(tarefa_id: int, payload: TarefaStatusUpdate, db: Session = Depends(get_db)):
    tarefa = db.get(Tarefa, tarefa_id)
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    tarefa.status = payload.status
    db.commit()
    db.refresh(tarefa)
    return tarefa

@router.delete("/{tarefa_id}", status_code=204)
def remover_tarefa(tarefa_id: int, db: Session = Depends(get_db)):
    tarefa = db.get(Tarefa, tarefa_id)
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    db.delete(tarefa)
    db.commit()
    return None
