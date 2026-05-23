const { z } = require('zod');
const model  = require('../models/diarioModel');

const postoSchema = z.object({
  quarto: z.string(),
  numero: z.string().max(20),
  nome:   z.string().max(100),
});

const schema = z.object({
  data_servico:              z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  parada_diaria_status:      z.enum(['Com Alteração', 'Sem Alteração']),
  parada_diaria_descricao:   z.string().max(1000).optional().nullable(),
  recebimento_monitor_numero:z.string().max(20).optional().nullable(),
  recebimento_monitor_nome:  z.string().max(100).optional().nullable(),
  recebimento_status:        z.enum(['Com Alteração', 'Sem Alteração']),
  escala_id:                 z.number().int().positive().optional().nullable(),
  cabo_ra:                   z.string().max(20).optional().nullable(),
  cabo_nome:                 z.string().max(150).optional().nullable(),
  atiradores:                z.array(postoSchema).max(3).optional().nullable(),
  postos_sentinela:          z.array(postoSchema).max(3).optional().nullable(),
  material_carga_status:     z.enum(['Com Alteração', 'Sem Alteração']),
  material_carga_descricao:  z.string().max(1000).optional().nullable(),
  instalacoes_status:        z.enum(['Com Alteração', 'Sem Alteração']),
  instalacoes_descricao:     z.string().max(1000).optional().nullable(),
  iluminacao_status:         z.enum(['Com Alteração', 'Sem Alteração']),
  iluminacao_descricao:      z.string().max(1000).optional().nullable(),
  ocorrencias_texto:         z.string().max(2000).optional().nullable(),
  passagem_monitor_numero:   z.string().max(20).optional().nullable(),
  passagem_monitor_nome:     z.string().max(100).optional().nullable(),
});

function proximoDia(dataISO) {
  const [y, m, d] = dataISO.split('-').map(Number);
  const prox = new Date(y, m - 1, d + 1);
  return `${prox.getFullYear()}-${String(prox.getMonth() + 1).padStart(2, '0')}-${String(prox.getDate()).padStart(2, '0')}`;
}

function listar(req, res) {
  const limit  = Math.min(Number(req.query.limit)  || 50, 200);
  const offset = Number(req.query.offset) || 0;
  return res.json({ dados: model.listar({ limit, offset }), total: model.total() });
}

function buscarPorData(req, res) {
  const { data } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return res.status(400).json({ erro: 'Data inválida.' });
  const diario = model.buscarPorData(data);
  if (!diario) return res.status(404).json({ erro: 'Diário não encontrado.' });
  return res.json(diario);
}

function criar(req, res) {
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ erro: result.error.issues });

  const existente = model.buscarPorData(result.data.data_servico);
  if (existente) return res.status(409).json({ erro: 'Já existe um diário para esta data.', id: existente.id });

  const data_para = proximoDia(result.data.data_servico);
  const diario = model.criar({ ...result.data, data_para }, req.user?.id);
  return res.status(201).json(diario);
}

function atualizar(req, res) {
  const id = Number(req.params.id);
  const existente = model.buscarPorId(id);
  if (!existente) return res.status(404).json({ erro: 'Diário não encontrado.' });
  if (existente.pdf_gerado) return res.status(403).json({ erro: 'Diário bloqueado — PDF já gerado.' });

  const schemaUpdate = schema.partial({ data_servico: true });
  const result = schemaUpdate.safeParse(req.body);
  if (!result.success) return res.status(400).json({ erro: result.error.issues });

  return res.json(model.atualizar(id, result.data));
}

function marcarPdf(req, res) {
  const id = Number(req.params.id);
  const existente = model.buscarPorId(id);
  if (!existente) return res.status(404).json({ erro: 'Diário não encontrado.' });
  return res.json(model.marcarPdfGerado(id));
}

function contexto(req, res) {
  const { data } = req.query;
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return res.status(400).json({ erro: 'Parâmetro data inválido.' });
  }
  return res.json(model.contexto(data));
}

module.exports = { listar, buscarPorData, criar, atualizar, marcarPdf, contexto };
