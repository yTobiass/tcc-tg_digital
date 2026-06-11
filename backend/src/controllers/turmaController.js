const turmas = require('../models/turmaModel');

// GET /api/turmas — todas as turmas (ativa + encerradas).
function listar(_req, res) {
  return res.json(turmas.listarTurmas());
}

// GET /api/turmas/ativa — turma ativa atual.
function ativa(_req, res) {
  const t = turmas.buscarTurmaAtiva();
  if (!t) return res.status(404).json({ error: 'Nenhuma turma ativa.' });
  return res.json(t);
}

// GET /api/turmas/:id — detalhes de uma turma.
function buscar(req, res) {
  const t = turmas.buscarTurma(Number(req.params.id));
  if (!t) return res.status(404).json({ error: 'Turma não encontrada.' });
  return res.json(t);
}

function soldados(req, res) {
  return res.json(turmas.soldadosDaTurma(Number(req.params.id)));
}

function escalas(req, res) {
  return res.json(turmas.escalasDaTurma(Number(req.params.id)));
}

function faltas(req, res) {
  return res.json(turmas.faltasDaTurma(Number(req.params.id)));
}

function ocorrencias(req, res) {
  return res.json(turmas.ocorrenciasDaTurma(Number(req.params.id)));
}

// POST /api/turmas/encerrar — encerra a turma ativa (apenas comandante).
function encerrar(req, res) {
  const r = turmas.encerrarTurma(req.user?.id);
  if (r.erro) return res.status(400).json({ error: r.erro });
  return res.status(201).json(r);
}

module.exports = { listar, ativa, buscar, soldados, escalas, faltas, ocorrencias, encerrar };
