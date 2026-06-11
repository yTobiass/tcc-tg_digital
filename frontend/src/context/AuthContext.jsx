import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      const salvo = localStorage.getItem('usuario');
      return salvo ? JSON.parse(salvo) : null;
    } catch {
      // Dado corrompido em localStorage não pode derrubar a aplicação inteira.
      localStorage.removeItem('usuario');
      return null;
    }
  });
  const [carregando, setCarregando] = useState(true);

  // Valida o token salvo ao iniciar a aplicação
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setCarregando(false);
      return;
    }
    api
      .get('/auth/me')
      .then(({ data }) => setUsuario(data.usuario))
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        setUsuario(null);
      })
      .finally(() => setCarregando(false));
  }, []);

  const login = useCallback(async (loginInput, senha) => {
    const { data } = await api.post('/auth/login', { login: loginInput, senha });
    // TEMP DEBUG (remover após depurar): o que o backend devolveu no login.
    console.log('[DEBUG login] resposta recebida:', {
      temToken: !!data.token,
      usuario: data.usuario,
    });
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    return data.usuario;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }, []);

  const trocarSenha = useCallback(async (senhaAtual, novaSenha) => {
    const { data } = await api.post('/auth/trocar-senha', {
      senha_atual: senhaAtual,
      nova_senha: novaSenha,
    });
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    return data.usuario;
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, logout, trocarSenha }}>
      {children}
    </AuthContext.Provider>
  );
}
