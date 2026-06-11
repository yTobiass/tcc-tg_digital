import api from './api';

export const turmasService = {
  // Todas as turmas (ativa + encerradas).
  listar: () => api.get('/turmas').then((r) => r.data),
  // Turma ativa atual.
  ativa: () => api.get('/turmas/ativa').then((r) => r.data),
  // Detalhes de uma turma.
  buscar: (id) => api.get(`/turmas/${id}`).then((r) => r.data),
  // Histórico de uma turma.
  soldados: (id) => api.get(`/turmas/${id}/soldados`).then((r) => r.data),
  escalas: (id) => api.get(`/turmas/${id}/escalas`).then((r) => r.data),
  faltas: (id) => api.get(`/turmas/${id}/faltas`).then((r) => r.data),
  ocorrencias: (id) => api.get(`/turmas/${id}/ocorrencias`).then((r) => r.data),
  // Encerrar a turma ativa (apenas comandante).
  encerrar: () => api.post('/turmas/encerrar').then((r) => r.data),
};
