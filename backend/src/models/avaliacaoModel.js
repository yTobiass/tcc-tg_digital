const { getDb } = require('../database/db');
const { calcularTAF } = require('../utils/tafCalculo');

function listar({ soldadoId, limit = 50 } = {}) {
  let sql = `
    SELECT a.*, s.nome_completo AS nome, s.ra, s.pelotao
    FROM avaliacoes a
    JOIN soldados s ON s.id = a.soldado_id
  `;
  const params = [];
  if (soldadoId) { sql += ' WHERE a.soldado_id = ?'; params.push(soldadoId); }
  sql += ' ORDER BY a.data DESC LIMIT ?';
  params.push(limit);
  return getDb().prepare(sql).all(...params);
}

function buscarPorId(id) {
  return getDb().prepare(`
    SELECT a.*, s.nome_completo AS nome, s.ra, s.pelotao
    FROM avaliacoes a
    JOIN soldados s ON s.id = a.soldado_id
    WHERE a.id = ?
  `).get(id);
}

function criar({ soldado_id, data, corrida, flexao, abdominal, observacoes }) {
  const { nota, conceito, ptsCorrida, ptsFlexao, ptsAbdominal } = calcularTAF(corrida, flexao, abdominal);
  const stmt = getDb().prepare(`
    INSERT INTO avaliacoes
      (soldado_id, data, corrida, flexao, abdominal, pts_corrida, pts_flexao, pts_abdominal, nota_final, conceito, observacoes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(soldado_id, data, corrida, flexao, abdominal, ptsCorrida, ptsFlexao, ptsAbdominal, nota, conceito, observacoes ?? null);
  return buscarPorId(info.lastInsertRowid);
}

function atualizar(id, { data, corrida, flexao, abdominal, observacoes }) {
  const { nota, conceito, ptsCorrida, ptsFlexao, ptsAbdominal } = calcularTAF(corrida, flexao, abdominal);
  getDb().prepare(`
    UPDATE avaliacoes SET
      data = ?, corrida = ?, flexao = ?, abdominal = ?,
      pts_corrida = ?, pts_flexao = ?, pts_abdominal = ?,
      nota_final = ?, conceito = ?, observacoes = ?
    WHERE id = ?
  `).run(data, corrida, flexao, abdominal, ptsCorrida, ptsFlexao, ptsAbdominal, nota, conceito, observacoes ?? null, id);
  return buscarPorId(id);
}

function remover(id) {
  getDb().prepare('DELETE FROM avaliacoes WHERE id = ?').run(id);
}

function evolucao(soldadoId) {
  return getDb().prepare(`
    SELECT data, nota_final, conceito, corrida, flexao, abdominal,
           pts_corrida, pts_flexao, pts_abdominal
    FROM avaliacoes
    WHERE soldado_id = ?
    ORDER BY data ASC
  `).all(soldadoId);
}

module.exports = { listar, buscarPorId, criar, atualizar, remover, evolucao };
