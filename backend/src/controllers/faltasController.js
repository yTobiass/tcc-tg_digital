const { z } = require('zod');
const pontos = require('../models/pontosModel');
const soldados = require('../models/soldadoModel');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/faltas — histórico geral de faltas (filtros: busca, de, ate, tipo).
function historico(req, res) {
  const { busca, de, ate, tipo } = req.query;
  return res.json(pontos.historicoFaltas({ busca, de, ate, tipo }));
}

// GET /api/faltas/dia?data=YYYY-MM-DD — soldado_ids com falta na data.
function doDia(req, res) {
  const data = req.query.data;
  if (!data || !ISO_DATE.test(data)) return res.status(400).json({ error: 'Parâmetro data (YYYY-MM-DD) é obrigatório.' });
  return res.json(pontos.faltasDoDia(data));
}

const itemLote = z.object({
  soldado_id: z.number().int().positive(),
  tipo: z.enum(['falta', 'falta_guarda']),
  escala_id: z.number().int().positive().optional().nullable(),
});

const schemaLote = z.object({
  data: z.string().regex(ISO_DATE),
  faltas: z.array(itemLote).min(1, 'Informe ao menos uma falta.'),
});

// POST /api/faltas/lote — registra várias faltas de uma vez.
function lote(req, res) {
  const r = schemaLote.safeParse(req.body);
  if (!r.success) return res.status(400).json({ error: r.error.issues[0].message });

  const resumo = pontos.registrarFaltaLote(r.data.data, r.data.faltas, req.user?.id);
  return res.status(201).json(resumo);
}

const schemaIndividual = z.object({
  data: z.string().regex(ISO_DATE),
  tipo: z.enum(['falta', 'falta_guarda']),
  escala_id: z.number().int().positive().optional().nullable(),
});

// POST /api/faltas/:soldado_id — registra uma falta individual.
function individual(req, res) {
  const soldadoId = Number(req.params.soldado_id);
  if (!soldados.buscarPorId(soldadoId)) return res.status(404).json({ error: 'Soldado não encontrado.' });

  const r = schemaIndividual.safeParse(req.body);
  if (!r.success) return res.status(400).json({ error: r.error.issues[0].message });

  const resultado = pontos.registrarFaltaIndividual(
    soldadoId, r.data.tipo, r.data.data, r.data.escala_id ?? null, req.user?.id
  );
  if (!resultado) return res.status(404).json({ error: 'Soldado não encontrado.' });
  return res.status(201).json(resultado);
}

const schemaEstorno = z.object({ motivo: z.string().min(1, 'O motivo do estorno é obrigatório.') });

// DELETE /api/faltas/:registro_id/estorno — estorna uma falta.
function estorno(req, res) {
  const registroId = Number(req.params.registro_id);
  const r = schemaEstorno.safeParse(req.body);
  if (!r.success) return res.status(400).json({ error: r.error.issues[0].message });

  const resultado = pontos.estornarPonto(registroId, r.data.motivo, req.user?.id);
  if (resultado.erro) return res.status(404).json({ error: resultado.erro });
  return res.json(resultado);
}

module.exports = { historico, doDia, lote, individual, estorno };
