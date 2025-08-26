# Deploy no Render

## Preparação para Deploy

### 1. Configuração do Repositório Git

```bash
# Já executado:
git init
git add .
git commit -m "Initial commit: Sistema de Usuários e Equipes completo"
git branch -M main

# Execute (substitua SEU_USUARIO):
git remote add origin https://github.com/SEU_USUARIO/sistema-usuarios-equipes.git
git push -u origin main
```

### 2. Deploy da API no Render

1. Acesse https://render.com
2. Clique em **"New"** → **"Web Service"**
3. Conecte seu repositório GitHub
4. Configure:
   - **Name**: `sistema-usuarios-api`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npm start`

5. **Variáveis de Ambiente**:
   ```
   DATABASE_URL=file:./dev.db
   JWT_SECRET=sua-chave-super-secreta-aqui
   PORT=10000
   ```

### 3. Deploy do Frontend no Render

1. Clique em **"New"** → **"Static Site"**
2. Conecte o mesmo repositório
3. Configure:
   - **Name**: `sistema-usuarios-web`
   - **Root Directory**: `web`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `.next`

4. **Variáveis de Ambiente**:
   ```
   NEXT_PUBLIC_API_URL=https://sistema-usuarios-api.onrender.com
   ```

### 4. Alternativa: Deploy Completo no Render

Para deploy de ambos em um serviço:

1. **Web Service**:
   - **Root Directory**: `/` (raiz)
   - **Build Command**: `cd server && npm install && npx prisma generate && cd ../web && npm install && npm run build`
   - **Start Command**: `cd server && npm start`

### 5. Pós-Deploy

1. Teste a API: `https://SEU-APP.onrender.com`
2. Teste o Frontend: `https://SEU-FRONTEND.onrender.com`
3. Registre primeira empresa através da interface

## URLs de Exemplo

- **API**: https://sistema-usuarios-api.onrender.com
- **Web**: https://sistema-usuarios-web.onrender.com

## Comandos Úteis

```bash
# Logs em produção (localmente)
npm run logs

# Rebuild Prisma
npx prisma generate

# Verificar status
curl https://SEU-APP.onrender.com
```
