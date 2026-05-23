const bcrypt = require('bcryptjs');

exports.up = async function (knex) {
  // Tipos de treino padrão conforme TAF do Exército
  await knex('tipos_treino').insert([
    { nome: 'Corrida 12min', unidade: 'metros', descricao: 'Teste de Cooper — distância percorrida em 12 minutos' },
    { nome: 'Flexão de Braço', unidade: 'repetições', descricao: 'Flexões em 1 minuto' },
    { nome: 'Abdominal', unidade: 'repetições', descricao: 'Abdominais em 1 minuto' },
    { nome: 'Corrida 2400m', unidade: 'segundos', descricao: 'Tempo para percorrer 2400 metros' },
  ]);

  // Usuário comandante padrão — senha deve ser trocada no primeiro acesso
  const senhaHash = await bcrypt.hash('admin123', 10);
  await knex('usuarios').insert({
    nome: 'Comandante',
    login: 'comandante',
    senha_hash: senhaHash,
    role: 'comandante',
    ativo: 1,
  });
};

exports.down = async function (knex) {
  await knex('usuarios').where('login', 'comandante').delete();
  await knex('tipos_treino').truncate();
};
