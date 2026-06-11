const { getDb } = require('../database/db');

// Expressão SQL (sem placeholder) para filtrar pela turma. Se `turmaId` é um
// inteiro válido, filtra por ele; senão, pela turma ATIVA. Injetada inline para
// não interferir na ordem de binding dos demais parâmetros.
function turmaFiltroSQL(turmaId, alias = 's') {
  const col = alias ? `${alias}.turma_id` : 'turma_id';
  const n = Number(turmaId);
  if (Number.isInteger(n) && n > 0) return `${col} = ${n}`;
  return `${col} = (SELECT id FROM turmas WHERE status = 'ativa' ORDER BY ano DESC LIMIT 1)`;
}

function presenca({ dataInicio, dataFim, turma, pelotao, soldadoId, turmaId } = {}) {
  const db = getDb();
  let where = turmaFiltroSQL(turmaId);
  const params = [];

  if (soldadoId) { where += ' AND s.id = ?';        params.push(soldadoId); }
  if (turma)     { where += ' AND s.turma = ?';      params.push(turma); }
  if (pelotao)   { where += ' AND s.pelotao = ?';    params.push(pelotao); }

  // Parâmetros para o JOIN (data range na cláusula ON para não excluir soldados sem registros)
  const joinParams = [];
  let joinWhere = '1=1';
  if (dataInicio) { joinWhere += ' AND r.data >= ?'; joinParams.push(dataInicio); }
  if (dataFim)    { joinWhere += ' AND r.data <= ?'; joinParams.push(dataFim); }

  const sql = `
    SELECT
      s.id        AS soldado_id,
      s.nome_completo,
      s.ra,
      s.pelotao,
      s.turma,
      s.status,
      s.graduacao,
      COUNT(r.id)                                                                  AS total_registros,
      COALESCE(SUM(CASE WHEN r.presente = 1 THEN 1 ELSE 0 END), 0)                AS presentes,
      COALESCE(SUM(CASE WHEN r.presente = 0 THEN 1 ELSE 0 END), 0)                AS ausentes,
      CASE
        WHEN COUNT(r.id) > 0
        THEN ROUND(100.0 * SUM(CASE WHEN r.presente = 1 THEN 1 ELSE 0 END) / COUNT(r.id), 1)
        ELSE NULL
      END AS taxa_presenca
    FROM soldados s
    LEFT JOIN registros_treino r
      ON r.soldado_id = s.id AND ${joinWhere}
    WHERE ${where}
    GROUP BY s.id
    ORDER BY s.nome_completo ASC
  `;

  return db.prepare(sql).all(...params, ...joinParams);
}

function evolucao({ tipoTreinoId, soldadoId, dataInicio, dataFim, turmaId } = {}) {
  const db = getDb();
  const params = [];

  // Filtra pela turma sempre (via JOIN soldados em ambas as consultas).
  let where = `r.presente = 1 AND r.resultado IS NOT NULL AND ${turmaFiltroSQL(turmaId)}`;
  if (tipoTreinoId) { where += ' AND r.tipo_treino_id = ?'; params.push(tipoTreinoId); }
  if (soldadoId)    { where += ' AND r.soldado_id = ?';     params.push(soldadoId); }
  if (dataInicio)   { where += ' AND r.data >= ?';          params.push(dataInicio); }
  if (dataFim)      { where += ' AND r.data <= ?';          params.push(dataFim); }

  if (soldadoId) {
    // Resultados individuais por data
    return db.prepare(`
      SELECT
        r.data,
        r.resultado,
        t.nome   AS tipo_nome,
        t.unidade,
        s.nome_completo AS soldado_nome
      FROM registros_treino r
      JOIN tipos_treino t ON t.id = r.tipo_treino_id
      JOIN soldados s     ON s.id = r.soldado_id
      WHERE ${where}
      ORDER BY r.data ASC
    `).all(...params);
  }

  // Média da turma por data
  return db.prepare(`
    SELECT
      r.data,
      ROUND(AVG(r.resultado), 1)  AS media_resultado,
      COUNT(*)                    AS total_presentes,
      t.nome                      AS tipo_nome,
      t.unidade
    FROM registros_treino r
    JOIN tipos_treino t ON t.id = r.tipo_treino_id
    JOIN soldados s     ON s.id = r.soldado_id
    WHERE ${where}
    GROUP BY r.data
    ORDER BY r.data ASC
  `).all(...params);
}

function efetivo({ turmaId } = {}) {
  const db = getDb();
  const filtro = turmaFiltroSQL(turmaId);
  const filtroSemAlias = turmaFiltroSQL(turmaId, '');

  const soldados = db.prepare(`
    SELECT
      s.*,
      (
        SELECT COUNT(*)
        FROM escala_membros em
        JOIN escalas_guarda eg ON eg.id = em.escala_id
        WHERE em.soldado_id = s.id AND eg.status = 'concluida'
      ) AS guardas_concluidas
    FROM soldados s
    WHERE ${filtro}
    ORDER BY s.nome_completo ASC
  `).all();

  const porStatus = db.prepare(`
    SELECT status, COUNT(*) AS total FROM soldados WHERE ${filtroSemAlias} GROUP BY status
  `).all();

  const porGraduacao = db.prepare(`
    SELECT graduacao, COUNT(*) AS total
    FROM soldados
    WHERE status NOT IN ('baixado', 'dispensado') AND ${filtroSemAlias}
    GROUP BY graduacao
  `).all();

  const resumo = {
    total: soldados.length,
    por_status: Object.fromEntries(porStatus.map((r) => [r.status, r.total])),
    por_graduacao: Object.fromEntries(porGraduacao.map((r) => [r.graduacao, r.total])),
  };

  return { soldados, resumo };
}

module.exports = { presenca, evolucao, efetivo };
