// Sistema de Pontos e FATD
// - Colunas acumuladoras em soldados
// - Tabela de histórico registros_pontos
// - Coluna compareceu em escala_membros (controle de falta em guarda)
// - Relaxa o CHECK de ocorrencias.tipo para aceitar 'expulsao'/'estorno'/'reativacao'
exports.up = async function (knex) {
  // 1. Colunas acumuladoras em soldados
  await knex.schema.alterTable('soldados', (t) => {
    t.integer('total_pontos').notNullable().defaultTo(0);
    t.integer('total_fatd').notNullable().defaultTo(0);
    t.integer('total_faltas').notNullable().defaultTo(0); // só faltas comuns
  });

  // 2. Histórico completo de pontos
  await knex.schema.createTable('registros_pontos', (t) => {
    t.increments('id').primary();
    t.integer('soldado_id').notNullable().references('id').inTable('soldados').onDelete('CASCADE');
    t.text('tipo').notNullable().checkIn(['falta', 'falta_guarda', 'fatd', 'ajuste_manual']);
    t.integer('pontos').notNullable();          // pontos adicionados neste registro
    t.integer('total_acumulado').notNullable(); // total do soldado após este registro
    t.integer('fatd_numero');                   // 1, 2 ou 3 (apenas tipo='fatd')
    t.integer('referencia_id');                 // registro_treino ou escala_membros que gerou a falta
    t.text('observacao');                       // justificativa (obrigatória no FATD)
    t.integer('registrado_por').references('id').inTable('usuarios').onDelete('SET NULL');
    t.text('created_at').defaultTo(knex.raw("(datetime('now'))"));
  });

  // 3. Controle de comparecimento nas guardas (default 1 = compareceu)
  await knex.schema.alterTable('escala_membros', (t) => {
    t.integer('compareceu').notNullable().defaultTo(1);
  });

  // 4. ocorrencias.tipo precisa aceitar 'expulsao'/'estorno'/'reativacao'.
  //    O SQLite não permite alterar um CHECK existente, então a tabela é
  //    recriada sem a restrição de enumeração em tipo (passa a ser texto livre).
  await knex.schema.raw(`
    CREATE TABLE ocorrencias_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      soldado_id INTEGER REFERENCES soldados(id) ON DELETE SET NULL,
      tipo TEXT,
      descricao TEXT NOT NULL,
      data TEXT NOT NULL,
      registrado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  await knex.schema.raw(`
    INSERT INTO ocorrencias_new (id, soldado_id, tipo, descricao, data, registrado_por, created_at)
    SELECT id, soldado_id, tipo, descricao, data, registrado_por, created_at FROM ocorrencias
  `);
  await knex.schema.raw('DROP TABLE ocorrencias');
  await knex.schema.raw('ALTER TABLE ocorrencias_new RENAME TO ocorrencias');
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('registros_pontos');

  await knex.schema.alterTable('soldados', (t) => {
    t.dropColumn('total_pontos');
    t.dropColumn('total_fatd');
    t.dropColumn('total_faltas');
  });

  await knex.schema.alterTable('escala_membros', (t) => {
    t.dropColumn('compareceu');
  });

  // Restaura ocorrencias com o CHECK original.
  await knex.schema.raw(`
    CREATE TABLE ocorrencias_old (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      soldado_id INTEGER REFERENCES soldados(id) ON DELETE SET NULL,
      tipo TEXT CHECK (tipo IN ('elogio','advertencia','dispensa','outro')),
      descricao TEXT NOT NULL,
      data TEXT NOT NULL,
      registrado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  await knex.schema.raw(`
    INSERT INTO ocorrencias_old (id, soldado_id, tipo, descricao, data, registrado_por, created_at)
    SELECT id, soldado_id, tipo, descricao, data, registrado_por, created_at FROM ocorrencias
    WHERE tipo IN ('elogio','advertencia','dispensa','outro')
  `);
  await knex.schema.raw('DROP TABLE ocorrencias');
  await knex.schema.raw('ALTER TABLE ocorrencias_old RENAME TO ocorrencias');
};
