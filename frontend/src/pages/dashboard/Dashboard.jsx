import { useEffect, useState } from 'react';
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Layout } from '../../components/layout/Layout';
import { dashboardService } from '../../services/dashboardService';
import { formatarData } from '../../utils/data';

// ─── Cores ───────────────────────────────────────────────────────────────────
const COR_PRIMARIA  = '#16a34a'; // green-600
const COR_FILL      = '#bbf7d0'; // green-200
const COR_EIXO      = '#9ca3af'; // gray-400
const COR_GRID      = '#f3f4f6'; // gray-100

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(n, total) {
  if (!total) return null;
  return Math.round((n / total) * 100);
}

function corTaxa(taxa) {
  if (taxa == null) return 'text-gray-400';
  if (taxa >= 80)   return 'text-green-700';
  if (taxa >= 50)   return 'text-yellow-600';
  return 'text-red-600';
}

function labelSemana(isoDate) {
  // 'yyyy-mm-dd' → 'DD/MM'
  if (!isoDate) return '';
  const [, m, d] = isoDate.split('-');
  return `${d}/${m}`;
}

// ─── Tooltip customizado ─────────────────────────────────────────────────────

function TooltipPresenca({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-0.5">Semana de {labelSemana(d.semana_inicio)}</p>
      <p className="text-green-700">{d.taxa}% de presença</p>
      <p className="text-gray-500">{d.presentes} de {d.total} registros</p>
    </div>
  );
}

function TooltipPelotao({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-0.5">{d.pelotao}</p>
      <p className="text-green-700">{d.taxa}% de presença</p>
      <p className="text-gray-500">{d.presentes} de {d.total} registros</p>
    </div>
  );
}

// ─── Cards de resumo ─────────────────────────────────────────────────────────

function SummaryCard({ titulo, valor, valorCor, sublabel, rodape }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{titulo}</p>
      <p className={`text-3xl font-bold ${valorCor || 'text-gray-800'}`}>{valor}</p>
      {sublabel && <p className="text-sm text-gray-500 mt-1">{sublabel}</p>}
      {rodape   && <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">{rodape}</p>}
    </div>
  );
}

// ─── Wrapper dos gráficos ─────────────────────────────────────────────────────

function ChartCard({ titulo, subtitulo, children, semDados }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-700">{titulo}</p>
        {subtitulo && <p className="text-xs text-gray-400 mt-0.5">{subtitulo}</p>}
      </div>
      {semDados ? (
        <div className="h-44 flex items-center justify-center text-gray-300 text-sm">
          Sem dados suficientes ainda.
        </div>
      ) : children}
    </div>
  );
}

// ─── Gráfico: presença semanal ────────────────────────────────────────────────

function GraficoPresencaSemanal({ dados }) {
  return (
    <ChartCard
      titulo="Presença — últimas 4 semanas"
      subtitulo="Taxa média de todos os tipos de treino"
      semDados={dados.length === 0}
    >
      <ResponsiveContainer width="100%" height={176}>
        <AreaChart data={dados} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradPresenca" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={COR_FILL}    stopOpacity={0.8} />
              <stop offset="95%" stopColor={COR_FILL}    stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={COR_GRID} vertical={false} />
          <XAxis
            dataKey="semana_inicio"
            tickFormatter={labelSemana}
            tick={{ fontSize: 11, fill: COR_EIXO }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: COR_EIXO }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <Tooltip content={<TooltipPresenca />} />
          <Area
            type="monotone"
            dataKey="taxa"
            stroke={COR_PRIMARIA}
            strokeWidth={2}
            fill="url(#gradPresenca)"
            dot={{ fill: COR_PRIMARIA, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Gráfico: presença por pelotão ───────────────────────────────────────────

function GraficoPresencaPelotao({ dados }) {
  // Trunca nomes longos no eixo X
  const tickFormatter = (v) => v.length > 10 ? v.slice(0, 9) + '…' : v;

  return (
    <ChartCard
      titulo="Presença por pelotão"
      subtitulo="Últimos 30 dias"
      semDados={dados.length === 0}
    >
      <ResponsiveContainer width="100%" height={176}>
        <BarChart data={dados} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={32}>
          <CartesianGrid stroke={COR_GRID} vertical={false} />
          <XAxis
            dataKey="pelotao"
            tickFormatter={tickFormatter}
            tick={{ fontSize: 11, fill: COR_EIXO }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: COR_EIXO }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <Tooltip content={<TooltipPelotao />} cursor={{ fill: '#f9fafb' }} />
          <Bar dataKey="taxa" fill={COR_PRIMARIA} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Card: próximas guardas ───────────────────────────────────────────────────

const TIPO_COR = {
  verde:    { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Verde' },
  preta:    { bg: 'bg-gray-200',   text: 'text-gray-700',   label: 'Preta' },
  vermelha: { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Vermelha' },
};

function CardProximasGuardas({ escalas }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
        Próximas guardas · 7 dias
      </p>
      {escalas.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">Nenhuma guarda agendada.</p>
      ) : (
        <ul className="space-y-2">
          {escalas.map((e) => {
            const cfg = TIPO_COR[e.tipo] ?? TIPO_COR.verde;
            return (
              <li key={e.id} className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} shrink-0`}>
                  {cfg.label}
                </span>
                <span className="text-sm text-gray-600">
                  {formatarData(e.data_inicio)}
                  {e.data_inicio !== e.data_fim && ` – ${formatarData(e.data_fim)}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <Layout>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-60" />
        <Skeleton className="h-60" />
      </div>
    </Layout>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Dashboard() {
  const [dados, setDados] = useState(null);
  const [erro, setErro]   = useState(null);

  useEffect(() => {
    dashboardService.buscar()
      .then(setDados)
      .catch(() => setErro('Erro ao carregar o dashboard.'));
  }, []);

  if (!dados && !erro) return <DashboardSkeleton />;

  if (erro) {
    return (
      <Layout>
        <p className="text-red-600 text-sm">{erro}</p>
      </Layout>
    );
  }

  const { resumo, presencaSemanal, presencaPorPelotao, proximasEscalas } = dados;
  const { totalAtivos, totalEfetivo, presencaHoje, soldadosSemAvaliacao } = resumo;

  // Card presença hoje
  const taxaHoje = pct(presencaHoje.presentes, presencaHoje.totalRegistrados);
  const valorPresenca  = presencaHoje.totalRegistrados === 0
    ? '—'
    : `${taxaHoje}%`;
  const sublabelPresenca = presencaHoje.totalRegistrados === 0
    ? 'Sem treino registrado hoje'
    : `${presencaHoje.presentes} de ${presencaHoje.totalRegistrados} registros`;

  // Card avaliação
  const valorAval   = soldadosSemAvaliacao === 0 ? '✓' : soldadosSemAvaliacao;
  const corAval     = soldadosSemAvaliacao === 0 ? 'text-green-600' : soldadosSemAvaliacao > 10 ? 'text-red-600' : 'text-yellow-600';
  const sublabAval  = soldadosSemAvaliacao === 0
    ? 'Todos avaliados nos últimos 90 dias'
    : `soldado${soldadosSemAvaliacao !== 1 ? 's' : ''} sem TAF recente`;

  return (
    <Layout>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* ── Cards de resumo ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          titulo="Efetivo ativo"
          valor={totalAtivos}
          sublabel={`${totalEfetivo} no efetivo total`}
          rodape={`${totalEfetivo - totalAtivos} em licença ou baixado`}
        />
        <SummaryCard
          titulo="Presença hoje"
          valor={valorPresenca}
          valorCor={presencaHoje.totalRegistrados > 0 ? corTaxa(taxaHoje) : 'text-gray-400'}
          sublabel={sublabelPresenca}
        />
        <SummaryCard
          titulo="Avaliação (TAF)"
          valor={valorAval}
          valorCor={corAval}
          sublabel={sublabAval}
          rodape="Janela de 90 dias"
        />

        {/* Card próximas guardas integrado ao grid de 4 */}
        <CardProximasGuardas escalas={proximasEscalas} />
      </div>

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GraficoPresencaSemanal dados={presencaSemanal} />
        <GraficoPresencaPelotao dados={presencaPorPelotao} />
      </div>
    </Layout>
  );
}
