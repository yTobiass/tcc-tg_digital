// Adiciona o exercício de BARRA FIXA ao TAF. `barra_resultado` guarda o número
// de repetições e `pts_barra` a pontuação correspondente (mesma lógica dos demais
// exercícios). Avaliações antigas ficam com NULL e mantêm a nota já calculada.
exports.up = async function (knex) {
  const temBarra = await knex.schema.hasColumn('avaliacoes', 'barra_resultado');
  if (temBarra) return;

  await knex.schema.alterTable('avaliacoes', (t) => {
    t.integer('barra_resultado');
    t.integer('pts_barra');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('avaliacoes', (t) => {
    t.dropColumn('barra_resultado');
    t.dropColumn('pts_barra');
  });
};
