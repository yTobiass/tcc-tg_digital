const { getDb } = require('../database/db');

function resumo() {
  const db = getDb();

  const efetivo = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'ativo'              THEN 1 ELSE 0 END) AS ativos,
      SUM(CASE WHEN status IN ('ativo','licenca') THEN 1 ELSE 0 END) AS total_efetivo
    FROM soldados
  `).get();

  // Soldados que apareceram em qualquer treino hoje (presente ou não)
  const presencaHoje = db.prepare(`
    SELECT
      COUNT(*)        AS total_registrados,
      SUM(max_pres)   AS presentes
    FROM (
      SELECT soldado_id, MAX(presente) AS max_pres
      FROM   registros_treino
      WHERE  data = DATE('now', 'localtime')
      GROUP  BY soldado_id
    )
  `).get();

  // Soldados ativos sem avaliação TAF nos últimos 90 dias
  const semAvaliacao = db.prepare(`
    SELECT COUNT(*) AS n
    FROM   soldados
    WHERE  status = 'ativo'
    AND    id NOT IN (
      SELECT DISTINCT soldado_id
      FROM   avaliacoes
      WHERE  data >= DATE('now', '-90 days')
    )
  `).get().n;

  return {
    totalAtivos:    efetivo.ativos        || 0,
    totalEfetivo:   efetivo.total_efetivo || 0,
    presencaHoje: {
      presentes:        presencaHoje.presentes        || 0,
      totalRegistrados: presencaHoje.total_registrados || 0,
    },
    soldadosSemAvaliacao: semAvaliacao,
  };
}

// Agrupa registros das últimas 4 semanas em buckets semanais (4 pontos)
function presencaSemanal() {
  return getDb().prepare(`
    SELECT
      (CAST(julianday(data) AS INTEGER) / 7)  AS semana_key,
      DATE(MIN(data))                          AS semana_inicio,
      ROUND(100.0 * SUM(presente) / COUNT(*), 1) AS taxa,
      CAST(SUM(presente) AS INTEGER)           AS presentes,
      COUNT(*)                                 AS total
    FROM   registros_treino
    WHERE  data >= DATE('now', '-28 days')
    GROUP  BY semana_key
    ORDER  BY semana_key ASC
  `).all();
}

// Taxa de presença por pelotão nos últimos 30 dias
function presencaPorPelotao() {
  return getDb().prepare(`
    SELECT
      COALESCE(NULLIF(TRIM(s.pelotao), ''), 'Sem pelotão') AS pelotao,
      ROUND(100.0 * SUM(r.presente) / COUNT(*), 1)         AS taxa,
      CAST(SUM(r.presente) AS INTEGER)                     AS presentes,
      COUNT(*)                                              AS total
    FROM   registros_treino r
    JOIN   soldados s ON s.id = r.soldado_id
    WHERE  r.data >= DATE('now', '-30 days')
    GROUP  BY s.pelotao
    ORDER  BY s.pelotao ASC
  `).all();
}

// Escalas agendadas nos próximos 7 dias
function proximasEscalas() {
  return getDb().prepare(`
    SELECT
      e.id, e.tipo, e.data_inicio, e.data_fim, e.status
    FROM   escalas_guarda e
    WHERE  e.data_inicio <= DATE('now', '+7 days', 'localtime')
      AND  e.data_fim    >= DATE('now', 'localtime')
      AND  e.status      IN ('agendada', 'em_andamento')
    ORDER  BY e.data_inicio ASC
    LIMIT  7
  `).all();
}

// Alertas de disciplina: soldados ativos com 90+ pontos (crítico) ou 2+ FATDs
// (risco de expulsão). Ordenados do mais crítico para o menos crítico.
function alertasDisciplina() {
  return getDb().prepare(`
    SELECT id, nome_completo, pelotao, total_pontos, total_fatd, status
    FROM   soldados
    WHERE  status = 'ativo'
      AND  (total_pontos >= 90 OR total_fatd >= 2)
    ORDER  BY total_fatd DESC, total_pontos DESC
    LIMIT  20
  `).all();
}

module.exports = { resumo, presencaSemanal, presencaPorPelotao, proximasEscalas, alertasDisciplina };
