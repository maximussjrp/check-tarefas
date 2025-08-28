# Deploy no Render - Opção Unificada

## ✅ **Configuração Escolhida: Deploy Unificado (Opção B)**

### 🚀 **Deploy Completo no Render**

1. **Acesse https://render.com**
2. **Clique em "New" → "Web Service"**
3. **Conecte seu repositório GitHub**
4. **Configure:**
   - **Name**: `sistema-usuarios-equipes`
   - **Root Directory**: `/` (deixe vazio - raiz do projeto)
   - **Environment**: `Node`
   - **Build Command**: `npm run render:build`
   - **Start Command**: `npm run render:start`
   - **Instance Type**: `Free` (para testes)

### 🔧 **Variáveis de Ambiente no Render**

Configure estas variáveis no dashboard do Render:

```
DATABASE_URL=file:./dev.db
JWT_SECRET=sua-chave-super-secreta-e-muito-forte-aqui-2024
PORT=10000
NEXT_PUBLIC_API_URL=https://SEU-APP-NAME.onrender.com
```

**⚠️ Importante:** 
- Substitua `SEU-APP-NAME` pelo nome que você escolheu no Render
- Use uma JWT_SECRET forte e única

### 📦 **O que acontece no build:**

1. **Build API**: Instala dependências e gera Prisma client
2. **Build Web**: Instala dependências e compila Next.js  
3. **Start**: Inicia apenas o servidor API (que serve tudo)

### 🌐 **URLs após Deploy**

- **Sistema Completo**: `https://SEU-APP-NAME.onrender.com`
- **API Endpoints**: `https://SEU-APP-NAME.onrender.com/auth/login`
- **Frontend**: Servido pelo mesmo domínio

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
