const { z } = require('zod');
const XLSX = require('xlsx');
const model = require('../models/soldadoModel');

const schemaSoldado = z.object({
  ra: z.string().min(1, 'RA é obrigatório'),
  nome_completo: z.string().min(1, 'Nome completo é obrigatório'),
  data_nascimento: z.string().nullable().optional(),
  data_incorporacao: z.string().nullable().optional(),
  pelotao: z.string().nullable().optional(),
  turma: z.string().nullable().optional(),
  graduacao: z.enum(['atirador', 'cabo']).default('atirador'),
  status: z.enum(['ativo', 'licenca', 'baixado', 'dispensado']).default('ativo'),
});

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

function guardas(req, res) {
  const id = Number(req.params.id);
  // Regra de Negócio nº 7: um soldado só acessa o próprio histórico.
  if (req.user.role === 'soldado' && id !== req.user.soldado_id) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  if (!model.buscarPorId(id)) return res.status(404).json({ error: 'Soldado não encontrado.' });
  res.json(model.guardasDoSoldado(id));
}

function criar(req, res) {
  const resultado = schemaSoldado.safeParse(req.body);
  if (!resultado.success) return res.status(400).json({ error: resultado.error.issues[0].message });
  try {
    res.status(201).json(model.criar(resultado.data));
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Já existe um soldado com este RA.' });
    throw err;
  }
}

function atualizar(req, res) {
  if (!model.buscarPorId(Number(req.params.id))) return res.status(404).json({ error: 'Soldado não encontrado.' });
  const resultado = schemaSoldado.safeParse(req.body);
  if (!resultado.success) return res.status(400).json({ error: resultado.error.issues[0].message });
  try {
    res.json(model.atualizar(Number(req.params.id), resultado.data));
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Já existe um soldado com este RA.' });
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

  // A planilha tem apenas a coluna "Nome Completo"; o resto é preenchido
  // automaticamente (RA sequencial, pelotão pelo RA, graduação atirador, turma ativa).
  const erros = [];
  const nomes = [];

  linhas.forEach((linha, i) => {
    const n = i + 2;
    const nome = String(linha['Nome Completo'] || '').trim();
    if (!nome) { erros.push(`Linha ${n}: Nome Completo obrigatório.`); return; }
    nomes.push(nome);
  });

  if (nomes.length === 0) return res.status(400).json({ error: 'Nenhum registro válido.', erros });

  try {
    const importados = model.importarLote(nomes, dataIncorporacao);
    res.json({ importados, erros });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar dados.', detalhe: err.message });
  }
}

function modeloPlanilha(_req, res) {
  const wb = XLSX.utils.book_new();
  // Apenas a coluna Nome Completo — RA, pelotão, graduação, data de incorporação
  // e turma são preenchidos automaticamente na importação.
  const ws = XLSX.utils.json_to_sheet([
    { 'Nome Completo': 'SILVA, João Pedro' },
    { 'Nome Completo': 'SOUZA, Carlos Eduardo' },
  ]);
  ws['!cols'] = [{ wch: 32 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Soldados');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="modelo_soldados.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
}

module.exports = { listar, buscarPorId, guardas, criar, atualizar, importar, modeloPlanilha };
