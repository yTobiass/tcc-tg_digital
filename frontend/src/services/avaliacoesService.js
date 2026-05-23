import api from './api';

export const avaliacoesService = {
  listar:        (params = {}) => api.get('/avaliacoes', { params }).then((r) => r.data),
  criar:         (dados)       => api.post('/avaliacoes', dados).then((r) => r.data),
  atualizar:     (id, dados)   => api.put(`/avaliacoes/${id}`, dados).then((r) => r.data),
  remover:       (id)          => api.delete(`/avaliacoes/${id}`),
  evolucao:      (soldadoId)   => api.get(`/avaliacoes/evolucao/${soldadoId}`).then((r) => r.data),
  minhaEvolucao: ()            => api.get('/avaliacoes/minha-evolucao').then((r) => r.data),
};
