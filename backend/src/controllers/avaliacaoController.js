const { z } = require('zod');
const model = require('../models/avaliacaoModel');

const schema = z.object({
  soldado_id:  z.number().int().positive(),
  data:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  corrida:     z.number().int().min(0),
  flexao:      z.number().int().min(0),
  abdominal:   z.number().int().min(0),
  barra_resultado: z.number().int().min(0),
  observacoes: z.string().max(500).optional().nullable(),
});

function listar(req, res) {
  const soldadoId = req.query.soldadoId ? Number(req.query.soldadoId) : undefined;
  const limit     = req.query.limit     ? Number(req.query.limit)     : 50;
  return res.json(model.listar({ soldadoId, limit }));
}

function criar(req, res) {
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.issues });
  try {
    const avaliacao = model.criar(result.data);
    return res.status(201).json(avaliacao);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

function atualizar(req, res) {
  const id = Number(req.params.id);
  const parcial = schema.partial({ soldado_id: true }).safeParse(req.body);
  if (!parcial.success) return res.status(400).json({ error: parcial.error.issues });
  const existente = model.buscarPorId(id);
  if (!existente) return res.status(404).json({ error: 'Avaliação não encontrada.' });
  return res.json(model.atualizar(id, parcial.data));
}

function remover(req, res) {
  const id = Number(req.params.id);
  if (!model.buscarPorId(id)) return res.status(404).json({ error: 'Avaliação não encontrada.' });
  model.remover(id);
  return res.status(204).end();
}

function evolucao(req, res) {
  const soldadoId = Number(req.params.soldadoId);
  return res.json(model.evolucao(soldadoId));
}

function minhaEvolucao(req, res) {
  const soldadoId = req.user.soldado_id;
  if (!soldadoId) return res.status(403).json({ error: 'Usuário não vinculado a um soldado.' });
  return res.json(model.evolucao(soldadoId));
}

module.exports = { listar, criar, atualizar, remover, evolucao, minhaEvolucao };
