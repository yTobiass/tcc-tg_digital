const { getDb } = require('../database/db');

function resumo() {
  const db = getDb();

  const efetivo = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'ativo'              THEN 1 ELSE 0 END) AS ativos,
      SUM(CASE WHEN status IN ('ativo','licenca') THEN 1 ELSE 0 END) AS total_efetivo
    FROM soldados
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
    soldadosSemAvaliacao: semAvaliacao,
  };
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
    SELECT id, nome_completo, nome_guerra, pelotao, total_pontos, total_fatd, status
    FROM   soldados
    WHERE  status = 'ativo'
      AND  (total_pontos >= 90 OR total_fatd >= 2)
    ORDER  BY total_fatd DESC, total_pontos DESC
    LIMIT  20
  `).all();
}

module.exports = { resumo, proximasEscalas, alertasDisciplina };
