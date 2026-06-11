const { getDb } = require('../database/db');

// Subquery da turma ativa — todas as listagens/criações operam sobre ela.
const TURMA_ATIVA = "(SELECT id FROM turmas WHERE status = 'ativa' ORDER BY ano DESC LIMIT 1)";

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
    WHERE s.turma_id = ${TURMA_ATIVA}`;
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
    `INSERT INTO soldados (ra, nome_completo, data_nascimento, data_incorporacao, pelotao, turma, graduacao, status, turma_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${TURMA_ATIVA})`
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

// Importa um lote informando apenas os nomes. O sistema preenche o resto:
// - RA: sequencial dentro da turma ativa (continua de onde parou);
// - Data de Incorporação: a mesma para todos (informada no formulário);
// - Pelotão: pelo número do RA; Graduação: 'atirador'; Turma: a ativa.
function importarLote(nomes, dataIncorporacao) {
  const db = getDb();
  const turmaId = db.prepare(`SELECT id FROM turmas WHERE status = 'ativa' ORDER BY ano DESC LIMIT 1`).get()?.id ?? null;

  const insert = db.prepare(
    `INSERT INTO soldados (ra, nome_completo, data_incorporacao, pelotao, graduacao, status, turma_id)
     VALUES (?, ?, ?, ?, 'atirador', 'ativo', ?)`
  );

  const importarTodos = db.transaction((lista) => {
    // Continua a numeração a partir do efetivo já existente na turma ativa.
    const existentes = db.prepare('SELECT COUNT(*) c FROM soldados WHERE turma_id = ?').get(turmaId).c;
    let seq = existentes;
    for (const nome of lista) {
      seq += 1;
      insert.run(formatarRA(seq), nome, dataIncorporacao ?? null, pelotaoPorNumero(seq), turmaId);
    }
    return lista.length;
  });
  return importarTodos(nomes);
}

module.exports = { listar, buscarPorId, guardasDoSoldado, criar, atualizar, importarLote };
