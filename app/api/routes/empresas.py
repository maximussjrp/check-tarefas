from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.empresa import Empresa
from app.schemas.empresa import EmpresaCreate, EmpresaOut, EmpresaUpdate

router = APIRouter(prefix="/empresas", tags=["Empresas"])

@router.post("", response_model=EmpresaOut, status_code=201)
def criar_empresa(payload: EmpresaCreate, db: Session = Depends(get_db)):
    existente = db.query(Empresa).filter(Empresa.nome == payload.nome).first()
    if existente:
        raise HTTPException(status_code=409, detail="Empresa já existe")
    empresa = Empresa(nome=payload.nome)
    db.add(empresa)
    db.commit()
    db.refresh(empresa)
    return empresa

@router.get("", response_model=list[EmpresaOut])
def listar_empresas(db: Session = Depends(get_db)):
    return db.query(Empresa).order_by(Empresa.id.desc()).all()

@router.get("/{empresa_id}", response_model=EmpresaOut)
def obter_empresa(empresa_id: int, db: Session = Depends(get_db)):
    empresa = db.get(Empresa, empresa_id)
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    return empresa

@router.put("/{empresa_id}", response_model=EmpresaOut)
def atualizar_empresa(empresa_id: int, payload: EmpresaUpdate, db: Session = Depends(get_db)):
    empresa = db.get(Empresa, empresa_id)
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    empresa.nome = payload.nome
    db.commit()
    db.refresh(empresa)
    return empresa

@router.delete("/{empresa_id}", status_code=204)
def remover_empresa(empresa_id: int, db: Session = Depends(get_db)):
    empresa = db.get(Empresa, empresa_id)
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    db.delete(empresa)
    db.commit()
    return None
