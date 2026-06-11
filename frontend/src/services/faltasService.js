import api from './api';

export const faltasService = {
  // Histórico geral de faltas (filtros: busca, de, ate, tipo).
  historico: (params) => api.get('/faltas', { params }).then((r) => r.data),

  // soldado_ids (e tipo) com falta numa data — para pré-marcar checkboxes.
  doDia: (data) => api.get('/faltas/dia', { params: { data } }).then((r) => r.data),

  // Registrar várias faltas de uma vez. faltas: [{ soldado_id, tipo, escala_id? }].
  lote: (data, faltas) => api.post('/faltas/lote', { data, faltas }).then((r) => r.data),

  // Registrar uma falta individual.
  individual: (soldadoId, payload) => api.post(`/faltas/${soldadoId}`, payload).then((r) => r.data),

  // Estornar uma falta (motivo obrigatório).
  estornar: (registroId, motivo) =>
    api.delete(`/faltas/${registroId}/estorno`, { data: { motivo } }).then((r) => r.data),
};
