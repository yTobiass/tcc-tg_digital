import { jsPDF } from 'jspdf';

const MESES = [
  'janeiro','fevereiro','março','abril','maio','junho',
  'julho','agosto','setembro','outubro','novembro','dezembro',
];

function formatarBR(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function dataExtenso(iso) {
  const [y, m, d] = (iso || new Date().toISOString().slice(0, 10)).split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

function corTaxa(taxa) {
  if (taxa === null || taxa === undefined) return [200, 200, 200];
  if (taxa >= 75) return [220, 252, 231];   // verde claro
  if (taxa >= 50) return [254, 249, 195];   // amarelo claro
  return [254, 226, 226];                   // vermelho claro
}

export function gerarPdfPresenca({ dados, dataInicio, dataFim, filtros = {} }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const ML = 15;
  const PW = 210;
  const UW = PW - ML * 2;
  let y = 22;

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('MINISTÉRIO DA DEFESA – EXÉRCITO BRASILEIRO – CMSE – CMDO 2ª RM', PW / 2, y, { align: 'center' });
  y += 5;
  doc.text('TIRO DE GUERRA 02-032 (RIO CLARO-SP)', PW / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(13);
  doc.text('RELATÓRIO DE PRESENÇA', PW / 2, y, { align: 'center' });
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Período: ${formatarBR(dataInicio)} a ${formatarBR(dataFim)}`, PW / 2, y, { align: 'center' });
  y += 5;

  const filtroTexto = [
    filtros.turma   && `Turma: ${filtros.turma}`,
    filtros.pelotao && `Pelotão: ${filtros.pelotao}`,
  ].filter(Boolean).join('   ');
  if (filtroTexto) {
    doc.setFontSize(9);
    doc.text(filtroTexto, PW / 2, y, { align: 'center' });
    y += 5;
  }

  y += 3;
  doc.setDrawColor(180);
  doc.line(ML, y, ML + UW, y);
  y += 6;

  // ── Tabela ─────────────────────────────────────────────────────────────────
  // Colunas: Nº(8) | Nome(72) | RA(22) | Pelotão(18) | Turma(16) | Pres(12) | Falt(12) | Taxa(12) = 172... adjust
  const cols = { num: 8, nome: 68, ra: 22, pelotao: 18, turma: 16, pres: 12, falt: 12, taxa: 14 };
  // total = 8+68+22+18+16+12+12+14 = 170 + margem interna
  const xNum    = ML;
  const xNome   = xNum    + cols.num;
  const xRA     = xNome   + cols.nome;
  const xPelotao= xRA     + cols.ra;
  const xTurma  = xPelotao+ cols.pelotao;
  const xPres   = xTurma  + cols.turma;
  const xFalt   = xPres   + cols.pres;
  const xTaxa   = xFalt   + cols.falt;
  const totalW  = cols.num + cols.nome + cols.ra + cols.pelotao + cols.turma + cols.pres + cols.falt + cols.taxa;

  const hH = 7; // header height
  const rH = 6; // row height

  function desenharCabecalhoTabela() {
    doc.setFillColor(230, 230, 230);
    doc.rect(ML, y, totalW, hH, 'F');
    doc.rect(ML, y, totalW, hH);

    // Linhas verticais do cabeçalho
    [xNome, xRA, xPelotao, xTurma, xPres, xFalt, xTaxa].forEach((x) => {
      doc.line(x, y, x, y + hH);
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const cy = y + 4.5;
    doc.text('Nº',        xNum    + 1,   cy);
    doc.text('NOME COMPLETO', xNome + 1, cy);
    doc.text('RA',        xRA     + 1,   cy);
    doc.text('PELOTÃO',   xPelotao+ 1,   cy);
    doc.text('TURMA',     xTurma  + 1,   cy);
    doc.text('PRES.',     xPres   + 1,   cy);
    doc.text('FALT.',     xFalt   + 1,   cy);
    doc.text('TAXA %',    xTaxa   + 1,   cy);
  }

  desenharCabecalhoTabela();
  y += hH;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  dados.forEach((s, idx) => {
    // Verificar quebra de página
    if (y + rH > 272) {
      doc.addPage();
      y = 18;
      desenharCabecalhoTabela();
      y += hH;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    }

    const [r, g, b] = corTaxa(s.taxa_presenca);
    doc.setFillColor(r, g, b);
    doc.rect(ML, y, totalW, rH, 'FD');

    [xNome, xRA, xPelotao, xTurma, xPres, xFalt, xTaxa].forEach((x) => {
      doc.line(x, y, x, y + rH);
    });

    const cy = y + 4;
    doc.setTextColor(50, 50, 50);
    doc.text(String(idx + 1),               xNum    + 1, cy);
    const nomeTrunc = doc.splitTextToSize(s.nome_completo?.toUpperCase() || '—', cols.nome - 3)[0];
    doc.text(nomeTrunc,                     xNome   + 1, cy);
    doc.text(s.ra || '—',                   xRA     + 1, cy);
    doc.text(s.pelotao || '—',              xPelotao+ 1, cy);
    doc.text(s.turma   || '—',              xTurma  + 1, cy);
    doc.text(String(s.presentes ?? 0),      xPres   + 1, cy);
    doc.text(String(s.ausentes  ?? 0),      xFalt   + 1, cy);
    doc.text(
      s.taxa_presenca != null ? `${s.taxa_presenca}%` : '—',
      xTaxa + 1, cy,
    );
    y += rH;
  });

  // Linha de fechamento da tabela
  doc.setTextColor(0, 0, 0);
  doc.line(ML, y, ML + totalW, y);

  // Totalizador
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const totalPresentes = dados.reduce((a, s) => a + (s.presentes ?? 0), 0);
  const totalFaltas    = dados.reduce((a, s) => a + (s.ausentes  ?? 0), 0);
  const totalReg       = dados.reduce((a, s) => a + (s.total_registros ?? 0), 0);
  const taxaGeral      = totalReg > 0 ? Math.round(100 * totalPresentes / totalReg) : null;
  doc.text(
    `Total: ${dados.length} soldado(s)  |  Presenças: ${totalPresentes}  |  Faltas: ${totalFaltas}${taxaGeral !== null ? `  |  Taxa geral: ${taxaGeral}%` : ''}`,
    ML, y,
  );

  // ── Rodapé ─────────────────────────────────────────────────────────────────
  y = Math.max(y + 16, 250);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Rio Claro-SP, ${dataExtenso(dataInicio)}.`, PW / 2, y, { align: 'center' });
  y += 20;
  const sigW = 70;
  doc.line(PW / 2 - sigW / 2, y, PW / 2 + sigW / 2, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('RESPONSÁVEL', PW / 2, y, { align: 'center' });

  doc.save(`relatorio_presenca_${dataInicio}_${dataFim}.pdf`);
}
