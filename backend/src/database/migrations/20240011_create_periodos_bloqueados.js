exports.up = function (knex) {
  return knex.schema.createTable('periodos_bloqueados', (t) => {
    t.increments('id').primary();
    t.text('data_inicio').notNullable();
    t.text('data_fim').notNullable();
    t.text('motivo');
    t.integer('criado_por').references('id').inTable('usuarios').onDelete('SET NULL');
    t.text('created_at').defaultTo(knex.raw("(datetime('now'))"));
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('periodos_bloqueados');
};
