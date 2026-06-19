import { jsPDF } from 'jspdf';
import { raExibicao } from './nomes';

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
  // Colunas: Nº | Nome | RA | Pelotão | Turma | Faltas | Faltas nas Guardas
  const cols = { num: 8, nome: 70, ra: 22, pelotao: 20, turma: 16, falt: 16, faltGuarda: 22 };
  // total = 8+70+22+20+16+16+22 = 174
  const xNum    = ML;
  const xNome   = xNum    + cols.num;
  const xRA     = xNome   + cols.nome;
  const xPelotao= xRA     + cols.ra;
  const xTurma  = xPelotao+ cols.pelotao;
  const xFalt   = xTurma  + cols.turma;
  const xFaltGd = xFalt   + cols.falt;
  const totalW  = cols.num + cols.nome + cols.ra + cols.pelotao + cols.turma + cols.falt + cols.faltGuarda;

  const hH = 7; // header height
  const rH = 6; // row height

  function desenharCabecalhoTabela() {
    doc.setFillColor(230, 230, 230);
    doc.rect(ML, y, totalW, hH, 'F');
    doc.rect(ML, y, totalW, hH);

    // Linhas verticais do cabeçalho
    [xNome, xRA, xPelotao, xTurma, xFalt, xFaltGd].forEach((x) => {
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
    doc.text('FALTAS',    xFalt   + 1,   cy);
    doc.text('F. GUARDA', xFaltGd + 1,   cy);
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

    doc.setFillColor(255, 255, 255);
    doc.rect(ML, y, totalW, rH, 'FD');

    [xNome, xRA, xPelotao, xTurma, xFalt, xFaltGd].forEach((x) => {
      doc.line(x, y, x, y + rH);
    });

    const cy = y + 4;
    doc.setTextColor(50, 50, 50);
    doc.text(String(idx + 1),               xNum    + 1, cy);
    const nomeTrunc = doc.splitTextToSize(s.nome_completo?.toUpperCase() || '—', cols.nome - 3)[0];
    doc.text(nomeTrunc,                     xNome   + 1, cy);
    doc.text(raExibicao(s.ra) || '—',       xRA     + 1, cy);
    doc.text(s.pelotao || '—',              xPelotao+ 1, cy);
    doc.text(s.turma   || '—',              xTurma  + 1, cy);
    doc.text(String(s.faltas        ?? 0),  xFalt   + 1, cy);
    doc.text(String(s.faltas_guarda ?? 0),  xFaltGd + 1, cy);
    y += rH;
  });

  // Linha de fechamento da tabela
  doc.setTextColor(0, 0, 0);
  doc.line(ML, y, ML + totalW, y);

  // Totalizador
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const totalFaltas    = dados.reduce((a, s) => a + (s.faltas        ?? 0), 0);
  const totalFaltasGd  = dados.reduce((a, s) => a + (s.faltas_guarda ?? 0), 0);
  doc.text(
    `Total: ${dados.length} soldado(s)  |  Faltas: ${totalFaltas}  |  Faltas nas Guardas: ${totalFaltasGd}`,
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
