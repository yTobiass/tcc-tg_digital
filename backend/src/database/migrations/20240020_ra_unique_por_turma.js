// O RA dos soldados (001-1, 002-1, …) reinicia a cada turma — o mesmo número é
// reutilizado em anos diferentes para pessoas diferentes. Portanto a unicidade
// do RA passa a ser POR TURMA: troca o índice único global (ra) por um composto
// (ra, turma_id). É um swap de índice (não reconstrói a tabela soldados).
exports.up = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS soldados_ra_unique');
  await knex.raw('CREATE UNIQUE INDEX soldados_ra_turma_unique ON soldados (ra, turma_id)');
};

exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS soldados_ra_turma_unique');
  await knex.raw('CREATE UNIQUE INDEX soldados_ra_unique ON soldados (ra)');
};
