import api from './api';

export const dashboardService = {
  buscar: () => api.get('/dashboard').then((r) => r.data),
};
