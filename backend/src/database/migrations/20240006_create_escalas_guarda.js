exports.up = function (knex) {
  return knex.schema
    .createTable('escalas_guarda', (t) => {
      t.increments('id').primary();
      t.text('tipo').notNullable().checkIn(['verde', 'preta', 'vermelha']);
      t.text('data_inicio').notNullable();
      t.text('data_fim').notNullable();
      t.text('status').defaultTo('agendada').checkIn(['agendada', 'em_andamento', 'concluida', 'cancelada']);
      t.text('observacoes');
      t.integer('criado_por').references('id').inTable('usuarios').onDelete('SET NULL');
      t.text('created_at').defaultTo(knex.raw("(datetime('now'))"));
    })
    .createTable('escala_membros', (t) => {
      t.increments('id').primary();
      t.integer('escala_id').notNullable().references('id').inTable('escalas_guarda').onDelete('CASCADE');
      t.integer('soldado_id').notNullable().references('id').inTable('soldados').onDelete('CASCADE');
      t.text('funcao').notNullable().checkIn(['cabo', 'atirador']);
      t.text('motivo_repeticao');
      t.unique(['escala_id', 'soldado_id']);
    });
};

exports.down = function (knex) {
  return knex.schema.dropTable('escala_membros').dropTable('escalas_guarda');
};
