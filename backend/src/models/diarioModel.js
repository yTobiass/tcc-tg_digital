const { getDb } = require('../database/db');

function nomeGuerra(nomeCompleto = '') {
  const partes = nomeCompleto.trim().split(/\s+/);
  return partes[partes.length - 1].toUpperCase();
}

function listar({ limit = 50, offset = 0 } = {}) {
  return getDb().prepare(`
    SELECT id, data_servico, data_para, parada_diaria_status, pdf_gerado, created_at
    FROM diario_rotina
    ORDER BY data_servico DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
}

function total() {
  return getDb().prepare('SELECT COUNT(*) AS c FROM diario_rotina').get().c;
}

function buscarPorData(data) {
  const d = getDb().prepare('SELECT * FROM diario_rotina WHERE data_servico = ?').get(data);
  return d ? parsearJson(d) : null;
}

function buscarPorId(id) {
  const d = getDb().prepare('SELECT * FROM diario_rotina WHERE id = ?').get(id);
  return d ? parsearJson(d) : null;
}

function parsearJson(d) {
  if (d.postos_sentinela && typeof d.postos_sentinela === 'string') {
    try { d.postos_sentinela = JSON.parse(d.postos_sentinela); } catch { d.postos_sentinela = []; }
  }
  if (d.atiradores && typeof d.atiradores === 'string') {
    try { d.atiradores = JSON.parse(d.atiradores); } catch { d.atiradores = []; }
  }
  return d;
}

function criar(dados, registradoPor) {
  const db = getDb();
  const {
    data_servico, data_para,
    parada_diaria_status, parada_diaria_descricao,
    recebimento_monitor_numero, recebimento_monitor_nome, recebimento_status,
    escala_id,
    cabo_ra, cabo_nome,
    atiradores,
    postos_sentinela,
    material_carga_status, material_carga_descricao,
    instalacoes_status, instalacoes_descricao,
    iluminacao_status, iluminacao_descricao,
    ocorrencias_texto,
    passagem_monitor_numero, passagem_monitor_nome,
  } = dados;

  const r = db.prepare(`
    INSERT INTO diario_rotina (
      data_servico, data_para,
      parada_diaria_status, parada_diaria_descricao,
      recebimento_monitor_numero, recebimento_monitor_nome, recebimento_status,
      escala_id, cabo_ra, cabo_nome, atiradores, postos_sentinela,
      material_carga_status, material_carga_descricao,
      instalacoes_status, instalacoes_descricao,
      iluminacao_status, iluminacao_descricao,
      ocorrencias_texto,
      passagem_monitor_numero, passagem_monitor_nome,
      registrado_por
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    data_servico, data_para,
    parada_diaria_status, parada_diaria_descricao ?? null,
    recebimento_monitor_numero ?? null, recebimento_monitor_nome ?? null, recebimento_status,
    escala_id ?? null, cabo_ra ?? null, cabo_nome ?? null,
    atiradores ? JSON.stringify(atiradores) : null,
    postos_sentinela ? JSON.stringify(postos_sentinela) : null,
    material_carga_status, material_carga_descricao ?? null,
    instalacoes_status, instalacoes_descricao ?? null,
    iluminacao_status, iluminacao_descricao ?? null,
    ocorrencias_texto ?? null,
    passagem_monitor_numero ?? null, passagem_monitor_nome ?? null,
    registradoPor ?? null,
  );
  return buscarPorId(r.lastInsertRowid);
}

function atualizar(id, dados) {
  const db = getDb();
  const {
    parada_diaria_status, parada_diaria_descricao,
    recebimento_monitor_numero, recebimento_monitor_nome, recebimento_status,
    escala_id, cabo_ra, cabo_nome, atiradores, postos_sentinela,
    material_carga_status, material_carga_descricao,
    instalacoes_status, instalacoes_descricao,
    iluminacao_status, iluminacao_descricao,
    ocorrencias_texto,
    passagem_monitor_numero, passagem_monitor_nome,
  } = dados;

  db.prepare(`
    UPDATE diario_rotina SET
      parada_diaria_status = ?, parada_diaria_descricao = ?,
      recebimento_monitor_numero = ?, recebimento_monitor_nome = ?, recebimento_status = ?,
      escala_id = ?, cabo_ra = ?, cabo_nome = ?, atiradores = ?, postos_sentinela = ?,
      material_carga_status = ?, material_carga_descricao = ?,
      instalacoes_status = ?, instalacoes_descricao = ?,
      iluminacao_status = ?, iluminacao_descricao = ?,
      ocorrencias_texto = ?,
      passagem_monitor_numero = ?, passagem_monitor_nome = ?
    WHERE id = ? AND pdf_gerado = 0
  `).run(
    parada_diaria_status, parada_diaria_descricao ?? null,
    recebimento_monitor_numero ?? null, recebimento_monitor_nome ?? null, recebimento_status,
    escala_id ?? null, cabo_ra ?? null, cabo_nome ?? null,
    atiradores ? JSON.stringify(atiradores) : null,
    postos_sentinela ? JSON.stringify(postos_sentinela) : null,
    material_carga_status, material_carga_descricao ?? null,
    instalacoes_status, instalacoes_descricao ?? null,
    iluminacao_status, iluminacao_descricao ?? null,
    ocorrencias_texto ?? null,
    passagem_monitor_numero ?? null, passagem_monitor_nome ?? null,
    id,
  );
  return buscarPorId(id);
}

function marcarPdfGerado(id) {
  getDb().prepare('UPDATE diario_rotina SET pdf_gerado = 1 WHERE id = ?').run(id);
  return buscarPorId(id);
}

function contexto(data) {
  const db = getDb();

  function membros(escalaId) {
    return db.prepare(`
      SELECT s.ra, s.nome_completo, em.funcao
      FROM escala_membros em
      JOIN soldados s ON s.id = em.soldado_id
      WHERE em.escala_id = ?
    `).all(escalaId);
  }

  const escalaDia = db.prepare(`
    SELECT id, tipo FROM escalas_guarda
    WHERE data_inicio <= ? AND data_fim >= ? AND status != 'cancelada'
    ORDER BY data_inicio DESC LIMIT 1
  `).get(data, data);

  const escalaAnterior = db.prepare(`
    SELECT id FROM escalas_guarda
    WHERE data_fim < ? AND status != 'cancelada'
    ORDER BY data_fim DESC LIMIT 1
  `).get(data);

  const escalaSeguinte = db.prepare(`
    SELECT id FROM escalas_guarda
    WHERE data_inicio > ? AND status != 'cancelada'
    ORDER BY data_inicio ASC LIMIT 1
  `).get(data);

  function caboDeEscala(escalaId) {
    if (!escalaId) return null;
    const m = db.prepare(`
      SELECT s.ra, s.nome_completo
      FROM escala_membros em
      JOIN soldados s ON s.id = em.soldado_id
      WHERE em.escala_id = ? AND em.funcao = 'cabo'
      LIMIT 1
    `).get(escalaId);
    if (!m) return null;
    return { ra: m.ra, nome: m.nome_completo, nomeGuerra: nomeGuerra(m.nome_completo) };
  }

  let escala = null;
  if (escalaDia) {
    const todos = membros(escalaDia.id);
    const cabo = todos.find((m) => m.funcao === 'cabo');
    const ats  = todos.filter((m) => m.funcao === 'atirador');
    escala = {
      id: escalaDia.id,
      tipo: escalaDia.tipo,
      cabo: cabo ? { ra: cabo.ra, nome: cabo.nome_completo, nomeGuerra: nomeGuerra(cabo.nome_completo) } : null,
      atiradores: ats.map((a) => ({ ra: a.ra, nome: a.nome_completo, nomeGuerra: nomeGuerra(a.nome_completo) })),
    };
  }

  return {
    escala,
    escalaAnterior: escalaAnterior ? { id: escalaAnterior.id, cabo: caboDeEscala(escalaAnterior.id) } : null,
    escalaSeguinte: escalaSeguinte ? { id: escalaSeguinte.id, cabo: caboDeEscala(escalaSeguinte.id) } : null,
  };
}

module.exports = { listar, total, buscarPorData, buscarPorId, criar, atualizar, marcarPdfGerado, contexto, nomeGuerra };
