// Helpers de cor/rótulo do módulo de pontos e FATD.

export const LIMITE_PONTOS = 120;
export const LIMITE_FATD = 3;

// Faixa de cor da coluna/barra de pontos.
// 0–59 verde · 60–89 amarelo · 90–119 laranja · 120+ vermelho
export function corPontos(pontos) {
  if (pontos >= 120) return { key: 'vermelho', bg: '#fee2e2', fg: '#991b1b', barra: '#dc2626' };
  if (pontos >= 90)  return { key: 'laranja',  bg: '#ffedd5', fg: '#9a3412', barra: '#ea580c' };
  if (pontos >= 60)  return { key: 'amarelo',  bg: '#fef9c3', fg: '#854d0e', barra: '#ca8a04' };
  return { key: 'verde', bg: '#dcfce7', fg: '#166534', barra: '#16a34a' };
}

// Faixa de cor da coluna de FATDs.
// 0–1 verde · 2 laranja · 3 vermelho
export function corFatd(fatd) {
  if (fatd >= 3) return { key: 'vermelho', bg: '#fee2e2', fg: '#991b1b' };
  if (fatd >= 2) return { key: 'laranja',  bg: '#ffedd5', fg: '#9a3412' };
  return { key: 'verde', bg: '#dcfce7', fg: '#166534' };
}

// Situação textual derivada de pontos/FATDs/status.
export function situacao(soldado) {
  if (soldado.status === 'dispensado') return { label: '⛔ Expulso',  bg: '#fee2e2', fg: '#991b1b' };
  const p = soldado.total_pontos ?? 0;
  const f = soldado.total_fatd ?? 0;
  if (p >= 90 || f >= 2) return { label: '🔴 Crítico', bg: '#fee2e2', fg: '#991b1b' };
  if (p >= 60)           return { label: '🟡 Atenção', bg: '#fef9c3', fg: '#854d0e' };
  return { label: '🟢 Regular', bg: '#dcfce7', fg: '#166534' };
}

export const TIPO_PONTO_LABEL = {
  falta: 'Falta',
  falta_guarda: 'Falta em Guarda',
  fatd: 'FATD',
  ajuste_manual: 'Ajuste manual',
};
