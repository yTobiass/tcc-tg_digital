exports.up = function (knex) {
  return knex.schema.createTable('avaliacoes', (t) => {
    t.increments('id').primary();
    t.integer('soldado_id').notNullable().references('id').inTable('soldados').onDelete('CASCADE');
    t.text('data').notNullable();
    t.float('corrida').notNullable();
    t.integer('flexao').notNullable();
    t.integer('abdominal').notNullable();
    t.integer('pts_corrida');
    t.integer('pts_flexao');
    t.integer('pts_abdominal');
    t.float('nota_final');
    t.text('conceito').checkIn(['Excelente', 'Muito Bom', 'Bom', 'Regular', 'Insuficiente']);
    t.text('observacoes');
    t.integer('avaliado_por').references('id').inTable('usuarios').onDelete('SET NULL');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('avaliacoes');
};
