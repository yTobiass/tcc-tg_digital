const { z } = require('zod');
const model  = require('../models/escalasModel');

// ── Schemas ──────────────────────────────────────────────────────────────────

const membroSchema = z.object({
  soldado_id: z.number().int().positive(),
  funcao:     z.enum(['cabo', 'atirador']),
});

const schemaEscala = z.object({
  tipo:        z.enum(['verde', 'preta', 'vermelha']),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  data_fim:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  observacoes: z.string().max(500).optional().nullable(),
  membros:     z.array(membroSchema).min(1).max(4),
});

const schemaBloqueio = z.object({
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  data_fim:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  motivo:      z.string().max(200).optional().nullable(),
});

function diaSemana(dataISO) {
  // Retorna 0=Dom … 6=Sáb usando meio-dia para evitar problemas de fuso
  return new Date(`${dataISO}T12:00:00`).getDay();
}

function validarRegrasNegocio(tipo, data_inicio, membros) {
  // Verde: apenas atiradores, apenas dias úteis
  if (tipo === 'verde') {
    const ds = diaSemana(data_inicio);
    if (ds === 0 || ds === 6) return 'Guarda verde só ocorre em dias úteis (seg–sex).';
    if (membros.some((m) => m.funcao === 'cabo')) return 'Guarda verde não permite cabo.';
    if (membros.length !== 1) return 'Guarda verde tem exatamente 1 atirador.';
  }
  // Preta/Vermelha: exige 1 cabo + 3 atiradores
  if (tipo === 'preta' || tipo === 'vermelha') {
    const cabos = membros.filter((m) => m.funcao === 'cabo').length;
    const ats   = membros.filter((m) => m.funcao === 'atirador').length;
    if (cabos !== 1) return 'Guarda preta/vermelha exige exatamente 1 cabo.';
    if (ats   !== 3) return 'Guarda preta/vermelha exige exatamente 3 atiradores.';
  }
  return null;
}

// ── Fila ─────────────────────────────────────────────────────────────────────

function fila(req, res) {
  const { tipo } = req.params;
  if (!['verde', 'preta', 'vermelha'].includes(tipo))
    return res.status(400).json({ erro: 'Tipo inválido.' });
  return res.json(model.listarFila(tipo));
}

function reordenar(req, res) {
  const { tipo } = req.params;
  const { soldado_id, acao } = req.body;
  if (!['verde', 'preta', 'vermelha'].includes(tipo))
    return res.status(400).json({ erro: 'Tipo inválido.' });
  if (!soldado_id || !['inicio', 'fim'].includes(acao))
    return res.status(400).json({ erro: 'Forneça soldado_id e acao (inicio | fim).' });
  return res.json(model.reordenarFila(tipo, soldado_id, acao));
}

function sugestao(req, res) {
  const { tipo, data_inicio } = req.query;
  if (!tipo || !data_inicio) return res.status(400).json({ erro: 'tipo e data_inicio obrigatórios.' });
  if (!['verde', 'preta', 'vermelha'].includes(tipo))
    return res.status(400).json({ erro: 'Tipo inválido.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data_inicio))
    return res.status(400).json({ erro: 'data_inicio inválida.' });

  if (tipo === 'verde') {
    const ds = diaSemana(data_inicio);
    if (ds === 0 || ds === 6) return res.status(400).json({ erro: 'Verde só ocorre em dias úteis.' });
  }

  const bloqueado      = model.estaBloequeado(data_inicio);
  const sugestoes      = model.sugerirMembros(tipo);
  const todosSoldados  = model.listarSoldadosElegiveis(tipo);

  return res.json({ ...sugestoes, bloqueado, todosSoldados });
}

// ── Escalas ──────────────────────────────────────────────────────────────────

function listar(req, res) {
  const { tipo, mes, ano, status } = req.query;
  return res.json(model.listarEscalas({
    tipo,
    status,
    mes: mes ? Number(mes) : undefined,
    ano: ano ? Number(ano) : undefined,
  }));
}

function buscar(req, res) {
  const e = model.buscarEscala(Number(req.params.id));
  if (!e) return res.status(404).json({ erro: 'Escala não encontrada.' });
  return res.json(e);
}

function criar(req, res) {
  const result = schemaEscala.safeParse(req.body);
  if (!result.success) return res.status(400).json({ erro: result.error.issues });

  const { tipo, data_inicio, membros } = result.data;
  const erroRegra = validarRegrasNegocio(tipo, data_inicio, membros);
  if (erroRegra) return res.status(422).json({ erro: erroRegra });

  if (model.estaBloequeado(data_inicio))
    return res.status(422).json({ erro: 'Data bloqueada pelo comandante.' });

  try {
    const escala = model.criarEscala({ ...result.data, criado_por: req.user?.id });
    return res.status(201).json(escala);
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ erro: 'Soldado já escalado neste período.' });
    return res.status(500).json({ erro: e.message });
  }
}

function atualizar(req, res) {
  const id = Number(req.params.id);
  if (!model.buscarEscala(id)) return res.status(404).json({ erro: 'Escala não encontrada.' });

  const schema = schemaEscala.partial({ tipo: true, membros: true });
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ erro: result.error.issues });

  return res.json(model.atualizarEscala(id, result.data));
}

function alterarStatus(req, res) {
  const id = Number(req.params.id);
  const status = req.body.status;
  if (!['agendada', 'em_andamento', 'concluida', 'cancelada'].includes(status))
    return res.status(400).json({ erro: 'Status inválido.' });
  if (!model.buscarEscala(id)) return res.status(404).json({ erro: 'Escala não encontrada.' });
  return res.json(model.alterarStatus(id, status));
}

function remover(req, res) {
  const id = Number(req.params.id);
  if (!model.buscarEscala(id)) return res.status(404).json({ erro: 'Escala não encontrada.' });
  model.removerEscala(id);
  return res.status(204).end();
}

function historicoPorSoldado(req, res) {
  return res.json(model.historicoPorSoldado(Number(req.params.soldadoId)));
}

function calendario(req, res) {
  const { ano, mes } = req.query;
  if (!ano || !mes) return res.status(400).json({ erro: 'ano e mes obrigatórios.' });
  return res.json(model.calendario(Number(ano), Number(mes)));
}

// ── Bloqueios ────────────────────────────────────────────────────────────────

function listarBloqueios(req, res) {
  return res.json(model.listarBloqueios());
}

function criarBloqueio(req, res) {
  const result = schemaBloqueio.safeParse(req.body);
  if (!result.success) return res.status(400).json({ erro: result.error.issues });
  return res.status(201).json(model.criarBloqueio({ ...result.data, criado_por: req.user?.id }));
}

function removerBloqueio(req, res) {
  model.removerBloqueio(Number(req.params.id));
  return res.status(204).end();
}

module.exports = {
  fila, reordenar, sugestao,
  listar, buscar, criar, atualizar, alterarStatus, remover,
  historicoPorSoldado, calendario,
  listarBloqueios, criarBloqueio, removerBloqueio,
};
