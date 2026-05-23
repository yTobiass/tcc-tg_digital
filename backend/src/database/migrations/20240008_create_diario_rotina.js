exports.up = function (knex) {
  return knex.schema.createTable('diario_rotina', (t) => {
    t.increments('id').primary();
    t.text('data_servico').unique().notNullable();
    t.text('data_para').notNullable();
    t.integer('ch_instr_id').references('id').inTable('usuarios').onDelete('SET NULL');
    t.text('parada_diaria_status').notNullable().checkIn(['Com Alteração', 'Sem Alteração']);
    t.text('parada_diaria_descricao');
    t.text('recebimento_monitor_numero');
    t.text('recebimento_monitor_nome');
    t.text('recebimento_status').notNullable().checkIn(['Com Alteração', 'Sem Alteração']);
    t.integer('escala_id').references('id').inTable('escalas_guarda').onDelete('SET NULL');
    t.text('postos_sentinela'); // JSON array: [{quarto, numero, nome}]
    t.text('material_carga_status').notNullable().checkIn(['Com Alteração', 'Sem Alteração']);
    t.text('material_carga_descricao');
    t.text('instalacoes_status').notNullable().checkIn(['Com Alteração', 'Sem Alteração']);
    t.text('instalacoes_descricao');
    t.text('iluminacao_status').notNullable().checkIn(['Com Alteração', 'Sem Alteração']);
    t.text('iluminacao_descricao');
    t.text('ocorrencias_texto');
    t.text('cabo_ra');         // RA do cabo/monitor desta escala (para PDF)
    t.text('cabo_nome');       // Nome completo do cabo (para rodapé do PDF)
    t.text('atiradores');      // JSON [{ra, nome, nomeGuerra}] — item 03b
    t.text('passagem_monitor_numero');
    t.text('passagem_monitor_nome');
    t.integer('pdf_gerado').defaultTo(0);
    t.integer('registrado_por').references('id').inTable('usuarios').onDelete('SET NULL');
    t.text('created_at').defaultTo(knex.raw("(datetime('now'))"));
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('diario_rotina');
};
