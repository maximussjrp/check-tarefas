# Tasbo — Render-ready com LOGIN MASTER
**Master pronto:** ao iniciar a API, será criada (se não existir) a empresa `master` e o admin `master@tasbo.local` / `master123`.

## Como usar local
API
```
cd server
cp .env.example .env
npm i
npm run prisma:gen
npm run prisma:migrate
npm run dev
```
Web
```
cd web
cp .env.local.example .env.local
npm i
npm run dev
```

## Render (Blueprint)
1) Importe com `render.yaml` (cria Postgres + API + Web).
2) Depois que **tasbo-api** publicar, ajuste `NEXT_PUBLIC_API_URL` no serviço **tasbo-web** e redeploye.
