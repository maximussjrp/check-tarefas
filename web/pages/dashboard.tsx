import { useEffect, useState } from 'react';
import api from '../lib/api';
import Link from 'next/link';
import { useRouter } from 'next/router';

type Task = {
  id: string; title: string; description?: string; status: string;
  priority: number; dueAt?: string; completedAt?: string;
  assignee?: { id: string; name: string };
  createdAt: string;
};

export default function Dashboard() {
  const [me, setMe]: any = useState(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/me');
        setMe(data);
        try {
          const { data: usersData } = await api.get('/users');
          setUsers(usersData);
        } catch {}
        const t = await api.get('/tasks');
        setTasks(t.data);
      } catch {
        router.push('/');
      }
    })();
  }, []);

  async function createTask(e:any) {
    e.preventDefault();
    const { data } = await api.post('/tasks', { title, assigneeId: assigneeId || undefined });
    setTasks([data, ...tasks]);
    setTitle('');
    setAssigneeId('');
  }

  async function markDone(id: string) {
    const { data } = await api.patch(`/tasks/${id}/done`);
    setTasks(tasks.map(t => t.id === id ? { ...t, status: 'DONE', completedAt: new Date().toISOString() } : t));
  }

  const kpis = {
    total: tasks.length,
    doing: tasks.filter(t => t.status === 'DOING').length,
    done7: tasks.filter(t => t.status === 'DONE' && t.completedAt && (Date.now()-new Date(t.completedAt).getTime()) < 7*864e5).length
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          {me && <p className="text-sm text-gray-600">{me.empresa.name} • {me.user.name}</p>}
        </div>
        <nav className="space-x-2">
          <Link href="/users" className="btn">Usuários</Link>
          <button className="btn" onClick={()=>{localStorage.clear(); location.href='/'}}>Sair</button>
        </nav>
      </header>

      <section className="grid grid-cols-3 gap-4">
        <div className="card"><div className="text-sm text-gray-600">Tarefas</div><div className="text-3xl font-bold">{kpis.total}</div></div>
        <div className="card"><div className="text-sm text-gray-600">Em andamento</div><div className="text-3xl font-bold">{kpis.doing}</div></div>
        <div className="card"><div className="text-sm text-gray-600">Concluídas (7d)</div><div className="text-3xl font-bold">{kpis.done7}</div></div>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-3">Nova Tarefa</h2>
        <form onSubmit={createTask} className="flex gap-3">
          <input className="input flex-1" placeholder="Título" value={title} onChange={e=>setTitle(e.target.value)} />
          <select className="input w-60" value={assigneeId} onChange={e=>setAssigneeId(e.target.value)}>
            <option value="">Atribuir a...</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button className="btn">Criar</button>
        </form>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-3">Tarefas</h2>
        <div className="space-y-2">
          {tasks.map(t => (
            <div key={t.id} className="flex items-center justify-between border rounded-xl p-3">
              <div>
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-gray-500">
                  {t.status} • {t.assignee?.name || 'sem responsável'} • {new Date(t.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {t.status !== 'DONE' && <button className="btn" onClick={()=>markDone(t.id)}>Marcar concluída</button>}
              </div>
            </div>
          ))}
          {tasks.length === 0 && <div className="text-sm text-gray-500">Nenhuma tarefa ainda.</div>}
        </div>
      </section>
    </div>
  );
}
