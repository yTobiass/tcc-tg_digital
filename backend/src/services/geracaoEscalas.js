const { getDb } = require('../database/db');
const model = require('../models/escalasModel');

// ── Helpers de data (operam em strings ISO 'YYYY-MM-DD', meio-dia p/ evitar fuso) ──
function toDate(iso) { return new Date(`${iso}T12:00:00`); }
function fmt(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function addDays(iso, n) { const dt = toDate(iso); dt.setDate(dt.getDate() + n); return fmt(dt); }
function dow(iso) { return toDate(iso).getDay(); } // 0=Dom … 6=Sáb
function hojeISO() { return fmt(new Date()); }

// Primeiro sábado em ou após `iso`.
function proximoSabado(iso) { let d = iso; while (dow(d) !== 6) d = addDays(d, 1); return d; }

// Gera todas as escalas do dia atual até 31/12 do ano corrente, respeitando a
// fila de rotação e os períodos bloqueados. É idempotente: dias que já têm
// escala (não cancelada) são pulados silenciosamente.
function gerarEscalasDoAno(usuarioId) {
  model.garantirFilas();
  const hoje = hojeISO();
  const ano = toDate(hoje).getFullYear();
  const fim = `${ano}-12-31`;

  let verdes = 0, pretas = 0, vermelhas = 0, dias_pulados = 0;

  // ── GUARDAS DE DIA ÚTIL (seg–sex): 1 PRETA + 1 VERDE por dia ──
  // Todo dia útil tem uma preta (1 cabo + 3 atiradores, do dia para o seguinte) e
  // uma verde (1 atirador). A preta é gerada ANTES da verde do mesmo dia: como ela
  // cobre o dia e o dia seguinte, a sugestão da verde (que exclui atiradores presos
  // em preta cobrindo a data) passa a excluir tanto os da preta de hoje quanto os
  // da preta de ontem — garantindo que um atirador de preta não faça verde no
  // mesmo dia NEM no dia seguinte.
  for (let dia = hoje; dia <= fim; dia = addDays(dia, 1)) {
    const d = dow(dia);
    if (d === 0 || d === 6) continue;                 // só dias úteis
    if (model.estaBloequeado(dia)) continue;          // não gera em bloqueio

    // PRETA do dia: data_inicio = dia, data_fim = dia + 1.
    const dfPreta = addDays(dia, 1);
    if (!model.estaBloequeado(dfPreta) && !model.existeEscalaTipoData('preta', dia)) {
      const sugP = model.sugerirMembros('preta', dia, dfPreta);
      const cabo = sugP.cabo;
      const atsP = sugP.atiradores || [];
      if (cabo && atsP.length >= 3) {
        model.criarEscala({
          tipo: 'preta', data_inicio: dia, data_fim: dfPreta,
          membros: [
            { soldado_id: cabo.soldado_id, funcao: 'cabo' },
            ...atsP.slice(0, 3).map((a) => ({ soldado_id: a.soldado_id, funcao: 'atirador' })),
          ],
          criado_por: usuarioId,
        });
        pretas++;
      } else {
        dias_pulados++;
      }
    }

    // VERDE do dia: 1 atirador. Pulada se já existir verde (não cancelada) no dia.
    if (!model.existeEscalaTipoData('verde', dia)) {
      const sugV = model.sugerirMembros('verde', dia, dia);
      const atirador = (sugV.atiradores || [])[0];
      if (atirador) {
        model.criarEscala({
          tipo: 'verde', data_inicio: dia, data_fim: dia,
          membros: [{ soldado_id: atirador.soldado_id, funcao: 'atirador' }],
          criado_por: usuarioId,
        });
        verdes++;
      } else {
        dias_pulados++;
      }
    }
  }

  // ── GUARDAS VERMELHAS — uma para CADA dia do fim de semana ──
  // Sábado→domingo E domingo→segunda, cada uma com 1 cabo + 3 atiradores. A de
  // sábado é gerada antes da de domingo: como ela cobre o domingo, a sugestão da
  // de domingo já exclui esses soldados (não repete efetivo no mesmo dia).
  function criarVermelha(di) {
    const df = addDays(di, 1);
    if (model.estaBloequeado(di) || model.estaBloequeado(df)) return;
    // Já existe vermelha (não cancelada) com esta data_inicio → pula.
    if (model.existeEscalaTipoData('vermelha', di)) return;

    const sug = model.sugerirMembros('vermelha', di, df);
    const cabo = sug.cabo;
    const ats = sug.atiradores || [];
    if (!cabo || ats.length < 3) { dias_pulados++; return; }

    model.criarEscala({
      tipo: 'vermelha', data_inicio: di, data_fim: df,
      membros: [
        { soldado_id: cabo.soldado_id, funcao: 'cabo' },
        ...ats.slice(0, 3).map((a) => ({ soldado_id: a.soldado_id, funcao: 'atirador' })),
      ],
      criado_por: usuarioId,
    });
    vermelhas++;
  }

  for (let sabado = proximoSabado(hoje); sabado <= fim; sabado = addDays(sabado, 7)) {
    criarVermelha(sabado);                              // sábado → domingo
    const domingo = addDays(sabado, 1);
    if (domingo <= fim) criarVermelha(domingo);         // domingo → segunda
  }

  model.verificarEReiniciarFila('cabos');
  model.verificarEReiniciarFila('atiradores');

  return { geradas: verdes + pretas + vermelhas, verdes, pretas, vermelhas, dias_pulados };
}

// Regenera do zero: cancela as escalas futuras agendadas, recoloca a fila de
// rotação no estado de baseline e gera novamente.
function regenerarEscalasDoAno(usuarioId) {
  const db = getDb();
  const hoje = hojeISO();

  db.transaction(() => {
    // 1. Cancela todas as escalas agendadas a partir de hoje.
    db.prepare(
      "UPDATE escalas_guarda SET status = 'cancelada' WHERE status = 'agendada' AND data_inicio >= ?"
    ).run(hoje);

    // 2. Reverte a fila de rotação ao estado anterior à geração. Para os
    //    soldados que guardaram uma posição anterior, restaura-a; em seguida a
    //    fila é renormalizada por garantirFilas/verificarEReiniciarFila.
    db.prepare(`
      UPDATE fila_rotacao
      SET posicao = posicao_anterior, posicao_anterior = NULL,
          ultima_escala_id = NULL, ultima_data = NULL
      WHERE posicao_anterior IS NOT NULL
    `).run();
  })();

  model.garantirFilas();
  model.verificarEReiniciarFila('cabos');
  model.verificarEReiniciarFila('atiradores');

  // 3. Gera novamente do zero.
  return gerarEscalasDoAno(usuarioId);
}

module.exports = { gerarEscalasDoAno, regenerarEscalasDoAno };
