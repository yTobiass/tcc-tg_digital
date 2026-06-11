const { getDb } = require('../database/db');
const pontos = require('./pontosModel');

function listarTipos() {
  return getDb().prepare('SELECT * FROM tipos_treino ORDER BY nome').all();
}

// Retorna todos os soldados ativos + seus registros já salvos para a sessão
function buscarSessao(data, tipoTreinoId) {
  return getDb().prepare(`
    SELECT
      s.id  AS soldado_id,
      s.ra,
      s.nome_completo,
      s.pelotao,
      s.turma,
      r.id  AS registro_id,
      r.presente,
      r.resultado,
      r.observacao
    FROM soldados s
    LEFT JOIN registros_treino r
      ON r.soldado_id = s.id
      AND r.data = ?
      AND r.tipo_treino_id = ?
    WHERE s.status = 'ativo'
    ORDER BY s.nome_completo ASC
  `).all(data, tipoTreinoId);
}

function salvarLote({ data, tipoTreinoId, registros, registradoPor }) {
  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO registros_treino
      (soldado_id, tipo_treino_id, data, presente, resultado, observacao, registrado_por)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(soldado_id, tipo_treino_id, data) DO UPDATE SET
      presente      = excluded.presente,
      resultado     = excluded.resultado,
      observacao    = excluded.observacao,
      registrado_por = excluded.registrado_por
  `);

  const buscarId = db.prepare(
    'SELECT id FROM registros_treino WHERE soldado_id = ? AND tipo_treino_id = ? AND data = ?'
  );

  const tx = db.transaction((lista) => {
    for (const r of lista) {
      const presente = r.presente ? 1 : 0;
      upsert.run(
        r.soldado_id, tipoTreinoId, data,
        presente,
        r.presente && r.resultado != null && r.resultado !== '' ? Number(r.resultado) : null,
        r.observacao || null,
        registradoPor
      );

      // Integração com o módulo de pontos: ao marcar ausência (presente=0),
      // registra a falta progressiva uma única vez por registro de treino.
      if (!presente) {
        const reg = buscarId.get(r.soldado_id, tipoTreinoId, data);
        if (reg && !pontos.faltaJaRegistrada(reg.id)) {
          pontos.registrarFalta(r.soldado_id, reg.id, registradoPor);
        }
      }
    }
    return lista.length;
  });

  return tx(registros);
}

// Histórico agrupado por sessão (data + tipo)
function listarSessoes({ tipoTreinoId, dataInicio, dataFim } = {}) {
  let q = `
    SELECT
      r.data,
      r.tipo_treino_id,
      t.nome  AS tipo_nome,
      t.unidade,
      COUNT(*)        AS total,
      SUM(r.presente) AS presentes
    FROM registros_treino r
    JOIN tipos_treino t ON t.id = r.tipo_treino_id
    WHERE 1=1
  `;
  const params = [];
  if (tipoTreinoId) { q += ' AND r.tipo_treino_id = ?'; params.push(tipoTreinoId); }
  if (dataInicio)   { q += ' AND r.data >= ?';          params.push(dataInicio); }
  if (dataFim)      { q += ' AND r.data <= ?';          params.push(dataFim); }
  q += ' GROUP BY r.data, r.tipo_treino_id ORDER BY r.data DESC, t.nome ASC LIMIT 100';
  return getDb().prepare(q).all(...params);
}

// Agregados para o dashboard de treinos (últimas 4 semanas)
function dadosDashboard() {
  const db = getDb();
  const presencaSemanal = db.prepare(`
    SELECT
      DATE(data, 'weekday 0', '-6 days') AS semana_inicio,
      ROUND(100.0 * SUM(presente) / COUNT(*), 1) AS taxa_presenca
    FROM registros_treino
    WHERE data >= DATE('now', '-28 days')
    GROUP BY semana_inicio
    ORDER BY semana_inicio ASC
  `).all();

  const presencaPorTipo = db.prepare(`
    SELECT
      t.nome AS tipo,
      ROUND(100.0 * SUM(r.presente) / COUNT(*), 1) AS taxa_presenca,
      COUNT(*) AS total_registros
    FROM registros_treino r
    JOIN tipos_treino t ON t.id = r.tipo_treino_id
    WHERE r.data >= DATE('now', '-28 days')
    GROUP BY r.tipo_treino_id
    ORDER BY taxa_presenca DESC
  `).all();

  return { presencaSemanal, presencaPorTipo };
}

module.exports = { listarTipos, buscarSessao, salvarLote, listarSessoes, dadosDashboard };
