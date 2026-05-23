import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { Layout }             from '../../components/layout/Layout';
import { relatoriosService }  from '../../services/relatoriosService';
import { treinosService }     from '../../services/treinosService';
import { soldadosService }    from '../../services/soldadosService';
import { gerarPdfPresenca }   from '../../utils/relatoriosPDF';
import { formatarData, hoje } from '../../utils/data';

// ── Helpers ───────────────────────────────────────────────────────────────────

function primeiroDiaMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function badgeTaxa(taxa) {
  if (taxa === null || taxa === undefined) return 'bg-gray-100 text-gray-400';
  if (taxa >= 75) return 'bg-green-100 text-green-800';
  if (taxa >= 50) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

function badgeStatus(status) {
  const m = {
    ativo:      'bg-green-100 text-green-800',
    licenca:    'bg-yellow-100 text-yellow-800',
    baixado:    'bg-red-100 text-red-800',
    dispensado: 'bg-gray-100 text-gray-500',
  };
  return m[status] ?? 'bg-gray-100 text-gray-500';
}

function labelStatus(s) {
  return { ativo: 'Ativo', licenca: 'Licença', baixado: 'Baixado', dispensado: 'Dispensado' }[s] ?? s;
}

function InputLabel({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

const INPUT_CLS = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500';

// ── Aba: Presença ─────────────────────────────────────────────────────────────

function AbaPresenca() {
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes);
  const [dataFim,    setDataFim]    = useState(hoje);
  const [turma,      setTurma]      = useState('');
  const [pelotao,    setPelotao]    = useState('');
  const [dados,      setDados]      = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro,       setErro]       = useState(null);

  async function buscar() {
    if (!dataInicio || !dataFim) return;
    setCarregando(true);
    setErro(null);
    try {
      const params = { data_inicio: dataInicio, data_fim: dataFim };
      if (turma)   params.turma   = turma;
      if (pelotao) params.pelotao = pelotao;
      setDados(await relatoriosService.presenca(params));
    } catch {
      setErro('Erro ao buscar relatório.');
    } finally {
      setCarregando(false);
    }
  }

  function exportarPDF() {
    if (!dados?.length) return;
    gerarPdfPresenca({ dados, dataInicio, dataFim, filtros: { turma, pelotao } });
  }

  const totalPres  = dados?.reduce((a, s) => a + (s.presentes ?? 0), 0) ?? 0;
  const totalFalt  = dados?.reduce((a, s) => a + (s.ausentes  ?? 0), 0) ?? 0;
  const totalReg   = dados?.reduce((a, s) => a + (s.total_registros ?? 0), 0) ?? 0;
  const taxaGeral  = totalReg > 0 ? Math.round(100 * totalPres / totalReg) : null;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Filtros</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <InputLabel label="Data início">
            <input type="date" className={INPUT_CLS} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </InputLabel>
          <InputLabel label="Data fim">
            <input type="date" className={INPUT_CLS} value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </InputLabel>
          <InputLabel label="Turma">
            <input type="text" className={INPUT_CLS} value={turma} onChange={(e) => setTurma(e.target.value)} placeholder="Ex: 2024-A" />
          </InputLabel>
          <InputLabel label="Pelotão">
            <input type="text" className={INPUT_CLS} value={pelotao} onChange={(e) => setPelotao(e.target.value)} placeholder="Ex: 1º Pel" />
          </InputLabel>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={buscar}
            disabled={carregando || !dataInicio || !dataFim}
            className="px-5 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {carregando ? 'Buscando…' : 'Buscar'}
          </button>
          {dados?.length > 0 && (
            <button
              onClick={exportarPDF}
              className="px-5 py-2 text-sm font-semibold text-white bg-gray-700 rounded-lg hover:bg-gray-800"
            >
              ⬇ Exportar PDF
            </button>
          )}
        </div>
        {erro && <p className="text-sm text-red-600 mt-2">{erro}</p>}
      </div>

      {/* Resumo */}
      {dados && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Soldados',   value: dados.length,  cls: 'text-gray-800' },
            { label: 'Presenças',  value: totalPres,     cls: 'text-green-700' },
            { label: 'Faltas',     value: totalFalt,     cls: 'text-red-600' },
            { label: 'Taxa geral', value: taxaGeral != null ? `${taxaGeral}%` : '—', cls: taxaGeral != null && taxaGeral >= 75 ? 'text-green-700' : 'text-red-600' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <p className={`text-2xl font-bold ${cls}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabela */}
      {dados && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Resultado por Soldado</h2>
            <span className="text-xs text-gray-400">{dados.length} soldado(s)</span>
          </div>
          {dados.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">Nenhum dado encontrado para os filtros selecionados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">RA</th>
                    <th className="px-4 py-3">Pelotão</th>
                    <th className="px-4 py-3">Turma</th>
                    <th className="px-4 py-3 text-center">Pres.</th>
                    <th className="px-4 py-3 text-center">Falt.</th>
                    <th className="px-4 py-3 text-center">Total</th>
                    <th className="px-4 py-3 text-center">Taxa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dados.map((s) => (
                    <tr key={s.soldado_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{s.nome_completo}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.ra}</td>
                      <td className="px-4 py-3 text-gray-600">{s.pelotao || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{s.turma   || '—'}</td>
                      <td className="px-4 py-3 text-center text-green-700 font-medium">{s.presentes}</td>
                      <td className="px-4 py-3 text-center text-red-600 font-medium">{s.ausentes}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{s.total_registros}</td>
                      <td className="px-4 py-3 text-center">
                        {s.taxa_presenca != null ? (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${badgeTaxa(s.taxa_presenca)}`}>
                            {s.taxa_presenca}%
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Aba: Evolução de Treinos ─────────────────────────────────────────────────

function TooltipEv({ active, payload, label, unidade, isMedio }) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-gray-700">{formatarData(label)}</p>
      <p className="text-gray-600">
        {isMedio ? 'Média: ' : 'Resultado: '}
        <span className="font-bold text-gray-900">{val}</span>
        {unidade ? ` ${unidade}` : ''}
      </p>
    </div>
  );
}

function AbaEvolucao() {
  const [tipos,       setTipos]       = useState([]);
  const [soldados,    setSoldados]    = useState([]);
  const [tipoId,      setTipoId]      = useState('');
  const [soldadoId,   setSoldadoId]   = useState('');
  const [dataInicio,  setDataInicio]  = useState(primeiroDiaMes);
  const [dataFim,     setDataFim]     = useState(hoje);
  const [dados,       setDados]       = useState(null);
  const [carregando,  setCarregando]  = useState(false);
  const [erro,        setErro]        = useState(null);

  useEffect(() => {
    Promise.all([
      treinosService.listarTipos().catch(() => []),
      soldadosService.listar({ status: 'ativo' }).catch(() => []),
    ]).then(([tps, sols]) => {
      setTipos(tps);
      setSoldados(sols);
    });
  }, []);

  async function buscar() {
    if (!tipoId) return;
    setCarregando(true);
    setErro(null);
    try {
      const params = { tipo_treino_id: tipoId };
      if (soldadoId) params.soldado_id = soldadoId;
      if (dataInicio) params.data_inicio = dataInicio;
      if (dataFim)    params.data_fim    = dataFim;
      setDados(await relatoriosService.evolucao(params));
    } catch {
      setErro('Erro ao buscar dados de evolução.');
    } finally {
      setCarregando(false);
    }
  }

  const tipoSelecionado = tipos.find((t) => String(t.id) === String(tipoId));
  const unidade = tipoSelecionado?.unidade || '';
  const isMedio = !soldadoId;
  const dataKey = isMedio ? 'media_resultado' : 'resultado';

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Filtros</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <InputLabel label="Tipo de treino *">
            <select className={INPUT_CLS} value={tipoId} onChange={(e) => setTipoId(e.target.value)}>
              <option value="">Selecione…</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}{t.unidade ? ` (${t.unidade})` : ''}</option>
              ))}
            </select>
          </InputLabel>
          <InputLabel label="Soldado (vazio = média geral)">
            <select className={INPUT_CLS} value={soldadoId} onChange={(e) => setSoldadoId(e.target.value)}>
              <option value="">Todos (média)</option>
              {soldados.map((s) => (
                <option key={s.id} value={s.id}>{s.nome_completo}</option>
              ))}
            </select>
          </InputLabel>
          <InputLabel label="Data início">
            <input type="date" className={INPUT_CLS} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </InputLabel>
          <InputLabel label="Data fim">
            <input type="date" className={INPUT_CLS} value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </InputLabel>
        </div>
        <button
          onClick={buscar}
          disabled={carregando || !tipoId}
          className="mt-4 px-5 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {carregando ? 'Buscando…' : 'Buscar'}
        </button>
        {erro && <p className="text-sm text-red-600 mt-2">{erro}</p>}
      </div>

      {/* Gráfico */}
      {dados && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">
              Evolução — {tipoSelecionado?.nome ?? ''}
              {isMedio ? ' (média geral)' : ` — ${soldados.find((s) => String(s.id) === String(soldadoId))?.nome_completo ?? ''}`}
            </h2>
            <span className="text-xs text-gray-400">{dados.length} registro(s)</span>
          </div>

          {dados.length < 2 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              {dados.length === 0
                ? 'Nenhum registro encontrado para estes filtros.'
                : 'Apenas um ponto de dados — o gráfico aparece a partir de dois.'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dados} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="data"
                  tickFormatter={(v) => { const [, m, d] = v.split('-'); return `${d}/${m}`; }}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false} tickLine={false} width={42}
                />
                <Tooltip content={<TooltipEv unidade={unidade} isMedio={isMedio} />} />
                <Line
                  type="monotone"
                  dataKey={dataKey}
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ fill: '#16a34a', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Tabela de valores */}
      {dados && dados.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Detalhamento</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3 text-right">{isMedio ? 'Média' : 'Resultado'}{unidade ? ` (${unidade})` : ''}</th>
                  {isMedio && <th className="px-5 py-3 text-center">Presentes</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...dados].reverse().map((d, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-600">{formatarData(d.data)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-800">
                      {(isMedio ? d.media_resultado : d.resultado) ?? '—'}
                    </td>
                    {isMedio && (
                      <td className="px-5 py-3 text-center text-gray-500">{d.total_presentes}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Aba: Efetivo ──────────────────────────────────────────────────────────────

const STATUS_ORDER = ['ativo', 'licenca', 'baixado', 'dispensado'];
const STATUS_CARD_CLS = {
  ativo:      { border: 'border-green-200',  num: 'text-green-700', label: 'Ativos' },
  licenca:    { border: 'border-yellow-200', num: 'text-yellow-700', label: 'Licença' },
  baixado:    { border: 'border-red-200',    num: 'text-red-600',    label: 'Baixados' },
  dispensado: { border: 'border-gray-200',   num: 'text-gray-500',   label: 'Dispensados' },
};

function AbaEfetivo() {
  const [dados,      setDados]      = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    relatoriosService.efetivo()
      .then(setDados)
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) {
    return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Carregando…</div>;
  }

  const { soldados = [], resumo = {} } = dados ?? {};
  const porStatus = resumo.por_status ?? {};
  const porGrad   = resumo.por_graduacao ?? {};

  const filtrados = soldados.filter((s) => {
    if (filtroStatus && s.status !== filtroStatus) return false;
    if (busca) {
      const b = busca.toLowerCase();
      return s.nome_completo.toLowerCase().includes(b) || s.ra.toLowerCase().includes(b);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Cards de status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATUS_ORDER.map((st) => {
          const cfg = STATUS_CARD_CLS[st];
          return (
            <button
              key={st}
              onClick={() => setFiltroStatus(filtroStatus === st ? '' : st)}
              className={`bg-white rounded-xl border-2 shadow-sm p-4 text-center transition-all ${
                filtroStatus === st ? cfg.border + ' ring-2 ring-offset-1 ring-green-400' : cfg.border
              }`}
            >
              <p className={`text-3xl font-bold ${cfg.num}`}>{porStatus[st] ?? 0}</p>
              <p className="text-xs text-gray-400 mt-1">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Cards de graduação */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'cabo',     label: 'Cabos (ativos)',     cls: 'text-gray-700' },
          { key: 'atirador', label: 'Atiradores (ativos)', cls: 'text-blue-700' },
        ].map(({ key, label, cls }) => (
          <div key={key} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <p className={`text-2xl font-bold ${cls}`}>{porGrad[key] ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabela completa */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            Efetivo completo
            {filtroStatus && ` — ${labelStatus(filtroStatus)}`}
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Buscar nome ou RA…"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-48"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {filtroStatus && (
              <button
                onClick={() => setFiltroStatus('')}
                className="text-xs text-gray-500 hover:text-gray-700 px-2"
              >
                Limpar filtro
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">RA</th>
                <th className="px-5 py-3">Graduação</th>
                <th className="px-5 py-3">Pelotão</th>
                <th className="px-5 py-3">Turma</th>
                <th className="px-5 py-3 text-center">Guardas</th>
                <th className="px-5 py-3">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-6 text-center text-sm text-gray-400">
                    Nenhum soldado encontrado.
                  </td>
                </tr>
              ) : filtrados.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{s.nome_completo}</td>
                  <td className="px-5 py-3 text-gray-500 font-mono text-xs">{s.ra}</td>
                  <td className="px-5 py-3 text-gray-600 capitalize">
                    {s.graduacao === 'cabo' ? 'Cabo' : 'Atirador'}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{s.pelotao || '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{s.turma   || '—'}</td>
                  <td className="px-5 py-3 text-center text-gray-500">{s.guardas_concluidas ?? 0}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badgeStatus(s.status)}`}>
                      {labelStatus(s.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-2 border-t border-gray-100 text-xs text-gray-400">
          {filtrados.length} de {soldados.length} soldado(s)
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

const ABAS = [
  { key: 'presenca',  label: 'Presença' },
  { key: 'evolucao',  label: 'Evolução de Treinos' },
  { key: 'efetivo',   label: 'Efetivo' },
];

export default function Relatorios() {
  const [aba, setAba] = useState('presenca');

  return (
    <Layout>
      <h1 className="text-xl font-bold text-gray-800 mb-5">Relatórios</h1>

      {/* Abas */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {ABAS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setAba(key)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              aba === key
                ? 'border-b-2 border-green-600 text-green-700 bg-white -mb-px'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {aba === 'presenca' && <AbaPresenca />}
      {aba === 'evolucao' && <AbaEvolucao />}
      {aba === 'efetivo'  && <AbaEfetivo />}
    </Layout>
  );
}
