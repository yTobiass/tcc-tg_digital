exports.up = function (knex) {
  return knex.schema.createTable('usuarios', (t) => {
    t.increments('id').primary();
    t.text('nome').notNullable();
    t.text('login').unique().notNullable();
    t.text('senha_hash').notNullable();
    t.text('role').notNullable().checkIn(['comandante', 'sargento', 'soldado']);
    t.integer('soldado_id').references('id').inTable('soldados').onDelete('SET NULL');
    t.integer('ativo').defaultTo(1);
    t.text('created_at').defaultTo(knex.raw("(datetime('now'))"));
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('usuarios');
};
