const { getDb } = require('../database/db');

// ── Turma ativa ──────────────────────────────────────────────────────────────

function buscarTurmaAtiva() {
  return getDb().prepare("SELECT * FROM turmas WHERE status = 'ativa' ORDER BY ano DESC LIMIT 1").get() ?? null;
}

// id da turma ativa (helper usado por outros models para vincular registros).
function idTurmaAtiva(db = getDb()) {
  const t = db.prepare("SELECT id FROM turmas WHERE status = 'ativa' ORDER BY ano DESC LIMIT 1").get();
  return t ? t.id : null;
}

// Garante que sempre exista uma turma ativa (chamada na subida do sistema).
// Se não houver nenhuma, cria a do ano corrente.
function garantirTurmaAtiva() {
  const db = getDb();
  const existe = db.prepare("SELECT id FROM turmas WHERE status = 'ativa' LIMIT 1").get();
  if (existe) return buscarTurmaAtiva();
  db.prepare(`
    INSERT INTO turmas (ano, status, data_inicio)
    VALUES (CAST(strftime('%Y','now') AS INTEGER), 'ativa', datetime('now'))
  `).run();
  return buscarTurmaAtiva();
}

// ── Consultas ────────────────────────────────────────────────────────────────

// Todas as turmas (ativa + encerradas), com o total de soldados: snapshot para
// encerradas, contagem ao vivo para a ativa.
function listarTurmas() {
  return getDb().prepare(`
    SELECT t.*,
           COALESCE(t.total_soldados, (SELECT COUNT(*) FROM soldados s WHERE s.turma_id = t.id)) AS total_soldados
    FROM turmas t
    ORDER BY t.ano DESC
  `).all();
}

function buscarTurma(id) {
  const t = getDb().prepare('SELECT * FROM turmas WHERE id = ?').get(id);
  if (!t) return null;
  if (t.total_soldados == null) {
    t.total_soldados = getDb().prepare('SELECT COUNT(*) c FROM soldados WHERE turma_id = ?').get(id).c;
  }
  return t;
}

function soldadosDaTurma(turmaId) {
  return getDb().prepare(`
    SELECT id, ra, nome_completo, pelotao, graduacao, status,
           total_pontos, total_fatd, total_faltas
    FROM soldados WHERE turma_id = ?
    ORDER BY nome_completo ASC
  `).all(turmaId);
}

function escalasDaTurma(turmaId) {
  return getDb().prepare(`
    SELECT e.id, e.tipo, e.data_inicio, e.data_fim, e.status,
           COUNT(em.id) AS total_membros
    FROM escalas_guarda e
    LEFT JOIN escala_membros em ON em.escala_id = e.id
    WHERE e.turma_id = ?
    GROUP BY e.id
    ORDER BY e.data_inicio DESC
  `).all(turmaId);
}

function faltasDaTurma(turmaId) {
  return getDb().prepare(`
    SELECT rp.id, rp.tipo, rp.pontos, rp.total_acumulado,
           COALESCE(rp.data_referencia, date(rp.created_at)) AS data,
           s.ra, s.nome_completo, s.pelotao,
           u.nome AS registrado_por_nome
    FROM registros_pontos rp
    JOIN soldados s ON s.id = rp.soldado_id
    LEFT JOIN usuarios u ON u.id = rp.registrado_por
    WHERE rp.turma_id = ? AND rp.tipo IN ('falta', 'falta_guarda')
    ORDER BY data DESC, rp.id DESC
  `).all(turmaId);
}

// Ocorrências (expulsões, estornos, reativações…) dos soldados da turma.
function ocorrenciasDaTurma(turmaId) {
  return getDb().prepare(`
    SELECT o.id, o.tipo, o.descricao, o.data, s.ra, s.nome_completo
    FROM ocorrencias o
    JOIN soldados s ON s.id = o.soldado_id
    WHERE s.turma_id = ?
    ORDER BY o.data DESC, o.id DESC
  `).all(turmaId);
}

// ── Encerramento ─────────────────────────────────────────────────────────────

// Encerra a turma ativa e abre a do ano seguinte. Preserva todo o histórico.
function encerrarTurma(comandanteId) {
  const db = getDb();
  return db.transaction(() => {
    const ativa = db.prepare("SELECT * FROM turmas WHERE status = 'ativa' ORDER BY ano DESC LIMIT 1").get();
    if (!ativa) return { erro: 'Nenhuma turma ativa encontrada.' };

    const total = db.prepare('SELECT COUNT(*) c FROM soldados WHERE turma_id = ?').get(ativa.id).c;

    // 1. Cancela as escalas ainda agendadas da turma.
    db.prepare("UPDATE escalas_guarda SET status = 'cancelada' WHERE turma_id = ? AND status = 'agendada'").run(ativa.id);

    // 2. Zera a fila de rotação (a nova turma inicializa do zero).
    db.prepare('DELETE FROM fila_rotacao').run();

    // 3. Encerra a turma atual (snapshot do efetivo).
    db.prepare(`
      UPDATE turmas
      SET status = 'encerrada', data_encerramento = datetime('now'),
          total_soldados = ?, encerrado_por = ?
      WHERE id = ?
    `).run(total, comandanteId ?? null, ativa.id);

    // 4. Cria a nova turma ativa (ano seguinte).
    const novoAno = ativa.ano + 1;
    const jaExiste = db.prepare('SELECT 1 FROM turmas WHERE ano = ?').get(novoAno);
    if (jaExiste) return { erro: `Já existe uma turma para ${novoAno}.` };

    db.prepare("INSERT INTO turmas (ano, status, data_inicio) VALUES (?, 'ativa', datetime('now'))").run(novoAno);

    return { sucesso: true, turma_encerrada: ativa.ano, nova_turma: novoAno };
  })();
}

module.exports = {
  buscarTurmaAtiva, idTurmaAtiva, garantirTurmaAtiva,
  listarTurmas, buscarTurma, soldadosDaTurma, escalasDaTurma,
  faltasDaTurma, ocorrenciasDaTurma, encerrarTurma,
};
