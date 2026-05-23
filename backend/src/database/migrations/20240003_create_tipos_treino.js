exports.up = function (knex) {
  return knex.schema.createTable('tipos_treino', (t) => {
    t.increments('id').primary();
    t.text('nome').notNullable();
    t.text('unidade');
    t.text('descricao');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('tipos_treino');
};
