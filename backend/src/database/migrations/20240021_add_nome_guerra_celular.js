// Ajustes no cadastro de soldados (TG 02-032):
// - nome_guerra: passa a ser o nome de exibição em todo o sistema (escalas,
//   diário, listagens, PDFs). Obrigatório no cadastro a partir de agora.
// - celular: contato opcional (alguns soldados não têm celular).
//
// Backfill: deriva o nome de guerra do nome_completo já existente (sobrenome
// antes da vírgula no formato "SOBRENOME, Nome", ou a última palavra), em
// maiúsculas — assim nenhuma exibição fica vazia para o efetivo já cadastrado.
function derivarNomeGuerra(nomeCompleto = '') {
  const nome = (nomeCompleto || '').trim();
  if (!nome) return '';
  if (nome.includes(',')) return nome.split(',')[0].trim().toUpperCase();
  const partes = nome.split(/\s+/);
  return partes[partes.length - 1].toUpperCase();
}

exports.up = async function (knex) {
  await knex.schema.alterTable('soldados', (t) => {
    t.text('nome_guerra');
    t.text('celular');
  });

  const soldados = await knex('soldados').select('id', 'nome_completo');
  for (const s of soldados) {
    await knex('soldados')
      .where('id', s.id)
      .update({ nome_guerra: derivarNomeGuerra(s.nome_completo) });
  }
};

exports.down = async function (knex) {
  await knex.schema.alterTable('soldados', (t) => {
    t.dropColumn('nome_guerra');
    t.dropColumn('celular');
  });
};
