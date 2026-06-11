import api from './api';

export const pontosService = {
  // Histórico completo + totais do soldado.
  historico: (soldadoId) => api.get(`/soldados/${soldadoId}/pontos`).then((r) => r.data),

  // Aplicar FATD (sargento/comandante).
  aplicarFATD: (soldadoId, observacao) =>
    api.post(`/soldados/${soldadoId}/fatd`, { observacao }).then((r) => r.data),

  // Ajuste manual do total de pontos (sargento/comandante).
  ajustar: (soldadoId, novo_total, motivo) =>
    api.patch(`/soldados/${soldadoId}/pontos/ajuste`, { novo_total, motivo }).then((r) => r.data),

  // Estornar um registro de pontos (sargento/comandante).
  estornar: (soldadoId, registroId, motivo) =>
    api.delete(`/soldados/${soldadoId}/pontos/${registroId}`, { data: { motivo } }).then((r) => r.data),
};
