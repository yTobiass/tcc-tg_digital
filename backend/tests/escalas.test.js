// Testes de regressão do módulo de escalas / fila de rotação.
// Rodar com:  npm test   (usa um banco temporário — não toca no banco real)
const { test, before, beforeEach, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tg-test-'));
process.env.DB_PATH = path.join(tmpDir, 'teste.db');

const knexfile = require('../src/database/knexfile');
let db, soldados, escalas, geracao, turmas, soldadoCtrl;

before(async () => {
  const knex = require('knex')(knexfile);
  await knex.migrate.latest();
  await knex.destroy();
  db = require('../src/database/db').getDb();
  soldados = require('../src/models/soldadoModel');
  escalas = require('../src/models/escalasModel');
  geracao = require('../src/services/geracaoEscalas');
  turmas = require('../src/models/turmaModel');
  soldadoCtrl = require('../src/controllers/soldadoController');
});

after(() => {
  mock.timers.reset();
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// Segunda-feira, 01/06/2026, 10h.
const INICIO = new Date('2026-06-01T10:00:00').getTime();

beforeEach(() => {
  mock.timers.reset();
  mock.timers.enable({ apis: ['Date'], now: INICIO });
  for (const t of ['escala_membros', 'escalas_guarda', 'fila_rotacao', 'registros_pontos', 'ocorrencias', 'soldados', 'turmas']) {
    db.prepare(`DELETE FROM ${t}`).run();
  }
  db.prepare("INSERT INTO turmas (ano, status, data_inicio) VALUES (2026, 'ativa', datetime('now'))").run();
});

// ── helpers ──────────────────────────────────────────────────────────────────
function importar(n, prefixo = 'S') {
  soldados.importarLote(
    Array.from({ length: n }, (_, i) => ({ nome_completo: `FULANO ${prefixo}${i + 1}`, nome_guerra: `${prefixo}${i + 1}` })),
    '2026-03-01'
  );
}
const idDe = (guerra) => db.prepare(
  "SELECT s.id FROM soldados s JOIN turmas t ON t.id = s.turma_id WHERE s.nome_guerra = ? AND t.status = 'ativa'"
).get(guerra).id;

// Edita o soldado pelo MESMO caminho da tela (PUT /api/soldados/:id).
function editar(guerra, patch) {
  const s = soldados.buscarPorId(idDe(guerra));
  let corpo; let codigo = 200;
  const res = { status(c) { codigo = c; return this; }, json(o) { corpo = o; return this; } };
  soldadoCtrl.atualizar({
    params: { id: s.id },
    body: {
      ra: s.ra, nome_completo: s.nome_completo, nome_guerra: s.nome_guerra, graduacao: s.graduacao,
      status: s.status, data_incorporacao: s.data_incorporacao, pelotao: s.pelotao, turma: s.turma, ...patch,
    },
    user: { role: 'sargento' },
  }, res);
  assert.equal(codigo, 200, JSON.stringify(corpo));
  return corpo;
}
const fila = (tipo) => escalas.listarFila(tipo).map((r) => r.nome_guerra);
const cabosAgendados = () => db.prepare(`
  SELECT s.nome_guerra AS n, COUNT(*) AS c
  FROM escala_membros em
  JOIN escalas_guarda e ON e.id = em.escala_id
  JOIN soldados s ON s.id = em.soldado_id
  WHERE e.status = 'agendada' AND em.funcao = 'cabo'
  GROUP BY s.id ORDER BY s.id
`).all();

// ── testes ───────────────────────────────────────────────────────────────────

test('cenário do áudio: rebaixar 1 cabo e promover até 13 reflete na fila e na regeneração', () => {
  importar(100);
  ['S1', 'S2', 'S3'].forEach((g) => editar(g, { graduacao: 'cabo' }));
  assert.deepEqual(fila('cabos'), ['S1', 'S2', 'S3']);
  geracao.gerarEscalasDoAno(1);

  editar('S3', { graduacao: 'atirador' });                       // o que não concluiu
  for (let i = 4; i <= 14; i++) editar(`S${i}`, { graduacao: 'cabo' }); // total: 13 cabos

  const filaCabos = fila('cabos');
  assert.equal(filaCabos.length, 13);
  assert.ok(!filaCabos.includes('S3'), 'rebaixado deve sair da fila de cabos');
  assert.ok(fila('atiradores').includes('S3'), 'rebaixado deve entrar na fila de atiradores');

  geracao.regenerarEscalasDoAno(1);

  const usados = cabosAgendados();
  assert.equal(usados.length, 13, 'os 13 cabos devem ser escalados');
  assert.ok(!usados.some((u) => u.n === 'S3'), 'rebaixado não pode ser escalado como cabo');
  const qtds = usados.map((u) => u.c);
  assert.ok(Math.max(...qtds) - Math.min(...qtds) <= 1, 'distribuição equilibrada entre os cabos');
  assert.equal(fila('cabos').length, 13);
});

test('ao rebaixar/inativar alguém já escalado, a resposta avisa quantas escalas futuras ficaram pendentes', () => {
  importar(30);
  ['S1', 'S2', 'S3'].forEach((g) => editar(g, { graduacao: 'cabo' }));
  geracao.gerarEscalasDoAno(1);

  const r1 = editar('S3', { graduacao: 'atirador' });
  assert.ok(r1.escalas_pendentes > 0, 'deve avisar que S3 ainda está escalado como cabo');

  const r2 = editar('S10', { status: 'baixado' });
  assert.ok(r2.escalas_pendentes > 0, 'deve avisar que o baixado ainda está escalado');

  const r3 = editar('S11', { celular: '(19) 99999-0000' });
  assert.equal(r3.escalas_pendentes ?? 0, 0, 'edição sem impacto não gera aviso');
});

test('filas só contêm atiradores da turma ativa (turma encerrada não vaza para a nova)', () => {
  importar(20, 'V');
  ['V1', 'V2'].forEach((g) => editar(g, { graduacao: 'cabo' }));
  assert.equal(fila('cabos').length, 2);

  const r = turmas.encerrarTurma(null);
  assert.ok(r.sucesso, JSON.stringify(r));

  importar(10, 'N');
  editar('N1', { graduacao: 'cabo' });

  assert.deepEqual(fila('cabos'), ['N1']);
  const ats = fila('atiradores');
  assert.equal(ats.length, 9);
  assert.ok(ats.every((n) => n.startsWith('N')), 'fila de atiradores só com a turma nova');
  assert.ok(escalas.listarSoldadosElegiveis('preta').every((s) => s.nome_guerra.startsWith('N')));
});

// Cabos das guardas PRETAS (dias úteis) a partir de uma data, em ordem.
const cabosDasPretas = (aPartirDe) => db.prepare(`
  SELECT s.nome_guerra AS n
  FROM escalas_guarda e
  JOIN escala_membros em ON em.escala_id = e.id AND em.funcao = 'cabo'
  JOIN soldados s ON s.id = em.soldado_id
  WHERE e.status != 'cancelada' AND e.tipo = 'preta' AND e.data_inicio >= ?
  ORDER BY e.data_inicio ASC
`).all(aPartirDe).map((r) => r.n);

// Data da última guarda (como cabo) de cada cabo ANTES de `data`.
const ultimaGuardaAntes = (data) => db.prepare(`
  SELECT s.nome_guerra AS n, MAX(e.data_inicio) AS ult
  FROM escala_membros em
  JOIN escalas_guarda e ON e.id = em.escala_id
  JOIN soldados s ON s.id = em.soldado_id
  WHERE e.status != 'cancelada' AND em.funcao = 'cabo' AND e.data_inicio < ?
  GROUP BY s.id ORDER BY ult ASC, e.id ASC
`).all(data);

const CABOS = ['S1', 'S2', 'S3', 'S4', 'S5'];
const HOJE2 = '2026-06-11'; // quinta-feira, 10 dias depois da geração

test('regenerar continua o rodízio a partir de quem tirou guarda há mais tempo', () => {
  importar(40);
  CABOS.forEach((g) => editar(g, { graduacao: 'cabo' }));
  geracao.gerarEscalasDoAno(1);
  mock.timers.setTime(new Date(`${HOJE2}T10:00:00`).getTime());

  const historico = ultimaGuardaAntes(HOJE2);   // do mais antigo para o mais recente
  assert.equal(historico.length, 5);
  const maisAntigo = historico[0].n;
  const maisRecente = historico[4].n;

  geracao.regenerarEscalasDoAno(1);
  const seq = cabosDasPretas(HOJE2).slice(0, 5);
  assert.equal(seq[0], maisAntigo, `1ª preta deve ser de quem está há mais tempo sem guarda: ${seq.join(' ')}`);
  assert.equal(seq[4], maisRecente, `quem acabou de tirar guarda deve ser o último: ${seq.join(' ')}`);
  assert.equal(new Set(seq).size, 5, 'ninguém repete antes de todos passarem');

  // Regenerar de novo, sem mudar nada, não pode alterar o resultado.
  const tudo = cabosDasPretas(HOJE2);
  geracao.regenerarEscalasDoAno(1);
  assert.deepEqual(cabosDasPretas(HOJE2), tudo);
});

test('"Punir (início)" e "Adiar (fim)" são respeitados ao regenerar', () => {
  importar(40);
  CABOS.forEach((g) => editar(g, { graduacao: 'cabo' }));
  geracao.gerarEscalasDoAno(1);
  mock.timers.setTime(new Date(`${HOJE2}T10:00:00`).getTime());

  // Pune quem acabou de tirar guarda antes de ontem (seria um dos últimos da fila).
  const historico = ultimaGuardaAntes(HOJE2);
  const punido = historico[3].n; // o [4] está de serviço ontem→hoje (indisponível hoje)
  escalas.reordenarFila('cabos', idDe(punido), 'inicio');
  geracao.regenerarEscalasDoAno(1);
  assert.equal(cabosDasPretas(HOJE2)[0], punido);

  // Adia quem seria o próximo: ele passa a ser o último da volta.
  mock.timers.setTime(new Date('2026-06-12T10:00:00').getTime());
  const adiado = cabosDasPretas('2026-06-12')[0];
  escalas.reordenarFila('cabos', idDe(adiado), 'fim');
  geracao.regenerarEscalasDoAno(1);
  const seq = cabosDasPretas('2026-06-12').slice(0, 5);
  assert.notEqual(seq[0], adiado);
  assert.equal(seq.indexOf(adiado), seq.lastIndexOf(adiado));
  assert.ok(seq.indexOf(adiado) >= 3, `adiado deveria ir para o fim da volta: ${seq.join(' ')}`);
});
