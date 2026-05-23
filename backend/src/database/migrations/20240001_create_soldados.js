exports.up = function (knex) {
  return knex.schema.createTable('soldados', (t) => {
    t.increments('id').primary();
    t.text('ra').unique().notNullable();
    t.text('nome_completo').notNullable();
    t.text('data_nascimento');
    t.text('data_incorporacao');
    t.text('pelotao');
    t.text('turma');
    t.text('graduacao').defaultTo('atirador').checkIn(['atirador', 'cabo']);
    t.text('status').defaultTo('ativo').checkIn(['ativo', 'licenca', 'baixado', 'dispensado']);
    t.text('foto_url');
    t.text('created_at').defaultTo(knex.raw("(datetime('now'))"));
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('soldados');
};
