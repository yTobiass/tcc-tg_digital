const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { getDb } = require('../database/db');
const usuarioModel = require('../models/usuarioModel');

// Monta o payload do JWT a partir de uma linha da tabela usuarios.
function montarPayload(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    login: usuario.login,
    role: usuario.role,
    soldado_id: usuario.soldado_id ?? null,
    precisa_trocar_senha: !!usuario.precisa_trocar_senha,
  };
}

function assinarToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

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

  const payload = montarPayload(usuario);
  const token = assinarToken(payload);

  return res.json({ token, usuario: payload });
}

function me(req, res) {
  return res.json({ usuario: req.user });
}

const schemaTrocarSenha = z.object({
  senha_atual: z.string().min(1, 'Senha atual é obrigatória.'),
  nova_senha:  z.string().min(6, 'A nova senha deve ter ao menos 6 caracteres.'),
});

// Troca a senha do próprio usuário autenticado e limpa a flag de troca obrigatória.
function trocarSenha(req, res) {
  const parse = schemaTrocarSenha.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.issues[0].message });

  const { senha_atual, nova_senha } = parse.data;

  const usuario = usuarioModel.buscarComSenha(req.user.id);
  if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado.' });

  if (!bcrypt.compareSync(senha_atual, usuario.senha_hash)) {
    return res.status(401).json({ error: 'Senha atual incorreta.' });
  }
  if (bcrypt.compareSync(nova_senha, usuario.senha_hash)) {
    return res.status(400).json({ error: 'A nova senha deve ser diferente da atual.' });
  }

  usuarioModel.trocarSenha(usuario.id, bcrypt.hashSync(nova_senha, 10));

  // Reemite o token sem a flag para refletir o novo estado imediatamente.
  const payload = montarPayload({ ...usuario, precisa_trocar_senha: 0 });
  const token = assinarToken(payload);

  return res.json({ token, usuario: payload });
}

module.exports = { login, me, trocarSenha };
