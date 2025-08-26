import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [user, setUser] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedEmpresa = localStorage.getItem('empresa');

    if (!token || !storedUser || !storedEmpresa) {
      router.push('/');
      return;
    }

    setUser(JSON.parse(storedUser));
    setEmpresa(JSON.parse(storedEmpresa));
    setLoading(false);

    // Aqui você pode carregar as tarefas do usuário
    // fetch('/api/tasks').then(...)
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('empresa');
    router.push('/');
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Dashboard - {empresa?.name}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Olá, {user?.name}</span>
              <Link href="/users" className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-sm font-medium">
                Usuários
              </Link>
              <button 
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Bem-vindo ao Sistema!</h2>
              <p className="text-gray-600 mb-8">Sistema de gerenciamento de usuários e equipes funcionando!</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Usuários</h3>
                  <p className="text-gray-600">Gerencie usuários da empresa</p>
                  <Link href="/users" className="mt-4 inline-block bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                    Ver Usuários
                  </Link>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Equipes</h3>
                  <p className="text-gray-600">Organize equipes de trabalho</p>
                  <button className="mt-4 bg-gray-400 text-white px-4 py-2 rounded cursor-not-allowed">
                    Em breve
                  </button>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Tarefas</h3>
                  <p className="text-gray-600">Acompanhe tarefas e projetos</p>
                  <button className="mt-4 bg-gray-400 text-white px-4 py-2 rounded cursor-not-allowed">
                    Em breve
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
