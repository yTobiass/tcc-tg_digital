const { z } = require('zod');
const pontos = require('../models/pontosModel');
const soldados = require('../models/soldadoModel');

// GET /api/soldados/:id/pontos — histórico completo (soldado vê só o próprio).
function historico(req, res) {
  const id = Number(req.params.id);
  if (req.user.role === 'soldado' && id !== req.user.soldado_id) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  const soldado = soldados.buscarPorId(id);
  if (!soldado) return res.status(404).json({ error: 'Soldado não encontrado.' });

  res.json({
    soldado: {
      id: soldado.id,
      nome_completo: soldado.nome_completo,
      status: soldado.status,
      total_pontos: soldado.total_pontos,
      total_fatd: soldado.total_fatd,
      total_faltas: soldado.total_faltas,
    },
    registros: pontos.historico(id),
  });
}

const schemaFATD = z.object({
  observacao: z.string().min(1, 'A observação é obrigatória para aplicar um FATD.'),
});

// POST /api/soldados/:id/fatd — aplicar FATD (sargento/comandante).
function aplicarFATD(req, res) {
  const id = Number(req.params.id);
  if (!soldados.buscarPorId(id)) return res.status(404).json({ error: 'Soldado não encontrado.' });

  const r = schemaFATD.safeParse(req.body);
  if (!r.success) return res.status(400).json({ error: r.error.issues[0].message });

  const resultado = pontos.registrarFATD(id, r.data.observacao, req.user?.id);
  if (!resultado) return res.status(404).json({ error: 'Soldado não encontrado.' });

  res.status(201).json({ ...resultado, soldado: soldados.buscarPorId(id) });
}

const schemaAjuste = z.object({
  novo_total: z.number().int().min(0, 'O total de pontos não pode ser negativo.'),
  motivo: z.string().min(1, 'O motivo do ajuste é obrigatório.'),
});

// PATCH /api/soldados/:id/pontos/ajuste — ajuste manual (sargento/comandante).
function ajustar(req, res) {
  const id = Number(req.params.id);
  if (!soldados.buscarPorId(id)) return res.status(404).json({ error: 'Soldado não encontrado.' });

  const r = schemaAjuste.safeParse(req.body);
  if (!r.success) return res.status(400).json({ error: r.error.issues[0].message });

  const soldado = pontos.ajustarPontos(id, r.data.novo_total, r.data.motivo, req.user?.id);
  res.json({ soldado, registros: pontos.historico(id) });
}

// DELETE /api/soldados/:id/pontos/:registroId — estornar (sargento/comandante).
function estornar(req, res) {
  const id = Number(req.params.id);
  const registroId = Number(req.params.registroId);
  if (!soldados.buscarPorId(id)) return res.status(404).json({ error: 'Soldado não encontrado.' });

  const motivo = (req.body && req.body.motivo) || 'Estorno de registro de pontos';
  const resultado = pontos.estornarPonto(registroId, motivo, req.user?.id);
  if (resultado.erro) return res.status(404).json({ error: resultado.erro });

  res.json({ soldado: soldados.buscarPorId(id), registros: pontos.historico(id) });
}

module.exports = { historico, aplicarFATD, ajustar, estornar };
