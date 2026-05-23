const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database/db');

function login(req, res) {
  const { login: loginInput, senha } = req.body;

  if (!loginInput || !senha) {
    return res.status(400).json({ error: 'Login e senha são obrigatórios.' });
  }

  const db = getDb();
  const usuario = db
    .prepare(
      `SELECT u.*, s.ra, s.nome_completo as soldado_nome
       FROM usuarios u
       LEFT JOIN soldados s ON s.id = u.soldado_id
       WHERE u.login = ? AND u.ativo = 1`
    )
    .get(loginInput);

  if (!usuario || !bcrypt.compareSync(senha, usuario.senha_hash)) {
    return res.status(401).json({ error: 'Login ou senha incorretos.' });
  }

  const payload = {
    id: usuario.id,
    nome: usuario.nome,
    login: usuario.login,
    role: usuario.role,
    soldado_id: usuario.soldado_id ?? null,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

  return res.json({ token, usuario: payload });
}

function me(req, res) {
  return res.json({ usuario: req.user });
}

module.exports = { login, me };
