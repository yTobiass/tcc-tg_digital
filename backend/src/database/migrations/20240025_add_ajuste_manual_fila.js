// Marca, na fila de rotação, quem foi movido manualmente pelo sargento:
//   'inicio' = Punir (vai na próxima guarda) · 'fim' = Adiar · NULL = sem ajuste.
// A regeneração das escalas reconstrói a fila pelo histórico real de guardas e
// usa esta marca para não perder a decisão manual. A marca é limpa assim que o
// soldado é escalado.
//
// A coluna também é garantida em tempo de execução (escalasModel), então aqui
// só criamos se ainda não existir.
exports.up = async function (knex) {
  const existe = await knex.schema.hasColumn('fila_rotacao', 'ajuste_manual');
  if (!existe) {
    await knex.schema.alterTable('fila_rotacao', (t) => { t.text('ajuste_manual'); });
  }
};

exports.down = async function (knex) {
  const existe = await knex.schema.hasColumn('fila_rotacao', 'ajuste_manual');
  if (existe) {
    await knex.schema.alterTable('fila_rotacao', (t) => { t.dropColumn('ajuste_manual'); });
  }
};
