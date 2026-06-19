const { getDb } = require('../database/db');
const pontos = require('./pontosModel');

// Subquery da turma ativa — escalas são criadas e listadas dentro dela.
const TURMA_ATIVA = "(SELECT id FROM turmas WHERE status = 'ativa' ORDER BY ano DESC LIMIT 1)";

// ── Filas de Rotação (modelo de 2 filas compartilhadas) ──────────────────────
// fila_cabos      (tipo_guarda='cabos')      → guardas preta e vermelha
// fila_atiradores (tipo_guarda='atiradores') → preta, vermelha e verde
// As posições crescem indefinidamente conforme os soldados são escalados; a
// fila só é "reiniciada" (renumerada de 1..N) quando todos deram uma volta
// completa — ver verificarEReiniciarFila.

const FILA_DE = { cabo: 'cabos', atirador: 'atiradores' };
const GRAD_DA_FILA = { cabos: 'cabo', atiradores: 'atirador' };

function _filaVazia(db, filaTipo) {
  return db.prepare('SELECT COUNT(*) AS c FROM fila_rotacao WHERE tipo_guarda = ?').get(filaTipo).c === 0;
}

// Inicializa uma fila a partir dos soldados ativos da graduação correspondente,
// ordenados por data de incorporação (mais antigo primeiro). Idempotente: só
// preenche se a fila estiver vazia.
function _inicializarFilaTipo(db, filaTipo) {
  if (!_filaVazia(db, filaTipo)) return;
  const graduacao = GRAD_DA_FILA[filaTipo];
  const soldados = db.prepare(`
    SELECT id FROM soldados
    WHERE graduacao = ? AND status = 'ativo'
    ORDER BY COALESCE(data_incorporacao, created_at) ASC, id ASC
  `).all(graduacao);

  const insert = db.prepare(
    'INSERT INTO fila_rotacao (soldado_id, tipo_guarda, posicao) VALUES (?, ?, ?) ON CONFLICT DO NOTHING'
  );
  soldados.forEach((s, i) => insert.run(s.id, filaTipo, i + 1));
}

// Garante que ambas as filas existam (chamada automaticamente nas operações).
function garantirFilas() {
  const db = getDb();
  db.transaction(() => {
    _inicializarFilaTipo(db, 'cabos');
    _inicializarFilaTipo(db, 'atiradores');
  })();
}

// Inicialização explícita (POST /api/escalas/fila/inicializar). Retorna as filas.
function inicializarFilas() {
  garantirFilas();
  return { cabos: listarFila('cabos'), atiradores: listarFila('atiradores') };
}

// ── Ressincronização das filas com a graduação atual ─────────────────────────
// As filas guardam soldados por graduação, mas a graduação muda ao longo do
// tempo (promoção atirador→cabo, rebaixamento cabo→atirador) e soldados podem
// ser removidos. Sem reconciliar, a fila fica inconsistente: um rebaixado
// continua na fila de cabos, um promovido nunca entra na de cabos, etc.
//
// _ressincronizarTipo reconcilia UMA fila quanto à GRADUAÇÃO:
//   - remove quem não tem mais a graduação da fila (foi promovido/rebaixado) ou
//     cujo soldado deixou de existir;
//   - adiciona ao fim os soldados ATIVOS com a graduação correta que ainda não
//     estão na fila (ex.: recém-promovidos).
// O status (licença/baixado/dispensado) NÃO retira a linha aqui — é filtrado na
// exibição (listarFila) e na sugestão; assim a posição na rotação é preservada
// caso o soldado volte a ficar ativo.
function _ressincronizarTipo(db, filaTipo) {
  const graduacao = GRAD_DA_FILA[filaTipo];

  // Retira da fila quem não corresponde mais à graduação dela (ou sumiu).
  db.prepare(`
    DELETE FROM fila_rotacao
    WHERE tipo_guarda = ?
      AND soldado_id NOT IN (SELECT id FROM soldados WHERE graduacao = ?)
  `).run(filaTipo, graduacao);

  // Acrescenta ao fim os ativos com a graduação certa que ainda não estão nela.
  const faltantes = db.prepare(`
    SELECT id FROM soldados
    WHERE graduacao = ? AND status = 'ativo'
      AND id NOT IN (SELECT soldado_id FROM fila_rotacao WHERE tipo_guarda = ?)
    ORDER BY COALESCE(data_incorporacao, created_at) ASC, id ASC
  `).all(graduacao, filaTipo);
  faltantes.forEach((s) => _garantirMembroNaFila(db, filaTipo, s.id));
}

// Reconciliação completa das duas filas. Idempotente. Deve rodar ao abrir a tela
// de Fila de Rotação e após qualquer alteração de graduação/efetivo dos soldados.
function ressincronizarFilas() {
  const db = getDb();
  db.transaction(() => {
    _inicializarFilaTipo(db, 'cabos');
    _inicializarFilaTipo(db, 'atiradores');
    _ressincronizarTipo(db, 'cabos');
    _ressincronizarTipo(db, 'atiradores');
  })();
}

// Insere o soldado no fim da fila caso ainda não esteja nela (ex.: soldado que
// estava em licença na inicialização, ou cadastrado depois).
function _garantirMembroNaFila(db, filaTipo, soldadoId) {
  const existe = db.prepare(
    'SELECT 1 FROM fila_rotacao WHERE soldado_id = ? AND tipo_guarda = ?'
  ).get(soldadoId, filaTipo);
  if (existe) return;
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(posicao),0) AS m FROM fila_rotacao WHERE tipo_guarda = ?'
  ).get(filaTipo).m;
  db.prepare(
    'INSERT INTO fila_rotacao (soldado_id, tipo_guarda, posicao) VALUES (?, ?, ?)'
  ).run(soldadoId, filaTipo, maxPos + 1);
}

// Avança um soldado para o fim da fila, guardando a posição anterior (para poder
// desfazer em uma alteração manual) e registrando a última escala.
function _avancarParaFim(db, filaTipo, soldadoId, escalaId, dataInicio) {
  _garantirMembroNaFila(db, filaTipo, soldadoId);
  const atual = db.prepare(
    'SELECT posicao FROM fila_rotacao WHERE soldado_id = ? AND tipo_guarda = ?'
  ).get(soldadoId, filaTipo).posicao;
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(posicao),0) AS m FROM fila_rotacao WHERE tipo_guarda = ?'
  ).get(filaTipo).m;
  db.prepare(`
    UPDATE fila_rotacao
    SET posicao_anterior = ?, posicao = ?, ultima_escala_id = ?, ultima_data = ?
    WHERE soldado_id = ? AND tipo_guarda = ?
  `).run(atual, maxPos + 1, escalaId ?? null, dataInicio ?? null, soldadoId, filaTipo);
}

// Reinicia a fila se todos os soldados ativos já deram uma volta completa
// (todos com posicao > total de ativos): reordena pelo valor atual de posicao
// e renumera de 1 a N, preservando a ordem em que terminaram a rodada.
function verificarEReiniciarFila(filaTipo) {
  const db = getDb();
  const ativos = db.prepare(`
    SELECT f.id FROM fila_rotacao f
    JOIN soldados s ON s.id = f.soldado_id
    WHERE f.tipo_guarda = ? AND s.status = 'ativo'
    ORDER BY f.posicao ASC
  `).all(filaTipo);

  const total = ativos.length;
  if (total === 0) return;

  const minima = db.prepare(`
    SELECT MIN(f.posicao) AS m FROM fila_rotacao f
    JOIN soldados s ON s.id = f.soldado_id
    WHERE f.tipo_guarda = ? AND s.status = 'ativo'
  `).get(filaTipo).m;

  // Se nem o primeiro da fila tem posição <= total, todos já rodaram.
  if (minima > total) {
    const upd = db.prepare('UPDATE fila_rotacao SET posicao = ? WHERE id = ?');
    ativos.forEach((r, i) => upd.run(i + 1, r.id));
  }
}

function listarFila(tipo) {
  // Reconcilia antes de listar: garante que a tela sempre reflita o estado atual
  // (promoções/rebaixamentos/remoções) e nunca mostre graduação inconsistente.
  ressincronizarFilas();
  const graduacao = GRAD_DA_FILA[tipo];
  return getDb().prepare(`
    SELECT f.posicao, f.posicao_anterior, f.ultima_data,
           s.id AS soldado_id, s.ra, s.nome_completo, s.nome_guerra, s.status, s.graduacao
    FROM fila_rotacao f
    JOIN soldados s ON s.id = f.soldado_id
    WHERE f.tipo_guarda = ? AND s.status = 'ativo' AND s.graduacao = ?
    ORDER BY f.posicao ASC
  `).all(tipo, graduacao);
}

// ── Disponibilidade / conflitos ──────────────────────────────────────────────

// Soldados ocupados em alguma escala não-cancelada com sobreposição de datas.
function _soldadosOcupados(db, dataInicio, dataFim, excluirEscalaId = null) {
  const rows = db.prepare(`
    SELECT DISTINCT em.soldado_id
    FROM escala_membros em
    JOIN escalas_guarda e ON e.id = em.escala_id
    WHERE e.status != 'cancelada'
      AND e.data_inicio <= ? AND e.data_fim >= ?
      AND (? IS NULL OR e.id != ?)
  `).all(dataFim, dataInicio, excluirEscalaId, excluirEscalaId);
  return new Set(rows.map((r) => r.soldado_id));
}

// Atiradores presos em uma guarda PRETA que cobre data_inicio OU data_fim da
// verde (restrição específica verde × preta).
function _atiradoresEmPretaCobrindo(db, dataInicio, dataFim) {
  const rows = db.prepare(`
    SELECT DISTINCT em.soldado_id
    FROM escala_membros em
    JOIN escalas_guarda e ON e.id = em.escala_id
    WHERE e.tipo = 'preta' AND e.status != 'cancelada'
      AND ( (e.data_inicio <= ? AND e.data_fim >= ?)
         OR (e.data_inicio <= ? AND e.data_fim >= ?) )
  `).all(dataInicio, dataInicio, dataFim, dataFim);
  return new Set(rows.map((r) => r.soldado_id));
}

// ── Sugestão automática ──────────────────────────────────────────────────────

function sugerirMembros(tipo, dataInicio, dataFim) {
  // Ressincroniza para que a sugestão considere a graduação atual de cada
  // soldado (cabos recém-promovidos entram, rebaixados saem da fila de cabos).
  ressincronizarFilas();
  const db = getDb();
  const ocupados = _soldadosOcupados(db, dataInicio, dataFim);

  // Próximos da fila, na ordem de posição, pulando indisponíveis.
  function proximos(filaTipo, graduacao, limite, excluir) {
    const fila = db.prepare(`
      SELECT s.id AS soldado_id, s.ra, s.nome_completo, s.nome_guerra, s.graduacao, f.posicao
      FROM fila_rotacao f
      JOIN soldados s ON s.id = f.soldado_id
      WHERE f.tipo_guarda = ? AND s.status = 'ativo' AND s.graduacao = ?
      ORDER BY f.posicao ASC
    `).all(filaTipo, graduacao);
    return fila.filter((c) => !excluir.has(c.soldado_id)).slice(0, limite);
  }

  if (tipo === 'verde') {
    const bloqueadosPreta = _atiradoresEmPretaCobrindo(db, dataInicio, dataFim);
    const excluir = new Set([...ocupados, ...bloqueadosPreta]);
    return { cabo: null, atiradores: proximos('atiradores', 'atirador', 1, excluir) };
  }

  // preta / vermelha
  return {
    cabo: proximos('cabos', 'cabo', 1, ocupados)[0] ?? null,
    atiradores: proximos('atiradores', 'atirador', 3, ocupados),
  };
}

function listarSoldadosElegiveis(tipo) {
  const db = getDb();
  const filtro = tipo === 'verde' ? "AND graduacao = 'atirador'" : '';
  return db.prepare(`
    SELECT id AS soldado_id, ra, nome_completo, nome_guerra, graduacao
    FROM soldados WHERE status = 'ativo' ${filtro}
    ORDER BY COALESCE(NULLIF(nome_guerra, ''), nome_completo) ASC
  `).all();
}

// Reordenação manual da fila (punição / adiamento). Opera sobre a fila
// cabos|atiradores. Não mexe em posicao_anterior (isso é exclusivo do fluxo de
// confirmação/troca de escala).
function reordenarFila(filaTipo, soldadoId, acao) {
  const db = getDb();
  garantirFilas();
  db.transaction(() => {
    if (acao === 'inicio') {
      const min = db.prepare(
        'SELECT COALESCE(MIN(posicao),1) AS m FROM fila_rotacao WHERE tipo_guarda = ?'
      ).get(filaTipo).m;
      db.prepare('UPDATE fila_rotacao SET posicao = ? WHERE soldado_id = ? AND tipo_guarda = ?')
        .run(min - 1, soldadoId, filaTipo);
    } else {
      const max = db.prepare(
        'SELECT COALESCE(MAX(posicao),0) AS m FROM fila_rotacao WHERE tipo_guarda = ?'
      ).get(filaTipo).m;
      db.prepare('UPDATE fila_rotacao SET posicao = ? WHERE soldado_id = ? AND tipo_guarda = ?')
        .run(max + 1, soldadoId, filaTipo);
    }
  })();
  return listarFila(filaTipo);
}

// ── Escalas CRUD ─────────────────────────────────────────────────────────────

function listarEscalas({ tipo, mes, ano, status } = {}) {
  const db = getDb();
  let q = `
    SELECT e.id, e.tipo, e.data_inicio, e.data_fim, e.status, e.observacoes,
           COUNT(em.id) AS total_membros
    FROM escalas_guarda e
    LEFT JOIN escala_membros em ON em.escala_id = e.id
    WHERE e.turma_id = ${TURMA_ATIVA}
  `;
  const p = [];
  if (tipo)   { q += ' AND e.tipo = ?';   p.push(tipo);   }
  if (status) { q += ' AND e.status = ?'; p.push(status); }
  if (mes && ano) {
    const mm = String(mes).padStart(2, '0');
    q += ` AND (e.data_inicio LIKE ? OR e.data_fim LIKE ?
             OR (e.data_inicio < ? AND e.data_fim > ?))`;
    p.push(`${ano}-${mm}%`, `${ano}-${mm}%`, `${ano}-${mm}-01`, `${ano}-${mm}-31`);
  }
  q += ' GROUP BY e.id ORDER BY e.data_inicio DESC';
  return db.prepare(q).all(...p);
}

// Existe outra guarda VERDE (não cancelada) começando exatamente neste dia?
// Usado para impedir duas verdes no mesmo dia. `excluirId` ignora uma escala
// específica (útil ao editar a própria escala).
function existeVerdeNoDia(data, excluirId = null) {
  return !!getDb().prepare(`
    SELECT 1 FROM escalas_guarda
    WHERE tipo = 'verde' AND status != 'cancelada' AND data_inicio = ?
      AND (? IS NULL OR id != ?)
    LIMIT 1
  `).get(data, excluirId, excluirId);
}

// Existe outra escala do tipo informado (não cancelada) começando exatamente em
// `dataInicio`? Verificação anti-duplicação espelhada pela constraint única
// (tipo, data_inicio) WHERE status != 'cancelada'. Usada na geração automática
// e na criação manual para verde/preta/vermelha. `excluirId` ignora a própria
// escala ao editar.
function existeEscalaTipoData(tipo, dataInicio, excluirId = null) {
  return !!getDb().prepare(`
    SELECT 1 FROM escalas_guarda
    WHERE tipo = ? AND status != 'cancelada' AND data_inicio = ?
      AND (? IS NULL OR id != ?)
    LIMIT 1
  `).get(tipo, dataInicio, excluirId, excluirId);
}

// Existe alguma escala do tipo informado (não cancelada) que cobre o período
// [dataInicio, dataFim]? Usado na geração para não duplicar preta/vermelha.
function existeEscalaCobrindo(tipo, dataInicio, dataFim) {
  return !!getDb().prepare(`
    SELECT 1 FROM escalas_guarda
    WHERE tipo = ? AND status != 'cancelada'
      AND data_inicio <= ? AND data_fim >= ?
    LIMIT 1
  `).get(tipo, dataFim, dataInicio);
}

function buscarEscala(id) {
  const db = getDb();
  const e = db.prepare('SELECT * FROM escalas_guarda WHERE id = ?').get(id);
  if (!e) return null;
  e.membros = db.prepare(`
    SELECT em.funcao, em.motivo_repeticao,
           s.id AS soldado_id, s.ra, s.nome_completo, s.nome_guerra, s.graduacao
    FROM escala_membros em
    JOIN soldados s ON s.id = em.soldado_id
    WHERE em.escala_id = ?
    ORDER BY em.funcao DESC, COALESCE(NULLIF(s.nome_guerra, ''), s.nome_completo) ASC
  `).all(id);
  return e;
}

// Confirmação de escala: grava a escala e seus membros, avança cada membro para
// o fim da fila correspondente (cabos|atiradores) e verifica reinício das filas.
function criarEscala({ tipo, data_inicio, data_fim, observacoes, membros, criado_por }) {
  const db = getDb();
  garantirFilas();

  const escalaId = db.transaction(() => {
    const r = db.prepare(`
      INSERT INTO escalas_guarda (tipo, data_inicio, data_fim, observacoes, criado_por, turma_id)
      VALUES (?, ?, ?, ?, ?, ${TURMA_ATIVA})
    `).run(tipo, data_inicio, data_fim, observacoes ?? null, criado_por ?? null);

    const id = r.lastInsertRowid;
    const ins = db.prepare('INSERT INTO escala_membros (escala_id, soldado_id, funcao) VALUES (?, ?, ?)');
    for (const m of membros) {
      ins.run(id, m.soldado_id, m.funcao);
      _avancarParaFim(db, FILA_DE[m.funcao], m.soldado_id, id, data_inicio);
    }
    return id;
  })();

  // Reinício avaliado após o commit lógico das movimentações.
  verificarEReiniciarFila('cabos');
  verificarEReiniciarFila('atiradores');

  return buscarEscala(escalaId);
}

function atualizarEscala(id, { data_inicio, data_fim, observacoes, membros }) {
  const db = getDb();
  db.prepare('UPDATE escalas_guarda SET data_inicio=?, data_fim=?, observacoes=? WHERE id=?')
    .run(data_inicio, data_fim, observacoes ?? null, id);

  if (membros) {
    db.prepare('DELETE FROM escala_membros WHERE escala_id = ?').run(id);
    const ins = db.prepare('INSERT INTO escala_membros (escala_id, soldado_id, funcao) VALUES (?, ?, ?)');
    for (const m of membros) ins.run(id, m.soldado_id, m.funcao);
  }
  return buscarEscala(id);
}

// Alteração manual: troca um membro já escalado por outro. O removido volta para
// a posição que tinha antes de ser escalado (desfaz o avanço); o novo vai para o
// fim da fila e recebe o motivo da repetição.
function alterarMembro(escalaId, soldadoRemovidoId, soldadoNovoId, motivo) {
  const db = getDb();
  return db.transaction(() => {
    const escala = db.prepare('SELECT data_inicio FROM escalas_guarda WHERE id = ?').get(escalaId);
    if (!escala) return { erro: 'Escala não encontrada.' };

    const membro = db.prepare(
      'SELECT funcao FROM escala_membros WHERE escala_id = ? AND soldado_id = ?'
    ).get(escalaId, soldadoRemovidoId);
    if (!membro) return { erro: 'Soldado removido não pertence a esta escala.' };

    const jaPresente = db.prepare(
      'SELECT 1 FROM escala_membros WHERE escala_id = ? AND soldado_id = ?'
    ).get(escalaId, soldadoNovoId);
    if (jaPresente) return { erro: 'O soldado novo já está nesta escala.' };

    const novo = db.prepare('SELECT graduacao FROM soldados WHERE id = ?').get(soldadoNovoId);
    if (!novo) return { erro: 'Soldado novo não encontrado.' };
    if (novo.graduacao !== membro.funcao) {
      return { erro: `A função exige um ${membro.funcao}, mas o soldado escolhido é ${novo.graduacao}.` };
    }

    const filaTipo = FILA_DE[membro.funcao];

    // 1. Remove o membro antigo.
    db.prepare('DELETE FROM escala_membros WHERE escala_id = ? AND soldado_id = ?')
      .run(escalaId, soldadoRemovidoId);

    // 2. Devolve o removido à posição anterior (desfaz o avanço).
    const ant = db.prepare(
      'SELECT posicao_anterior FROM fila_rotacao WHERE soldado_id = ? AND tipo_guarda = ?'
    ).get(soldadoRemovidoId, filaTipo);
    if (ant && ant.posicao_anterior != null) {
      db.prepare('UPDATE fila_rotacao SET posicao = ? WHERE soldado_id = ? AND tipo_guarda = ?')
        .run(ant.posicao_anterior, soldadoRemovidoId, filaTipo);
    }

    // 3. Insere o novo membro (mesma função) com o motivo.
    db.prepare(
      'INSERT INTO escala_membros (escala_id, soldado_id, funcao, motivo_repeticao) VALUES (?, ?, ?, ?)'
    ).run(escalaId, soldadoNovoId, membro.funcao, motivo ?? null);

    // 4. Avança o novo para o fim da fila.
    _avancarParaFim(db, filaTipo, soldadoNovoId, escalaId, escala.data_inicio);

    return { ok: true };
  })();
}

// Conclui/altera o status de uma escala. Ao concluir (status = 'concluida'),
// os soldados informados em `ausentes` recebem +20 pontos de falta em guarda
// (uma única vez por escala). `ausentes` é uma lista de soldado_id.
function alterarStatus(id, status, { ausentes = [], registradoPor } = {}) {
  const db = getDb();
  const escala = db.prepare('SELECT status FROM escalas_guarda WHERE id = ?').get(id);
  db.prepare('UPDATE escalas_guarda SET status = ? WHERE id = ?').run(status, id);

  const concluindoAgora = status === 'concluida' && escala && escala.status !== 'concluida';
  if (concluindoAgora && ausentes.length > 0) {
    const membros = db.prepare('SELECT soldado_id FROM escala_membros WHERE escala_id = ?').all(id);
    const idsMembros = new Set(membros.map((m) => m.soldado_id));
    const marcar = db.prepare('UPDATE escala_membros SET compareceu = 0 WHERE escala_id = ? AND soldado_id = ?');
    for (const soldadoId of ausentes) {
      if (!idsMembros.has(soldadoId)) continue;       // só membros da escala
      marcar.run(id, soldadoId);
      if (!pontos.faltaGuardaJaRegistrada(soldadoId, id)) {
        pontos.registrarFaltaGuarda(soldadoId, id, registradoPor);
      }
    }
  }
  return buscarEscala(id);
}

function removerEscala(id) {
  getDb().prepare('DELETE FROM escalas_guarda WHERE id = ?').run(id);
}

function historicoPorSoldado(soldadoId) {
  return getDb().prepare(`
    SELECT e.id, e.tipo, e.data_inicio, e.data_fim, e.status, em.funcao
    FROM escala_membros em
    JOIN escalas_guarda e ON e.id = em.escala_id
    WHERE em.soldado_id = ?
    ORDER BY e.data_inicio DESC
  `).all(soldadoId);
}

// ── Calendário ───────────────────────────────────────────────────────────────

function calendario(ano, mes) {
  const db = getDb();
  const mm    = String(mes).padStart(2, '0');
  const inicio = `${ano}-${mm}-01`;
  const fim    = `${ano}-${mm}-31`;

  const escalas = db.prepare(`
    SELECT e.id, e.tipo, e.data_inicio, e.data_fim, e.status,
           COUNT(em.id) AS total_membros
    FROM escalas_guarda e
    LEFT JOIN escala_membros em ON em.escala_id = e.id
    WHERE e.status != 'cancelada'
      AND e.turma_id = ${TURMA_ATIVA}
      AND e.data_inicio <= ? AND e.data_fim >= ?
    GROUP BY e.id
    ORDER BY e.data_inicio ASC
  `).all(fim, inicio);

  const bloqueios = db.prepare(
    'SELECT * FROM periodos_bloqueados WHERE data_inicio <= ? AND data_fim >= ? ORDER BY data_inicio ASC'
  ).all(fim, inicio);

  return { escalas, bloqueios };
}

// ── Bloqueios de Período ──────────────────────────────────────────────────────

function estaBloequeado(data) {
  return !!getDb().prepare(
    'SELECT id FROM periodos_bloqueados WHERE data_inicio <= ? AND data_fim >= ? LIMIT 1'
  ).get(data, data);
}

function listarBloqueios() {
  return getDb().prepare('SELECT * FROM periodos_bloqueados ORDER BY data_inicio DESC').all();
}

function criarBloqueio({ data_inicio, data_fim, motivo, criado_por }) {
  const db = getDb();
  const r = db.prepare(
    'INSERT INTO periodos_bloqueados (data_inicio, data_fim, motivo, criado_por) VALUES (?,?,?,?)'
  ).run(data_inicio, data_fim, motivo ?? null, criado_por ?? null);
  return db.prepare('SELECT * FROM periodos_bloqueados WHERE id = ?').get(r.lastInsertRowid);
}

function removerBloqueio(id) {
  getDb().prepare('DELETE FROM periodos_bloqueados WHERE id = ?').run(id);
}

module.exports = {
  garantirFilas, ressincronizarFilas, inicializarFilas, listarFila, sugerirMembros, listarSoldadosElegiveis,
  reordenarFila, verificarEReiniciarFila, existeVerdeNoDia, existeEscalaTipoData, existeEscalaCobrindo,
  listarEscalas, buscarEscala, criarEscala, atualizarEscala, alterarMembro,
  alterarStatus, removerEscala, historicoPorSoldado, calendario,
  estaBloequeado, listarBloqueios, criarBloqueio, removerBloqueio,
};
