const { z } = require('zod');
const model = require('../models/treinoModel');

function listarTipos(_req, res) {
  res.json(model.listarTipos());
}

function buscarSessao(req, res) {
  const { data, tipo_treino_id } = req.query;
  if (!data || !tipo_treino_id) {
    return res.status(400).json({ error: 'Parâmetros data e tipo_treino_id são obrigatórios.' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return res.status(400).json({ error: 'Formato de data inválido. Use AAAA-MM-DD.' });
  }
  res.json(model.buscarSessao(data, Number(tipo_treino_id)));
}

const schemaLote = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use AAAA-MM-DD)'),
  tipo_treino_id: z.number().int().positive('tipo_treino_id inválido'),
  registros: z.array(
    z.object({
      soldado_id: z.number().int().positive(),
      presente:   z.boolean(),
      resultado:  z.union([z.number(), z.string(), z.null()]).optional(),
      observacao: z.string().nullable().optional(),
    })
  ).min(1, 'Envie pelo menos um registro'),
});

function salvarLote(req, res) {
  const resultado = schemaLote.safeParse(req.body);
  if (!resultado.success) {
    return res.status(400).json({ error: resultado.error.issues[0].message });
  }
  const { data, tipo_treino_id, registros } = resultado.data;
  const salvos = model.salvarLote({
    data,
    tipoTreinoId: tipo_treino_id,
    registros,
    registradoPor: req.user.id,
  });
  res.json({ salvos });
}

function listarSessoes(req, res) {
  const { tipo_treino_id, data_inicio, data_fim } = req.query;
  res.json(model.listarSessoes({
    tipoTreinoId: tipo_treino_id ? Number(tipo_treino_id) : null,
    dataInicio: data_inicio || null,
    dataFim: data_fim || null,
  }));
}

function dashboard(_req, res) {
  res.json(model.dadosDashboard());
}

module.exports = { listarTipos, buscarSessao, salvarLote, listarSessoes, dashboard };
