import { useState } from 'react';
import api from '../lib/api';
import { useRouter } from 'next/router';

export default function Login() {
  const [empresaSlug, setEmpresaSlug] = useState('demo');
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleLogin(e: any) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/login', { empresaSlug, email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('empresa', JSON.stringify(data.empresa));
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err:any) {
      setError(err?.response?.data?.error || 'Erro ao entrar');
    }
  }

  return (
    <div className="min-h-screen grid place-items-center">
      <form onSubmit={handleLogin} className="card w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Entrar</h1>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div>
          <label className="label">Slug da Empresa</label>
          <input className="input" value={empresaSlug} onChange={e=>setEmpresaSlug(e.target.value)} placeholder="minha-empresa" />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input className="input" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Senha</label>
          <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        <button className="btn w-full">Entrar</button>
        <p className="text-xs text-gray-500">Ainda não tem empresa? <a href="/setup" className="underline">Criar agora</a></p>
      </form>
    </div>
  );
}
