import api from './api';

export const diarioService = {
  listar:       (params = {}) => api.get('/diario', { params }).then((r) => r.data),
  buscarPorData:(data)        => api.get(`/diario/${data}`).then((r) => r.data),
  contexto:     (data)        => api.get('/diario/contexto', { params: { data } }).then((r) => r.data),
  criar:        (dados)       => api.post('/diario', dados).then((r) => r.data),
  atualizar:    (id, dados)   => api.put(`/diario/${id}`, dados).then((r) => r.data),
  marcarPdf:    (id)          => api.patch(`/diario/${id}/pdf`).then((r) => r.data),
};
