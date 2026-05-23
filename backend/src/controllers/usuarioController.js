const { z }  = require('zod');
const model  = require('../models/usuarioModel');

const schemaCriar = z.object({
  nome:       z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  login:      z.string().min(3, 'Login deve ter ao menos 3 caracteres'),
  senha:      z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  role:       z.enum(['comandante', 'sargento', 'soldado']),
  soldado_id: z.number().int().positive().nullable().optional(),
});

const schemaAtualizar = z.object({
  nome:       z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  login:      z.string().min(3, 'Login deve ter ao menos 3 caracteres'),
  senha:      z.string().min(6, 'Senha deve ter ao menos 6 caracteres').optional().or(z.literal('')),
  role:       z.enum(['comandante', 'sargento', 'soldado']),
  soldado_id: z.number().int().positive().nullable().optional(),
});

function listar(_req, res) {
  res.json(model.listar());
}

function buscar(req, res) {
  const u = model.buscarPorId(Number(req.params.id));
  if (!u) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  res.json(u);
}

function criar(req, res) {
  const parse = schemaCriar.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ erro: parse.error.issues[0].message });

  const dados = parse.data;
  if (dados.role === 'soldado' && !dados.soldado_id) {
    return res.status(400).json({ erro: 'soldado_id é obrigatório para usuários com role soldado.' });
  }
  if (dados.role !== 'soldado') dados.soldado_id = null;

  if (model.loginExiste(dados.login)) {
    return res.status(409).json({ erro: 'Este login já está em uso.' });
  }

  res.status(201).json(model.criar(dados));
}

function atualizar(req, res) {
  const id = Number(req.params.id);
  const alvo = model.buscarPorId(id);
  if (!alvo) return res.status(404).json({ erro: 'Usuário não encontrado.' });

  const parse = schemaAtualizar.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ erro: parse.error.issues[0].message });

  const dados = parse.data;

  // Impede rebaixar o próprio role de comandante se for o último
  if (alvo.role === 'comandante' && dados.role !== 'comandante') {
    if (model.contarComandantesAtivos() <= 1) {
      return res.status(400).json({ erro: 'Não é possível alterar o role do único comandante ativo.' });
    }
  }

  if (dados.role === 'soldado' && !dados.soldado_id) {
    return res.status(400).json({ erro: 'soldado_id é obrigatório para usuários com role soldado.' });
  }
  if (dados.role !== 'soldado') dados.soldado_id = null;

  if (model.loginExiste(dados.login, id)) {
    return res.status(409).json({ erro: 'Este login já está em uso.' });
  }

  res.json(model.atualizar(id, dados));
}

function remover(req, res) {
  const id = Number(req.params.id);

  if (id === req.user.id) {
    return res.status(400).json({ erro: 'Você não pode desativar sua própria conta.' });
  }

  const alvo = model.buscarPorId(id);
  if (!alvo) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  if (!alvo.ativo) return res.status(400).json({ erro: 'Usuário já está inativo.' });

  if (alvo.role === 'comandante' && model.contarComandantesAtivos() <= 1) {
    return res.status(400).json({ erro: 'Não é possível desativar o único comandante ativo.' });
  }

  model.desativar(id);
  res.json({ mensagem: 'Usuário desativado com sucesso.' });
}

function reativar(req, res) {
  const id = Number(req.params.id);
  const alvo = model.buscarPorId(id);
  if (!alvo) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  if (alvo.ativo) return res.status(400).json({ erro: 'Usuário já está ativo.' });

  model.reativar(id);
  res.json(model.buscarPorId(id));
}

module.exports = { listar, buscar, criar, atualizar, remover, reativar };
