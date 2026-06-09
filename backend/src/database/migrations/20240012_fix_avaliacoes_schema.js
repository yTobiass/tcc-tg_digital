// Corrige bancos antigos cuja tabela `avaliacoes` foi criada com o esquema
// legado (corrida_resultado/flexao_resultado/abdominal_resultado) e que não
// possuem as colunas usadas pelo modelo atual (corrida, flexao, abdominal,
// pts_*, observacoes). Em instalações novas a 20240005 já cria o esquema
// correto, então esta migração é ignorada (a coluna `corrida` já existe).
exports.up = async function (knex) {
  const jaCorreto = await knex.schema.hasColumn('avaliacoes', 'corrida');
  if (jaCorreto) return;

  await knex.schema.dropTableIfExists('avaliacoes');
  await knex.schema.createTable('avaliacoes', (t) => {
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

exports.down = function () {
  return Promise.resolve();
};
