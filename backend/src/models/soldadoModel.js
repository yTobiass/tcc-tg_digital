const { getDb } = require('../database/db');

function listar({ turma, pelotao, status, graduacao, busca } = {}) {
  const db = getDb();
  // Inclui a contagem de guardas CONCLUÍDAS por tipo via LEFT JOIN com a
  // agregação de escala_membros/escalas_guarda. Soldados sem guardas → 0.
  let q = `
    SELECT s.*,
           COALESCE(g.total_verde,    0) AS total_verde,
           COALESCE(g.total_preta,    0) AS total_preta,
           COALESCE(g.total_vermelha, 0) AS total_vermelha
    FROM soldados s
    LEFT JOIN (
      SELECT em.soldado_id,
             COUNT(CASE WHEN eg.tipo = 'verde'    THEN 1 END) AS total_verde,
             COUNT(CASE WHEN eg.tipo = 'preta'    THEN 1 END) AS total_preta,
             COUNT(CASE WHEN eg.tipo = 'vermelha' THEN 1 END) AS total_vermelha
      FROM escala_membros em
      JOIN escalas_guarda eg ON eg.id = em.escala_id AND eg.status = 'concluida'
      GROUP BY em.soldado_id
    ) g ON g.soldado_id = s.id
    WHERE 1=1`;
  const params = [];

  if (turma)    { q += ' AND s.turma = ?';    params.push(turma); }
  if (pelotao)  { q += ' AND s.pelotao = ?';  params.push(pelotao); }
  if (status)   { q += ' AND s.status = ?';   params.push(status); }
  if (graduacao){ q += ' AND s.graduacao = ?'; params.push(graduacao); }
  if (busca) {
    q += ' AND (s.nome_completo LIKE ? OR s.ra LIKE ?)';
    params.push(`%${busca}%`, `%${busca}%`);
  }
  q += ' ORDER BY s.nome_completo ASC';
  return db.prepare(q).all(...params);
}

function buscarPorId(id) {
  return getDb().prepare('SELECT * FROM soldados WHERE id = ?').get(id);
}

// Histórico de guardas de um soldado (todas as participações, mais recente primeiro).
function guardasDoSoldado(id) {
  return getDb().prepare(`
    SELECT eg.id AS escala_id, eg.tipo, em.funcao, eg.data_inicio, eg.data_fim, eg.status
    FROM escala_membros em
    JOIN escalas_guarda eg ON eg.id = em.escala_id
    WHERE em.soldado_id = ?
    ORDER BY eg.data_inicio DESC
  `).all(id);
}

function criar(dados) {
  const db = getDb();
  const { ra, nome_completo, data_nascimento, data_incorporacao, pelotao, turma, graduacao, status } = dados;
  const r = db.prepare(
    `INSERT INTO soldados (ra, nome_completo, data_nascimento, data_incorporacao, pelotao, turma, graduacao, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(ra, nome_completo, data_nascimento || null, data_incorporacao || null, pelotao || null, turma || null, graduacao || 'atirador', status || 'ativo');
  return buscarPorId(r.lastInsertRowid);
}

function atualizar(id, dados) {
  const db = getDb();
  const { ra, nome_completo, data_nascimento, data_incorporacao, pelotao, turma, graduacao, status } = dados;
  db.prepare(
    `UPDATE soldados
     SET ra=?, nome_completo=?, data_nascimento=?, data_incorporacao=?, pelotao=?, turma=?, graduacao=?, status=?
     WHERE id=?`
  ).run(ra, nome_completo, data_nascimento || null, data_incorporacao || null, pelotao || null, turma || null, graduacao, status, id);
  return buscarPorId(id);
}

function importarLote(soldados) {
  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO soldados (ra, nome_completo, data_nascimento, data_incorporacao, pelotao, turma, graduacao, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'ativo')
     ON CONFLICT(ra) DO UPDATE SET
       nome_completo=excluded.nome_completo,
       data_nascimento=excluded.data_nascimento,
       data_incorporacao=excluded.data_incorporacao,
       pelotao=excluded.pelotao,
       turma=excluded.turma,
       graduacao=excluded.graduacao`
  );
  const importarTodos = db.transaction((lista) => {
    for (const s of lista) {
      upsert.run(s.ra, s.nome_completo, s.data_nascimento || null, s.data_incorporacao || null, s.pelotao || null, s.turma || null, s.graduacao || 'atirador');
    }
    return lista.length;
  });
  return importarTodos(soldados);
}

module.exports = { listar, buscarPorId, guardasDoSoldado, criar, atualizar, importarLote };
