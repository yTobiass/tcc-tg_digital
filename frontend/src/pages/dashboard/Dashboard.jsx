import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { dashboardService } from '../../services/dashboardService';
import { formatarData } from '../../utils/data';
import { nomeExibicao } from '../../utils/nomes';
import { corPontos, corFatd, LIMITE_PONTOS, LIMITE_FATD } from '../../utils/pontos';
import styles from './Dashboard.module.scss';

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

// Card de alertas de disciplina: soldados com 90+ pontos ou 2+ FATDs.
function CardAlertasDisciplina({ alertas }) {
  const navigate = useNavigate();
  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <p className={styles.chartTitle}>⚠️ Alertas de disciplina</p>
        <p className={styles.chartSubtitle}>Soldados com 90+ pontos ou 2+ FATDs</p>
      </div>
      {alertas.length === 0 ? (
        <div className={styles.emptyChart}>Nenhum soldado em situação crítica. 👍</div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alertas.map((s) => {
            const cp = corPontos(s.total_pontos);
            const cf = corFatd(s.total_fatd);
            return (
              <li key={s.id}>
                <button
                  onClick={() => navigate(`/soldados/${s.id}`)}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: 8, padding: '8px 10px', borderRadius: 8, border: '1px solid #f3f4f6',
                    background: '#fff', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#1f2937', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {nomeExibicao(s)}
                    </span>
                    {s.pelotao && <span style={{ fontSize: 12, color: '#9ca3af' }}>{s.pelotao}</span>}
                  </span>
                  <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <span style={{ ...cp, padding: '2px 8px', borderRadius: 9999, fontSize: 12, fontWeight: 600 }}>
                      {s.total_pontos} / {LIMITE_PONTOS}
                    </span>
                    <span style={{ ...cf, padding: '2px 8px', borderRadius: 9999, fontSize: 12, fontWeight: 600 }}>
                      {s.total_fatd} / {LIMITE_FATD} FATD
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
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
        {[...Array(3)].map((_, i) => <div key={i} className={styles.skeletonH32} />)}
      </div>
      <div className={styles.chartsGrid}>
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

  const { resumo, proximasEscalas, alertasDisciplina = [] } = dados;
  const { totalAtivos, totalEfetivo, soldadosSemAvaliacao } = resumo;

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
          titulo="Avaliação (TAF)"
          valor={valorAval}
          colorKey={avalKey}
          sublabel={sublabAval}
          rodape="Janela de 90 dias"
        />
        <CardProximasGuardas escalas={proximasEscalas} />
      </div>

      <div className={styles.chartsGrid}>
        <CardAlertasDisciplina alertas={alertasDisciplina} />
      </div>
    </Layout>
  );
}
