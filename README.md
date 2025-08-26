# Sistema de Usuários e Equipes

Sistema completo de gerenciamento de usuários e equipes com autenticação JWT.

## Tecnologias

### Backend (API)
- **Node.js** + **Express**
- **Prisma** ORM + **SQLite** 
- **JWT** para autenticação
- **bcryptjs** para hash de senhas

### Frontend (Web)
- **Next.js 14** 
- **TypeScript**
- **Tailwind CSS**

## Instalação e Uso

### Backend (API)
```bash
cd server
cp .env.example .env
npm install
npm run prisma:gen
npm run prisma:migrate
npm run dev
```
A API iniciará em `http://localhost:6789`.

### Frontend (Web)
```bash
cd web
cp .env.local.example .env.local
npm install
npm run dev
```
O frontend iniciará em `http://localhost:3000`.

### Rotas principais
- `POST /auth/register-company` → cria empresa e usuário admin inicial
- `POST /auth/login` → login (empresaSlug, email, password)
- `GET /me` → dados do usuário/empresa logados
- `GET /users` (ADMIN/MANAGER) → lista usuários
- `POST /users` (ADMIN) → cria usuário
- `PATCH /users/:id` (ADMIN) → altera role/ativo
- `GET /tasks` → lista tarefas
- `POST /tasks` → cria tarefa
- `PATCH /tasks/:id` → atualiza
- `PATCH /tasks/:id/done` → conclui
- `GET /metrics/completions` → série de conclusões por dia (DONE)

## 2) Web
```bash
cd web
cp .env.local.example .env.local
pnpm i  # ou npm i
pnpm dev
```
Acesse `http://localhost:3000`.

### Fluxo de teste rápido
1. Abra `http://localhost:3000/setup` e crie a **empresa demo** (slug `demo`, email `admin@demo.com`, senha `admin123`).
2. Você será redirecionado ao **Dashboard** e poderá criar tarefas.
3. Em **Usuários**, crie membros da equipe.

## Observações
- Banco local SQLite (`server/prisma/dev.db`). Para produção, troque para Postgres no `schema.prisma` e ajuste `DATABASE_URL`.
- JWT simples (7 dias). Altere `JWT_SECRET` no `.env` de produção.
- Este é um **MVP** para acelerar seu projeto. Amplie com: comentários, checklists, quadros Kanban e métricas avançadas.
