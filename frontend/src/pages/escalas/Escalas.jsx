import { useState, useEffect, useCallback } from 'react';
import { Layout }          from '../../components/layout/Layout';
import { escalasService }  from '../../services/escalasService';
import { formatarData }    from '../../utils/data';
import { useAuth }         from '../../hooks/useAuth';
import EscalaModal         from './EscalaModal';

// ── Constantes visuais ────────────────────────────────────────────────────────

const TIPO_COR = {
  verde:    { chip: 'bg-green-500 text-white',   label: 'Verde'    },
  preta:    { chip: 'bg-gray-700  text-white',   label: 'Preta'    },
  vermelha: { chip: 'bg-red-500   text-white',   label: 'Vermelha' },
};

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const MESES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function dataISO(ano, mes, dia) {
  return `${ano}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
}

function diasNoMes(ano, mes) {
  return new Date(ano, mes, 0).getDate();
}

function primeiroDiaDaSemana(ano, mes) {
  return new Date(ano, mes - 1, 1).getDay(); // 0=Dom
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

// ── Calendário ────────────────────────────────────────────────────────────────

function Calendario({ ano, mes, escalas, bloqueios, onDayClick, onNovaEscala }) {
  const total     = diasNoMes(ano, mes);
  const diaInicio = primeiroDiaDaSemana(ano, mes);
  const hojeISO   = hoje();

  const cells = [];
  for (let i = 0; i < diaInicio; i++) cells.push(null);
  for (let d = 1; d <= total; d++) {
    const iso = dataISO(ano, mes, d);
    const escalasNoDia = escalas.filter(
      (e) => e.data_inicio <= iso && e.data_fim >= iso
    );
    const bloqueado = bloqueios.some(
      (b) => b.data_inicio <= iso && b.data_fim >= iso
    );
    cells.push({ dia: d, iso, escalasNoDia, bloqueado });
  }

  return (
    <div>
      {/* Cabeçalho dos dias */}
      <div className="grid grid-cols-7 mb-1">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
        ))}
      </div>

      {/* Grade */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`vazio-${i}`} />;
          const { dia, iso, escalasNoDia, bloqueado } = cell;
          const isHoje    = iso === hojeISO;
          const temEscala = escalasNoDia.length > 0;

          return (
            <div
              key={iso}
              onClick={() => {
                if (temEscala) onDayClick(escalasNoDia[0]);
                else if (!bloqueado) onNovaEscala(iso);
              }}
              className={`min-h-[44px] sm:min-h-[70px] rounded-lg border p-1 sm:p-1.5 cursor-pointer transition-all select-none
                ${isHoje    ? 'border-green-400 ring-1 ring-green-300' : 'border-gray-100'}
                ${bloqueado ? 'bg-gray-50 cursor-default opacity-60'   : 'hover:border-gray-300 hover:shadow-sm'}
                ${temEscala ? 'bg-white' : 'bg-white'}
              `}
            >
              <div className={`text-xs font-semibold mb-1 ${isHoje ? 'text-green-600' : 'text-gray-600'}`}>
                {dia}
              </div>

              {bloqueado && (
                <div className="text-xs bg-gray-200 text-gray-500 rounded px-1 py-0.5 text-center">
                  Bloqueado
                </div>
              )}

              {escalasNoDia.slice(0, 2).map((e) => {
                const cfg = TIPO_COR[e.tipo] ?? TIPO_COR.verde;
                return (
                  <div key={e.id} className={`text-xs rounded px-1 py-0.5 mb-0.5 truncate ${cfg.chip}`}>
                    <span className="hidden sm:inline">{cfg.label}</span>
                    <span className="sm:hidden">●</span>
                  </div>
                );
              })}
              {escalasNoDia.length > 2 && (
                <div className="text-xs text-gray-400 text-center">+{escalasNoDia.length - 2}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Aba: Fila de Rotação ──────────────────────────────────────────────────────

const STATUS_COR = {
  ativo:      'text-green-700',
  licenca:    'text-yellow-600',
  baixado:    'text-red-600',
  dispensado: 'text-gray-400',
};

function FilaView() {
  const [tipo,       setTipo]       = useState('verde');
  const [fila,       setFila]       = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [punindo,    setPunindo]    = useState(null);
  const [motivo,     setMotivo]     = useState('');

  const carregar = useCallback(async (t) => {
    setCarregando(true);
    try { setFila(await escalasService.fila(t)); }
    finally { setCarregando(false); }
  }, []);

  useEffect(() => { carregar(tipo); }, [tipo, carregar]);

  async function mover(soldadoId, acao) {
    await escalasService.reordenar(tipo, soldadoId, acao);
    setPunindo(null);
    setMotivo('');
    carregar(tipo);
  }

  return (
    <div>
      {/* Legenda da fila */}
      <p className="text-xs text-gray-400 mb-4">
        Posição 1 = próximo a ser escalado. · <strong className="text-gray-500">Punir (início)</strong>: escalona na próxima guarda deste tipo. · <strong className="text-gray-500">Adiar (fim)</strong>: move para o final da fila.
      </p>

      {/* Seletor de tipo */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['verde', 'preta', 'vermelha'].map((t) => {
          const cfg = TIPO_COR[t];
          return (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                tipo === t ? cfg.chip : 'border border-gray-300 text-gray-500 hover:bg-gray-50'
              }`}
            >
              Guarda {cfg.label}
            </button>
          );
        })}
      </div>

      {carregando ? (
        <div className="text-center text-gray-400 py-8 text-sm">Carregando…</div>
      ) : fila.length === 0 ? (
        <div className="text-center text-gray-400 py-8 text-sm">Fila não inicializada.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-gray-50">
              <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">
                <th className="px-4 py-3 w-12">Pos.</th>
                <th className="px-4 py-3">Soldado</th>
                <th className="px-4 py-3">Graduação</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3">Última guarda</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fila.map((row) => (
                <tr key={row.soldado_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                      {row.posicao}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{row.nome_completo}</p>
                    <p className="text-xs text-gray-400">{row.ra}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${row.graduacao === 'cabo' ? 'bg-gray-200 text-gray-700' : 'bg-blue-50 text-blue-700'}`}>
                      {row.graduacao === 'cabo' ? 'Cabo' : 'Atirador'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${STATUS_COR[row.status] ?? 'text-gray-400'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {row.ultima_data ? formatarData(row.ultima_data) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {punindo === row.soldado_id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => mover(row.soldado_id, 'inicio')} className="text-xs text-red-600 hover:underline">
                          Punir (início)
                        </button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => mover(row.soldado_id, 'fim')} className="text-xs text-yellow-600 hover:underline">
                          Adiar (fim)
                        </button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => setPunindo(null)} className="text-xs text-gray-400 hover:underline">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setPunindo(row.soldado_id)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                        title="Mover na fila"
                      >
                        Mover
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Aba: Bloqueios ────────────────────────────────────────────────────────────

function BloqueiosView() {
  const [bloqueios,  setBloqueios]  = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [form,       setForm]       = useState({ data_inicio: '', data_fim: '', motivo: '' });
  const [salvando,   setSalvando]   = useState(false);
  const [erro,       setErro]       = useState(null);

  const carregar = async () => {
    setCarregando(true);
    try { setBloqueios(await escalasService.bloqueios()); }
    finally { setCarregando(false); }
  };

  useEffect(() => { carregar(); }, []);

  async function adicionar(e) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      await escalasService.criarBloqueio(form);
      setForm({ data_inicio: '', data_fim: '', motivo: '' });
      carregar();
    } catch (err) {
      setErro(err?.response?.data?.erro ?? 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id) {
    if (!window.confirm('Remover este bloqueio?')) return;
    await escalasService.removerBloqueio(id);
    carregar();
  }

  return (
    <div className="space-y-5">
      {/* Formulário */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Novo Período Bloqueado</h3>
        <p className="text-xs text-gray-400 mb-3">Recessos e feriados cadastrados aqui ficam marcados no calendário e impedem a criação de escalas.</p>
        <form onSubmit={adicionar} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Data de início</label>
              <input type="date" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.data_inicio} onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Data de fim</label>
              <input type="date" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.data_fim} onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Motivo</label>
            <input type="text" maxLength={200} placeholder="Recesso, feriado, exercício de campo…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.motivo} onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))} />
          </div>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="flex justify-end">
            <button type="submit" disabled={salvando}
              className="px-5 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
              {salvando ? 'Salvando…' : '+ Adicionar bloqueio'}
            </button>
          </div>
        </form>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {carregando ? (
          <div className="p-8 text-center text-gray-400 text-sm">Carregando…</div>
        ) : bloqueios.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Nenhum período bloqueado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">
                <th className="px-5 py-3">Início</th>
                <th className="px-5 py-3">Fim</th>
                <th className="px-5 py-3">Motivo</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bloqueios.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">{formatarData(b.data_inicio)}</td>
                  <td className="px-5 py-3">{formatarData(b.data_fim)}</td>
                  <td className="px-5 py-3 text-gray-600">{b.motivo || '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => remover(b.id)} className="text-xs text-red-500 hover:underline">Remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Escalas() {
  const { usuario } = useAuth();
  const isComandante = usuario?.role === 'comandante';

  const hoje = new Date();
  const [ano,        setAno]        = useState(hoje.getFullYear());
  const [mes,        setMes]        = useState(hoje.getMonth() + 1);
  const [aba,        setAba]        = useState('calendario');
  const [dadosCal,   setDadosCal]   = useState({ escalas: [], bloqueios: [] });
  const [carregando, setCarregando] = useState(true);
  const [modal,      setModal]      = useState(null); // { escala } | { dataInicial }

  const carregarCalendario = useCallback(async (a, m) => {
    setCarregando(true);
    try { setDadosCal(await escalasService.calendario(a, m)); }
    finally { setCarregando(false); }
  }, []);

  useEffect(() => {
    if (aba === 'calendario') carregarCalendario(ano, mes);
  }, [aba, ano, mes, carregarCalendario]);

  function navMes(delta) {
    let novoMes = mes + delta;
    let novoAno = ano;
    if (novoMes < 1)  { novoMes = 12; novoAno--; }
    if (novoMes > 12) { novoMes = 1;  novoAno++; }
    setMes(novoMes);
    setAno(novoAno);
  }

  function handleSalvo(escala) {
    setDadosCal((prev) => {
      const sem = prev.escalas.filter((e) => e.id !== escala.id);
      return { ...prev, escalas: [...sem, escala] };
    });
  }

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Escalas de Guarda</h1>
        <button
          onClick={() => setModal({ dataInicial: new Date().toISOString().slice(0, 10) })}
          className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700"
        >
          + Nova Escala
        </button>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {[
          { key: 'calendario', label: 'Calendário' },
          { key: 'fila',       label: 'Fila de Rotação' },
          ...(isComandante ? [{ key: 'bloqueios', label: 'Períodos Bloqueados' }] : []),
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setAba(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              aba === key
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Aba: Calendário */}
      {aba === 'calendario' && (
        <div>
          {/* Navegação do mês */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navMes(-1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              ← Anterior
            </button>
            <h2 className="text-base font-semibold text-gray-700">
              {MESES_PT[mes - 1]} {ano}
            </h2>
            <button onClick={() => navMes(1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              Próximo →
            </button>
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-2 text-xs">
            {Object.entries(TIPO_COR).map(([tipo, { chip, label }]) => (
              <div key={tipo} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-sm ${chip.split(' ')[0]}`} />
                <span className="text-gray-500">{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-gray-200" />
              <span className="text-gray-500">Bloqueado</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Clique em um dia sem escala para criar uma nova · Clique em uma escala para ver detalhes
          </p>

          {carregando ? (
            <div className="text-center text-gray-400 py-12 text-sm">Carregando…</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <Calendario
                ano={ano}
                mes={mes}
                escalas={dadosCal.escalas}
                bloqueios={dadosCal.bloqueios}
                onDayClick={(escala) => {
                  // busca detalhes completos
                  escalasService.buscar(escala.id).then((e) => setModal({ escala: e }));
                }}
                onNovaEscala={(data) => setModal({ dataInicial: data })}
              />
            </div>
          )}
        </div>
      )}

      {/* Aba: Fila */}
      {aba === 'fila' && <FilaView />}

      {/* Aba: Bloqueios */}
      {aba === 'bloqueios' && isComandante && <BloqueiosView />}

      {/* Modal */}
      {modal && (
        <EscalaModal
          escala={modal.escala ?? null}
          dataInicial={modal.dataInicial ?? null}
          onFechar={() => setModal(null)}
          onSalvo={(escala) => { handleSalvo(escala); setModal(null); }}
        />
      )}
    </Layout>
  );
}
