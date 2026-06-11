const { z } = require('zod');
const model  = require('../models/escalasModel');
const geracao = require('../services/geracaoEscalas');

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

const schemaMembro = z.object({
  soldado_removido_id: z.number().int().positive(),
  soldado_novo_id:     z.number().int().positive(),
  motivo:              z.string().max(200).optional().nullable(),
});

const FILAS = ['cabos', 'atiradores'];

function diaSemana(dataISO) {
  // Retorna 0=Dom … 6=Sáb usando meio-dia para evitar problemas de fuso
  return new Date(`${dataISO}T12:00:00`).getDay();
}

// Período da guarda: verde = mesmo dia; preta = vira a noite (+1 dia);
// vermelha = fim de semana sábado→domingo (+1 dia).
function calcularDataFim(tipo, dataInicio) {
  if (tipo === 'verde') return dataInicio;
  const [y, m, d] = dataInicio.split('-').map(Number);
  const dt = new Date(y, m - 1, d + 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
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
  if (!FILAS.includes(tipo))
    return res.status(400).json({ error: 'Fila inválida (use cabos ou atiradores).' });
  return res.json(model.listarFila(tipo));
}

function reordenar(req, res) {
  const { tipo } = req.params;
  const { soldado_id, acao } = req.body;
  if (!FILAS.includes(tipo))
    return res.status(400).json({ error: 'Fila inválida (use cabos ou atiradores).' });
  if (!soldado_id || !['inicio', 'fim'].includes(acao))
    return res.status(400).json({ error: 'Forneça soldado_id e acao (inicio | fim).' });
  return res.json(model.reordenarFila(tipo, soldado_id, acao));
}

function inicializarFilas(_req, res) {
  return res.status(201).json(model.inicializarFilas());
}

function sugestao(req, res) {
  const { tipo, data_inicio } = req.query;
  if (!tipo || !data_inicio) return res.status(400).json({ error: 'tipo e data_inicio obrigatórios.' });
  if (!['verde', 'preta', 'vermelha'].includes(tipo))
    return res.status(400).json({ error: 'Tipo inválido.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data_inicio))
    return res.status(400).json({ error: 'data_inicio inválida.' });

  // Guarda verde só ocorre de segunda a sexta.
  if (tipo === 'verde') {
    const ds = diaSemana(data_inicio);
    if (ds === 0 || ds === 6)
      return res.status(400).json({ error: 'Guarda verde só ocorre de segunda a sexta.' });

    // Já existe uma verde nesse dia → não sugere nenhum soldado.
    if (model.existeVerdeNoDia(data_inicio))
      return res.status(400).json({ error: 'Já existe uma guarda verde agendada para este dia.' });
  }

  // Sugestão recusada se a data cair em período bloqueado pelo comandante.
  if (model.estaBloequeado(data_inicio)) {
    return res.status(422).json({
      error: 'A data selecionada está dentro de um período bloqueado pelo comandante.',
      bloqueado: true,
    });
  }

  const data_fim       = calcularDataFim(tipo, data_inicio);
  const sugestoes      = model.sugerirMembros(tipo, data_inicio, data_fim);
  const todosSoldados  = model.listarSoldadosElegiveis(tipo);

  return res.json({ ...sugestoes, data_fim, bloqueado: false, todosSoldados });
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
  if (!e) return res.status(404).json({ error: 'Escala não encontrada.' });
  return res.json(e);
}

function criar(req, res) {
  const result = schemaEscala.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.issues });

  const { tipo, data_inicio, membros } = result.data;
  const erroRegra = validarRegrasNegocio(tipo, data_inicio, membros);
  if (erroRegra) return res.status(422).json({ error: erroRegra });

  // Não pode haver duas guardas do mesmo tipo (verde/preta/vermelha) começando na
  // mesma data — espelha a constraint única (tipo, data_inicio).
  if (model.existeEscalaTipoData(tipo, data_inicio))
    return res.status(409).json({ error: `Já existe uma guarda ${tipo} agendada para esta data.` });

  if (model.estaBloequeado(data_inicio))
    return res.status(422).json({ error: 'Data bloqueada pelo comandante.' });

  try {
    const escala = model.criarEscala({ ...result.data, criado_por: req.user?.id });
    return res.status(201).json(escala);
  } catch (e) {
    // Violação da constraint única tipo+data (corrida com outra criação).
    if (e.message?.includes('unique_tipo_data'))
      return res.status(409).json({ error: `Já existe uma guarda ${tipo} agendada para esta data.` });
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Soldado já escalado neste período.' });
    return res.status(500).json({ error: e.message });
  }
}

function atualizar(req, res) {
  const id = Number(req.params.id);
  if (!model.buscarEscala(id)) return res.status(404).json({ error: 'Escala não encontrada.' });

  const schema = schemaEscala.partial({ tipo: true, membros: true });
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.issues });

  return res.json(model.atualizarEscala(id, result.data));
}

// Troca manual de um membro de uma escala já confirmada.
function alterarMembro(req, res) {
  const id = Number(req.params.id);
  if (!model.buscarEscala(id)) return res.status(404).json({ error: 'Escala não encontrada.' });

  const result = schemaMembro.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.issues[0].message });

  const { soldado_removido_id, soldado_novo_id, motivo } = result.data;
  const r = model.alterarMembro(id, soldado_removido_id, soldado_novo_id, motivo ?? null);
  if (r?.erro) return res.status(422).json({ error: r.erro });

  return res.json(model.buscarEscala(id));
}

function alterarStatus(req, res) {
  const id = Number(req.params.id);
  const status = req.body.status;
  if (!['agendada', 'em_andamento', 'concluida', 'cancelada'].includes(status))
    return res.status(400).json({ error: 'Status inválido.' });
  if (!model.buscarEscala(id)) return res.status(404).json({ error: 'Escala não encontrada.' });

  // Ao concluir, o body pode trazer `ausentes`: lista de soldado_id que faltaram
  // à guarda e receberão +20 pontos cada.
  const ausentes = Array.isArray(req.body.ausentes)
    ? req.body.ausentes.map(Number).filter((n) => Number.isInteger(n))
    : [];
  return res.json(model.alterarStatus(id, status, { ausentes, registradoPor: req.user?.id }));
}

function remover(req, res) {
  const id = Number(req.params.id);
  if (!model.buscarEscala(id)) return res.status(404).json({ error: 'Escala não encontrada.' });
  model.removerEscala(id);
  return res.status(204).end();
}

function historicoPorSoldado(req, res) {
  return res.json(model.historicoPorSoldado(Number(req.params.soldadoId)));
}

function calendario(req, res) {
  const { ano, mes } = req.query;
  if (!ano || !mes) return res.status(400).json({ error: 'ano e mes obrigatórios.' });
  return res.json(model.calendario(Number(ano), Number(mes)));
}

// ── Geração automática ───────────────────────────────────────────────────────

// POST /api/escalas/gerar-ano — gera do dia atual até 31/12 do ano corrente.
function gerarAno(req, res) {
  return res.status(201).json(geracao.gerarEscalasDoAno(req.user?.id));
}

// POST /api/escalas/regenerar-ano — cancela as futuras agendadas e regera.
function regenerarAno(req, res) {
  return res.status(201).json(geracao.regenerarEscalasDoAno(req.user?.id));
}

// ── Bloqueios ────────────────────────────────────────────────────────────────

function listarBloqueios(req, res) {
  return res.json(model.listarBloqueios());
}

function criarBloqueio(req, res) {
  const result = schemaBloqueio.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.issues });
  return res.status(201).json(model.criarBloqueio({ ...result.data, criado_por: req.user?.id }));
}

function removerBloqueio(req, res) {
  model.removerBloqueio(Number(req.params.id));
  return res.status(204).end();
}

module.exports = {
  fila, reordenar, inicializarFilas, sugestao,
  listar, buscar, criar, atualizar, alterarMembro, alterarStatus, remover,
  historicoPorSoldado, calendario, gerarAno, regenerarAno,
  listarBloqueios, criarBloqueio, removerBloqueio,
};
