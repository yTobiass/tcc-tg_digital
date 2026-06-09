const model = require('../models/relatorioModel');

function relatorioPresenca(req, res) {
  const { data_inicio, data_fim, turma, pelotao, soldado_id } = req.query;
  if (!data_inicio || !data_fim) {
    return res.status(400).json({ error: 'data_inicio e data_fim são obrigatórios.' });
  }
  const dados = model.presenca({
    dataInicio: data_inicio,
    dataFim:    data_fim,
    turma:      turma   || null,
    pelotao:    pelotao || null,
    soldadoId:  soldado_id ? Number(soldado_id) : null,
  });
  res.json(dados);
}

function relatorioEvolucao(req, res) {
  const { tipo_treino_id, soldado_id, data_inicio, data_fim } = req.query;
  const dados = model.evolucao({
    tipoTreinoId: tipo_treino_id ? Number(tipo_treino_id) : null,
    soldadoId:    soldado_id    ? Number(soldado_id)    : null,
    dataInicio:   data_inicio   || null,
    dataFim:      data_fim      || null,
  });
  res.json(dados);
}

function relatorioEfetivo(_req, res) {
  res.json(model.efetivo());
}

module.exports = { relatorioPresenca, relatorioEvolucao, relatorioEfetivo };
