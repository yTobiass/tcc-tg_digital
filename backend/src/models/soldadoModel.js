const { getDb } = require('../database/db');

function listar({ turma, pelotao, status, graduacao, busca } = {}) {
  const db = getDb();
  let q = 'SELECT * FROM soldados WHERE 1=1';
  const params = [];

  if (turma)    { q += ' AND turma = ?';    params.push(turma); }
  if (pelotao)  { q += ' AND pelotao = ?';  params.push(pelotao); }
  if (status)   { q += ' AND status = ?';   params.push(status); }
  if (graduacao){ q += ' AND graduacao = ?'; params.push(graduacao); }
  if (busca) {
    q += ' AND (nome_completo LIKE ? OR ra LIKE ?)';
    params.push(`%${busca}%`, `%${busca}%`);
  }
  q += ' ORDER BY nome_completo ASC';
  return db.prepare(q).all(...params);
}

function buscarPorId(id) {
  return getDb().prepare('SELECT * FROM soldados WHERE id = ?').get(id);
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

module.exports = { listar, buscarPorId, criar, atualizar, importarLote };
