require('dotenv/config');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from Next.js build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../web/.next')));
  app.use(express.static(path.join(__dirname, '../../web/public')));
}

const PORT = Number(process.env.PORT) || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function auth() {
  return (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token required' });
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

function requireRole(...roles) {
  return (req, res, next) => {
    const u = req.user;
    if (!roles.includes(u.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

// ========== ROUTES ==========

app.get('/', (_, res) => res.json({ message: '🚀 API Tasbo - Sistema de Usuários e Equipes funcionando!' }));

// AUTH ROUTES
app.post('/auth/register-company', async (req, res) => {
  const { empresaNome, adminNome, adminEmail, adminSenha } = req.body;
  
  if (!empresaNome || !adminNome || !adminEmail || !adminSenha) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }
  
  try {
    // Check if company slug already exists
    const slug = empresaNome.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const existingCompany = await prisma.empresa.findUnique({ where: { slug } });
    if (existingCompany) {
      return res.status(409).json({ error: 'Nome da empresa já está em uso' });
    }

    // Create company
    const empresa = await prisma.empresa.create({
      data: {
        nome: empresaNome,
        slug,
      }
    });

    // Create admin user
    const senhaHash = await bcrypt.hash(adminSenha, 12);
    const admin = await prisma.usuario.create({
      data: {
        nome: adminNome,
        email: adminEmail.toLowerCase(),
        senhaHash,
        role: 'admin',
        empresaId: empresa.id,
      }
    });

    // Update company with ownerId
    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { ownerId: admin.id }
    });

    const token = signToken({ userId: admin.id, empresaId: empresa.id, role: 'admin' });

    res.status(201).json({
      token,
      user: { id: admin.id, nome: admin.nome, email: admin.email, role: admin.role },
      company: { id: empresa.id, nome: empresa.nome, slug: empresa.slug }
    });
  } catch (error) {
    console.error('Register company error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, senha } = req.body;
  
  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }
  
  try {
    const usuario = await prisma.usuario.findFirst({
      where: { 
        email: email.toLowerCase(),
        isActive: true 
      },
      include: { empresa: true }
    });
    
    if (!usuario || !await bcrypt.compare(senha, usuario.senhaHash)) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    const token = signToken({ 
      userId: usuario.id, 
      empresaId: usuario.empresaId, 
      role: usuario.role 
    });
    
    res.json({
      token,
      user: { 
        id: usuario.id, 
        nome: usuario.nome, 
        email: usuario.email, 
        role: usuario.role 
      },
      company: { 
        id: usuario.empresa.id, 
        nome: usuario.empresa.nome, 
        slug: usuario.empresa.slug 
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// USER ROUTES
app.get('/me', auth(), async (req, res) => {
  const user = req.user;
  
  try {
    const userData = await prisma.usuario.findUnique({
      where: { id: user.userId },
      select: { 
        id: true, 
        nome: true, 
        email: true, 
        role: true, 
        empresaId: true 
      },
      include: { 
        empresa: { 
          select: { nome: true, slug: true } 
        } 
      }
    });
    
    res.json(userData);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/users', auth(), requireRole('admin', 'manager'), async (req, res) => {
  const user = req.user;
  
  try {
    const users = await prisma.usuario.findMany({
      where: { empresaId: user.empresaId },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    });
    
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/users', auth(), requireRole('admin'), async (req, res) => {
  const user = req.user;
  const { nome, email, senha, role = 'member' } = req.body;
  
  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }
  
  if (!['admin', 'manager', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Role deve ser: admin, manager ou member' });
  }
  
  try {
    const existingUser = await prisma.usuario.findFirst({
      where: { 
        email: email.toLowerCase(), 
        empresaId: user.empresaId 
      }
    });
    
    if (existingUser) {
      return res.status(409).json({ error: 'Email já está em uso nesta empresa' });
    }
    
    const senhaHash = await bcrypt.hash(senha, 12);
    
    const newUser = await prisma.usuario.create({
      data: {
        nome,
        email: email.toLowerCase(),
        senhaHash,
        role,
        empresaId: user.empresaId,
      },
      select: { 
        id: true, 
        nome: true, 
        email: true, 
        role: true, 
        isActive: true, 
        createdAt: true 
      }
    });
    
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// TEAM ROUTES
app.get('/equipes', auth(), async (req, res) => {
  const user = req.user;
  
  try {
    const equipes = await prisma.equipe.findMany({
      where: { empresaId: user.empresaId },
      include: {
        membros: {
          include: {
            usuario: {
              select: { id: true, nome: true, email: true, role: true }
            }
          }
        }
      }
    });
    
    res.json(equipes);
  } catch (error) {
    console.error('Get equipes error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/equipes', auth(), requireRole('admin', 'manager'), async (req, res) => {
  const user = req.user;
  const { nome, descricao, membros = [] } = req.body;
  
  if (!nome) {
    return res.status(400).json({ error: 'Nome da equipe é obrigatório' });
  }
  
  try {
    const equipe = await prisma.equipe.create({
      data: {
        nome,
        descricao,
        empresaId: user.empresaId,
      }
    });
    
    // Add members
    if (membros.length > 0) {
      await prisma.usuarioEquipe.createMany({
        data: membros.map((usuarioId) => ({
          usuarioId,
          equipeId: equipe.id,
        }))
      });
    }
    
    // Return equipe with members
    const equipeCompleta = await prisma.equipe.findUnique({
      where: { id: equipe.id },
      include: {
        membros: {
          include: {
            usuario: {
              select: { id: true, nome: true, email: true, role: true }
            }
          }
        }
      }
    });
    
    res.status(201).json(equipeCompleta);
  } catch (error) {
    console.error('Create equipe error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Serve Next.js pages in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../web/.next/server/pages/index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API rodando em http://localhost:${PORT}`);
  console.log(`🌍 Servidor acessível em 0.0.0.0:${PORT}`);
});
