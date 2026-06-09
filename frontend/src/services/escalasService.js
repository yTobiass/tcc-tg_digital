import api from './api';

export const escalasService = {
  listar:    (params = {}) => api.get('/escalas', { params }).then((r) => r.data),
  buscar:    (id)           => api.get(`/escalas/${id}`).then((r) => r.data),
  criar:     (dados)        => api.post('/escalas', dados).then((r) => r.data),
  atualizar: (id, dados)    => api.put(`/escalas/${id}`, dados).then((r) => r.data),
  status:    (id, status)   => api.patch(`/escalas/${id}/status`, { status }).then((r) => r.data),
  remover:   (id)           => api.delete(`/escalas/${id}`),

  // Troca manual de um membro de uma escala já confirmada.
  trocarMembro: (id, soldado_removido_id, soldado_novo_id, motivo) =>
    api.put(`/escalas/${id}/membro`, { soldado_removido_id, soldado_novo_id, motivo }).then((r) => r.data),

  sugestao:  (tipo, data_inicio) =>
    api.get('/escalas/sugestao', { params: { tipo, data_inicio } }).then((r) => r.data),

  // tipo da fila: 'cabos' | 'atiradores'
  fila:            (tipo) => api.get(`/escalas/fila/${tipo}`).then((r) => r.data),
  inicializarFila: ()     => api.post('/escalas/fila/inicializar').then((r) => r.data),
  reordenar: (tipo, soldado_id, acao) =>
    api.post(`/escalas/fila/${tipo}/reordenar`, { soldado_id, acao }).then((r) => r.data),

  calendario:(ano, mes)     =>
    api.get('/escalas/calendario', { params: { ano, mes } }).then((r) => r.data),

  historicoSoldado: (soldadoId) =>
    api.get(`/escalas/soldado/${soldadoId}`).then((r) => r.data),

  bloqueios:       ()            => api.get('/escalas/bloqueios').then((r) => r.data),
  criarBloqueio:   (dados)       => api.post('/escalas/bloqueios', dados).then((r) => r.data),
  removerBloqueio: (id)          => api.delete(`/escalas/bloqueios/${id}`),
};
