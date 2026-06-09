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
import styles from './Dashboard.module.scss';

const COR_PRIMARIA  = '#16a34a';
const COR_FILL      = '#bbf7d0';
const COR_EIXO      = '#9ca3af';
const COR_GRID      = '#f3f4f6';

function pct(n, total) {
  if (!total) return null;
  return Math.round((n / total) * 100);
}

function corTaxaKey(taxa) {
  if (taxa == null) return '';
  if (taxa >= 80) return 'green';
  if (taxa >= 50) return 'yellow';
  return 'red';
}

function labelSemana(isoDate) {
  if (!isoDate) return '';
  const [, m, d] = isoDate.split('-');
  return `${d}/${m}`;
}

function TooltipPresenca({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitle}>Semana de {labelSemana(d.semana_inicio)}</p>
      <p className={styles.tooltipGreen}>{d.taxa}% de presença</p>
      <p className={styles.tooltipMuted}>{d.presentes} de {d.total} registros</p>
    </div>
  );
}

function TooltipPelotao({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitle}>{d.pelotao}</p>
      <p className={styles.tooltipGreen}>{d.taxa}% de presença</p>
      <p className={styles.tooltipMuted}>{d.presentes} de {d.total} registros</p>
    </div>
  );
}

function SummaryCard({ titulo, valor, colorKey, sublabel, rodape, children }) {
  const valClass = colorKey ? styles[`summaryValue--${colorKey}`] : '';
  return (
    <div className={styles.summaryCard}>
      <p className={styles.summaryLabel}>{titulo}</p>
      {children ?? (
        <p className={`${styles.summaryValue} ${valClass}`}>{valor}</p>
      )}
      {sublabel && <p className={styles.summarySub}>{sublabel}</p>}
      {rodape   && <p className={styles.summaryFooter}>{rodape}</p>}
    </div>
  );
}

function ChartCard({ titulo, subtitulo, children, semDados }) {
  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <p className={styles.chartTitle}>{titulo}</p>
        {subtitulo && <p className={styles.chartSubtitle}>{subtitulo}</p>}
      </div>
      {semDados ? (
        <div className={styles.emptyChart}>Sem dados suficientes ainda.</div>
      ) : children}
    </div>
  );
}

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
              <stop offset="5%"  stopColor={COR_FILL} stopOpacity={0.8} />
              <stop offset="95%" stopColor={COR_FILL} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={COR_GRID} vertical={false} />
          <XAxis dataKey="semana_inicio" tickFormatter={labelSemana} tick={{ fontSize: 11, fill: COR_EIXO }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: COR_EIXO }} axisLine={false} tickLine={false} width={42} />
          <Tooltip content={<TooltipPresenca />} />
          <Area type="monotone" dataKey="taxa" stroke={COR_PRIMARIA} strokeWidth={2} fill="url(#gradPresenca)" dot={{ fill: COR_PRIMARIA, r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function GraficoPresencaPelotao({ dados }) {
  const tickFormatter = (v) => v.length > 10 ? v.slice(0, 9) + '…' : v;
  return (
    <ChartCard titulo="Presença por pelotão" subtitulo="Últimos 30 dias" semDados={dados.length === 0}>
      <ResponsiveContainer width="100%" height={176}>
        <BarChart data={dados} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={32}>
          <CartesianGrid stroke={COR_GRID} vertical={false} />
          <XAxis dataKey="pelotao" tickFormatter={tickFormatter} tick={{ fontSize: 11, fill: COR_EIXO }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: COR_EIXO }} axisLine={false} tickLine={false} width={42} />
          <Tooltip content={<TooltipPelotao />} cursor={{ fill: '#f9fafb' }} />
          <Bar dataKey="taxa" fill={COR_PRIMARIA} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function CardProximasGuardas({ escalas }) {
  return (
    <div className={styles.summaryCard}>
      <p className={styles.summaryLabel}>Próximas guardas · 7 dias</p>
      {escalas.length === 0 ? (
        <p className={styles.guardasEmpty}>Nenhuma guarda agendada.</p>
      ) : (
        <ul className={styles.guardaList}>
          {escalas.map((e) => (
            <li key={e.id} className={styles.guardaItem}>
              <span className={`${styles.guardaChip} ${styles[`guardaChip--${e.tipo}`]}`}>
                {{ verde: 'Verde', preta: 'Preta', vermelha: 'Vermelha' }[e.tipo]}
              </span>
              <span className={styles.guardaDate}>
                {formatarData(e.data_inicio)}
                {e.data_inicio !== e.data_fim && ` – ${formatarData(e.data_fim)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <Layout>
      <p className={styles.pageTitle}>Dashboard</p>
      <div className={styles.summaryGrid}>
        {[...Array(4)].map((_, i) => <div key={i} className={styles.skeletonH32} />)}
      </div>
      <div className={styles.chartsGrid}>
        <div className={styles.skeletonH60} />
        <div className={styles.skeletonH60} />
      </div>
    </Layout>
  );
}

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
        <p style={{ color: 'var(--clr-red-600)', fontSize: 'var(--fs-sm)' }}>{erro}</p>
      </Layout>
    );
  }

  const { resumo, presencaSemanal, presencaPorPelotao, proximasEscalas } = dados;
  const { totalAtivos, totalEfetivo, presencaHoje, soldadosSemAvaliacao } = resumo;

  const taxaHoje = pct(presencaHoje.presentes, presencaHoje.totalRegistrados);
  const valorPresenca = presencaHoje.totalRegistrados === 0 ? '—' : `${taxaHoje}%`;
  const sublabelPresenca = presencaHoje.totalRegistrados === 0
    ? 'Sem treino registrado hoje'
    : `${presencaHoje.presentes} de ${presencaHoje.totalRegistrados} registros`;

  const valorAval  = soldadosSemAvaliacao === 0 ? '✓' : soldadosSemAvaliacao;
  const avalKey    = soldadosSemAvaliacao === 0 ? 'green' : soldadosSemAvaliacao > 10 ? 'red' : 'yellow';
  const sublabAval = soldadosSemAvaliacao === 0
    ? 'Todos avaliados nos últimos 90 dias'
    : `soldado${soldadosSemAvaliacao !== 1 ? 's' : ''} sem TAF recente`;

  return (
    <Layout>
      <h1 className={styles.pageTitle}>Dashboard</h1>

      <div className={styles.summaryGrid}>
        <SummaryCard
          titulo="Efetivo ativo"
          valor={totalAtivos}
          sublabel={`${totalEfetivo} no efetivo total`}
          rodape={`${totalEfetivo - totalAtivos} em licença ou baixado`}
        />
        <SummaryCard
          titulo="Presença hoje"
          valor={valorPresenca}
          colorKey={presencaHoje.totalRegistrados > 0 ? corTaxaKey(taxaHoje) : 'muted'}
          sublabel={sublabelPresenca}
        />
        <SummaryCard
          titulo="Avaliação (TAF)"
          valor={valorAval}
          colorKey={avalKey}
          sublabel={sublabAval}
          rodape="Janela de 90 dias"
        />
        <CardProximasGuardas escalas={proximasEscalas} />
      </div>

      <div className={styles.chartsGrid}>
        <GraficoPresencaSemanal dados={presencaSemanal} />
        <GraficoPresencaPelotao dados={presencaPorPelotao} />
      </div>
    </Layout>
  );
}
