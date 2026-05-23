import { jsPDF } from 'jspdf';

const MESES = [
  'janeiro','fevereiro','março','abril','maio','junho',
  'julho','agosto','setembro','outubro','novembro','dezembro',
];

const TIPO_LABEL = { verde: 'VERDE', preta: 'PRETA', vermelha: 'VERMELHA' };

function formatarDataBR(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function dataExtenso(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

function uc(str) { return (str || '').toUpperCase(); }

export function gerarPdfEscala(escala) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const ML = 20;
  const MR = 20;
  const PW = 210;
  const UW = PW - ML - MR;
  const LH = 6;
  let y = 22;

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('MINISTÉRIO DA DEFESA – EXÉRCITO BRASILEIRO – CMSE – CMDO 2ª RM', PW / 2, y, { align: 'center' });
  y += 5;
  doc.text('TIRO DE GUERRA 02-032 (RIO CLARO-SP)', PW / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(13);
  doc.text(`ESCALA DE GUARDA ${TIPO_LABEL[escala.tipo] ?? uc(escala.tipo)}`, PW / 2, y, { align: 'center' });
  y += 8;

  // ── Período ─────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const periodo = escala.data_inicio === escala.data_fim
    ? `Dia ${formatarDataBR(escala.data_inicio)}`
    : `De ${formatarDataBR(escala.data_inicio)} a ${formatarDataBR(escala.data_fim)}`;
  doc.text(`Período: ${periodo}`, PW / 2, y, { align: 'center' });
  y += 5;

  const statusLabel = { agendada: 'AGENDADA', em_andamento: 'EM ANDAMENTO', concluida: 'CONCLUÍDA', cancelada: 'CANCELADA' };
  doc.text(`Situação: ${statusLabel[escala.status] ?? uc(escala.status)}`, PW / 2, y, { align: 'center' });
  y += 10;

  // ── Linha divisória ─────────────────────────────────────────────────────────
  doc.setDrawColor(180);
  doc.line(ML, y, ML + UW, y);
  y += 8;

  // ── Membros ─────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PESSOAL ESCALADO', ML, y);
  y += 7;

  const cabo = escala.membros?.find((m) => m.funcao === 'cabo');
  const ats  = escala.membros?.filter((m) => m.funcao === 'atirador') ?? [];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  // Cabeçalho da tabela
  const cFunc = 40;
  const cRA   = 30;
  const cNome = UW - cFunc - cRA;
  const xFunc = ML;
  const xRA   = ML + cFunc;
  const xNome = xRA + cRA;
  const rowH  = 8;
  const headerH = 7;

  doc.setFillColor(240, 240, 240);
  doc.rect(ML, y, UW, headerH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('FUNÇÃO',  xFunc + 2,  y + 5);
  doc.text('N° (RA)', xRA   + 2,  y + 5);
  doc.text('NOME COMPLETO', xNome + 2, y + 5);

  doc.rect(ML, y, UW, headerH);
  doc.line(xRA,   y, xRA,   y + headerH);
  doc.line(xNome, y, xNome, y + headerH);
  y += headerH;

  function linha(funcao, ra, nome) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.rect(ML, y, UW, rowH);
    doc.line(xRA,   y, xRA,   y + rowH);
    doc.line(xNome, y, xNome, y + rowH);
    doc.text(uc(funcao), xFunc + 2, y + 5);
    doc.text(ra || '—', xRA + 2, y + 5);
    const nomeTrunc = doc.splitTextToSize(uc(nome || '—'), cNome - 4)[0];
    doc.text(nomeTrunc, xNome + 2, y + 5);
    y += rowH;
  }

  if (cabo) linha('MONITOR / CABO', cabo.ra, cabo.nome_completo);
  ats.forEach((at, i) => linha(`ATIRADOR ${i + 1}`, at.ra, at.nome_completo));

  y += 6;

  // ── Observações ─────────────────────────────────────────────────────────────
  if (escala.observacoes?.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('OBSERVAÇÕES:', ML, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const obsLines = doc.splitTextToSize(escala.observacoes, UW);
    doc.text(obsLines, ML, y);
    y += obsLines.length * 5 + 4;
  }

  // ── Rodapé ──────────────────────────────────────────────────────────────────
  y = Math.max(y + 10, 230);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Rio Claro-SP, ${dataExtenso(escala.data_inicio)}.`, PW / 2, y, { align: 'center' });
  y += LH * 4;

  const sigW  = 70;
  const sigX1 = PW / 2 - sigW / 2;
  doc.line(sigX1, y, sigX1 + sigW, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('RESPONSÁVEL', PW / 2, y, { align: 'center' });

  doc.save(`escala_${escala.tipo}_${escala.data_inicio}.pdf`);
}
