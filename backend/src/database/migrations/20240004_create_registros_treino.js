exports.up = function (knex) {
  return knex.schema.createTable('registros_treino', (t) => {
    t.increments('id').primary();
    t.integer('soldado_id').notNullable().references('id').inTable('soldados').onDelete('CASCADE');
    t.integer('tipo_treino_id').notNullable().references('id').inTable('tipos_treino').onDelete('RESTRICT');
    t.text('data').notNullable();
    t.float('resultado');
    t.integer('presente').defaultTo(1);
    t.text('observacao');
    t.integer('registrado_por').references('id').inTable('usuarios').onDelete('SET NULL');
    t.text('created_at').defaultTo(knex.raw("(datetime('now'))"));
    // Um registro por soldado por tipo por dia
    t.unique(['soldado_id', 'tipo_treino_id', 'data']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('registros_treino');
};
