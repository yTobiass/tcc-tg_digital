const { getDb } = require('../database/db');

// ── Fila de Rotação ──────────────────────────────────────────────────────────

function _inicializarFilaTipo(db, tipo) {
  const existem = db.prepare('SELECT COUNT(*) AS c FROM fila_rotacao WHERE tipo_guarda = ?').get(tipo).c;
  if (existem > 0) return;

  const filtroGrad = tipo === 'verde' ? "AND s.graduacao = 'atirador'" : '';
  const soldados = db.prepare(`
    SELECT s.id FROM soldados s
    WHERE s.status IN ('ativo','licenca') ${filtroGrad}
    ORDER BY COALESCE(s.data_incorporacao, s.created_at) ASC, s.id ASC
  `).all();

  const insert = db.prepare(
    'INSERT INTO fila_rotacao (soldado_id, tipo_guarda, posicao) VALUES (?, ?, ?) ON CONFLICT DO NOTHING'
  );
  soldados.forEach((s, i) => insert.run(s.id, tipo, i + 1));
}

function garantirFilas() {
  const db = getDb();
  const tx = db.transaction(() => {
    ['verde', 'preta', 'vermelha'].forEach((t) => _inicializarFilaTipo(db, t));
  });
  tx();
}

function _renormalizarFila(db, tipo) {
  const rows = db.prepare('SELECT id FROM fila_rotacao WHERE tipo_guarda = ? ORDER BY posicao ASC').all(tipo);
  rows.forEach((r, i) => db.prepare('UPDATE fila_rotacao SET posicao = ? WHERE id = ?').run(i + 1, r.id));
}

function _moverParaFimFila(db, tipo, soldadoIds) {
  let maxPos = db.prepare('SELECT COALESCE(MAX(posicao),0) AS m FROM fila_rotacao WHERE tipo_guarda = ?').get(tipo).m;
  soldadoIds.forEach((sid) => {
    maxPos += 1;
    db.prepare('UPDATE fila_rotacao SET posicao = ? WHERE soldado_id = ? AND tipo_guarda = ?').run(maxPos, sid, tipo);
  });
  _renormalizarFila(db, tipo);
}

function listarFila(tipo) {
  garantirFilas();
  return getDb().prepare(`
    SELECT f.posicao, f.ultima_data,
           s.id AS soldado_id, s.ra, s.nome_completo, s.status, s.graduacao
    FROM fila_rotacao f
    JOIN soldados s ON s.id = f.soldado_id
    WHERE f.tipo_guarda = ?
    ORDER BY f.posicao ASC
  `).all(tipo);
}

function sugerirMembros(tipo) {
  garantirFilas();
  const db = getDb();

  function proxElegiveis(graduacao, limite) {
    return db.prepare(`
      SELECT s.id AS soldado_id, s.ra, s.nome_completo, s.graduacao, f.posicao
      FROM fila_rotacao f
      JOIN soldados s ON s.id = f.soldado_id
      WHERE f.tipo_guarda = ? AND s.status = 'ativo' AND s.graduacao = ?
      ORDER BY f.posicao ASC
      LIMIT ?
    `).all(tipo, graduacao, limite);
  }

  if (tipo === 'verde') return { cabo: null, atiradores: proxElegiveis('atirador', 1) };
  return { cabo: proxElegiveis('cabo', 1)[0] ?? null, atiradores: proxElegiveis('atirador', 3) };
}

function listarSoldadosElegiveis(tipo) {
  // Todos os soldados ativos com a graduação correta para o tipo
  const db = getDb();
  const filtro = tipo === 'verde' ? "AND graduacao = 'atirador'" : '';
  return db.prepare(`
    SELECT id AS soldado_id, ra, nome_completo, graduacao
    FROM soldados WHERE status = 'ativo' ${filtro}
    ORDER BY nome_completo ASC
  `).all();
}

function reordenarFila(tipo, soldadoId, acao) {
  const db = getDb();
  garantirFilas();
  const tx = db.transaction(() => {
    if (acao === 'inicio') {
      // Punição: mover para posição 1 (faz a guarda mais cedo)
      db.prepare('UPDATE fila_rotacao SET posicao = 0 WHERE soldado_id = ? AND tipo_guarda = ?').run(soldadoId, tipo);
      _renormalizarFila(db, tipo);
    } else {
      // Adiamento: mover para o fim
      _moverParaFimFila(db, tipo, [soldadoId]);
    }
  });
  tx();
  return listarFila(tipo);
}

// ── Escalas CRUD ─────────────────────────────────────────────────────────────

function listarEscalas({ tipo, mes, ano, status } = {}) {
  const db = getDb();
  let q = `
    SELECT e.id, e.tipo, e.data_inicio, e.data_fim, e.status, e.observacoes,
           COUNT(em.id) AS total_membros
    FROM escalas_guarda e
    LEFT JOIN escala_membros em ON em.escala_id = e.id
    WHERE 1=1
  `;
  const p = [];
  if (tipo)   { q += ' AND e.tipo = ?';   p.push(tipo);   }
  if (status) { q += ' AND e.status = ?'; p.push(status); }
  if (mes && ano) {
    const mm = String(mes).padStart(2, '0');
    q += ` AND (e.data_inicio LIKE ? OR e.data_fim LIKE ?
             OR (e.data_inicio < ? AND e.data_fim > ?))`;
    p.push(`${ano}-${mm}%`, `${ano}-${mm}%`, `${ano}-${mm}-01`, `${ano}-${mm}-31`);
  }
  q += ' GROUP BY e.id ORDER BY e.data_inicio DESC';
  return db.prepare(q).all(...p);
}

function buscarEscala(id) {
  const db = getDb();
  const e = db.prepare('SELECT * FROM escalas_guarda WHERE id = ?').get(id);
  if (!e) return null;
  e.membros = db.prepare(`
    SELECT em.funcao, em.motivo_repeticao,
           s.id AS soldado_id, s.ra, s.nome_completo, s.graduacao
    FROM escala_membros em
    JOIN soldados s ON s.id = em.soldado_id
    WHERE em.escala_id = ?
    ORDER BY em.funcao DESC, s.nome_completo ASC
  `).all(id);
  return e;
}

function criarEscala({ tipo, data_inicio, data_fim, observacoes, membros, criado_por }) {
  const db = getDb();
  garantirFilas();

  const escalaId = db.transaction(() => {
    const r = db.prepare(`
      INSERT INTO escalas_guarda (tipo, data_inicio, data_fim, observacoes, criado_por)
      VALUES (?, ?, ?, ?, ?)
    `).run(tipo, data_inicio, data_fim, observacoes ?? null, criado_por ?? null);

    const id = r.lastInsertRowid;
    const ins = db.prepare('INSERT INTO escala_membros (escala_id, soldado_id, funcao) VALUES (?, ?, ?)');
    for (const m of membros) ins.run(id, m.soldado_id, m.funcao);

    // Move membros para o fim da fila
    const soldadoIds = membros.map((m) => m.soldado_id);
    _moverParaFimFila(db, tipo, soldadoIds);

    // Registra ultima escala na fila
    for (const sid of soldadoIds) {
      db.prepare(`
        UPDATE fila_rotacao SET ultima_escala_id = ?, ultima_data = ?
        WHERE soldado_id = ? AND tipo_guarda = ?
      `).run(id, data_inicio, sid, tipo);
    }

    return id;
  })();

  return buscarEscala(escalaId);
}

function atualizarEscala(id, { data_inicio, data_fim, observacoes, membros }) {
  const db = getDb();
  db.prepare('UPDATE escalas_guarda SET data_inicio=?, data_fim=?, observacoes=? WHERE id=?')
    .run(data_inicio, data_fim, observacoes ?? null, id);

  if (membros) {
    db.prepare('DELETE FROM escala_membros WHERE escala_id = ?').run(id);
    const ins = db.prepare('INSERT INTO escala_membros (escala_id, soldado_id, funcao) VALUES (?, ?, ?)');
    for (const m of membros) ins.run(id, m.soldado_id, m.funcao);
  }
  return buscarEscala(id);
}

function alterarStatus(id, status) {
  getDb().prepare('UPDATE escalas_guarda SET status = ? WHERE id = ?').run(status, id);
  return buscarEscala(id);
}

function removerEscala(id) {
  getDb().prepare('DELETE FROM escalas_guarda WHERE id = ?').run(id);
}

function historicoPorSoldado(soldadoId) {
  return getDb().prepare(`
    SELECT e.id, e.tipo, e.data_inicio, e.data_fim, e.status, em.funcao
    FROM escala_membros em
    JOIN escalas_guarda e ON e.id = em.escala_id
    WHERE em.soldado_id = ?
    ORDER BY e.data_inicio DESC
  `).all(soldadoId);
}

// ── Calendário ───────────────────────────────────────────────────────────────

function calendario(ano, mes) {
  const db = getDb();
  const mm    = String(mes).padStart(2, '0');
  const inicio = `${ano}-${mm}-01`;
  const fim    = `${ano}-${mm}-31`;

  const escalas = db.prepare(`
    SELECT e.id, e.tipo, e.data_inicio, e.data_fim, e.status,
           COUNT(em.id) AS total_membros
    FROM escalas_guarda e
    LEFT JOIN escala_membros em ON em.escala_id = e.id
    WHERE e.status != 'cancelada'
      AND e.data_inicio <= ? AND e.data_fim >= ?
    GROUP BY e.id
    ORDER BY e.data_inicio ASC
  `).all(fim, inicio);

  const bloqueios = db.prepare(
    'SELECT * FROM periodos_bloqueados WHERE data_inicio <= ? AND data_fim >= ? ORDER BY data_inicio ASC'
  ).all(fim, inicio);

  return { escalas, bloqueios };
}

// ── Bloqueios de Período ──────────────────────────────────────────────────────

function estaBloequeado(data) {
  return !!getDb().prepare(
    'SELECT id FROM periodos_bloqueados WHERE data_inicio <= ? AND data_fim >= ? LIMIT 1'
  ).get(data, data);
}

function listarBloqueios() {
  return getDb().prepare('SELECT * FROM periodos_bloqueados ORDER BY data_inicio DESC').all();
}

function criarBloqueio({ data_inicio, data_fim, motivo, criado_por }) {
  const db = getDb();
  const r = db.prepare(
    'INSERT INTO periodos_bloqueados (data_inicio, data_fim, motivo, criado_por) VALUES (?,?,?,?)'
  ).run(data_inicio, data_fim, motivo ?? null, criado_por ?? null);
  return db.prepare('SELECT * FROM periodos_bloqueados WHERE id = ?').get(r.lastInsertRowid);
}

function removerBloqueio(id) {
  getDb().prepare('DELETE FROM periodos_bloqueados WHERE id = ?').run(id);
}

module.exports = {
  garantirFilas, listarFila, sugerirMembros, listarSoldadosElegiveis, reordenarFila,
  listarEscalas, buscarEscala, criarEscala, atualizarEscala, alterarStatus, removerEscala,
  historicoPorSoldado, calendario,
  estaBloequeado, listarBloqueios, criarBloqueio, removerBloqueio,
};
