# Check Tarefas (FastAPI) — Versão Completa

Stack: **FastAPI + SQLAlchemy + Pydantic**. Banco: **PostgreSQL** (produção) ou **SQLite** (dev).
Rotas prontas com Swagger em `/docs`.

## Rotas
Empresas
- `POST /empresas`
- `GET /empresas`
- `GET /empresas/{id}`
- `PUT /empresas/{id}`
- `DELETE /empresas/{id}`

Tarefas
- `POST /tarefas`
- `GET /tarefas?status=&empresa_id=&q=&page=&page_size=`
- `GET /tarefas/{id}`
- `PUT /tarefas/{id}`
- `PATCH /tarefas/{id}/status`
- `DELETE /tarefas/{id}`

## Rodar localmente
```powershell
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
# abra http://127.0.0.1:8000/docs
```

## Variáveis
- `DATABASE_URL` — ex.: `sqlite:///./check_tarefas.db` (padrão dev) ou
  `postgresql+psycopg2://user:pass@host:5432/db`
