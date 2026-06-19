const { getDb } = require('../database/db');

function nomeGuerra(nomeCompleto = '') {
  const nome = (nomeCompleto || '').trim();
  if (!nome) return '';
  // Formato "SOBRENOME, Nome" → nome de guerra é o sobrenome (antes da vírgula).
  if (nome.includes(',')) return nome.split(',')[0].trim().toUpperCase();
  const partes = nome.split(/\s+/);
  return partes[partes.length - 1].toUpperCase();
}

// Nome de guerra de exibição: usa a coluna nome_guerra (preenchida no cadastro)
// e, na ausência dela (dados antigos), deriva do nome completo.
function nomeDeGuerra(soldado) {
  const guerra = (soldado?.nome_guerra || '').trim();
  return guerra || nomeGuerra(soldado?.nome_completo);
}

function listar({ limit = 50, offset = 0 } = {}) {
  return getDb().prepare(`
    SELECT dr.id, dr.data_servico, dr.data_para, dr.parada_diaria_status,
           dr.pdf_gerado, dr.created_at,
           dr.registrado_por, u.nome AS registrado_por_nome
    FROM diario_rotina dr
    LEFT JOIN usuarios u ON u.id = dr.registrado_por
    ORDER BY dr.data_servico DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
}

function total() {
  return getDb().prepare('SELECT COUNT(*) AS c FROM diario_rotina').get().c;
}

const SELECT_COM_REGISTRADOR = `
  SELECT dr.*, u.nome AS registrado_por_nome
  FROM diario_rotina dr
  LEFT JOIN usuarios u ON u.id = dr.registrado_por
`;

function buscarPorData(data) {
  const d = getDb().prepare(`${SELECT_COM_REGISTRADOR} WHERE dr.data_servico = ?`).get(data);
  return d ? parsearJson(d) : null;
}

function buscarPorId(id) {
  const d = getDb().prepare(`${SELECT_COM_REGISTRADOR} WHERE dr.id = ?`).get(id);
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

function atualizar(id, dados, registradoPor) {
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
      passagem_monitor_numero = ?, passagem_monitor_nome = ?,
      registrado_por = COALESCE(?, registrado_por)
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
    registradoPor ?? null,
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
      SELECT s.id, s.ra, s.nome_completo, s.nome_guerra, s.graduacao, em.funcao
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
      SELECT s.id, s.ra, s.nome_completo, s.nome_guerra, s.graduacao
      FROM escala_membros em
      JOIN soldados s ON s.id = em.soldado_id
      WHERE em.escala_id = ? AND em.funcao = 'cabo'
      LIMIT 1
    `).get(escalaId);
    if (!m) return null;
    return { id: m.id, ra: m.ra, nome: m.nome_completo, nomeGuerra: nomeDeGuerra(m), graduacao: m.graduacao };
  }

  let escala = null;
  const membrosDoDia = escalaDia ? membros(escalaDia.id) : [];
  if (escalaDia) {
    const cabo = membrosDoDia.find((m) => m.funcao === 'cabo');
    const ats  = membrosDoDia.filter((m) => m.funcao === 'atirador');
    escala = {
      id: escalaDia.id,
      tipo: escalaDia.tipo,
      cabo: cabo
        ? { id: cabo.id, ra: cabo.ra, nome: cabo.nome_completo, nomeGuerra: nomeDeGuerra(cabo), graduacao: cabo.graduacao }
        : null,
      atiradores: ats.map((a) => ({
        id: a.id, ra: a.ra, nome: a.nome_completo, nomeGuerra: nomeDeGuerra(a), graduacao: a.graduacao,
      })),
    };
  }

  const ctxAnterior = escalaAnterior ? { id: escalaAnterior.id, cabo: caboDeEscala(escalaAnterior.id) } : null;
  const ctxSeguinte = escalaSeguinte ? { id: escalaSeguinte.id, cabo: caboDeEscala(escalaSeguinte.id) } : null;

  // Lista achatada de soldados envolvidos no preenchimento do diário (escala do
  // dia + cabos das anterior/seguinte), no formato que o frontend usa nos
  // selects. Inclui id e graduacao para o SoldadoSelect funcionar mesmo quando
  // o usuário não tem permissão para listar todos os soldados (caso do soldado).
  const soldadosDoContexto = [];
  const vistos = new Set();
  function adicionar(m) {
    if (!m || !m.id || vistos.has(m.id)) return;
    vistos.add(m.id);
    soldadosDoContexto.push({
      id: m.id,
      ra: m.ra,
      nome_completo: m.nome ?? m.nome_completo,
      nome_guerra: m.nomeGuerra ?? m.nome_guerra ?? '',
      graduacao: m.graduacao ?? 'atirador',
      status: 'ativo',
    });
  }
  membrosDoDia.forEach(adicionar);
  if (ctxAnterior?.cabo) adicionar(ctxAnterior.cabo);
  if (ctxSeguinte?.cabo) adicionar(ctxSeguinte.cabo);

  return {
    escala,
    escalaAnterior: ctxAnterior,
    escalaSeguinte: ctxSeguinte,
    soldadosDoContexto,
  };
}

module.exports = { listar, total, buscarPorData, buscarPorId, criar, atualizar, marcarPdfGerado, contexto, nomeGuerra };
