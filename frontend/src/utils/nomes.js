// Nome de exibição padrão do sistema (TG 02-032): o nome de guerra é o nome
// mostrado em listagens, escalas, diário, faltas e PDFs. Há um fallback
// defensivo para o nome completo (ou o campo genérico `nome`) caso o nome de
// guerra esteja ausente — por exemplo em dados antigos antes da migração.
export function nomeExibicao(obj) {
  if (!obj) return '';
  return obj.nome_guerra || obj.nome_completo || obj.nome || '';
}

// Exibição do RA: mostra apenas o número, sem zeros à esquerda e sem o sufixo
// de turma (ex.: '001-1' → '1', '010-1' → '10', '100-1' → '100'). O valor real
// armazenado em `ra` é mantido intacto — isto afeta só o que aparece na tela e
// nos PDFs. RAs sem número (vazio/null) retornam string vazia.
export function raExibicao(ra) {
  if (ra == null || ra === '') return '';
  const n = parseInt(ra, 10);
  return Number.isNaN(n) ? String(ra) : String(n);
}

// Máscara de celular brasileiro: (XX) XXXXX-XXXX. Aceita digitação parcial e
// remove tudo que não for dígito antes de formatar. Limita a 11 dígitos (DDD + 9).
export function formatarCelular(valor) {
  const d = String(valor || '').replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2)  return `(${d}`;
  if (d.length <= 7)  return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
