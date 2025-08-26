import 'dotenv/config'; import express, { Request, Response } from 'express'; import cors from 'cors'; import { PrismaClient, Role } from '@prisma/client'; import jwt from 'jsonwebtoken'; import bcrypt from 'bcryptjs';
const prisma = new PrismaClient(); const app = express(); app.use(cors()); app.use(express.json());
const PORT = Number(process.env.PORT || 4000); const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
type JwtUser = { userId:string; empresaId:string; role:Role }; const signToken = (p:JwtUser)=> jwt.sign(p, JWT_SECRET, { expiresIn: '7d' });
const auth = (required=true)=>(req:any,res:any,next:any)=>{ const h=req.headers.authorization||''; const t=h.startsWith('Bearer ')?h.slice(7):null;
  if(!t){ if(!required) return next(); return res.status(401).json({error:'No token'});} try{ req.user=jwt.verify(t, JWT_SECRET) as JwtUser; next(); }catch{ return res.status(401).json({error:'Invalid token'});} };
const requireRole=(...roles:Role[])=> (req:any,res:any,next:any)=>{ const u:JwtUser=req.user; if(!u) return res.status(401).json({error:'Unauthorized'}); if(!roles.includes(u.role)) return res.status(403).json({error:'Forbidden'}); next(); };
async function bootstrapMaster(){ if(String(process.env.BOOTSTRAP_ENABLED).toLowerCase()==='false') return;
  const slug=process.env.BOOTSTRAP_COMPANY_SLUG||'master', name=process.env.BOOTSTRAP_COMPANY_NAME||'Master Org', an=process.env.BOOTSTRAP_ADMIN_NAME||'Master Admin', ae=(process.env.BOOTSTRAP_ADMIN_EMAIL||'master@tasbo.local').toLowerCase(), ap=process.env.BOOTSTRAP_ADMIN_PASSWORD||'master123';
  let emp=await prisma.empresa.findUnique({ where:{ slug } }); if(!emp){ emp=await prisma.empresa.create({ data:{ name, slug } }); console.log('[bootstrap] Empresa criada:', slug); }
  let usr=await prisma.usuario.findUnique({ where:{ email_empresaId:{ email: ae, empresaId: emp.id } } });
  if(!usr){ usr=await prisma.usuario.create({ data:{ name: an, email: ae, password: await bcrypt.hash(ap,10), role:'ADMIN', empresaId: emp.id } }); console.log('[bootstrap] Admin criado:', ae); } else { console.log('[bootstrap] Admin já existe:', ae); } }
app.post('/auth/register-company', async (req: Request, res: Response)=>{ const {empresaName,empresaSlug,adminName,adminEmail,adminPassword}=req.body||{};
  if(!empresaName||!empresaSlug||!adminName||!adminEmail||!adminPassword) return res.status(400).json({error:'Missing fields'});
  const slug=String(empresaSlug).toLowerCase().replace(/[^a-z0-9-]/g,'-'); const exists=await prisma.empresa.findUnique({ where:{ slug } }); if(exists) return res.status(409).json({error:'Slug already in use'});
  const empresa=await prisma.empresa.create({ data:{ name:empresaName, slug, users:{ create:{ name:adminName, email:adminEmail.toLowerCase(), password:await bcrypt.hash(adminPassword,10), role:'ADMIN' } } }, include:{ users:true } });
  const admin=empresa.users[0]; const token=signToken({ userId:admin.id, empresaId:empresa.id, role:admin.role }); res.json({ token, empresa:{ id:empresa.id, name:empresa.name, slug:empresa.slug }, user:{ id:admin.id, name:admin.name, role:admin.role } }); });
app.post('/auth/login', async (req: Request, res: Response)=>{ const {empresaSlug,email,password}=req.body||{}; if(!empresaSlug||!email||!password) return res.status(400).json({error:'Missing fields'});
  const empresa=await prisma.empresa.findUnique({ where:{ slug:String(empresaSlug).toLowerCase() } }); if(!empresa) return res.status(404).json({error:'Empresa not found'});
  const user=await prisma.usuario.findUnique({ where:{ email_empresaId:{ email:String(email).toLowerCase(), empresaId: empresa.id } } }); if(!user||!user.isActive) return res.status(401).json({error:'Invalid credentials'});
  const ok=await bcrypt.compare(password, user.password); if(!ok) return res.status(401).json({error:'Invalid credentials'});
  const token=signToken({ userId:user.id, empresaId:empresa.id, role:user.role }); res.json({ token, empresa:{ id:empresa.id, name:empresa.name, slug:empresa.slug }, user:{ id:user.id, name:user.name, role:user.role } }); });
app.get('/me', auth(), async (req:any,res)=>{ const u:JwtUser=req.user; const user=await prisma.usuario.findUnique({ where:{ id:u.userId }, select:{ id:true, name:true, email:true, role:true } });
  const empresa=await prisma.empresa.findUnique({ where:{ id:u.empresaId }, select:{ id:true, name:true, slug:true } }); res.json({ user, empresa }); });
app.get('/users', auth(), requireRole('ADMIN','MANAGER'), async (req:any,res)=>{ const u:JwtUser=req.user; const users=await prisma.usuario.findMany({ where:{ empresaId:u.empresaId }, select:{ id:true, name:true, email:true, role:true, isActive:true, createdAt:true } }); res.json(users); });
app.post('/users', auth(), requireRole('ADMIN'), async (req:any,res)=>{ const u:JwtUser=req.user; const { name,email,password,role }=req.body||{}; if(!name||!email||!password) return res.status(400).json({error:'Missing fields'});
  try{ const user=await prisma.usuario.create({ data:{ name, email:String(email).toLowerCase(), password:await bcrypt.hash(password,10), role: role&&['ADMIN','MANAGER','MEMBER'].includes(role)?role:'MEMBER', empresaId:u.empresaId }, select:{ id:true, name:true, email:true, role:true, isActive:true, createdAt:true } }); res.json(user); }
  catch(e:any){ res.status(400).json({error:'Could not create user', detail:e.message}); } });
app.patch('/users/:id', auth(), requireRole('ADMIN'), async (req:any,res)=>{ const u:JwtUser=req.user; const {id}=req.params; const {role,isActive}=req.body||{};
  const cur=await prisma.usuario.findUnique({ where:{ id } }); if(!cur||cur.empresaId!==u.empresaId) return res.status(404).json({error:'User not found'});
  const updated=await prisma.usuario.update({ where:{ id }, data:{ role: role&&['ADMIN','MANAGER','MEMBER'].includes(role)?role:cur.role, isActive: typeof isActive==='boolean'?isActive:cur.isActive }, select:{ id:true, name:true, email:true, role:true, isActive:true } }); res.json(updated); });
app.get('/tasks', auth(), async (req:any,res)=>{ const u:JwtUser=req.user; const {status,from,to}=req.query; const where:any={ empresaId:u.empresaId };
  if(status) where.status=status; if(from||to){ where.createdAt={}; if(from) where.createdAt.gte=new Date(String(from)); if(to) where.createdAt.lte=new Date(String(to)); }
  const tasks=await prisma.tarefa.findMany({ where, orderBy:{ createdAt:'desc' }, select:{ id:true,title:true,description:true,status:true,priority:true,dueAt:true,startedAt:true,completedAt:true,assignee:{select:{id:true,name:true}},createdAt:true,updatedAt:true } }); res.json(tasks); });
app.post('/tasks', auth(), async (req:any,res)=>{ const u:JwtUser=req.user; const {title,description,priority,dueAt,assigneeId}=req.body||{}; if(!title) return res.status(400).json({error:'Title required'});
  if(assigneeId){ const a=await prisma.usuario.findUnique({ where:{ id:assigneeId } }); if(!a||a.empresaId!==u.empresaId) return res.status(400).json({error:'Invalid assignee'}); }
  const task=await prisma.tarefa.create({ data:{ empresaId:u.empresaId, title, description, priority: typeof priority==='number'?priority:3, dueAt: dueAt?new Date(dueAt):null, createdById:u.userId, assigneeId: assigneeId||null } }); res.json(task); });
app.patch('/tasks/:id', auth(), async (req:any,res)=>{ const u:JwtUser=req.user; const {id}=req.params; const t=await prisma.tarefa.findUnique({ where:{ id } }); if(!t||t.empresaId!==u.empresaId) return res.status(404).json({error:'Task not found'});
  const d:any={}; const b=req.body||{}; ['title','description','priority','status'].forEach(k=>{ if(b[k]!==undefined) d[k]=b[k]; });
  if(b.dueAt!==undefined) d.dueAt=b.dueAt?new Date(b.dueAt):null; if(b.startedAt!==undefined) d.startedAt=b.startedAt?new Date(b.startedAt):null; if(b.completedAt!==undefined) d.completedAt=b.completedAt?new Date(b.completedAt):null;
  if(b.assigneeId!==undefined){ if(b.assigneeId===null) d.assigneeId=null; else { const a=await prisma.usuario.findUnique({ where:{ id:b.assigneeId } }); if(!a||a.empresaId!==u.empresaId) return res.status(400).json({error:'Invalid assignee'}); d.assigneeId=b.assigneeId; } }
  const up=await prisma.tarefa.update({ where:{ id }, data:d }); res.json(up); });
app.patch('/tasks/:id/done', auth(), async (req:any,res)=>{ const u:JwtUser=req.user; const {id}=req.params; const t=await prisma.tarefa.findUnique({ where:{ id } }); if(!t||t.empresaId!==u.empresaId) return res.status(404).json({error:'Task not found'});
  const up=await prisma.tarefa.update({ where:{ id }, data:{ status:'DONE', completedAt:new Date() } }); res.json(up); });
app.get('/metrics/completions', auth(), async (req:any,res)=>{ const u:JwtUser=req.user; const {from,to}=req.query; const start=from?new Date(String(from)):new Date(Date.now()-7*24*60*60*1000); const end=to?new Date(String(to)):new Date();
  const tasks=await prisma.tarefa.findMany({ where:{ empresaId:u.empresaId, status:'DONE', completedAt:{ gte:start, lte:end } }, select:{ completedAt:true } }); const map:Record<string,number>={};
  for(const t of tasks){ const d=t.completedAt? t.completedAt.toISOString().slice(0,10):null; if(!d) continue; map[d]=(map[d]||0)+1; } res.json({ from:start, to:end, series:map }); });
app.get('/',(_,res)=>res.send('Tasbo API ok'));
bootstrapMaster().then(()=>{ app.listen(PORT, ()=>console.log('API listening on :'+PORT)); }).catch(e=>{ console.error('Bootstrap error', e); app.listen(PORT, ()=>console.log('API listening on :'+PORT)); });
