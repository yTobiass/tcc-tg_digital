import api from './api';

export const relatoriosService = {
  presenca: (params = {}) =>
    api.get('/relatorios/presenca', { params }).then((r) => r.data),

  evolucao: (params = {}) =>
    api.get('/relatorios/evolucao', { params }).then((r) => r.data),

  efetivo: () =>
    api.get('/relatorios/efetivo').then((r) => r.data),
};
