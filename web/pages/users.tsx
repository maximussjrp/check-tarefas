import { useEffect, useState } from 'react';
import api from '../lib/api';
import Link from 'next/link';
import { useRouter } from 'next/router';

type User = { id: string; name: string; email: string; role: string; isActive: boolean; createdAt?: string };

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'MEMBER' });
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/users');
        setUsers(data);
      } catch {
        router.push('/');
      }
    })();
  }, []);

  async function addUser(e:any) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/users', form);
      setUsers([data, ...users]);
      setForm({ name: '', email: '', password: '', role: 'MEMBER' });
    } catch (err:any) {
      setError(err?.response?.data?.error || 'Erro ao criar usuário');
    }
  }

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <nav className="space-x-2">
          <Link href="/dashboard" className="btn">Dashboard</Link>
        </nav>
      </header>

      <section className="card">
        <h2 className="font-semibold mb-3">Adicionar Usuário</h2>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <form onSubmit={addUser} className="grid grid-cols-4 gap-3">
          <input className="input" placeholder="Nome" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
          <input className="input" placeholder="E-mail" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
          <input className="input" placeholder="Senha" type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
          <select className="input" value={form.role} onChange={e=>setForm({...form, role:e.target.value})}>
            <option value="MEMBER">MEMBER</option>
            <option value="MANAGER">MANAGER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <div className="col-span-4">
            <button className="btn">Criar</button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-3">Equipe</h2>
        <div className="divide-y rounded-xl border">
          {users.map(u => (
            <div key={u.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{u.name} <span className="badge bg-gray-100 ml-2">{u.role}</span></div>
                <div className="text-xs text-gray-500">{u.email}</div>
              </div>
              <div className="text-xs">{u.isActive ? 'Ativo' : 'Inativo'}</div>
            </div>
          ))}
          {users.length === 0 && <div className="p-3 text-sm text-gray-500">Sem usuários ainda.</div>}
        </div>
      </section>
    </div>
  );
}
