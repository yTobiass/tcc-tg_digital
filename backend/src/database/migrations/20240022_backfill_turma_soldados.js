// Backfill do texto `turma` dos soldados.
//
// A turma é identificada pelo ANO em `turmas` e o vínculo real é por `turma_id`.
// O campo texto `soldados.turma` (usado nas listagens, perfil, relatórios e PDFs)
// vinha ficando vazio na importação — que só preenchia `turma_id` —, então a
// turma não aparecia em lugar nenhum. Aqui preenchemos o texto a partir do ano da
// turma vinculada para todos os soldados que estão sem ele.
exports.up = async function (knex) {
  await knex.raw(`
    UPDATE soldados
    SET turma = (SELECT CAST(t.ano AS TEXT) FROM turmas t WHERE t.id = soldados.turma_id)
    WHERE (turma IS NULL OR turma = '') AND turma_id IS NOT NULL
  `);
};

// Sem rollback: o backfill apenas preenche valores ausentes; não há estado
// anterior a restaurar com segurança.
exports.down = async function () {};
