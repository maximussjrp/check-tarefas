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

## Deploy no Render
1. **Fork ou clone** este repositório
2. **Crie um novo serviço** no Render conectando ao seu repositório
3. **Use as configurações**:
   - Environment: `Python`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. **Adicione variável de ambiente**: `ENVIRONMENT=production`
5. **Conecte um banco PostgreSQL** (o Render criará automaticamente a `DATABASE_URL`)

### Ou use o Blueprint (render.yaml):
1. No Render Dashboard, clique em **"New Blueprint Instance"**
2. Conecte ao repositório GitHub
3. O `render.yaml` criará automaticamente:
   - Database PostgreSQL
   - Web Service com todas as configurações

## Variáveis de Ambiente
- `DATABASE_URL` — Para dev: `sqlite:///./check_tarefas.db` | Para prod: PostgreSQL URL
- `ENVIRONMENT` — `development` ou `production`
