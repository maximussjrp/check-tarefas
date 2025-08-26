import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

type JwtUser = { userId: string; empresaId: string; role: string };

function signToken(payload: JwtUser) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function auth() {
  return (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token required' });
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtUser;
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    const u = req.user as JwtUser;
    if (!roles.includes(u.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

// ========== ROTAS DE AUTENTICAÇÃO ==========

app.post('/auth/register-company', async (req: any, res: any) => {
  console.log('=== Criação de empresa ===');
  console.log('Body:', req.body);
  
  const { nomeEmpresa, slugEmpresa, nomeAdmin, emailAdmin, senhaAdmin } = req.body || {};
  
  if (!nomeEmpresa || !slugEmpresa || !nomeAdmin || !emailAdmin || !senhaAdmin) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }
  
  const slug = String(slugEmpresa).toLowerCase().replace(/[^a-z0-9-]/g, '-');
  
  const exists = await prisma.empresa.findUnique({ where: { slug } });
  if (exists) {
    return res.status(409).json({ error: 'Slug já está em uso' });
  }
  
  try {
    const senhaHash = await bcrypt.hash(senhaAdmin, 12);
    
    const empresa = await prisma.empresa.create({
      data: {
        nome: nomeEmpresa,
        slug,
        ownerId: 'temp',
        usuarios: {
          create: {
            nome: nomeAdmin,
            email: emailAdmin.toLowerCase(),
            senhaHash,
            role: 'admin'
          }
        }
      },
      include: { usuarios: true }
    });
    
    const admin = empresa.usuarios[0];
    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { ownerId: admin.id }
    });
    
    const token = signToken({ userId: admin.id, empresaId: empresa.id, role: admin.role });
    console.log('✅ Empresa criada:', empresa.nome);
    
    res.json({ 
      token, 
      empresa: { id: empresa.id, nome: empresa.nome, slug: empresa.slug }, 
      user: { id: admin.id, nome: admin.nome, role: admin.role, email: admin.email } 
    });
  } catch (error) {
    console.error('Erro ao criar empresa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/auth/login', async (req: any, res: any) => {
  const { slugEmpresa, email, senha } = req.body || {};
  
  if (!slugEmpresa || !email || !senha) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }
  
  const empresa = await prisma.empresa.findUnique({ where: { slug: slugEmpresa.toLowerCase() } });
  if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' });
  
  const usuario = await prisma.usuario.findFirst({ 
    where: { 
      email: email.toLowerCase(), 
      empresaId: empresa.id 
    } 
  });
  
  if (!usuario || !usuario.isActive) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }
  
  const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
  if (!senhaValida) return res.status(401).json({ error: 'Credenciais inválidas' });
  
  const token = signToken({ userId: usuario.id, empresaId: empresa.id, role: usuario.role });
  res.json({ 
    token, 
    empresa: { id: empresa.id, nome: empresa.nome, slug: empresa.slug }, 
    user: { id: usuario.id, nome: usuario.nome, role: usuario.role, email: usuario.email } 
  });
});

// Perfil do usuário
app.get('/me', auth(), async (req: any, res: any) => {
  const u = req.user as JwtUser;
  const usuario = await prisma.usuario.findUnique({ 
    where: { id: u.userId }, 
    select: { id: true, nome: true, email: true, role: true, empresaId: true },
    include: {
      empresa: { select: { nome: true, slug: true } },
      equipesUsuario: {
        include: { equipe: { select: { id: true, nome: true } } }
      }
    }
  });
  res.json(usuario);
});

// ========== ROTAS DE USUÁRIOS ==========

app.get('/usuarios', auth(), requireRole('admin', 'manager'), async (req: any, res: any) => {
  const u = req.user as JwtUser;
  const usuarios = await prisma.usuario.findMany({ 
    where: { empresaId: u.empresaId }, 
    select: { 
      id: true, 
      nome: true, 
      email: true, 
      role: true, 
      isActive: true, 
      createdAt: true 
    },
    include: {
      equipesUsuario: {
        include: { equipe: { select: { nome: true } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json(usuarios);
});

app.post('/usuarios', auth(), requireRole('admin'), async (req: any, res: any) => {
  const u = req.user as JwtUser;
  const { nome, email, senha, role } = req.body || {};
  
  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }
  
  if (!['admin', 'manager', 'member'].includes(role || 'member')) {
    return res.status(400).json({ error: 'Role deve ser: admin, manager ou member' });
  }
  
  try {
    const exists = await prisma.usuario.findFirst({
      where: { email: email.toLowerCase(), empresaId: u.empresaId }
    });
    
    if (exists) {
      return res.status(409).json({ error: 'Email já está em uso nesta empresa' });
    }
    
    const senhaHash = await bcrypt.hash(senha, 12);
    
    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email: email.toLowerCase(),
        senhaHash,
        role: role || 'member',
        empresaId: u.empresaId
      },
      select: { id: true, nome: true, email: true, role: true, isActive: true, createdAt: true }
    });
    
    res.status(201).json(usuario);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ========== ROTAS DE EQUIPES ==========

app.get('/equipes', auth(), async (req: any, res: any) => {
  const u = req.user as JwtUser;
  const equipes = await prisma.equipe.findMany({
    where: { empresaId: u.empresaId },
    include: {
      membros: {
        include: {
          usuario: { select: { id: true, nome: true, email: true, role: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json(equipes);
});

app.post('/equipes', auth(), requireRole('admin', 'manager'), async (req: any, res: any) => {
  const u = req.user as JwtUser;
  const { nome, descricao } = req.body || {};
  
  if (!nome) {
    return res.status(400).json({ error: 'Nome da equipe é obrigatório' });
  }
  
  try {
    const equipe = await prisma.equipe.create({
      data: {
        nome,
        descricao,
        empresaId: u.empresaId
      },
      include: {
        membros: {
          include: {
            usuario: { select: { id: true, nome: true, email: true, role: true } }
          }
        }
      }
    });
    
    res.status(201).json(equipe);
  } catch (error) {
    console.error('Erro ao criar equipe:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/equipes/:equipeId/membros', auth(), requireRole('admin', 'manager'), async (req: any, res: any) => {
  const u = req.user as JwtUser;
  const { equipeId } = req.params;
  const { usuarioId } = req.body || {};
  
  if (!usuarioId) {
    return res.status(400).json({ error: 'usuarioId é obrigatório' });
  }
  
  try {
    const equipe = await prisma.equipe.findFirst({
      where: { id: equipeId, empresaId: u.empresaId }
    });
    
    if (!equipe) {
      return res.status(404).json({ error: 'Equipe não encontrada' });
    }
    
    const usuario = await prisma.usuario.findFirst({
      where: { id: usuarioId, empresaId: u.empresaId }
    });
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    const membroExistente = await prisma.usuarioEquipe.findFirst({
      where: { usuarioId, equipeId }
    });
    
    if (membroExistente) {
      return res.status(409).json({ error: 'Usuário já é membro desta equipe' });
    }
    
    const membro = await prisma.usuarioEquipe.create({
      data: { usuarioId, equipeId },
      include: {
        usuario: { select: { id: true, nome: true, email: true, role: true } }
      }
    });
    
    res.status(201).json(membro);
  } catch (error) {
    console.error('Erro ao adicionar membro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ========== ROTA DE TESTE ==========
app.get('/', (_, res) => res.send('🚀 Tasbo API - Sistema de Usuários e Equipes funcionando!'));

// ===== AUTENTICAÇÃO =====
app.post('/auth/register-company', async (req: any, res: any) => {
  console.log('=== Criando empresa ===');
  console.log('Body:', req.body);
  const { empresaNome, empresaSlug, adminNome, adminEmail, adminSenha } = req.body || {};
  
  if (!empresaNome || !empresaSlug || !adminNome || !adminEmail || !adminSenha) {
    console.log('Campos ausentes');
    return res.status(400).json({ error: 'Campos obrigatórios: empresaNome, empresaSlug, adminNome, adminEmail, adminSenha' });
  }
  
  const slug = String(empresaSlug).toLowerCase().replace(/[^a-z0-9-]/g, '-');
  console.log('Slug processado:', slug);
  
  const empresaExistente = await prisma.empresa.findUnique({ where: { slug } });
  if (empresaExistente) {
    console.log('Slug já existe:', slug);
    return res.status(409).json({ error: 'Slug da empresa já está em uso' });
  }
  
  try {
    const empresa = await prisma.empresa.create({
      data: {
        nome: empresaNome,
        slug,
        ownerId: 'temp', // Será atualizado após criar o admin
        usuarios: {
          create: {
            nome: adminNome,
            email: adminEmail.toLowerCase(),
            senhaHash: await bcrypt.hash(adminSenha, 10),
            role: 'admin'
          }
        }
      },
      include: { usuarios: true }
    });
    
    // Atualizar ownerId com o ID do admin criado
    const admin = empresa.usuarios[0];
    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { ownerId: admin.id }
    });
    
    const token = signToken({ userId: admin.id, empresaId: empresa.id, role: admin.role });
    console.log('Empresa criada com sucesso:', { empresaId: empresa.id, adminId: admin.id });
    
    res.json({
      token,
      empresa: { id: empresa.id, nome: empresa.nome, slug: empresa.slug },
      usuario: { id: admin.id, nome: admin.nome, email: admin.email, role: admin.role }
    });
  } catch (error) {
    console.error('Erro ao criar empresa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/auth/login', async (req: any, res: any) => {
  const { empresaSlug, email, senha } = req.body || {};
  if (!empresaSlug || !email || !senha) {
    return res.status(400).json({ error: 'Campos obrigatórios: empresaSlug, email, senha' });
  }
  
  const empresa = await prisma.empresa.findUnique({ where: { slug: empresaSlug.toLowerCase() } });
  if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' });
  
  const usuario = await prisma.usuario.findFirst({
    where: { empresaId: empresa.id, email: email.toLowerCase(), isActive: true }
  });
  if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });
  
  const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
  if (!senhaValida) return res.status(401).json({ error: 'Senha inválida' });
  
  const token = signToken({ userId: usuario.id, empresaId: empresa.id, role: usuario.role });
  res.json({
    token,
    empresa: { id: empresa.id, nome: empresa.nome, slug: empresa.slug },
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role }
  });
});

// ===== PERFIL DO USUÁRIO =====
app.get('/me', auth(), async (req: any, res: any) => {
  const u = req.user as JwtUser;
  const usuario = await prisma.usuario.findUnique({
    where: { id: u.userId },
    select: { id: true, nome: true, email: true, role: true, isActive: true }
  });
  if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json(usuario);
});

// ===== GESTÃO DE USUÁRIOS =====
app.get('/usuarios', auth(), requireRole('admin', 'manager'), async (req: any, res: any) => {
  const u = req.user as JwtUser;
  const usuarios = await prisma.usuario.findMany({
    where: { empresaId: u.empresaId },
    select: {
      id: true, nome: true, email: true, role: true, isActive: true, createdAt: true,
      equipesUsuario: { include: { equipe: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json(usuarios);
});

app.post('/usuarios', auth(), requireRole('admin'), async (req: any, res: any) => {
  const u = req.user as JwtUser;
  const { nome, email, senha, role = 'member' } = req.body || {};
  
  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, email, senha' });
  }
  
  if (!['admin', 'manager', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Role inválido. Use: admin, manager ou member' });
  }
  
  try {
    const usuarioExistente = await prisma.usuario.findFirst({
      where: { empresaId: u.empresaId, email: email.toLowerCase() }
    });
    
    if (usuarioExistente) {
      return res.status(409).json({ error: 'Email já está em uso nesta empresa' });
    }
    
    const novoUsuario = await prisma.usuario.create({
      data: {
        nome,
        email: email.toLowerCase(),
        senhaHash: await bcrypt.hash(senha, 10),
        role,
        empresaId: u.empresaId
      },
      select: { id: true, nome: true, email: true, role: true, isActive: true, createdAt: true }
    });
    
    res.json(novoUsuario);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.patch('/usuarios/:id', auth(), requireRole('admin'), async (req: any, res: any) => {
  const u = req.user as JwtUser;
  const { id } = req.params;
  const { nome, email, role, isActive } = req.body || {};
  
  const usuario = await prisma.usuario.findFirst({
    where: { id, empresaId: u.empresaId }
  });
  
  if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });
  
  const dados: any = {};
  if (nome) dados.nome = nome;
  if (email) dados.email = email.toLowerCase();
  if (role && ['admin', 'manager', 'member'].includes(role)) dados.role = role;
  if (typeof isActive === 'boolean') dados.isActive = isActive;
  
  try {
    const usuarioAtualizado = await prisma.usuario.update({
      where: { id },
      data: dados,
      select: { id: true, nome: true, email: true, role: true, isActive: true, createdAt: true }
    });
    
    res.json(usuarioAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== GESTÃO DE EQUIPES =====
app.get('/equipes', auth(), async (req: any, res: any) => {
  const u = req.user as JwtUser;
  const equipes = await prisma.equipe.findMany({
    where: { empresaId: u.empresaId },
    include: {
      membros: {
        include: { usuario: { select: { id: true, nome: true, email: true, role: true } } }
      },
      _count: { select: { tarefas: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json(equipes);
});

app.post('/equipes', auth(), requireRole('admin', 'manager'), async (req: any, res: any) => {
  const u = req.user as JwtUser;
  const { nome, descricao = '', membrosIds = [] } = req.body || {};
  
  if (!nome) return res.status(400).json({ error: 'Campo obrigatório: nome' });
  
  try {
    const equipe = await prisma.equipe.create({
      data: {
        nome,
        descricao,
        empresaId: u.empresaId,
        membros: {
          create: membrosIds.map((usuarioId: string) => ({ usuarioId }))
        }
      },
      include: {
        membros: {
          include: { usuario: { select: { id: true, nome: true, email: true, role: true } } }
        }
      }
    });
    
    res.json(equipe);
  } catch (error) {
    console.error('Erro ao criar equipe:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.patch('/equipes/:id', auth(), requireRole('admin', 'manager'), async (req: any, res: any) => {
  const u = req.user as JwtUser;
  const { id } = req.params;
  const { nome, descricao, membrosIds } = req.body || {};
  
  const equipe = await prisma.equipe.findFirst({
    where: { id, empresaId: u.empresaId }
  });
  
  if (!equipe) return res.status(404).json({ error: 'Equipe não encontrada' });
  
  try {
    const dados: any = {};
    if (nome) dados.nome = nome;
    if (descricao !== undefined) dados.descricao = descricao;
    
    // Atualizar membros se fornecido
    if (Array.isArray(membrosIds)) {
      await prisma.usuarioEquipe.deleteMany({ where: { equipeId: id } });
      dados.membros = {
        create: membrosIds.map((usuarioId: string) => ({ usuarioId }))
      };
    }
    
    const equipeAtualizada = await prisma.equipe.update({
      where: { id },
      data: dados,
      include: {
        membros: {
          include: { usuario: { select: { id: true, nome: true, email: true, role: true } } }
        }
      }
    });
    
    res.json(equipeAtualizada);
  } catch (error) {
    console.error('Erro ao atualizar equipe:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.delete('/equipes/:id', auth(), requireRole('admin', 'manager'), async (req: any, res: any) => {
  const u = req.user as JwtUser;
  const { id } = req.params;
  
  const equipe = await prisma.equipe.findFirst({
    where: { id, empresaId: u.empresaId }
  });
  
  if (!equipe) return res.status(404).json({ error: 'Equipe não encontrada' });
  
  try {
    await prisma.equipe.delete({ where: { id } });
    res.json({ message: 'Equipe excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir equipe:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== ROTA BÁSICA =====
app.get('/', (req: any, res: any) => res.send('Sistema de Gestão de Equipes - API OK'));

// --------- AUTH ---------
app.post('/auth/register-company', async (req, res) => {
  console.log('=== Requisição de criação de empresa recebida ===');
  console.log('Body:', req.body);
  const { empresaName, empresaSlug, adminName, adminEmail, adminPassword } = req.body || {};
  if (!empresaName || !empresaSlug || !adminName || !adminEmail || !adminPassword) {
    console.log('Campos ausentes:', { empresaName: !!empresaName, empresaSlug: !!empresaSlug, adminName: !!adminName, adminEmail: !!adminEmail, adminPassword: !!adminPassword });
    return res.status(400).json({ error: 'Missing fields' });
  }
  const slug = String(empresaSlug).toLowerCase().replace(/[^a-z0-9-]/g, '-');
  console.log('Slug processado:', slug);
  const exists = await prisma.empresa.findUnique({ where: { slug } });
  if (exists) {
    console.log('Slug já existe:', slug);
    return res.status(409).json({ error: 'Slug already in use' });
  }
  try {
    const empresa = await prisma.empresa.create({
      data: {
        name: empresaName,
        slug,
        users: {
          create: {
            name: adminName,
            email: adminEmail.toLowerCase(),
            password: await bcrypt.hash(adminPassword, 10),
            role: 'ADMIN'
          }
        }
      },
      include: { users: true }
    });
    const admin = empresa.users[0];
    const token = signToken({ userId: admin.id, empresaId: empresa.id, role: admin.role });
    console.log('Empresa criada com sucesso:', { empresaId: empresa.id, adminId: admin.id });
    res.json({ token, empresa: { id: empresa.id, name: empresa.name, slug: empresa.slug }, user: { id: admin.id, name: admin.name, role: admin.role } });
  } catch (error) {
    console.error('Erro ao criar empresa:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { empresaSlug, email, password } = req.body || {};
  if (!empresaSlug || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  const empresa = await prisma.empresa.findUnique({ where: { slug: empresaSlug.toLowerCase() } });
  if (!empresa) return res.status(404).json({ error: 'Empresa not found' });
  const user = await prisma.usuario.findUnique({ where: { email_empresaId: { email: email.toLowerCase(), empresaId: empresa.id } } });
  if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signToken({ userId: user.id, empresaId: empresa.id, role: user.role });
  res.json({ token, empresa: { id: empresa.id, name: empresa.name, slug: empresa.slug }, user: { id: user.id, name: user.name, role: user.role } });
});

app.get('/me', auth(), async (req: any, res) => {
  const u: JwtUser = req.user;
  const user = await prisma.usuario.findUnique({ where: { id: u.userId }, select: { id: true, name: true, email: true, role: true } });
  const empresa = await prisma.empresa.findUnique({ where: { id: u.empresaId }, select: { id: true, name: true, slug: true } });
  res.json({ user, empresa });
});

// --------- USERS (ADMIN/MANAGER) ---------
app.get('/users', auth(), requireRole('ADMIN', 'MANAGER'), async (req: any, res) => {
  const u: JwtUser = req.user;
  const users = await prisma.usuario.findMany({ where: { empresaId: u.empresaId }, select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } });
  res.json(users);
});

app.post('/users', auth(), requireRole('ADMIN'), async (req: any, res) => {
  const u: JwtUser = req.user;
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const user = await prisma.usuario.create({
      data: {
        name, email: String(email).toLowerCase(), password: await bcrypt.hash(password, 10),
        role: role && ['ADMIN','MANAGER','MEMBER'].includes(role) ? role : 'MEMBER',
        empresaId: u.empresaId
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true }
    });
    res.json(user);
  } catch (e:any) {
    res.status(400).json({ error: 'Could not create user', detail: e.message });
  }
});

app.patch('/users/:id', auth(), requireRole('ADMIN'), async (req: any, res) => {
  const u: JwtUser = req.user;
  const { id } = req.params;
  const { role, isActive } = req.body || {};
  // ensure same empresa
  const current = await prisma.usuario.findUnique({ where: { id } });
  if (!current || current.empresaId !== u.empresaId) return res.status(404).json({ error: 'User not found' });
  const updated = await prisma.usuario.update({
    where: { id },
    data: {
      role: role && ['ADMIN','MANAGER','MEMBER'].includes(role) ? role : current.role,
      isActive: typeof isActive === 'boolean' ? isActive : current.isActive
    },
    select: { id: true, name: true, email: true, role: true, isActive: true }
  });
  res.json(updated);
});

// --------- TASKS ---------
app.get('/tasks', auth(), async (req: any, res) => {
  const u: JwtUser = req.user;
  const { status, from, to } = req.query;
  const where:any = { empresaId: u.empresaId };
  if (status) where.status = status;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(String(from));
    if (to) where.createdAt.lte = new Date(String(to));
  }
  const tasks = await prisma.tarefa.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, description: true, status: true, priority: true,
      dueAt: true, startedAt: true, completedAt: true,
      assignee: { select: { id: true, name: true } },
      createdAt: true, updatedAt: true
    }
  });
  res.json(tasks);
});

app.post('/tasks', auth(), async (req: any, res) => {
  const u: JwtUser = req.user;
  const { title, description, priority, dueAt, assigneeId } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Title required' });
  // validate assignee belongs to same empresa
  if (assigneeId) {
    const assignee = await prisma.usuario.findUnique({ where: { id: assigneeId } });
    if (!assignee || assignee.empresaId !== u.empresaId) return res.status(400).json({ error: 'Invalid assignee' });
  }
  const task = await prisma.tarefa.create({
    data: {
      empresaId: u.empresaId,
      title,
      description,
      priority: typeof priority === 'number' ? priority : 3,
      dueAt: dueAt ? new Date(dueAt) : null,
      createdById: u.userId,
      assigneeId: assigneeId || null
    }
  });
  res.json(task);
});

app.patch('/tasks/:id', auth(), async (req: any, res) => {
  const u: JwtUser = req.user;
  const { id } = req.params;
  const task = await prisma.tarefa.findUnique({ where: { id } });
  if (!task || task.empresaId !== u.empresaId) return res.status(404).json({ error: 'Task not found' });
  const data: any = {};
  const body = req.body || {};
  ['title','description','priority','status'].forEach((k) => {
    if (body[k] !== undefined) data[k] = body[k];
  });
  if (body.dueAt !== undefined) data.dueAt = body.dueAt ? new Date(body.dueAt) : null;
  if (body.startedAt !== undefined) data.startedAt = body.startedAt ? new Date(body.startedAt) : null;
  if (body.completedAt !== undefined) data.completedAt = body.completedAt ? new Date(body.completedAt) : null;
  if (body.assigneeId !== undefined) {
    if (body.assigneeId === null) data.assigneeId = null;
    else {
      const assignee = await prisma.usuario.findUnique({ where: { id: body.assigneeId } });
      if (!assignee || assignee.empresaId !== u.empresaId) return res.status(400).json({ error: 'Invalid assignee' });
      data.assigneeId = body.assigneeId;
    }
  }
  const updated = await prisma.tarefa.update({ where: { id }, data });
  res.json(updated);
});

app.patch('/tasks/:id/done', auth(), async (req: any, res) => {
  const u: JwtUser = req.user;
  const { id } = req.params;
  const task = await prisma.tarefa.findUnique({ where: { id } });
  if (!task || task.empresaId !== u.empresaId) return res.status(404).json({ error: 'Task not found' });
  const updated = await prisma.tarefa.update({
    where: { id },
    data: { status: 'DONE', completedAt: new Date() }
  });
  res.json(updated);
});

// --------- METRICS ---------
app.get('/metrics/completions', auth(), async (req: any, res) => {
  const u: JwtUser = req.user;
  const { from, to } = req.query;
  const start = from ? new Date(String(from)) : new Date(Date.now() - 7*24*60*60*1000);
  const end = to ? new Date(String(to)) : new Date();
  const tasks = await prisma.tarefa.findMany({
    where: { empresaId: u.empresaId, status: 'DONE', completedAt: { gte: start, lte: end } },
    select: { completedAt: true }
  });
  const map: Record<string, number> = {};
  for (const t of tasks) {
    const d = t.completedAt ? t.completedAt.toISOString().slice(0,10) : null;
    if (!d) continue;
    map[d] = (map[d] || 0) + 1;
  }
  res.json({ from: start, to: end, series: map });
});

app.get('/', (_, res) => res.send('Tasbo API ok'));
app.listen(PORT, 'localhost', () => console.log(`API listening on localhost:${PORT}`));
