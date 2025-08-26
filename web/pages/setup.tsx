import { useState } from 'react';
import api from '../lib/api';
import { useRouter } from 'next/router';

export default function Setup() {
  const [empresaName, setEmpresaName] = useState('Empresa Demo');
  const [empresaSlug, setEmpresaSlug] = useState('demo');
  const [adminName, setAdminName] = useState('Admin Demo');
  const [adminEmail, setAdminEmail] = useState('admin@demo.com');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleCreate(e:any) {
    e.preventDefault();
    setError('');
    try {
      console.log('Enviando dados:', { empresaName, empresaSlug, adminName, adminEmail, adminPassword });
      const { data } = await api.post('/auth/register-company', { empresaName, empresaSlug, adminName, adminEmail, adminPassword });
      console.log('Resposta recebida:', data);
      localStorage.setItem('token', data.token);
      localStorage.setItem('empresa', JSON.stringify(data.empresa));
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err:any) {
      console.error('Erro completo:', err);
      console.error('Resposta do erro:', err?.response);
      setError(err?.response?.data?.error || err?.message || 'Erro ao criar empresa');
    }
  }

  return (
    <div className="min-h-screen grid place-items-center">
      <form onSubmit={handleCreate} className="card w-full max-w-lg space-y-4">
        <h1 className="text-2xl font-bold">Criar Empresa</h1>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Nome da Empresa</label>
            <input className="input" value={empresaName} onChange={e=>setEmpresaName(e.target.value)} />
          </div>
          <div>
            <label className="label">Slug</label>
            <input className="input" value={empresaSlug} onChange={e=>setEmpresaSlug(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Seu Nome</label>
            <input className="input" value={adminName} onChange={e=>setAdminName(e.target.value)} />
          </div>
          <div>
            <label className="label">Seu E-mail</label>
            <input className="input" value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Senha</label>
          <input className="input" type="password" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} />
        </div>
        <button className="btn w-full">Criar</button>
      </form>
    </div>
  );
}
