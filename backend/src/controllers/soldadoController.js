const { z } = require('zod');
const XLSX = require('xlsx');
const model = require('../models/soldadoModel');
const escalas = require('../models/escalasModel');

const schemaSoldado = z.object({
  ra: z.string().min(1, 'RA é obrigatório'),
  nome_completo: z.string().min(1, 'Nome completo é obrigatório'),
  nome_guerra: z.string({ required_error: 'O nome de guerra é obrigatório.' }).min(1, 'O nome de guerra é obrigatório.'),
  data_nascimento: z.string().nullable().optional(),
  data_incorporacao: z.string().nullable().optional(),
  pelotao: z.string().nullable().optional(),
  turma: z.string().nullable().optional(),
  celular: z.string().nullable().optional(),
  graduacao: z.enum(['atirador', 'cabo']).default('atirador'),
  status: z.enum(['ativo', 'licenca', 'baixado', 'dispensado']).default('ativo'),
});

// Celular é opcional; quando preenchido, aceita apenas números, parênteses,
// traço e espaço (ex.: "(19) 99999-1234").
const CELULAR_RE = /^[\d()\-\s]+$/;
function celularValido(celular) {
  if (celular == null || String(celular).trim() === '') return true;
  return CELULAR_RE.test(String(celular).trim());
}

// Validações de negócio compartilhadas por cadastro/edição. Retorna a mensagem
// de erro (string) ou null se estiver tudo certo. `turmaId` e `soldadoId`
// definem o escopo da checagem de RA único por turma.
function validarSoldado(dados, turmaId, soldadoId = null) {
  if (!dados.nome_guerra.trim()) return 'O nome de guerra é obrigatório.';
  if (!celularValido(dados.celular)) {
    return 'Celular inválido: use apenas números, parênteses, traço e espaço.';
  }
  if (model.raEmUso(dados.ra, turmaId, soldadoId)) {
    return `Já existe um soldado com o RA ${dados.ra} nesta turma.`;
  }
  return null;
}

function listar(req, res) {
  // Regra de Negócio nº 7: um soldado só enxerga o próprio cadastro.
  if (req.user.role === 'soldado') {
    if (!req.user.soldado_id) return res.json([]);
    const proprio = model.buscarPorId(req.user.soldado_id);
    return res.json(proprio ? [proprio] : []);
  }
  const { turma, pelotao, status, graduacao, busca } = req.query;
  res.json(model.listar({ turma, pelotao, status, graduacao, busca }));
}

function buscarPorId(req, res) {
  const id = Number(req.params.id);
  // Regra de Negócio nº 7: um soldado só pode acessar os próprios dados.
  if (req.user.role === 'soldado' && id !== req.user.soldado_id) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  const soldado = model.buscarPorId(id);
  if (!soldado) return res.status(404).json({ error: 'Soldado não encontrado.' });
  res.json(soldado);
}

const TIPOS_GUARDA = new Set(['verde', 'preta', 'vermelha']);
const SITUACOES_GUARDA = new Set(['agendada', 'concluida', 'cancelada']);

function guardas(req, res) {
  const id = Number(req.params.id);
  // Regra de Negócio nº 7: um soldado só acessa o próprio histórico.
  if (req.user.role === 'soldado' && id !== req.user.soldado_id) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  if (!model.buscarPorId(id)) return res.status(404).json({ error: 'Soldado não encontrado.' });

  // Filtros opcionais — valores inválidos são ignorados (cai no padrão "todos").
  const tipo     = TIPOS_GUARDA.has(req.query.tipo)         ? req.query.tipo     : null;
  const situacao = SITUACOES_GUARDA.has(req.query.situacao) ? req.query.situacao : null;

  res.json(model.guardasDoSoldado(id, { tipo, situacao }));
}

function criar(req, res) {
  const resultado = schemaSoldado.safeParse(req.body);
  if (!resultado.success) return res.status(400).json({ error: resultado.error.issues[0].message });

  const dados = resultado.data;
  const erro = validarSoldado(dados, model.turmaAtivaId());
  if (erro) return res.status(400).json({ error: erro });

  try {
    res.status(201).json(model.criar(dados));
  } catch (err) {
    // Rede de segurança: o índice composto (ra, turma_id) também barra duplicatas.
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: `Já existe um soldado com o RA ${dados.ra} nesta turma.` });
    }
    throw err;
  }
}

function atualizar(req, res) {
  const id = Number(req.params.id);
  const existente = model.buscarPorId(id);
  if (!existente) return res.status(404).json({ error: 'Soldado não encontrado.' });

  const resultado = schemaSoldado.safeParse(req.body);
  if (!resultado.success) return res.status(400).json({ error: resultado.error.issues[0].message });

  const dados = resultado.data;
  // Valida o RA único dentro da própria turma do soldado, ignorando ele mesmo.
  const erro = validarSoldado(dados, existente.turma_id, id);
  if (erro) return res.status(400).json({ error: erro });

  try {
    const atualizado = model.atualizar(id, dados);
    // Mudança de graduação (atirador↔cabo) ou de status afeta a composição das
    // filas de rotação: ressincroniza para refletir o novo efetivo de cada fila
    // (promovidos entram, rebaixados/inativos saem da fila onde não pertencem).
    if (existente.graduacao !== atualizado.graduacao || existente.status !== atualizado.status) {
      escalas.ressincronizarFilas();
    }
    res.json(atualizado);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: `Já existe um soldado com o RA ${dados.ra} nesta turma.` });
    }
    throw err;
  }
}

// --- Importação CSV/Excel ---

function parseDateBR(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  const str = String(val).trim();
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return null;
}

function importar(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado.' });

  // Data de incorporação informada uma única vez no formulário, aplicada a todos.
  const dataIncorporacao = parseDateBR(req.body?.data_incorporacao);
  if (!dataIncorporacao) {
    return res.status(400).json({ error: 'Informe a data de incorporação (DD/MM/AAAA) — ela é aplicada a todos os soldados.' });
  }

  let workbook;
  try {
    workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
  } catch {
    return res.status(400).json({ error: 'Arquivo inválido ou corrompido.' });
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const linhas = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (linhas.length === 0) return res.status(400).json({ error: 'Planilha sem dados.' });

  // A planilha tem Nome Completo (obrigatório), Nome de Guerra (obrigatório) e
  // Celular (opcional); o resto é preenchido automaticamente (RA sequencial,
  // pelotão pelo RA, graduação atirador, turma ativa).
  const erros = [];
  const registros = [];

  linhas.forEach((linha, i) => {
    const n = i + 2;
    const nome = String(linha['Nome Completo'] || '').trim();
    const guerra = String(linha['Nome de Guerra'] || '').trim();
    // O cabeçalho do modelo é "Celular (opcional)"; aceita "Celular" também.
    const celular = String(linha['Celular (opcional)'] ?? linha['Celular'] ?? '').trim();

    if (!nome)   { erros.push(`Linha ${n}: Nome Completo obrigatório.`); return; }
    if (!guerra) { erros.push(`Linha ${n}: Nome de Guerra obrigatório.`); return; }
    if (!celularValido(celular)) {
      erros.push(`Linha ${n}: Celular inválido (use apenas números, parênteses, traço e espaço).`);
      return;
    }
    registros.push({ nome_completo: nome, nome_guerra: guerra, celular: celular || null });
  });

  if (registros.length === 0) return res.status(400).json({ error: 'Nenhum registro válido.', erros });

  try {
    const importados = model.importarLote(registros, dataIncorporacao);
    res.json({ importados, erros });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar dados.', detalhe: err.message });
  }
}

function modeloPlanilha(_req, res) {
  const wb = XLSX.utils.book_new();
  // Nome Completo e Nome de Guerra são obrigatórios; Celular é opcional.
  // RA, pelotão, graduação, data de incorporação e turma são preenchidos
  // automaticamente na importação.
  const ws = XLSX.utils.json_to_sheet([
    { 'Nome Completo': 'SILVA, João Pedro',     'Nome de Guerra': 'SILVA', 'Celular (opcional)': '(19) 99999-1234' },
    { 'Nome Completo': 'SOUZA, Carlos Eduardo',  'Nome de Guerra': 'SOUZA', 'Celular (opcional)': '' },
  ]);
  ws['!cols'] = [{ wch: 32 }, { wch: 18 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Soldados');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="modelo_soldados.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
}

module.exports = { listar, buscarPorId, guardas, criar, atualizar, importar, modeloPlanilha };
