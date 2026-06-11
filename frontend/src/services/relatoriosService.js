import api from './api';

export const relatoriosService = {
  presenca: (params = {}) =>
    api.get('/relatorios/presenca', { params }).then((r) => r.data),

  evolucao: (params = {}) =>
    api.get('/relatorios/evolucao', { params }).then((r) => r.data),

  efetivo: (params = {}) =>
    api.get('/relatorios/efetivo', { params }).then((r) => r.data),
};
