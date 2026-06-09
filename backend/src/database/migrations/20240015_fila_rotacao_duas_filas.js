// Reestrutura `fila_rotacao` para o modelo de DUAS filas compartilhadas
// (cabos / atiradores), conforme a especificação do módulo de escalas:
//   - fila_cabos  (tipo_guarda='cabos')      → guardas preta e vermelha
//   - fila_atiradores (tipo_guarda='atiradores') → preta, vermelha e verde
//
// O modelo antigo tinha uma fila por TIPO de guarda (verde/preta/vermelha), o
// que impedia o compartilhamento exigido (fazer a preta avança você na mesma
// fila usada pela vermelha). Também adiciona `posicao_anterior`, usada para
// desfazer o avanço de um soldado quando ele é removido manualmente de uma
// escala.
//
// As filas são dados operacionais regeneráveis (reconstruídos por
// inicializarFilas a partir de soldados), então a tabela é recriada do zero.
exports.up = async function (knex) {
  await knex.schema.dropTableIfExists('fila_rotacao');
  await knex.schema.createTable('fila_rotacao', (t) => {
    t.increments('id').primary();
    t.integer('soldado_id').notNullable().references('id').inTable('soldados').onDelete('CASCADE');
    t.text('tipo_guarda').notNullable().checkIn(['cabos', 'atiradores']);
    t.integer('posicao').notNullable();
    t.integer('posicao_anterior'); // posição antes do último avanço (para desfazer trocas)
    t.integer('ultima_escala_id').references('id').inTable('escalas_guarda').onDelete('SET NULL');
    t.text('ultima_data');
    t.unique(['soldado_id', 'tipo_guarda']);
  });
};

exports.down = async function (knex) {
  // Volta ao modelo antigo de uma fila por tipo de guarda.
  await knex.schema.dropTableIfExists('fila_rotacao');
  await knex.schema.createTable('fila_rotacao', (t) => {
    t.increments('id').primary();
    t.integer('soldado_id').notNullable().references('id').inTable('soldados').onDelete('CASCADE');
    t.text('tipo_guarda').notNullable().checkIn(['verde', 'preta', 'vermelha']);
    t.integer('posicao').notNullable();
    t.integer('ultima_escala_id').references('id').inTable('escalas_guarda').onDelete('SET NULL');
    t.text('ultima_data');
    t.unique(['soldado_id', 'tipo_guarda']);
  });
};
