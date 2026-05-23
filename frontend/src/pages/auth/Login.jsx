import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { rotaInicial } from '../../routes/ProtectedRoute';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ login: '', senha: '' });
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErro('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.login || !form.senha) {
      setErro('Preencha login e senha.');
      return;
    }
    setCarregando(true);
    try {
      const usuario = await login(form.login, form.senha);
      navigate(rotaInicial(usuario.role), { replace: true });
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao conectar ao servidor.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-md p-8">
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">
            Exército Brasileiro
          </p>
          <h1 className="text-2xl font-bold text-gray-800">TG 02-032</h1>
          <p className="text-sm text-gray-500 mt-1">Rio Claro-SP — Sistema de Gestão</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="login">
              Login
            </label>
            <input
              id="login"
              name="login"
              type="text"
              autoComplete="username"
              autoFocus
              value={form.login}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              placeholder="Seu login"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="senha">
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              autoComplete="current-password"
              value={form.senha}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              placeholder="Sua senha"
            />
          </div>

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
