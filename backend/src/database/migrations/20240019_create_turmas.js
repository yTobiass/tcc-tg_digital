// Sistema de Turmas por Ano.
// Cada ano letivo é uma turma; ao encerrar, os dados ficam preservados no
// histórico e a nova turma começa do zero.
//
// Decisão de modelagem: o vínculo soldado↔turma é feito por `turma_id`, e o
// isolamento entre turmas é por esse campo (todas as listagens filtram pela
// turma ativa). NÃO adicionamos o status 'inativo_turma' ao CHECK de soldados —
// isso exigiria reconstruir a tabela `soldados` (7 tabelas filhas com FK +
// 1500+ escalas), operação destrutiva e desnecessária: filtrar por turma_id
// atinge o mesmo isolamento e preserva o status real final de cada soldado
// (útil no histórico da turma encerrada).
exports.up = async function (knex) {
  // 1. Tabela de turmas.
  await knex.schema.createTable('turmas', (t) => {
    t.increments('id').primary();
    t.integer('ano').notNullable().unique();
    t.text('status').notNullable().defaultTo('ativa').checkIn(['ativa', 'encerrada']);
    t.text('data_inicio');
    t.text('data_encerramento');
    t.integer('total_soldados');
    t.integer('encerrado_por').references('id').inTable('usuarios').onDelete('SET NULL');
    t.text('created_at').defaultTo(knex.raw("(datetime('now'))"));
  });

  // 2. Vínculo de turma nas tabelas operacionais.
  await knex.schema.alterTable('soldados', (t) => {
    t.integer('turma_id').references('id').inTable('turmas').onDelete('SET NULL');
  });
  await knex.schema.alterTable('escalas_guarda', (t) => {
    t.integer('turma_id').references('id').inTable('turmas').onDelete('SET NULL');
  });
  await knex.schema.alterTable('registros_pontos', (t) => {
    t.integer('turma_id').references('id').inTable('turmas').onDelete('SET NULL');
  });

  // 3. Turma inicial (ano corrente) — recebe todo o efetivo/dados já existentes.
  await knex.raw(`
    INSERT INTO turmas (ano, status, data_inicio)
    VALUES (CAST(strftime('%Y','now') AS INTEGER), 'ativa', datetime('now'))
  `);

  // 4. Backfill: liga os dados existentes à turma inicial.
  await knex.raw("UPDATE soldados        SET turma_id = (SELECT id FROM turmas WHERE status = 'ativa')");
  await knex.raw("UPDATE escalas_guarda  SET turma_id = (SELECT id FROM turmas WHERE status = 'ativa')");
  await knex.raw("UPDATE registros_pontos SET turma_id = (SELECT id FROM turmas WHERE status = 'ativa')");
};

exports.down = async function (knex) {
  await knex.schema.alterTable('registros_pontos', (t) => { t.dropColumn('turma_id'); });
  await knex.schema.alterTable('escalas_guarda',   (t) => { t.dropColumn('turma_id'); });
  await knex.schema.alterTable('soldados',         (t) => { t.dropColumn('turma_id'); });
  await knex.schema.dropTableIfExists('turmas');
};
