// Remove o módulo de Treinos do banco. As faltas passam a vir exclusivamente da
// aba Faltas (registros_pontos), que não depende destas tabelas. A coluna
// genérica registros_pontos.referencia_id é mantida (não há FK para treino).
exports.up = async function (knex) {
  // registros_treino primeiro (depende de tipos_treino via FK).
  await knex.schema.dropTableIfExists('registros_treino');
  await knex.schema.dropTableIfExists('tipos_treino');
};

// Rollback recria as tabelas com o schema original (sem os dados), mantendo a
// reversibilidade da cadeia de migrations (o seed inicial trunca tipos_treino).
exports.down = async function (knex) {
  await knex.schema.createTable('tipos_treino', (t) => {
    t.increments('id').primary();
    t.text('nome').notNullable();
    t.text('unidade');
    t.text('descricao');
  });

  await knex.schema.createTable('registros_treino', (t) => {
    t.increments('id').primary();
    t.integer('soldado_id').notNullable().references('id').inTable('soldados').onDelete('CASCADE');
    t.integer('tipo_treino_id').notNullable().references('id').inTable('tipos_treino').onDelete('RESTRICT');
    t.text('data').notNullable();
    t.float('resultado');
    t.integer('presente').defaultTo(1);
    t.text('observacao');
    t.integer('registrado_por').references('id').inTable('usuarios').onDelete('SET NULL');
    t.text('created_at').defaultTo(knex.raw("(datetime('now'))"));
    t.unique(['soldado_id', 'tipo_treino_id', 'data']);
  });
};
