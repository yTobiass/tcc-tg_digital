exports.up = function (knex) {
  return knex.schema.createTable('fila_rotacao', (t) => {
    t.increments('id').primary();
    t.integer('soldado_id').notNullable().references('id').inTable('soldados').onDelete('CASCADE');
    t.text('tipo_guarda').notNullable().checkIn(['verde', 'preta', 'vermelha']);
    t.integer('posicao').notNullable();
    t.integer('ultima_escala_id').references('id').inTable('escalas_guarda').onDelete('SET NULL');
    t.text('ultima_data');
    t.unique(['soldado_id', 'tipo_guarda']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('fila_rotacao');
};
