import { useState } from 'react';
import { useRouter } from 'next/router';
import { api } from '../lib/api';

export default function Setup() {
  const [empresaNome, setEmpresaNome] = useState('');
  const [adminNome, setAdminNome] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminSenha, setAdminSenha] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  // Generate slug preview
  const generateSlug = (nome) => {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens duplicados
      .replace(/^-|-$/g, ''); // Remove hífens no início e fim
  };

  const slugPreview = generateSlug(empresaNome);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/register-company', {
        empresaNome,
        adminNome,
        adminEmail,
        adminSenha
      });
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('empresa', JSON.stringify(data.empresa));
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar empresa');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Criar Nova Empresa</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Já tem uma conta?{' '}
            <a href="/" className="font-medium text-indigo-600 hover:text-indigo-500">
              Fazer login
            </a>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleCreate}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="text"
                placeholder="Nome da Empresa"
                value={empresaNome}
                onChange={(e) => setEmpresaNome(e.target.value)}
                className="rounded-t-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
              {slugPreview && (
                <p className="mt-1 text-xs text-green-600">
                  ✓ Slug da empresa: <strong>{slugPreview}</strong> (use este código para fazer login)
                </p>
              )}
            </div>
            <div>
              <input
                type="text"
                placeholder="Nome do Administrador"
                value={adminNome}
                onChange={(e) => setAdminNome(e.target.value)}
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <input
                type="email"
                placeholder="Email do Administrador"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Senha do Administrador"
                value={adminSenha}
                onChange={(e) => setAdminSenha(e.target.value)}
                className="rounded-b-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
          </div>

          {error && <div className="text-red-500 text-sm text-center">{error}</div>}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Criar Empresa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
