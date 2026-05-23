exports.up = function (knex) {
  return knex.schema.createTable('ocorrencias', (t) => {
    t.increments('id').primary();
    t.integer('soldado_id').references('id').inTable('soldados').onDelete('SET NULL');
    t.text('tipo').checkIn(['elogio', 'advertencia', 'dispensa', 'outro']);
    t.text('descricao').notNullable();
    t.text('data').notNullable();
    t.integer('registrado_por').references('id').inTable('usuarios').onDelete('SET NULL');
    t.text('created_at').defaultTo(knex.raw("(datetime('now'))"));
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('ocorrencias');
};
