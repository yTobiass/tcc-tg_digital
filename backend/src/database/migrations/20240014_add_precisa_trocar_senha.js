// Adiciona a flag `precisa_trocar_senha` em `usuarios`. Contas criadas com
// senha provisória (ex.: o comandante padrão do seed, com `admin123`) ficam
// marcadas para forçar a troca no primeiro acesso. O ADD é condicionado a
// `hasColumn` para ser idempotente em bancos que já tenham a coluna.
exports.up = async function (knex) {
  const existe = await knex.schema.hasColumn('usuarios', 'precisa_trocar_senha');
  if (!existe) {
    await knex.schema.alterTable('usuarios', (t) => {
      t.integer('precisa_trocar_senha').notNullable().defaultTo(0);
    });
  }

  // Comandante padrão (seed) usa a senha provisória — exige troca no 1º login.
  await knex('usuarios')
    .where({ login: 'comandante' })
    .update({ precisa_trocar_senha: 1 });
};

exports.down = async function (knex) {
  const existe = await knex.schema.hasColumn('usuarios', 'precisa_trocar_senha');
  if (existe) {
    await knex.schema.alterTable('usuarios', (t) => {
      t.dropColumn('precisa_trocar_senha');
    });
  }
};
