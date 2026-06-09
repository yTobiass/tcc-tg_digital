// Corrige bancos antigos cuja tabela `diario_rotina` foi criada antes das
// colunas cabo_ra, cabo_nome e atiradores (usadas pelo modelo/PDF). Em
// instalações novas a 20240008 já cria essas colunas, então cada ADD é
// condicionado a `hasColumn` e a migração vira no-op.
exports.up = async function (knex) {
  const adicionarSeFaltar = async (coluna, def) => {
    const existe = await knex.schema.hasColumn('diario_rotina', coluna);
    if (!existe) {
      await knex.schema.alterTable('diario_rotina', (t) => def(t));
    }
  };

  await adicionarSeFaltar('cabo_ra',    (t) => t.text('cabo_ra'));
  await adicionarSeFaltar('cabo_nome',  (t) => t.text('cabo_nome'));
  await adicionarSeFaltar('atiradores', (t) => t.text('atiradores'));
};

exports.down = function () {
  return Promise.resolve();
};
