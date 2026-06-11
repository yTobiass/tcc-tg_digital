const { getDb } = require('../database/db');

// Subquery da turma ativa — todo registro de pontos é vinculado a ela.
const TURMA_ATIVA = "(SELECT id FROM turmas WHERE status = 'ativa' ORDER BY ano DESC LIMIT 1)";

// Data local de hoje no formato 'YYYY-MM-DD' (meio-dia evita problemas de fuso).
function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Cálculo da tabela progressiva de pontos por falta ────────────────────────
// total_faltas_atuais = número de faltas comuns ANTES desta nova falta.
function calcularPontosFalta(totalFaltasAtuais) {
  const novaFalta = totalFaltasAtuais + 1;
  if (novaFalta <= 3) return 2;
  if (novaFalta <= 6) return 4;
  return 6;
}

function buscarSoldado(db, id) {
  return db.prepare('SELECT * FROM soldados WHERE id = ?').get(id);
}

// Registra a expulsão (status = 'dispensado'), a ocorrência e remove o soldado
// das escalas futuras agendadas. Chamada sempre que pontos são adicionados.
function verificarExpulsao(db, soldadoId, totalPontos, totalFatd) {
  if (totalPontos >= 120 || totalFatd >= 3) {
    db.prepare("UPDATE soldados SET status = 'dispensado' WHERE id = ?").run(soldadoId);

    const motivo = totalFatd >= 3 ? '3 FATDs acumulados' : '120 pontos atingidos';
    db.prepare(`
      INSERT INTO ocorrencias (soldado_id, tipo, descricao, data)
      VALUES (?, 'expulsao', ?, datetime('now'))
    `).run(soldadoId, motivo);

    // Remove das escalas futuras ainda agendadas.
    db.prepare(`
      DELETE FROM escala_membros
      WHERE soldado_id = ?
        AND escala_id IN (
          SELECT id FROM escalas_guarda
          WHERE status = 'agendada' AND data_inicio > date('now')
        )
    `).run(soldadoId);

    return { expulso: true, motivo };
  }
  return { expulso: false };
}

// Reativa um soldado dispensado caso os pontos tenham voltado abaixo do limite
// e ele tenha menos de 3 FATDs.
function verificarReativacao(db, soldadoId) {
  const s = buscarSoldado(db, soldadoId);
  if (s && s.status === 'dispensado' && s.total_pontos < 120 && s.total_fatd < 3) {
    db.prepare("UPDATE soldados SET status = 'ativo' WHERE id = ?").run(soldadoId);
    db.prepare(`
      INSERT INTO ocorrencias (soldado_id, tipo, descricao, data)
      VALUES (?, 'reativacao', 'Reativado automaticamente após redução de pontos', datetime('now'))
    `).run(soldadoId);
    return true;
  }
  return false;
}

// ── Registro de falta comum (tabela progressiva) ─────────────────────────────
// `data` = dia da falta ('YYYY-MM-DD'); default hoje. Opcional para manter
// compatibilidade com chamadas existentes (treino).
function registrarFalta(soldadoId, referenciaId, registradoPor, data = null) {
  const db = getDb();
  const soldado = buscarSoldado(db, soldadoId);
  if (!soldado) return null;

  const pontos = calcularPontosFalta(soldado.total_faltas);
  const novoTotal = soldado.total_pontos + pontos;
  const novoTotalFaltas = soldado.total_faltas + 1;

  db.prepare(`
    INSERT INTO registros_pontos (soldado_id, tipo, pontos, total_acumulado, referencia_id, data_referencia, registrado_por, turma_id)
    VALUES (?, 'falta', ?, ?, ?, ?, ?, ${TURMA_ATIVA})
  `).run(soldadoId, pontos, novoTotal, referenciaId ?? null, data ?? hojeISO(), registradoPor ?? null);

  db.prepare('UPDATE soldados SET total_pontos = ?, total_faltas = ? WHERE id = ?')
    .run(novoTotal, novoTotalFaltas, soldadoId);

  return { ...verificarExpulsao(db, soldadoId, novoTotal, soldado.total_fatd), pontos, total_acumulado: novoTotal };
}

// ── Registro de falta em guarda (+20 fixo, não mexe na tabela progressiva) ────
function registrarFaltaGuarda(soldadoId, escalaId, registradoPor, data = null) {
  const db = getDb();
  const soldado = buscarSoldado(db, soldadoId);
  if (!soldado) return null;

  const pontos = 20;
  const novoTotal = soldado.total_pontos + pontos;

  db.prepare(`
    INSERT INTO registros_pontos (soldado_id, tipo, pontos, total_acumulado, referencia_id, data_referencia, registrado_por, turma_id)
    VALUES (?, 'falta_guarda', 20, ?, ?, ?, ?, ${TURMA_ATIVA})
  `).run(soldadoId, novoTotal, escalaId ?? null, data ?? hojeISO(), registradoPor ?? null);

  db.prepare('UPDATE soldados SET total_pontos = ? WHERE id = ?').run(novoTotal, soldadoId);

  return { ...verificarExpulsao(db, soldadoId, novoTotal, soldado.total_fatd), pontos, total_acumulado: novoTotal };
}

// ── Registro de FATD (+10, expulsa no 3º) ────────────────────────────────────
function registrarFATD(soldadoId, observacao, registradoPor) {
  const db = getDb();
  const soldado = buscarSoldado(db, soldadoId);
  if (!soldado) return null;

  const novoTotalFatd = soldado.total_fatd + 1;
  const pontos = 10;
  const novoTotal = soldado.total_pontos + pontos;

  db.prepare(`
    INSERT INTO registros_pontos (soldado_id, tipo, pontos, total_acumulado, fatd_numero, observacao, registrado_por, turma_id)
    VALUES (?, 'fatd', 10, ?, ?, ?, ?, ${TURMA_ATIVA})
  `).run(soldadoId, novoTotal, novoTotalFatd, observacao ?? null, registradoPor ?? null);

  db.prepare('UPDATE soldados SET total_pontos = ?, total_fatd = ? WHERE id = ?')
    .run(novoTotal, novoTotalFatd, soldadoId);

  const r = verificarExpulsao(db, soldadoId, novoTotal, novoTotalFatd);
  return { ...r, fatd_numero: novoTotalFatd, total_acumulado: novoTotal };
}

// ── Ajuste manual de pontos (sargento/comandante) ────────────────────────────
function ajustarPontos(soldadoId, novoTotal, motivo, usuarioId) {
  const db = getDb();
  const soldado = buscarSoldado(db, soldadoId);
  if (!soldado) return null;

  const diferenca = novoTotal - soldado.total_pontos;

  db.prepare('UPDATE soldados SET total_pontos = ? WHERE id = ?').run(novoTotal, soldadoId);

  db.prepare(`
    INSERT INTO registros_pontos (soldado_id, tipo, pontos, total_acumulado, observacao, registrado_por, turma_id)
    VALUES (?, 'ajuste_manual', ?, ?, ?, ?, ${TURMA_ATIVA})
  `).run(soldadoId, diferenca, novoTotal, motivo ?? null, usuarioId ?? null);

  verificarExpulsao(db, soldadoId, novoTotal, soldado.total_fatd);
  // Caso o ajuste tenha baixado os pontos, reverte uma eventual dispensa.
  verificarReativacao(db, soldadoId);

  return buscarSoldado(db, soldadoId);
}

// ── Estorno de um registro de pontos (sargento/comandante) ───────────────────
function estornarPonto(registroId, motivo, usuarioId) {
  const db = getDb();
  const registro = db.prepare('SELECT * FROM registros_pontos WHERE id = ?').get(registroId);
  if (!registro) return { erro: 'Registro não encontrado.' };

  const soldado = buscarSoldado(db, registro.soldado_id);

  // Reverte os acumuladores conforme o tipo do registro estornado.
  let q = 'UPDATE soldados SET total_pontos = total_pontos - ?';
  const params = [registro.pontos];
  if (registro.tipo === 'falta') q += ', total_faltas = MAX(total_faltas - 1, 0)';
  if (registro.tipo === 'fatd')  q += ', total_fatd = MAX(total_fatd - 1, 0)';
  q += ' WHERE id = ?';
  params.push(registro.soldado_id);
  db.prepare(q).run(...params);

  db.prepare('DELETE FROM registros_pontos WHERE id = ?').run(registroId);

  db.prepare(`
    INSERT INTO ocorrencias (soldado_id, tipo, descricao, data, registrado_por)
    VALUES (?, 'estorno', ?, datetime('now'), ?)
  `).run(registro.soldado_id, motivo || 'Estorno de registro de pontos', usuarioId ?? null);

  // Reverte expulsão se os pontos voltaram abaixo do limite.
  verificarReativacao(db, registro.soldado_id);

  return { ok: true, soldado: buscarSoldado(db, registro.soldado_id) };
}

// ── Consultas ────────────────────────────────────────────────────────────────
function historico(soldadoId) {
  return getDb().prepare(`
    SELECT rp.id, rp.tipo, rp.pontos, rp.total_acumulado, rp.fatd_numero,
           rp.referencia_id, rp.observacao, rp.created_at,
           u.nome AS registrado_por_nome
    FROM registros_pontos rp
    LEFT JOIN usuarios u ON u.id = rp.registrado_por
    WHERE rp.soldado_id = ?
    ORDER BY rp.id DESC
  `).all(soldadoId);
}

// Já existe uma falta registrada para um dado registro_treino?
function faltaJaRegistrada(referenciaId) {
  return !!getDb().prepare(
    "SELECT 1 FROM registros_pontos WHERE tipo = 'falta' AND referencia_id = ? LIMIT 1"
  ).get(referenciaId);
}

// Já existe falta em guarda registrada para este soldado nesta escala?
function faltaGuardaJaRegistrada(soldadoId, escalaId) {
  return !!getDb().prepare(
    "SELECT 1 FROM registros_pontos WHERE tipo = 'falta_guarda' AND soldado_id = ? AND referencia_id = ? LIMIT 1"
  ).get(soldadoId, escalaId);
}

// ── Faltas (aba dedicada) ────────────────────────────────────────────────────
// A "data da falta" é COALESCE(data_referencia, date(created_at)) — cobre tanto
// registros novos (com data_referencia) quanto antigos (fallback ao created_at).
const DATA_FALTA = "COALESCE(rp.data_referencia, date(rp.created_at))";

// Histórico de faltas (apenas tipos 'falta' e 'falta_guarda') com filtros.
function historicoFaltas({ busca, de, ate, tipo } = {}) {
  let q = `
    SELECT rp.id, rp.tipo, rp.pontos, rp.total_acumulado, rp.observacao,
           ${DATA_FALTA} AS data, rp.created_at,
           s.id AS soldado_id, s.ra, s.nome_completo, s.pelotao,
           u.nome AS registrado_por_nome
    FROM registros_pontos rp
    JOIN soldados s ON s.id = rp.soldado_id
    LEFT JOIN usuarios u ON u.id = rp.registrado_por
    WHERE rp.tipo IN ('falta', 'falta_guarda')
      AND rp.turma_id = ${TURMA_ATIVA}
  `;
  const params = [];
  if (tipo === 'falta' || tipo === 'falta_guarda') { q += ' AND rp.tipo = ?'; params.push(tipo); }
  if (busca) { q += ' AND (s.nome_completo LIKE ? OR s.ra LIKE ?)'; params.push(`%${busca}%`, `%${busca}%`); }
  if (de)  { q += ` AND ${DATA_FALTA} >= ?`; params.push(de); }
  if (ate) { q += ` AND ${DATA_FALTA} <= ?`; params.push(ate); }
  q += ` ORDER BY ${DATA_FALTA} DESC, rp.id DESC`;
  return getDb().prepare(q).all(...params);
}

// soldado_ids (e tipo) com falta numa data — para pré-marcar os checkboxes.
function faltasDoDia(data) {
  return getDb().prepare(`
    SELECT DISTINCT rp.soldado_id, rp.tipo
    FROM registros_pontos rp
    WHERE rp.tipo IN ('falta', 'falta_guarda') AND rp.turma_id = ${TURMA_ATIVA} AND ${DATA_FALTA} = ?
  `).all(data);
}

// Registra uma falta avulsa (comum ou em guarda) numa data.
function registrarFaltaIndividual(soldadoId, tipo, data, escalaId, registradoPor) {
  if (tipo === 'falta_guarda') {
    return registrarFaltaGuarda(soldadoId, escalaId ?? null, registradoPor, data);
  }
  return registrarFalta(soldadoId, null, registradoPor, data);
}

// Registra várias faltas de uma vez. Retorna resumo com expulsões (nome incluso).
function registrarFaltaLote(data, faltas, registradoPor) {
  const db = getDb();
  let registradas = 0;
  let pontosDistribuidos = 0;
  const expulsoes = [];

  const aplicar = db.transaction(() => {
    for (const f of faltas) {
      const r = registrarFaltaIndividual(f.soldado_id, f.tipo, data, f.escala_id ?? null, registradoPor);
      if (!r) continue;
      registradas++;
      pontosDistribuidos += r.pontos ?? 0;
      if (r.expulso) {
        const s = buscarSoldado(db, f.soldado_id);
        expulsoes.push({ soldado_id: f.soldado_id, nome_completo: s?.nome_completo, motivo: r.motivo });
      }
    }
  });
  aplicar();

  return { registradas, pontos_distribuidos: pontosDistribuidos, expulsoes };
}

module.exports = {
  calcularPontosFalta,
  registrarFalta,
  registrarFaltaGuarda,
  registrarFATD,
  ajustarPontos,
  estornarPonto,
  historico,
  faltaJaRegistrada,
  faltaGuardaJaRegistrada,
  historicoFaltas,
  faltasDoDia,
  registrarFaltaIndividual,
  registrarFaltaLote,
};
