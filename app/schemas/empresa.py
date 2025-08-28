from pydantic import BaseModel, ConfigDict

class EmpresaBase(BaseModel):
    nome: str

class EmpresaCreate(EmpresaBase):
    pass

class EmpresaUpdate(BaseModel):
    nome: str

class EmpresaOut(EmpresaBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
