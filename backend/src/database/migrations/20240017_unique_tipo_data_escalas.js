// Impede, no nível do banco, a duplicação de escalas do mesmo TIPO começando na
// mesma DATA_INICIO (bug crítico da geração automática).
//
// A especificação pedia, em sintaxe Postgres:
//   ALTER TABLE escalas_guarda ADD CONSTRAINT unique_tipo_data
//   UNIQUE (tipo, data_inicio) WHERE status != 'cancelada';
//
// SQLite não suporta `ADD CONSTRAINT` nem UNIQUE com predicado WHERE; o
// equivalente é um ÍNDICE ÚNICO PARCIAL, que aplica exatamente a mesma garantia:
// no máximo uma escala não-cancelada por (tipo, data_inicio). Escalas canceladas
// ficam de fora do índice, permitindo recriar uma escala após cancelar a antiga.
exports.up = async function (knex) {
  // 1. Sanea duplicatas pré-existentes: mantém a escala mais antiga (menor id) de
  //    cada (tipo, data_inicio) não-cancelada e cancela as demais — sem isso a
  //    criação do índice único falharia.
  await knex.raw(`
    UPDATE escalas_guarda
    SET status = 'cancelada'
    WHERE status != 'cancelada'
      AND id NOT IN (
        SELECT MIN(id) FROM escalas_guarda
        WHERE status != 'cancelada'
        GROUP BY tipo, data_inicio
      )
  `);

  // 2. Cria o índice único parcial.
  await knex.raw(`
    CREATE UNIQUE INDEX unique_tipo_data
    ON escalas_guarda (tipo, data_inicio)
    WHERE status != 'cancelada'
  `);
};

exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS unique_tipo_data');
};
