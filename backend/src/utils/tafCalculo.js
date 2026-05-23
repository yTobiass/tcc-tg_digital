// Tabelas de pontuação para TAF — TG, faixa 18-21 anos, sexo masculino
// Baseadas nas normas do Exército Brasileiro (simplificadas para uso no TCC)

const TABELAS = {
  corrida: [
    { min: 3200, pts: 100 }, { min: 3000, pts: 95 }, { min: 2800, pts: 90 },
    { min: 2600, pts: 82 },  { min: 2400, pts: 74 }, { min: 2200, pts: 65 },
    { min: 2000, pts: 55 },  { min: 1800, pts: 45 }, { min: 1600, pts: 35 },
    { min: 0,    pts: 20 },
  ],
  flexao: [
    { min: 50, pts: 100 }, { min: 44, pts: 95 }, { min: 38, pts: 90 },
    { min: 33, pts: 82 },  { min: 28, pts: 74 }, { min: 24, pts: 65 },
    { min: 20, pts: 55 },  { min: 15, pts: 45 }, { min: 10, pts: 35 },
    { min: 0,  pts: 20 },
  ],
  abdominal: [
    { min: 60, pts: 100 }, { min: 54, pts: 95 }, { min: 48, pts: 90 },
    { min: 42, pts: 82 },  { min: 36, pts: 74 }, { min: 30, pts: 65 },
    { min: 25, pts: 55 },  { min: 20, pts: 45 }, { min: 15, pts: 35 },
    { min: 0,  pts: 20 },
  ],
};

function pontuar(valor, chave) {
  for (const { min, pts } of TABELAS[chave]) {
    if (Number(valor) >= min) return pts;
  }
  return 20;
}

function calcularConceito(nota) {
  if (nota >= 90) return 'Excelente';
  if (nota >= 75) return 'Muito Bom';
  if (nota >= 60) return 'Bom';
  if (nota >= 45) return 'Regular';
  return 'Insuficiente';
}

function calcularTAF(corrida, flexao, abdominal) {
  const ptsCorrida    = pontuar(corrida,    'corrida');
  const ptsFlexao     = pontuar(flexao,     'flexao');
  const ptsAbdominal  = pontuar(abdominal,  'abdominal');
  const nota          = Math.round((ptsCorrida + ptsFlexao + ptsAbdominal) / 3);
  return { nota, conceito: calcularConceito(nota), ptsCorrida, ptsFlexao, ptsAbdominal };
}

module.exports = { calcularTAF, calcularConceito, pontuar, TABELAS };
