const { getDb } = require('../database/db');

// Subquery da turma ativa — todas as listagens/criações operam sobre ela.
const TURMA_ATIVA = "(SELECT id FROM turmas WHERE status = 'ativa' ORDER BY ano DESC LIMIT 1)";

function listar({ turma, pelotao, status, graduacao, busca } = {}) {
  const db = getDb();
  // Contagem de guardas CONCLUÍDAS por tipo (guardas já realizadas) via LEFT
  // JOIN com a agregação de escala_membros/escalas_guarda. Soldados sem guardas
  // concluídas → 0. A listagem mostra histórico; o perfil individual mostra
  // futuro (agendadas) — são contagens propositalmente diferentes.
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
    WHERE s.turma_id = ${TURMA_ATIVA}`;
  const params = [];

  if (turma)    { q += ' AND s.turma = ?';    params.push(turma); }
  if (pelotao)  { q += ' AND s.pelotao = ?';  params.push(pelotao); }
  if (status)   { q += ' AND s.status = ?';   params.push(status); }
  if (graduacao){ q += ' AND s.graduacao = ?'; params.push(graduacao); }
  if (busca) {
    q += ' AND (s.nome_completo LIKE ? OR s.nome_guerra LIKE ? OR s.ra LIKE ?)';
    params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
  }
  // Lista é exibida pelo nome de guerra → ordena por ele (fallback ao completo).
  q += ' ORDER BY COALESCE(NULLIF(s.nome_guerra, \'\'), s.nome_completo) ASC';
  return db.prepare(q).all(...params);
}

function buscarPorId(id) {
  return getDb().prepare('SELECT * FROM soldados WHERE id = ?').get(id);
}

// Id da turma ativa (a mesma usada pela subquery TURMA_ATIVA nas inserções).
function turmaAtivaId() {
  return getDb().prepare(
    "SELECT id FROM turmas WHERE status = 'ativa' ORDER BY ano DESC LIMIT 1"
  ).get()?.id ?? null;
}

// Ano (texto) da turma ativa — usado para preencher o campo texto `turma` do
// soldado, que é o que aparece nas listagens, perfil, relatórios e PDFs.
function turmaAtivaAno() {
  const ano = getDb().prepare(
    "SELECT ano FROM turmas WHERE status = 'ativa' ORDER BY ano DESC LIMIT 1"
  ).get()?.ano;
  return ano != null ? String(ano) : null;
}

// RA é único DENTRO da turma (cada turma reinicia o RA de 1 a 100). Retorna true
// se já existe outro soldado com o mesmo RA na turma (ignora o próprio na edição).
function raEmUso(ra, turmaId, soldadoId = null) {
  const row = getDb().prepare(
    'SELECT 1 FROM soldados WHERE ra = ? AND turma_id IS ? AND id != ? LIMIT 1'
  ).get(ra, turmaId, soldadoId ?? -1);
  return !!row;
}

// Histórico de guardas de um soldado.
// Ordenação: data DESC e, em empate, agendada vem antes de concluída/cancelada.
// Filtros opcionais por `tipo` (verde/preta/vermelha) e `situacao`
// (agendada/concluida/cancelada). Os `totais` SEMPRE refletem todas as guardas
// agendadas do soldado por tipo — não são afetados pelos filtros aplicados ao
// histórico, para que os contadores do card não mudem ao filtrar a tabela.
function guardasDoSoldado(id, { tipo, situacao } = {}) {
  const db = getDb();

  let q = `
    SELECT eg.id AS escala_id, eg.tipo, em.funcao, eg.data_inicio, eg.data_fim, eg.status
    FROM escala_membros em
    JOIN escalas_guarda eg ON eg.id = em.escala_id
    WHERE em.soldado_id = ?`;
  const params = [id];
  if (tipo)     { q += ' AND eg.tipo = ?';   params.push(tipo); }
  if (situacao) { q += ' AND eg.status = ?'; params.push(situacao); }
  q += `
    ORDER BY eg.data_inicio DESC,
      CASE eg.status
        WHEN 'agendada'  THEN 0
        WHEN 'concluida' THEN 1
        WHEN 'cancelada' THEN 2
        ELSE 3
      END ASC`;

  const historico = db.prepare(q).all(...params);

  const totais = db.prepare(`
    SELECT
      COUNT(CASE WHEN eg.tipo = 'verde'    AND eg.status = 'agendada' THEN 1 END) AS verde,
      COUNT(CASE WHEN eg.tipo = 'preta'    AND eg.status = 'agendada' THEN 1 END) AS preta,
      COUNT(CASE WHEN eg.tipo = 'vermelha' AND eg.status = 'agendada' THEN 1 END) AS vermelha
    FROM escala_membros em
    JOIN escalas_guarda eg ON eg.id = em.escala_id
    WHERE em.soldado_id = ?
  `).get(id);

  return { historico, totais };
}

function criar(dados) {
  const db = getDb();
  const { ra, nome_completo, nome_guerra, celular, data_nascimento, data_incorporacao, pelotao, turma, graduacao, status } = dados;
  // Se a turma (texto) não vier do formulário, usa o ano da turma ativa — é o
  // valor exibido em todo o sistema.
  const turmaTexto = (turma && String(turma).trim()) || turmaAtivaAno();
  const r = db.prepare(
    `INSERT INTO soldados (ra, nome_completo, nome_guerra, celular, data_nascimento, data_incorporacao, pelotao, turma, graduacao, status, turma_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${TURMA_ATIVA})`
  ).run(ra, nome_completo, nome_guerra, celular || null, data_nascimento || null, data_incorporacao || null, pelotao || null, turmaTexto, graduacao || 'atirador', status || 'ativo');
  return buscarPorId(r.lastInsertRowid);
}

function atualizar(id, dados) {
  const db = getDb();
  const { ra, nome_completo, nome_guerra, celular, data_nascimento, data_incorporacao, pelotao, turma, graduacao, status } = dados;
  db.prepare(
    `UPDATE soldados
     SET ra=?, nome_completo=?, nome_guerra=?, celular=?, data_nascimento=?, data_incorporacao=?, pelotao=?, turma=?, graduacao=?, status=?
     WHERE id=?`
  ).run(ra, nome_completo, nome_guerra, celular || null, data_nascimento || null, data_incorporacao || null, pelotao || null, turma || null, graduacao, status, id);
  return buscarPorId(id);
}

// Regras do TG 02-032 para importação:
// RA sequencial por turma (001-1, 002-1, …) e pelotão derivado do número do RA.
function formatarRA(n) { return `${String(n).padStart(3, '0')}-1`; }
function pelotaoPorNumero(n) {
  if (n >= 1   && n <= 25)  return '1º Pelotão';
  if (n >= 26  && n <= 50)  return '2º Pelotão';
  if (n >= 51  && n <= 75)  return '3º Pelotão';
  if (n >= 76  && n <= 100) return '4º Pelotão';
  return null; // além da capacidade (100) — pelotão indefinido
}

// Importa um lote de registros { nome_completo, nome_guerra, celular }. O sistema
// preenche o resto automaticamente:
// - RA: sequencial dentro da turma ativa (continua de onde parou);
// - Data de Incorporação: a mesma para todos (informada no formulário);
// - Pelotão: pelo número do RA; Graduação: 'atirador'; Turma: a ativa.
function importarLote(registros, dataIncorporacao) {
  const db = getDb();
  const turmaId = turmaAtivaId();
  // Preenche também o texto `turma` (ano da turma ativa) — é o que aparece nas
  // listagens, perfil, relatórios e PDFs.
  const turmaAno = turmaAtivaAno();

  const insert = db.prepare(
    `INSERT INTO soldados (ra, nome_completo, nome_guerra, celular, data_incorporacao, pelotao, turma, graduacao, status, turma_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'atirador', 'ativo', ?)`
  );

  const importarTodos = db.transaction((lista) => {
    // Continua a numeração a partir do MAIOR RA já existente na turma — não do
    // COUNT(*). Usar a contagem quebra quando há lacunas (soldados removidos) ou
    // RAs fora do padrão sequencial, gerando um RA que já existe e violando o
    // índice único (ra, turma_id). Também guardamos os RAs ocupados para pular
    // qualquer número já em uso.
    const ras = db.prepare('SELECT ra FROM soldados WHERE turma_id IS ?').all(turmaId);
    const ocupados = new Set(ras.map((r) => r.ra));
    let maxSeq = 0;
    for (const { ra } of ras) {
      const m = String(ra).match(/^(\d+)-1$/);
      if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
    }

    let seq = maxSeq;
    for (const reg of lista) {
      // Avança até achar um número de RA livre dentro da turma.
      do { seq += 1; } while (ocupados.has(formatarRA(seq)));
      ocupados.add(formatarRA(seq));
      insert.run(formatarRA(seq), reg.nome_completo, reg.nome_guerra, reg.celular || null, dataIncorporacao ?? null, pelotaoPorNumero(seq), turmaAno, turmaId);
    }
    return lista.length;
  });
  return importarTodos(registros);
}

module.exports = { listar, buscarPorId, guardasDoSoldado, criar, atualizar, importarLote, raEmUso, turmaAtivaId };
