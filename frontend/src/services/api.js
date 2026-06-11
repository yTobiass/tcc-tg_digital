import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Só tratamos como "sessão expirada" um 401 vindo de uma rota JÁ autenticada.
    // 401 em /auth/login (senha errada) e /auth/me (validação na inicialização)
    // são esperados e devem ser tratados por quem chamou — NÃO podemos forçar um
    // reload aqui, senão a mensagem de erro do login some e a tela "pisca".
    const url = err.config?.url || '';
    const ehRotaAuth = url.includes('/auth/login') || url.includes('/auth/me');

    if (err.response?.status === 401 && !ehRotaAuth) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      // Evita loop de reload caso já estejamos na tela de login.
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
