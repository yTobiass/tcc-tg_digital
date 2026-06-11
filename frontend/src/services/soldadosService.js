import api from './api';

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const soldadosService = {
  listar: (params) => api.get('/soldados', { params }).then((r) => r.data),
  buscarPorId: (id) => api.get(`/soldados/${id}`).then((r) => r.data),
  criar: (dados) => api.post('/soldados', dados).then((r) => r.data),
  atualizar: (id, dados) => api.put(`/soldados/${id}`, dados).then((r) => r.data),

  importar: (arquivo, dataIncorporacao) => {
    const form = new FormData();
    form.append('arquivo', arquivo);
    if (dataIncorporacao) form.append('data_incorporacao', dataIncorporacao);
    return api.post('/soldados/importar', form).then((r) => r.data);
  },

  baixarModelo: async () => {
    const r = await api.get('/soldados/modelo-planilha', { responseType: 'blob' });
    triggerDownload(r.data, 'modelo_soldados.xlsx');
  },
};
