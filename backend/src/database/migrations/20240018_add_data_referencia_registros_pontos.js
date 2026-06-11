// Adiciona `data_referencia` a registros_pontos: a DATA da falta (dia em que o
// soldado faltou), que pode ser diferente de created_at (momento do lançamento).
// Usada pela aba de Faltas para o seletor de data, os filtros de período e o
// pré-marcado de checkboxes. Nula para fatd/ajuste_manual e para registros
// antigos — nesses casos as consultas usam date(created_at) como fallback.
exports.up = async function (knex) {
  await knex.schema.alterTable('registros_pontos', (t) => {
    t.text('data_referencia'); // 'YYYY-MM-DD' — dia da falta
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('registros_pontos', (t) => {
    t.dropColumn('data_referencia');
  });
};
