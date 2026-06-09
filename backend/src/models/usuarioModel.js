const bcrypt   = require('bcryptjs');
const { getDb } = require('../database/db');

const COLS = `
  u.id, u.nome, u.login, u.role, u.ativo, u.soldado_id, u.created_at,
  s.nome_completo AS soldado_nome, s.ra AS soldado_ra
`;

function buscarPorId(id) {
  return getDb().prepare(
    `SELECT ${COLS} FROM usuarios u LEFT JOIN soldados s ON s.id = u.soldado_id WHERE u.id = ?`
  ).get(id);
}

function listar() {
  return getDb().prepare(
    `SELECT ${COLS} FROM usuarios u LEFT JOIN soldados s ON s.id = u.soldado_id ORDER BY u.nome ASC`
  ).all();
}

function loginExiste(login, excluirId = null) {
  const q = excluirId
    ? 'SELECT id FROM usuarios WHERE login = ? AND id != ?'
    : 'SELECT id FROM usuarios WHERE login = ?';
  return !!getDb().prepare(q).get(login, ...(excluirId ? [excluirId] : []));
}

function criar({ nome, login, senha, role, soldado_id }) {
  const db = getDb();
  const hash = bcrypt.hashSync(senha, 10);
  const r = db.prepare(
    `INSERT INTO usuarios (nome, login, senha_hash, role, soldado_id, ativo) VALUES (?, ?, ?, ?, ?, 1)`
  ).run(nome, login, hash, role, soldado_id || null);
  return buscarPorId(r.lastInsertRowid);
}

function atualizar(id, { nome, login, senha, role, soldado_id }) {
  const db = getDb();
  if (senha && senha.trim()) {
    const hash = bcrypt.hashSync(senha, 10);
    db.prepare(
      `UPDATE usuarios SET nome=?, login=?, senha_hash=?, role=?, soldado_id=? WHERE id=?`
    ).run(nome, login, hash, role, soldado_id || null, id);
  } else {
    db.prepare(
      `UPDATE usuarios SET nome=?, login=?, role=?, soldado_id=? WHERE id=?`
    ).run(nome, login, role, soldado_id || null, id);
  }
  return buscarPorId(id);
}

function desativar(id) {
  getDb().prepare(`UPDATE usuarios SET ativo=0 WHERE id=?`).run(id);
}

function reativar(id) {
  getDb().prepare(`UPDATE usuarios SET ativo=1 WHERE id=?`).run(id);
}

function contarComandantesAtivos() {
  return getDb().prepare(
    `SELECT COUNT(*) AS total FROM usuarios WHERE role='comandante' AND ativo=1`
  ).get().total;
}

// Retorna o registro completo (inclui senha_hash) — uso interno em login/troca de senha.
function buscarComSenha(id) {
  return getDb().prepare(`SELECT * FROM usuarios WHERE id = ? AND ativo = 1`).get(id);
}

// Define uma nova senha e limpa a flag de troca obrigatória.
function trocarSenha(id, senhaHash) {
  getDb().prepare(
    `UPDATE usuarios SET senha_hash = ?, precisa_trocar_senha = 0 WHERE id = ?`
  ).run(senhaHash, id);
}

module.exports = {
  listar, buscarPorId, loginExiste, criar, atualizar, desativar, reativar,
  contarComandantesAtivos, buscarComSenha, trocarSenha,
};
