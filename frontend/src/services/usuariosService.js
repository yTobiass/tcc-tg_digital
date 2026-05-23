import api from './api';

export const usuariosService = {
  listar:   ()          => api.get('/usuarios').then((r) => r.data),
  buscar:   (id)        => api.get(`/usuarios/${id}`).then((r) => r.data),
  criar:    (dados)     => api.post('/usuarios', dados).then((r) => r.data),
  atualizar:(id, dados) => api.put(`/usuarios/${id}`, dados).then((r) => r.data),
  remover:  (id)        => api.delete(`/usuarios/${id}`).then((r) => r.data),
  reativar: (id)        => api.patch(`/usuarios/${id}/reativar`).then((r) => r.data),
};
