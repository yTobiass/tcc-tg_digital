import { useState, useEffect, useCallback } from 'react';
import { Layout }        from '../../components/layout/Layout';
import { InfoTooltip }   from '../../components/ui/Tooltip';
import { diarioService } from '../../services/diarioService';
import { gerarPdfDiario } from '../../utils/diarioPDF';
import { formatarData, hoje } from '../../utils/data';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_OPTS = ['Sem Alteração', 'Com Alteração'];

const POSTOS_VAZIOS = [
  { quarto: '1°', numero: '', nome: '' },
  { quarto: '2°', numero: '', nome: '' },
  { quarto: '3°', numero: '', nome: '' },
];

const FORM_INICIAL = {
  data_servico:              hoje(),
  parada_diaria_status:      'Sem Alteração',
  parada_diaria_descricao:   '',
  recebimento_monitor_numero:'',
  recebimento_monitor_nome:  '',
  recebimento_status:        'Sem Alteração',
  escala_id:                 null,
  cabo_ra:                   '',
  cabo_nome:                 '',
  atiradores:                [],
  postos_sentinela:          [...POSTOS_VAZIOS],
  material_carga_status:     'Sem Alteração',
  material_carga_descricao:  '',
  instalacoes_status:        'Sem Alteração',
  instalacoes_descricao:     '',
  iluminacao_status:         'Sem Alteração',
  iluminacao_descricao:      '',
  ocorrencias_texto:         '',
  passagem_monitor_numero:   '',
  passagem_monitor_nome:     '',
};

function proximoDia(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const p = new Date(y, m - 1, d + 1);
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, '0')}-${String(p.getDate()).padStart(2, '0')}`;
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function SecaoToggle({ label, campo, form, set, bloqueado }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-gray-700">{label}:</span>
        {STATUS_OPTS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={bloqueado}
            onClick={() => set(campo, s)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              form[campo] === s
                ? s === 'Com Alteração'
                  ? 'bg-red-50 border-red-400 text-red-700 font-semibold'
                  : 'bg-green-50 border-green-400 text-green-700 font-semibold'
                : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'
            } ${bloqueado ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {s}
          </button>
        ))}
      </div>
      {form[campo] === 'Com Alteração' && (
        <textarea
          rows={2}
          disabled={bloqueado}
          placeholder="Descreva a alteração…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none disabled:bg-gray-50"
          value={form[`${campo.replace('_status', '')}_descricao`] ?? ''}
          onChange={(e) => set(`${campo.replace('_status', '')}_descricao`, e.target.value)}
        />
      )}
    </div>
  );
}

function CampoAutoPreenchido({ label, value, tooltip }) {
  return (
    <div>
      <label className="flex items-center text-xs font-semibold text-gray-500 mb-1">
        {label}
        {tooltip && <InfoTooltip text={tooltip} position="top" />}
      </label>
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 font-medium">
        {value || <span className="text-gray-400 font-normal italic">Não encontrado</span>}
      </div>
    </div>
  );
}

function SectionTitle({ numero, titulo }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
        {numero}
      </span>
      <h3 className="text-sm font-semibold text-gray-700">{titulo}</h3>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function DiarioForm({ inicial, onSalvo, onCancelar }) {
  const editando  = Boolean(inicial?.id);
  const bloqueado = Boolean(inicial?.pdf_gerado);

  const [form,       setFormState] = useState(() => {
    if (!inicial) return { ...FORM_INICIAL };
    return {
      ...FORM_INICIAL,
      ...inicial,
      postos_sentinela: Array.isArray(inicial.postos_sentinela) && inicial.postos_sentinela.length === 3
        ? inicial.postos_sentinela
        : [...POSTOS_VAZIOS],
      atiradores: Array.isArray(inicial.atiradores) ? inicial.atiradores : [],
    };
  });

  const [contexto,   setContexto]  = useState(null);
  const [carregCtx,  setCarregCtx] = useState(false);
  const [salvando,   setSalvando]  = useState(false);
  const [gerando,    setGerando]   = useState(false);
  const [erro,       setErro]      = useState(null);

  function set(campo, valor) {
    setFormState((f) => ({ ...f, [campo]: valor }));
  }

  // Busca contexto da escala ao mudar a data
  const buscarContexto = useCallback(async (data) => {
    if (!data) return;
    setCarregCtx(true);
    setContexto(null);
    try {
      const ctx = await diarioService.contexto(data);
      setContexto(ctx);

      // Auto-preenche campos da escala
      if (!editando) {
        setFormState((f) => ({
          ...f,
          escala_id:                  ctx.escala?.id                  ?? null,
          cabo_ra:                    ctx.escala?.cabo?.ra            ?? '',
          cabo_nome:                  ctx.escala?.cabo?.nome          ?? '',
          atiradores:                 ctx.escala?.atiradores          ?? [],
          recebimento_monitor_numero: ctx.escalaAnterior?.cabo?.ra    ?? '',
          recebimento_monitor_nome:   ctx.escalaAnterior?.cabo?.nomeGuerra ?? '',
          passagem_monitor_numero:    ctx.escalaSeguinte?.cabo?.ra    ?? '',
          passagem_monitor_nome:      ctx.escalaSeguinte?.cabo?.nomeGuerra ?? '',
          // Preenche postos com atiradores (editável depois)
          postos_sentinela: (ctx.escala?.atiradores ?? []).slice(0, 3).map((at, i) => ({
            quarto: POSTOS_VAZIOS[i].quarto,
            numero: at.ra ?? '',
            nome:   at.nomeGuerra ?? at.nome?.split(' ').pop() ?? '',
          })).concat(POSTOS_VAZIOS).slice(0, 3),
        }));
      }
    } catch {
      // Sem escala para essa data — ignora silenciosamente
    } finally {
      setCarregCtx(false);
    }
  }, [editando]);

  useEffect(() => {
    if (!editando) {
      buscarContexto(form.data_servico);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDataChange(e) {
    const data = e.target.value;
    set('data_servico', data);
    if (!editando) buscarContexto(data);
  }

  function setPostoSentinela(idx, campo, valor) {
    setFormState((f) => {
      const novos = [...f.postos_sentinela];
      novos[idx] = { ...novos[idx], [campo]: valor };
      return { ...f, postos_sentinela: novos };
    });
  }

  function payloadParaSalvar() {
    return {
      ...form,
      postos_sentinela: form.postos_sentinela,
      atiradores:       form.atiradores,
    };
  }

  async function salvar() {
    setErro(null);
    setSalvando(true);
    try {
      const payload = payloadParaSalvar();
      let salvo;
      if (editando) {
        salvo = await diarioService.atualizar(inicial.id, payload);
      } else {
        salvo = await diarioService.criar(payload);
      }
      onSalvo(salvo);
    } catch (e) {
      const msg = e?.response?.data?.erro;
      if (typeof msg === 'string') setErro(msg);
      else setErro('Erro ao salvar diário.');
    } finally {
      setSalvando(false);
    }
  }

  async function gerarPDF() {
    setErro(null);
    setGerando(true);
    try {
      const payload = payloadParaSalvar();
      let diario = inicial;

      // Salva se ainda não foi salvo ou se tem alterações
      if (!editando) {
        diario = await diarioService.criar(payload);
      } else if (!bloqueado) {
        diario = await diarioService.atualizar(inicial.id, payload);
      }

      // Prepara dados completos para o PDF
      const dadosPDF = {
        ...diario,
        atiradores:      form.atiradores,
        postos_sentinela:form.postos_sentinela,
        data_para:       proximoDia(diario.data_servico ?? form.data_servico),
      };

      gerarPdfDiario(dadosPDF);

      // Marca como gerado (bloqueia edição)
      if (!diario.pdf_gerado) {
        const marcado = await diarioService.marcarPdf(diario.id);
        onSalvo(marcado);
      } else {
        onSalvo(diario);
      }
    } catch (e) {
      const msg = e?.response?.data?.erro;
      if (typeof msg === 'string') setErro(msg);
      else setErro('Erro ao gerar PDF.');
      setGerando(false);
    }
  }

  const ats = Array.isArray(form.atiradores) ? form.atiradores : [];

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            {bloqueado ? 'Visualizar Diário' : editando ? 'Editar Diário' : 'Novo Diário de Rotina'}
          </h1>
          {bloqueado && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5 mt-1 inline-block">
              PDF gerado — somente leitura
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onCancelar}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Voltar à lista
        </button>
      </div>

      <div className="space-y-5 max-w-3xl">

        {/* ── Cabeçalho: datas ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Cabeçalho</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">DO DIA</label>
              <input
                type="date"
                disabled={bloqueado || editando}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
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
          {carregCtx && (
            <p className="text-xs text-blue-600 animate-pulse">Buscando escala vinculada…</p>
          )}
          {contexto && !contexto.escala && !carregCtx && (
            <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 space-y-0.5">
              <p className="font-medium">Nenhuma escala cadastrada para esta data.</p>
              <p className="text-yellow-600">Preencha os campos do pessoal de serviço manualmente, ou cadastre a escala primeiro na aba Escalas.</p>
            </div>
          )}
          {contexto?.escala && (
            <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 space-y-0.5">
              <p className="font-medium">Escala guarda {contexto.escala.tipo} encontrada.</p>
              <p className="text-green-600">Cabo, atiradores, recebimento e passagem foram preenchidos automaticamente.</p>
            </div>
          )}
        </div>

        {/* ── Item 01: Parada Diária ─────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <SectionTitle numero="01" titulo="Parada Diária" />
          <div className="mt-3">
            <SecaoToggle campo="parada_diaria_status" form={form} set={set} bloqueado={bloqueado}
              label="Situação" />
          </div>
        </div>

        {/* ── Item 02: Recebimento ───────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <SectionTitle numero="02" titulo="Recebimento do Serviço" />
          <p className="text-xs text-gray-400">Recebi do Monitor/Atirador com ou sem alteração.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">N° do Monitor anterior</label>
              <input
                type="text"
                disabled={bloqueado}
                placeholder="ex: 101-1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                value={form.recebimento_monitor_numero}
                onChange={(e) => set('recebimento_monitor_numero', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nome de guerra</label>
              <input
                type="text"
                disabled={bloqueado}
                placeholder="ex: SILVA"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                value={form.recebimento_monitor_nome}
                onChange={(e) => set('recebimento_monitor_nome', e.target.value)}
              />
            </div>
          </div>
          <SecaoToggle campo="recebimento_status" form={form} set={set} bloqueado={bloqueado}
            label="Recebimento" />
        </div>

        {/* ── Item 03: Pessoal de Serviço ───────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <SectionTitle numero="03" titulo="Pessoal de Serviço" />

          {/* 03a — Cabo/Monitor */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              a) Comandante da Guarda (Cabo/Monitor)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CampoAutoPreenchido label="N° (RA)" value={form.cabo_ra} tooltip="Auto-preenchido da escala" />
              <CampoAutoPreenchido label="Nome (completo)" value={form.cabo_nome} tooltip="Usado na assinatura do PDF" />
            </div>
          </div>

          {/* 03b — Atiradores */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              b) Guardas (Atiradores)
            </h4>
            {ats.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Nenhum atirador escalado encontrado.</p>
            ) : (
              <div className="space-y-1">
                {ats.map((at, i) => (
                  <div key={i} className="flex gap-3 text-sm text-gray-700">
                    <span className="text-gray-400 w-4">{i + 1}.</span>
                    <span className="font-medium">{at.ra}</span>
                    <span className="text-gray-500">–</span>
                    <span>{at.nomeGuerra || at.nome}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tabela Posto 1 / Quartos */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Posto 1 — Sentinelas por Quarto
            </h4>
            <p className="text-xs text-gray-400 mb-2">
              Informe o N° (RA) e o nome de guerra de quem ficará em cada quarto.
              Os horários são fixos conforme o formulário oficial.
            </p>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full min-w-[480px] text-xs border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr className="text-gray-500 uppercase tracking-wide font-semibold">
                    <th className="px-3 py-2 text-left w-12">Quarto</th>
                    <th className="px-3 py-2 text-left w-28">N° (RA)</th>
                    <th className="px-3 py-2 text-left">Nome de guerra</th>
                    <th className="px-3 py-2 text-left text-gray-400 font-normal">Horários (fixos)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { q: '1°', h: '08h–10h / 14h–16h / 20h–22h / 02h–04h' },
                    { q: '2°', h: '10h–12h / 16h–20h / 22h–24h / 04h–06h' },
                    { q: '3°', h: '12h–14h / 18h–22h / 20h–24h / 06h–08h' },
                  ].map(({ q, h }, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-semibold text-gray-700">{q}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          disabled={bloqueado}
                          placeholder="101-1"
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-400 disabled:bg-gray-50"
                          value={form.postos_sentinela[i]?.numero ?? ''}
                          onChange={(e) => setPostoSentinela(i, 'numero', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          disabled={bloqueado}
                          placeholder="SILVA"
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-400 disabled:bg-gray-50"
                          value={form.postos_sentinela[i]?.nome ?? ''}
                          onChange={(e) => setPostoSentinela(i, 'nome', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-400">{h}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Itens 04, 05, 06 ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
          <div>
            <SectionTitle numero="04" titulo="Material Carga" />
            <div className="mt-3">
              <SecaoToggle campo="material_carga_status" form={form} set={set} bloqueado={bloqueado} label="Situação" />
            </div>
          </div>
          <hr className="border-gray-100" />
          <div>
            <SectionTitle numero="05" titulo="Instalações" />
            <div className="mt-3">
              <SecaoToggle campo="instalacoes_status" form={form} set={set} bloqueado={bloqueado} label="Situação" />
            </div>
          </div>
          <hr className="border-gray-100" />
          <div>
            <SectionTitle numero="06" titulo="Iluminação" />
            <div className="mt-3">
              <SecaoToggle campo="iluminacao_status" form={form} set={set} bloqueado={bloqueado} label="Situação" />
            </div>
          </div>
        </div>

        {/* ── Item 07: Ocorrências ──────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <SectionTitle numero="07" titulo="Ocorrências" />
          <p className="text-xs text-gray-400">
            Relate todas as alterações. Se deixado em branco, imprimirá "Nada a Registrar" no PDF.
          </p>
          <textarea
            rows={4}
            disabled={bloqueado}
            placeholder="Descreva as ocorrências do serviço… (deixe em branco para 'Nada a Registrar')"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none disabled:bg-gray-50"
            maxLength={2000}
            value={form.ocorrencias_texto}
            onChange={(e) => set('ocorrencias_texto', e.target.value)}
          />
          <p className="text-xs text-gray-400 text-right">{form.ocorrencias_texto.length}/2000</p>
        </div>

        {/* ── Item 08: Passagem do Serviço ─────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <SectionTitle numero="08" titulo="Passagem do Serviço" />
          <p className="text-xs text-gray-400">Fiz a passagem ao Monitor/Atirador, com todas as ordens em vigor.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">N° do próximo Monitor</label>
              <input
                type="text"
                disabled={bloqueado}
                placeholder="ex: 102-1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                value={form.passagem_monitor_numero}
                onChange={(e) => set('passagem_monitor_numero', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nome de guerra</label>
              <input
                type="text"
                disabled={bloqueado}
                placeholder="ex: SANTOS"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                value={form.passagem_monitor_nome}
                onChange={(e) => set('passagem_monitor_nome', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Rodapé do formulário ──────────────────────────────────────── */}
        {form.cabo_nome && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
            <p className="font-semibold text-gray-700 mb-0.5">Assinatura no PDF:</p>
            <p className="text-xs uppercase tracking-wide">{form.cabo_nome}</p>
            <p className="text-xs text-gray-400">MONITOR / CMT DA GUARDA</p>
          </div>
        )}

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        {/* ── Botões ────────────────────────────────────────────────────── */}
        {!bloqueado && (
          <div className="flex flex-wrap items-center gap-3 pt-2 pb-6">
            <button
              type="button"
              onClick={onCancelar}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={salvando || gerando}
              onClick={salvar}
              className="px-5 py-2 text-sm font-semibold text-white bg-gray-700 rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {salvando ? 'Salvando…' : 'Salvar rascunho'}
            </button>
            <button
              type="button"
              disabled={salvando || gerando}
              onClick={gerarPDF}
              className="px-6 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {gerando ? 'Gerando…' : '⬇ Gerar PDF'}
            </button>
            <p className="text-xs text-gray-400">
              Após gerar o PDF o registro será bloqueado para edição.
            </p>
          </div>
        )}

        {bloqueado && (
          <div className="flex items-center gap-3 pt-2 pb-6">
            <button
              type="button"
              onClick={onCancelar}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={() => gerarPdfDiario({ ...form, data_para: proximoDia(form.data_servico) })}
              className="px-5 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
              ⬇ Reimprimir PDF
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
