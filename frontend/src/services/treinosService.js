import api from './api';

export const treinosService = {
  listarTipos: () =>
    api.get('/treinos/tipos').then((r) => r.data),

  buscarSessao: (data, tipoTreinoId) =>
    api.get('/treinos/sessao', { params: { data, tipo_treino_id: tipoTreinoId } }).then((r) => r.data),

  salvarLote: (payload) =>
    api.post('/treinos/lote', payload).then((r) => r.data),

  listarSessoes: (params) =>
    api.get('/treinos/historico', { params }).then((r) => r.data),
};
