import { useState, useEffect, useCallback } from 'react';
import { Layout }        from '../../components/layout/Layout';
import { InfoTooltip }   from '../../components/ui/Tooltip';
import { diarioService } from '../../services/diarioService';
import { soldadosService } from '../../services/soldadosService';
import { gerarPdfDiario } from '../../utils/diarioPDF';
import { formatarData, hoje } from '../../utils/data';
import styles from './DiarioForm.module.scss';

const STATUS_OPTS = ['Sem Alteração', 'Com Alteração'];

// Extrai o nome de guerra. Suporta o formato "SOBRENOME, Nome" (nome de
// guerra = parte antes da vírgula) e o formato "Nome Sobrenome" (última palavra).
function nomeGuerraDe(nomeCompleto = '') {
  const nome = nomeCompleto.trim();
  if (!nome) return '';
  if (nome.includes(',')) return nome.split(',')[0].trim().toUpperCase();
  const partes = nome.split(/\s+/);
  return partes[partes.length - 1].toUpperCase();
}

// Seleção de soldado por RA. Ao escolher devolve { numero, nome (guerra),
// nomeCompleto, nomeGuerra } para que o chamador use o que precisar.
// `graduacao` filtra a lista ('cabo' ou 'atirador'); omitido mostra todos.
function SoldadoSelect({ soldados, valorRa, onSelect, disabled, placeholder, graduacao }) {
  const lista = graduacao
    ? soldados.filter((s) => (s.graduacao ?? 'atirador') === graduacao)
    : soldados;
  return (
    <select
      disabled={disabled}
      className={styles.input}
      value={valorRa ?? ''}
      onChange={(e) => {
        const s = soldados.find((x) => String(x.ra) === e.target.value);
        onSelect(s
          ? {
              numero:       String(s.ra),
              nome:         nomeGuerraDe(s.nome_completo),
              nomeCompleto: s.nome_completo,
              nomeGuerra:   nomeGuerraDe(s.nome_completo),
            }
          : { numero: '', nome: '', nomeCompleto: '', nomeGuerra: '' });
      }}
    >
      <option value="">{placeholder ?? 'Selecione o soldado…'}</option>
      {lista.map((s) => (
        <option key={s.id} value={s.ra}>
          {s.nome_completo} — RA {s.ra}
        </option>
      ))}
    </select>
  );
}

const POSTOS_VAZIOS = [
  { quarto: '1°', numero: '', nome: '' },
  { quarto: '2°', numero: '', nome: '' },
  { quarto: '3°', numero: '', nome: '' },
];

const ATIRADOR_VAZIO = { ra: '', nome: '', nomeGuerra: '' };

// Garante sempre 3 posições de atirador (preenchidas ou vazias) para os selects.
function padAtiradores(lista = []) {
  return [0, 1, 2].map((i) => lista[i] ?? { ...ATIRADOR_VAZIO });
}

const FORM_INICIAL = {
  data_servico:               hoje(),
  parada_diaria_status:       'Sem Alteração',
  parada_diaria_descricao:    '',
  recebimento_monitor_numero: '',
  recebimento_monitor_nome:   '',
  recebimento_status:         'Sem Alteração',
  escala_id:                  null,
  cabo_ra:                    '',
  cabo_nome:                  '',
  atiradores:                 padAtiradores([]),
  postos_sentinela:           [...POSTOS_VAZIOS],
  material_carga_status:      'Sem Alteração',
  material_carga_descricao:   '',
  instalacoes_status:         'Sem Alteração',
  instalacoes_descricao:      '',
  iluminacao_status:          'Sem Alteração',
  iluminacao_descricao:       '',
  ocorrencias_texto:          '',
  passagem_monitor_numero:    '',
  passagem_monitor_nome:      '',
};

function proximoDia(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const p = new Date(y, m - 1, d + 1);
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, '0')}-${String(p.getDate()).padStart(2, '0')}`;
}

function SecaoToggle({ label, campo, form, set, bloqueado }) {
  const campoDesc = campo.replace('_status', '_descricao');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>{label}:</span>
        {STATUS_OPTS.map((s) => {
          const isActive = form[campo] === s;
          const modClass = isActive
            ? s === 'Com Alteração' ? styles['toggleBtn--altActive'] : styles['toggleBtn--okActive']
            : '';
          return (
            <button
              key={s}
              type="button"
              disabled={bloqueado}
              onClick={() => set(campo, s)}
              className={`${styles.toggleBtn} ${modClass}`}
            >
              {s}
            </button>
          );
        })}
      </div>
      {form[campo] === 'Com Alteração' && (
        <textarea
          rows={2}
          disabled={bloqueado}
          placeholder="Descreva a alteração…"
          className={styles.textarea}
          value={form[campoDesc] ?? ''}
          onChange={(e) => set(campoDesc, e.target.value)}
        />
      )}
    </div>
  );
}

function CampoAutoPreenchido({ label, value, tooltip }) {
  return (
    <div>
      <label
        className={styles.label}
        style={tooltip ? { display: 'flex', alignItems: 'center', gap: 4 } : undefined}
      >
        {label}
        {tooltip && <InfoTooltip text={tooltip} position="top" />}
      </label>
      <div className={styles.autoField}>
        {value || <span className={styles.autoEmpty}>Não encontrado</span>}
      </div>
    </div>
  );
}

function SectionTitle({ numero, titulo }) {
  return (
    <div className={styles.sectionTitle}>
      <span className={styles.sectionNum}>{numero}</span>
      <h3 className={styles.sectionName}>{titulo}</h3>
    </div>
  );
}

export default function DiarioForm({ inicial, onSalvo, onCancelar }) {
  const editando  = Boolean(inicial?.id);
  const bloqueado = Boolean(inicial?.pdf_gerado);

  const [form, setFormState] = useState(() => {
    if (!inicial) return { ...FORM_INICIAL };
    return {
      ...FORM_INICIAL,
      ...inicial,
      postos_sentinela: Array.isArray(inicial.postos_sentinela) && inicial.postos_sentinela.length === 3
        ? inicial.postos_sentinela
        : [...POSTOS_VAZIOS],
      atiradores: padAtiradores(Array.isArray(inicial.atiradores) ? inicial.atiradores : []),
    };
  });

  const [contexto,  setContexto]  = useState(null);
  const [carregCtx, setCarregCtx] = useState(false);
  const [salvando,  setSalvando]  = useState(false);
  const [gerando,   setGerando]   = useState(false);
  const [erro,      setErro]      = useState(null);
  const [soldados,  setSoldados]  = useState([]);

  useEffect(() => {
    soldadosService.listar({ status: 'ativo' })
      .then(setSoldados)
      .catch(() => setSoldados([]));
  }, []);

  function set(campo, valor) {
    setFormState((f) => ({ ...f, [campo]: valor }));
  }

  const buscarContexto = useCallback(async (data) => {
    if (!data) return;
    setCarregCtx(true);
    setContexto(null);
    try {
      const ctx = await diarioService.contexto(data);
      setContexto(ctx);
      // Auto-preenche apenas o que vier da escala, sem sobrescrever o que o
      // usuário já tiver digitado manualmente (?? mantém o valor atual).
      if (!editando) {
        setFormState((f) => {
          const next = {
            ...f,
            recebimento_monitor_numero: ctx.escalaAnterior?.cabo?.ra          ?? f.recebimento_monitor_numero,
            recebimento_monitor_nome:   ctx.escalaAnterior?.cabo?.nomeGuerra  ?? f.recebimento_monitor_nome,
            passagem_monitor_numero:    ctx.escalaSeguinte?.cabo?.ra          ?? f.passagem_monitor_numero,
            passagem_monitor_nome:      ctx.escalaSeguinte?.cabo?.nomeGuerra  ?? f.passagem_monitor_nome,
          };
          if (ctx.escala) {
            next.escala_id  = ctx.escala.id ?? f.escala_id;
            next.cabo_ra    = ctx.escala.cabo?.ra   ?? f.cabo_ra;
            next.cabo_nome  = ctx.escala.cabo?.nome ?? f.cabo_nome;
            if (ctx.escala.atiradores?.length) {
              next.atiradores = padAtiradores(ctx.escala.atiradores);
              next.postos_sentinela = ctx.escala.atiradores.slice(0, 3).map((at, i) => ({
                quarto: POSTOS_VAZIOS[i].quarto,
                numero: at.ra ?? '',
                nome:   at.nomeGuerra ?? nomeGuerraDe(at.nome),
              })).concat(POSTOS_VAZIOS).slice(0, 3);
            }
          }
          return next;
        });
      }
    } catch {
      // Sem escala para essa data — ignora silenciosamente
    } finally {
      setCarregCtx(false);
    }
  }, [editando]);

  useEffect(() => {
    if (!editando) buscarContexto(form.data_servico);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDataChange(e) {
    const data = e.target.value;
    set('data_servico', data);
    if (!editando) buscarContexto(data);
  }

  function payloadParaSalvar() {
    return { ...form, postos_sentinela: form.postos_sentinela, atiradores: form.atiradores };
  }

  // Campos obrigatórios para gerar o PDF (rascunho pode ficar incompleto).
  // Ocorrências fica opcional de propósito: vazio imprime "Nada a Registrar".
  function camposFaltando() {
    const f = form;
    const faltando = [];

    if (!f.recebimento_monitor_numero) faltando.push('Item 02 – Monitor anterior (recebimento)');
    if (!f.cabo_ra)                    faltando.push('Item 03a – Comandante da Guarda (cabo/monitor)');

    const atsFilled = (f.atiradores || []).filter((a) => a?.ra).length;
    if (atsFilled < 3) faltando.push(`Item 03b – Guardas (atiradores): faltam ${3 - atsFilled} de 3`);

    const sentFilled = (f.postos_sentinela || []).filter((p) => p?.numero).length;
    if (sentFilled < 3) faltando.push(`Item 03 – Sentinelas do Posto 1: faltam ${3 - sentFilled} de 3`);

    if (!f.passagem_monitor_numero) faltando.push('Item 08 – Próximo monitor (passagem)');

    const comDescricao = [
      ['parada_diaria',  'Item 01 – Parada Diária'],
      ['material_carga', 'Item 04 – Material Carga'],
      ['instalacoes',    'Item 05 – Instalações'],
      ['iluminacao',     'Item 06 – Iluminação'],
    ];
    for (const [campo, label] of comDescricao) {
      if (f[`${campo}_status`] === 'Com Alteração' && !f[`${campo}_descricao`]?.trim()) {
        faltando.push(`${label}: descreva a alteração`);
      }
    }
    return faltando;
  }

  async function salvar() {
    setErro(null);
    setSalvando(true);
    try {
      const payload = payloadParaSalvar();
      const salvo = editando
        ? await diarioService.atualizar(inicial.id, payload)
        : await diarioService.criar(payload);
      onSalvo(salvo);
    } catch (e) {
      const msg = e?.response?.data?.error;
      setErro(typeof msg === 'string' ? msg : 'Erro ao salvar diário.');
    } finally {
      setSalvando(false);
    }
  }

  async function gerarPDF() {
    setErro(null);
    const faltando = camposFaltando();
    if (faltando.length) {
      setErro(`Preencha todos os campos obrigatórios antes de gerar o PDF:\n• ${faltando.join('\n• ')}`);
      return;
    }
    setGerando(true);
    try {
      const payload = payloadParaSalvar();
      let diario = inicial;
      if (!editando) {
        diario = await diarioService.criar(payload);
      } else if (!bloqueado) {
        diario = await diarioService.atualizar(inicial.id, payload);
      }
      const dadosPDF = {
        ...diario,
        atiradores:       form.atiradores,
        postos_sentinela: form.postos_sentinela,
        data_para:        proximoDia(diario.data_servico ?? form.data_servico),
      };
      gerarPdfDiario(dadosPDF);
      if (!diario.pdf_gerado) {
        const marcado = await diarioService.marcarPdf(diario.id);
        onSalvo(marcado);
      } else {
        onSalvo(diario);
      }
    } catch (e) {
      const msg = e?.response?.data?.error;
      setErro(typeof msg === 'string' ? msg : 'Erro ao gerar PDF.');
      setGerando(false);
    }
  }

  const ats = Array.isArray(form.atiradores) ? form.atiradores : [];

  // Sentinelas só podem ser os atiradores escalados como guardas no dia (item 03b).
  const guardasRas = new Set(ats.filter((a) => a?.ra).map((a) => String(a.ra)));
  const guardasSoldados = soldados.filter((s) => guardasRas.has(String(s.ra)));
  const guardasKey = [...guardasRas].sort().join(',');

  // Se um guarda deixar de ser escalado, limpa o sentinela que apontava para ele.
  useEffect(() => {
    if (bloqueado) return;
    setFormState((f) => {
      let mudou = false;
      const novos = f.postos_sentinela.map((p) => {
        if (p.numero && !guardasRas.has(String(p.numero))) { mudou = true; return { ...p, numero: '', nome: '' }; }
        return p;
      });
      return mudou ? { ...f, postos_sentinela: novos } : f;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardasKey, bloqueado]);

  return (
    <Layout>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.pageTitle}>
            {bloqueado ? 'Visualizar Diário' : editando ? 'Editar Diário' : 'Novo Diário de Rotina'}
          </h1>
          {bloqueado && <span className={styles.pdfBadge}>PDF gerado — somente leitura</span>}
          {inicial?.registrado_por_nome && (
            <span className={styles.selecionadoHint}>Registrado por: <strong>{inicial.registrado_por_nome}</strong></span>
          )}
        </div>
        <button type="button" onClick={onCancelar} className={styles.backBtn}>← Voltar à lista</button>
      </div>

      <div className={styles.formStack}>

        {/* ── Cabeçalho: datas ─────────────────────────────────────────────── */}
        <div className={styles.sectionCardSpaced}>
          <h2 className={styles.sectionHeader}>Cabeçalho</h2>
          <div className={styles.grid2}>
            <div>
              <label className={styles.label}>DO DIA</label>
              <input
                type="date"
                disabled={bloqueado || editando}
                className={styles.input}
                value={form.data_servico}
                onChange={handleDataChange}
              />
            </div>
            <CampoAutoPreenchido
              label="PARA O DIA (automático)"
              value={form.data_servico ? formatarData(proximoDia(form.data_servico)) : ''}
              tooltip="Sempre o dia seguinte ao do serviço"
            />
          </div>
          {carregCtx && <p className={styles.loadingCtx}>Buscando escala vinculada…</p>}
          {contexto && !contexto.escala && !carregCtx && (
            <div className={styles.alertWarning}>
              <p className={styles.alertWarnTitle}>Nenhuma escala cadastrada para esta data.</p>
              <p className={styles.alertWarnBody}>Preencha os campos do pessoal de serviço manualmente, ou cadastre a escala primeiro na aba Escalas.</p>
            </div>
          )}
          {contexto?.escala && (
            <div className={styles.alertSuccess}>
              <p className={styles.alertWarnTitle}>Escala guarda {contexto.escala.tipo} encontrada.</p>
              <p className={styles.alertWarnBody}>Cabo, atiradores, recebimento e passagem foram preenchidos automaticamente.</p>
            </div>
          )}
        </div>

        {/* ── Item 01: Parada Diária ────────────────────────────────────────── */}
        <div className={styles.sectionCard}>
          <SectionTitle numero="01" titulo="Parada Diária" />
          <div style={{ marginTop: 12 }}>
            <SecaoToggle campo="parada_diaria_status" form={form} set={set} bloqueado={bloqueado} label="Situação" />
          </div>
        </div>

        {/* ── Item 02: Recebimento ─────────────────────────────────────────── */}
        <div className={styles.sectionCardSpaced}>
          <SectionTitle numero="02" titulo="Recebimento do Serviço" />
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-gray-400)' }}>Recebi do Monitor/Atirador com ou sem alteração.</p>
          <div>
            <label className={styles.label}>Monitor anterior</label>
            <SoldadoSelect
              soldados={soldados}
              graduacao="cabo"
              disabled={bloqueado}
              valorRa={form.recebimento_monitor_numero}
              placeholder="Selecione o monitor anterior…"
              onSelect={({ numero, nome }) =>
                setFormState((f) => ({ ...f, recebimento_monitor_numero: numero, recebimento_monitor_nome: nome }))}
            />
            {form.recebimento_monitor_nome && (
              <p className={styles.selecionadoHint}>Nome de guerra: <strong>{form.recebimento_monitor_nome}</strong></p>
            )}
          </div>
          <SecaoToggle campo="recebimento_status" form={form} set={set} bloqueado={bloqueado} label="Recebimento" />
        </div>

        {/* ── Item 03: Pessoal de Serviço ──────────────────────────────────── */}
        <div className={styles.sectionCardSpaced}>
          <SectionTitle numero="03" titulo="Pessoal de Serviço" />

          <div>
            <h4 className={styles.subTitle}>a) Comandante da Guarda (Cabo/Monitor)</h4>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-gray-400)', marginBottom: 8 }}>
              Preenchido automaticamente pela escala vinculada. Caso não haja escala, selecione manualmente.
            </p>
            <SoldadoSelect
              soldados={soldados}
              graduacao="cabo"
              disabled={bloqueado}
              valorRa={form.cabo_ra}
              placeholder="Selecione o cabo / monitor…"
              onSelect={({ numero, nomeCompleto }) =>
                setFormState((f) => ({ ...f, cabo_ra: numero, cabo_nome: nomeCompleto }))}
            />
            {form.cabo_nome && (
              <p className={styles.selecionadoHint}>
                Nome de guerra: <strong>{nomeGuerraDe(form.cabo_nome)}</strong> · assinatura: <strong>{form.cabo_nome}</strong>
              </p>
            )}
          </div>

          <div>
            <h4 className={styles.subTitle}>b) Guardas (Atiradores)</h4>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-gray-400)', marginBottom: 8 }}>
              Até 3 atiradores. Preenchidos pela escala quando houver; selecione manualmente se necessário.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <SoldadoSelect
                    soldados={soldados}
                    graduacao="atirador"
                    disabled={bloqueado}
                    valorRa={ats[i]?.ra}
                    placeholder={`Selecione o atirador ${i + 1}…`}
                    onSelect={({ numero, nomeCompleto, nomeGuerra }) =>
                      setFormState((f) => {
                        const novos = padAtiradores(f.atiradores);
                        novos[i] = numero
                          ? { ra: numero, nome: nomeCompleto, nomeGuerra }
                          : { ...ATIRADOR_VAZIO };
                        return { ...f, atiradores: novos };
                      })}
                  />
                  {ats[i]?.ra && (
                    <span className={styles.postoTag}>
                      RA {ats[i].ra} · {ats[i].nomeGuerra || nomeGuerraDe(ats[i].nome)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className={styles.subTitle}>Posto 1 — Sentinelas por Quarto</h4>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-gray-400)', marginBottom: 8 }}>
              Selecione quem ficará em cada quarto. Só aparecem os atiradores
              escalados como guardas (item 03b) acima. Os horários são fixos
              conforme o formulário oficial.
            </p>
            {guardasSoldados.length === 0 && (
              <p className={styles.atiradorEmpty}>
                Selecione primeiro os guardas (item 03b) para liberar os sentinelas.
              </p>
            )}
            <div className={styles.postoWrap}>
              <table className={styles.postoTable}>
                <thead>
                  <tr>
                    <th style={{ width: 48 }}>Quarto</th>
                    <th>Sentinela</th>
                    <th>Horários (fixos)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { q: '1°', h: '08h–10h / 14h–16h / 20h–22h / 02h–04h' },
                    { q: '2°', h: '10h–12h / 16h–20h / 22h–24h / 04h–06h' },
                    { q: '3°', h: '12h–14h / 18h–22h / 20h–24h / 06h–08h' },
                  ].map(({ q, h }, i) => (
                    <tr key={i}>
                      <td><span className={styles.postoQuarto}>{q}</span></td>
                      <td>
                        <SoldadoSelect
                          soldados={guardasSoldados}
                          disabled={bloqueado || guardasSoldados.length === 0}
                          valorRa={form.postos_sentinela[i]?.numero}
                          placeholder="Selecione o sentinela…"
                          onSelect={({ numero, nome }) =>
                            setFormState((f) => {
                              const novos = [...f.postos_sentinela];
                              novos[i] = { ...novos[i], numero, nome };
                              return { ...f, postos_sentinela: novos };
                            })}
                        />
                        {form.postos_sentinela[i]?.numero && (
                          <span className={styles.postoTag}>
                            RA {form.postos_sentinela[i].numero} · {form.postos_sentinela[i].nome}
                          </span>
                        )}
                      </td>
                      <td><span className={styles.postoHorario}>{h}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Itens 04, 05, 06 ─────────────────────────────────────────────── */}
        <div className={styles.sectionCardSpaced}>
          <div>
            <SectionTitle numero="04" titulo="Material Carga" />
            <div style={{ marginTop: 12 }}>
              <SecaoToggle campo="material_carga_status" form={form} set={set} bloqueado={bloqueado} label="Situação" />
            </div>
          </div>
          <hr className={styles.divider} />
          <div>
            <SectionTitle numero="05" titulo="Instalações" />
            <div style={{ marginTop: 12 }}>
              <SecaoToggle campo="instalacoes_status" form={form} set={set} bloqueado={bloqueado} label="Situação" />
            </div>
          </div>
          <hr className={styles.divider} />
          <div>
            <SectionTitle numero="06" titulo="Iluminação" />
            <div style={{ marginTop: 12 }}>
              <SecaoToggle campo="iluminacao_status" form={form} set={set} bloqueado={bloqueado} label="Situação" />
            </div>
          </div>
        </div>

        {/* ── Item 07: Ocorrências ─────────────────────────────────────────── */}
        <div className={styles.sectionCardSpaced}>
          <SectionTitle numero="07" titulo="Ocorrências" />
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-gray-400)' }}>
            Relate todas as alterações. Se deixado em branco, imprimirá "Nada a Registrar" no PDF.
          </p>
          <textarea
            rows={4}
            disabled={bloqueado}
            placeholder="Descreva as ocorrências do serviço… (deixe em branco para 'Nada a Registrar')"
            className={styles.textarea}
            maxLength={2000}
            value={form.ocorrencias_texto}
            onChange={(e) => set('ocorrencias_texto', e.target.value)}
          />
          <p className={styles.charCount}>{form.ocorrencias_texto.length}/2000</p>
        </div>

        {/* ── Item 08: Passagem do Serviço ─────────────────────────────────── */}
        <div className={styles.sectionCardSpaced}>
          <SectionTitle numero="08" titulo="Passagem do Serviço" />
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-gray-400)' }}>
            Fiz a passagem ao Monitor/Atirador, com todas as ordens em vigor.
          </p>
          <div>
            <label className={styles.label}>Próximo Monitor</label>
            <SoldadoSelect
              soldados={soldados}
              graduacao="cabo"
              disabled={bloqueado}
              valorRa={form.passagem_monitor_numero}
              placeholder="Selecione o próximo monitor…"
              onSelect={({ numero, nome }) =>
                setFormState((f) => ({ ...f, passagem_monitor_numero: numero, passagem_monitor_nome: nome }))}
            />
            {form.passagem_monitor_nome && (
              <p className={styles.selecionadoHint}>Nome de guerra: <strong>{form.passagem_monitor_nome}</strong></p>
            )}
          </div>
        </div>

        {/* ── Assinatura Preview ───────────────────────────────────────────── */}
        {form.cabo_nome && (
          <div className={styles.signatureCard}>
            <p className={styles.sigTitle}>Assinatura no PDF:</p>
            <p className={styles.sigName}>{form.cabo_nome}</p>
            <p className={styles.sigRole}>MONITOR / CMT DA GUARDA</p>
          </div>
        )}

        {erro && <div className={styles.errorCard} style={{ whiteSpace: 'pre-line' }}>{erro}</div>}

        {/* ── Botões ───────────────────────────────────────────────────────── */}
        {!bloqueado && (
          <div className={styles.btnRow}>
            <button type="button" onClick={onCancelar} className={styles.cancelBtn}>Cancelar</button>
            <button type="button" disabled={salvando || gerando} onClick={salvar} className={styles.draftBtn}>
              {salvando ? 'Salvando…' : 'Salvar rascunho'}
            </button>
            <button type="button" disabled={salvando || gerando} onClick={gerarPDF} className={styles.pdfBtn}>
              {gerando ? 'Gerando…' : '⬇ Gerar PDF'}
            </button>
            <p className={styles.pdfHint}>Após gerar o PDF o registro será bloqueado para edição.</p>
          </div>
        )}

        {bloqueado && (
          <div className={styles.btnRow}>
            <button type="button" onClick={onCancelar} className={styles.cancelBtn}>Voltar</button>
            <button type="button"
              onClick={() => gerarPdfDiario({ ...form, data_para: proximoDia(form.data_servico) })}
              className={styles.pdfBtn}>
              ⬇ Reimprimir PDF
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
