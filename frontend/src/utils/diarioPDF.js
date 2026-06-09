import { jsPDF } from 'jspdf';

const MESES = [
  'janeiro','fevereiro','março','abril','maio','junho',
  'julho','agosto','setembro','outubro','novembro','dezembro',
];

const HORARIOS_QUARTO = [
  ['08h às 10h', '14h às 16h', '20h às 22h', '02h às 04h'],
  ['10h às 12h', '16h às 20h', '22h às 24h', '04h às 06h'],
  ['12h às 14h', '18h às 22h', '20h às 24h', '06h às 08h'],
];

function formatarDataBR(iso) {
  if (!iso) return '___/___/______';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function dataExtenso(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

function uc(str) {
  return (str || '').toUpperCase();
}

// Nome de guerra: "SOBRENOME, Nome" → SOBRENOME; "Nome Sobrenome" → SOBRENOME.
function nomeGuerra(nomeCompleto = '') {
  const nome = (nomeCompleto || '').trim();
  if (!nome) return '';
  if (nome.includes(',')) return nome.split(',')[0].trim().toUpperCase();
  const partes = nome.split(/\s+/);
  return partes[partes.length - 1].toUpperCase();
}

// Escreve texto com negrito apenas para o prefixo do item
function itemBold(doc, numero, resto, x, y, maxW, lh) {
  doc.setFont('helvetica', 'bold');
  doc.text(`${numero} –`, x, y);
  const prefixW = doc.getTextWidth(`${numero} – `);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(resto, maxW - prefixW);
  doc.text(lines, x + prefixW, y);
  return y + lines.length * lh;
}

export function gerarPdfDiario(diario) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Margens de 1,5 cm conforme instrução do formulário físico
  const ML  = 15;   // margem esquerda
  const MR  = 15;   // margem direita
  const PW  = 210;  // largura da página A4
  const UW  = PW - ML - MR; // 180mm utilizáveis
  const LH  = 5;    // espaçamento entre linhas padrão

  let y = 18;

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('MINISTÉRIO DA DEFESA – EXÉRCITO BRASILEIRO – CMSE – CMDO 2ª RM', PW / 2, y, { align: 'center' });
  y += LH;
  doc.text('TIRO DE GUERRA 02-032 (RIO CLARO-SP)', PW / 2, y, { align: 'center' });
  y += LH + 1;

  doc.setFontSize(9);
  doc.text('PARTE DO COMANDANTE DA GUARDA RELATIVA AO SERVIÇO', PW / 2, y, { align: 'center' });
  y += LH + 3;

  // ── Datas DO DIA / PARA O DIA ──────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`DO DIA ${formatarDataBR(diario.data_servico)}`, ML, y);
  doc.text(`PARA O DIA ${formatarDataBR(diario.data_para)}`, PW - MR, y, { align: 'right' });
  y += LH + 3;

  // ── Item 01 ────────────────────────────────────────────────────────────────
  const p01 = diario.parada_diaria_status === 'Com Alteração' ? 'COM ALTERAÇÃO' : 'SEM ALTERAÇÃO';
  let item01 = `PARADA DIÁRIA: ${p01}.`;
  if (diario.parada_diaria_status === 'Com Alteração' && diario.parada_diaria_descricao?.trim()) {
    item01 += ` ${uc(diario.parada_diaria_descricao)}`;
  }
  y = itemBold(doc, '01', item01, ML, y, UW, LH);
  y += 2;

  // ── Item 02 ────────────────────────────────────────────────────────────────
  const recNr   = diario.recebimento_monitor_numero || '___-___';
  const recNome = uc(diario.recebimento_monitor_nome) || '________________';
  const rec02   = diario.recebimento_status === 'Com Alteração' ? 'COM ALTERAÇÃO' : 'SEM ALTERAÇÃO';
  y = itemBold(doc, '02', `RECEBI DO MONITOR N° ${recNr} – ${recNome}, ${rec02}.`, ML, y, UW, LH);
  y += 2;

  // ── Item 03 ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.text('03 –', ML, y);
  const p03W = doc.getTextWidth('03 – ');
  doc.setFont('helvetica', 'normal');
  doc.text('PESSOAL DE SERVIÇO:', ML + p03W, y);
  y += LH;

  const caboRa    = diario.cabo_ra    || '___-___';
  const caboGrr   = nomeGuerra(diario.cabo_nome) || '________________';
  doc.text(`    a) CMT GD: MONITOR N° ${caboRa} – ${caboGrr}.`, ML, y);
  y += LH;

  const ats = Array.isArray(diario.atiradores) ? diario.atiradores : [];
  const prefAt  = '    b) GUARDAS: ';
  const prefVaz = '               ';
  for (let i = 0; i < 3; i++) {
    const at  = ats[i];
    const ra  = at?.ra || '___-___';
    const grr = uc(at?.nomeGuerra) || nomeGuerra(at?.nome) || '________________';
    doc.text(`${i === 0 ? prefAt : prefVaz}ATIRADOR N° ${ra} – ${grr}.`, ML, y);
    y += LH;
  }
  y += 2;

  // ── Tabela de Posto ────────────────────────────────────────────────────────
  // Colunas: POSTO | QUARTO | N° | NOME | HORÁRIO
  const cPosto   = 14;
  const cQuarto  = 16;
  const cNum     = 22;
  const cNome    = 42;
  const cHorario = UW - cPosto - cQuarto - cNum - cNome; // 86mm

  const xPosto   = ML;
  const xQuarto  = xPosto  + cPosto;
  const xNum     = xQuarto + cQuarto;
  const xNome    = xNum    + cNum;
  const xHorario = xNome   + cNome;

  const FONT_TABLE = 7.5;
  const LH_TABLE   = 4;
  const ROW_H      = HORARIOS_QUARTO[0].length * LH_TABLE + 2; // altura por quarto (4 horários + padding)
  const HEADER_H   = 6;
  const TABLE_H    = HEADER_H + ROW_H * 3;

  doc.setFontSize(FONT_TABLE);

  // Cabeçalho da tabela
  doc.rect(xPosto,   y, cPosto,   HEADER_H);
  doc.rect(xQuarto,  y, cQuarto,  HEADER_H);
  doc.rect(xNum,     y, cNum,     HEADER_H);
  doc.rect(xNome,    y, cNome,    HEADER_H);
  doc.rect(xHorario, y, cHorario, HEADER_H);

  doc.setFont('helvetica', 'bold');
  doc.text('POSTO',   xPosto   + cPosto   / 2, y + 4, { align: 'center' });
  doc.text('QUARTO',  xQuarto  + cQuarto  / 2, y + 4, { align: 'center' });
  doc.text('N°',      xNum     + cNum     / 2, y + 4, { align: 'center' });
  doc.text('NOME',    xNome    + cNome    / 2, y + 4, { align: 'center' });
  doc.text('HORÁRIO', xHorario + cHorario / 2, y + 4, { align: 'center' });

  const tableBodyTop = y + HEADER_H;

  // Célula POSTO abrange as 3 linhas de quarto
  doc.rect(xPosto, tableBodyTop, cPosto, ROW_H * 3);
  doc.setFont('helvetica', 'bold');
  doc.text('01', xPosto + cPosto / 2, tableBodyTop + ROW_H * 1.5 + 1, { align: 'center' });

  const postos = Array.isArray(diario.postos_sentinela) ? diario.postos_sentinela : [];
  const QUARTOS = ['1°', '2°', '3°'];

  for (let i = 0; i < 3; i++) {
    const rowY = tableBodyTop + i * ROW_H;
    const posto = postos[i] || {};
    const sentNum  = posto.numero || '___-___';
    const sentNome = uc(posto.nome) || '________________';

    doc.rect(xQuarto,  rowY, cQuarto,  ROW_H);
    doc.rect(xNum,     rowY, cNum,     ROW_H);
    doc.rect(xNome,    rowY, cNome,    ROW_H);
    doc.rect(xHorario, rowY, cHorario, ROW_H);

    doc.setFont('helvetica', 'normal');
    const midCell = rowY + ROW_H / 2 + 1;
    doc.text(QUARTOS[i],   xQuarto  + cQuarto  / 2, midCell, { align: 'center' });
    doc.text(sentNum,      xNum     + cNum     / 2, midCell, { align: 'center' });

    // Nome — truncado se necessário
    const nomeTrunc = doc.splitTextToSize(sentNome, cNome - 2)[0];
    doc.text(nomeTrunc, xNome + 1, midCell);

    // Horários — uma linha por período
    let hy = rowY + LH_TABLE - 1;
    for (const h of HORARIOS_QUARTO[i]) {
      doc.text(h, xHorario + 1, hy);
      hy += LH_TABLE;
    }
  }

  y = tableBodyTop + ROW_H * 3 + 4;
  doc.setFontSize(9);

  // ── Item 04 ────────────────────────────────────────────────────────────────
  const s04 = diario.material_carga_status === 'Com Alteração' ? 'COM ALTERAÇÃO' : 'SEM ALTERAÇÃO';
  let t04 = `MATERIAL CARGA: ${s04}.`;
  if (diario.material_carga_status === 'Com Alteração' && diario.material_carga_descricao?.trim()) {
    t04 += ` ${uc(diario.material_carga_descricao)}`;
  }
  y = itemBold(doc, '04', t04, ML, y, UW, LH);
  y += 2;

  // ── Item 05 ────────────────────────────────────────────────────────────────
  const s05 = diario.instalacoes_status === 'Com Alteração' ? 'COM ALTERAÇÃO' : 'SEM ALTERAÇÃO';
  let t05 = `INSTALAÇÕES: ${s05}.`;
  if (diario.instalacoes_status === 'Com Alteração' && diario.instalacoes_descricao?.trim()) {
    t05 += ` ${uc(diario.instalacoes_descricao)}`;
  }
  y = itemBold(doc, '05', t05, ML, y, UW, LH);
  y += 2;

  // ── Item 06 ────────────────────────────────────────────────────────────────
  const s06 = diario.iluminacao_status === 'Com Alteração' ? 'COM ALTERAÇÃO' : 'SEM ALTERAÇÃO';
  let t06 = `ILUMINAÇÃO: ${s06}.`;
  if (diario.iluminacao_status === 'Com Alteração' && diario.iluminacao_descricao?.trim()) {
    t06 += ` ${uc(diario.iluminacao_descricao)}`;
  }
  y = itemBold(doc, '06', t06, ML, y, UW, LH);
  y += 2;

  // ── Item 07 ────────────────────────────────────────────────────────────────
  const ocorr = diario.ocorrencias_texto?.trim();
  let t07 = ocorr ? `OCORRÊNCIAS: ${uc(ocorr)}` : 'OCORRÊNCIAS: NADA A REGISTRAR.';
  y = itemBold(doc, '07', t07, ML, y, UW, LH);
  y += 2;

  // ── Item 08 ────────────────────────────────────────────────────────────────
  const pasNr   = diario.passagem_monitor_numero || '___-___';
  const pasNome = uc(diario.passagem_monitor_nome) || '________________';
  y = itemBold(doc, '08', `FIZ A PASSAGEM AO MONITOR N° ${pasNr} – ${pasNome}, COM TODAS AS ORDENS EM VIGOR.`, ML, y, UW, LH);
  y += 6;

  // ── Rodapé ─────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Rio Claro-SP, ${dataExtenso(diario.data_servico)}.`, PW / 2, y, { align: 'center' });
  y += LH * 5;

  // Linha de assinatura
  const sigW  = 70;
  const sigX1 = PW / 2 - sigW / 2;
  const sigX2 = PW / 2 + sigW / 2;
  doc.line(sigX1, y, sigX2, y);
  y += LH;

  const nomeCompleto = uc(diario.cabo_nome) || '________________________________';
  doc.setFont('helvetica', 'bold');
  doc.text(nomeCompleto, PW / 2, y, { align: 'center' });
  y += LH;
  doc.setFont('helvetica', 'normal');
  doc.text('MONITOR / CMT DA GUARDA', PW / 2, y, { align: 'center' });

  // ── Download ───────────────────────────────────────────────────────────────
  doc.save(`diario_${diario.data_servico}.pdf`);
}
