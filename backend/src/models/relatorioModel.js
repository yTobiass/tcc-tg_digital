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

  // Todas as FALTAS vêm de registros_pontos — a fonte única, alimentada pela aba
  // Faltas. O relatório distingue FALTAS COMUNS (tipo 'falta') de FALTAS NAS
  // GUARDAS (tipo 'falta_guarda'), em colunas separadas.

  // A "data da falta" cobre registros novos (data_referencia) e antigos (created_at).
  const DATA_FALTA = "COALESCE(rp.data_referencia, date(rp.created_at))";

  const faltParams = [];
  let faltWhere = "rp.tipo IN ('falta', 'falta_guarda')";
  if (dataInicio) { faltWhere += ` AND ${DATA_FALTA} >= ?`; faltParams.push(dataInicio); }
  if (dataFim)    { faltWhere += ` AND ${DATA_FALTA} <= ?`; faltParams.push(dataFim); }

  let where = turmaFiltroSQL(turmaId);
  const whereParams = [];
  if (soldadoId) { where += ' AND s.id = ?';      whereParams.push(soldadoId); }
  if (turma)     { where += ' AND s.turma = ?';   whereParams.push(turma); }
  if (pelotao)   { where += ' AND s.pelotao = ?'; whereParams.push(pelotao); }

  const sql = `
    SELECT
      s.id        AS soldado_id,
      s.nome_completo,
      s.ra,
      s.pelotao,
      s.turma,
      s.status,
      s.graduacao,
      COALESCE(falt.faltas, 0)        AS faltas,
      COALESCE(falt.faltas_guarda, 0) AS faltas_guarda
    FROM soldados s
    LEFT JOIN (
      SELECT rp.soldado_id,
             SUM(CASE WHEN rp.tipo = 'falta'        THEN 1 ELSE 0 END) AS faltas,
             SUM(CASE WHEN rp.tipo = 'falta_guarda' THEN 1 ELSE 0 END) AS faltas_guarda
      FROM registros_pontos rp
      WHERE ${faltWhere}
      GROUP BY rp.soldado_id
    ) falt ON falt.soldado_id = s.id
    WHERE ${where}
    ORDER BY s.nome_completo ASC
  `;

  return db.prepare(sql).all(...faltParams, ...whereParams);
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

module.exports = { presenca, efetivo };
