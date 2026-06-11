import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { Layout }            from '../../components/layout/Layout';
import { Badge }             from '../../components/ui/Badge';
import { useAuth }           from '../../hooks/useAuth';
import { soldadosService }   from '../../services/soldadosService';
import { avaliacoesService } from '../../services/avaliacoesService';
import { useGuardasSoldado } from '../../hooks/useGuardas';
import { DisciplinaSecao }   from './DisciplinaSecao';
import { BG_CONCEITO }       from '../../utils/tafCalculo';
import { formatarData }      from '../../utils/data';
import styles from './MeuPerfil.module.scss';

const COR_LINHA = '#16a34a';
const COR_EIXO  = '#9ca3af';
const COR_GRID  = '#f3f4f6';

const REFS_TAF = [
  { y: 90, label: 'Excelente', cor: '#15803d' },
  { y: 75, label: 'Muito Bom', cor: '#22c55e' },
  { y: 60, label: 'Bom',       cor: '#3b82f6' },
  { y: 45, label: 'Regular',   cor: '#eab308' },
];

const TIPO_BADGE_STYLE = {
  verde:    { background: '#dcfce7', color: '#166534' },
  preta:    { background: '#e5e7eb', color: '#1f2937' },
  vermelha: { background: '#fee2e2', color: '#991b1b' },
};

const STATUS_BADGE_STYLE = {
  agendada:     { background: '#eff6ff', color: '#1d4ed8' },
  em_andamento: { background: '#fefce8', color: '#a16207' },
  concluida:    { background: '#f0fdf4', color: '#166534' },
  cancelada:    { background: '#f9fafb', color: '#6b7280' },
};

const STATUS_LABEL_G = {
  agendada: 'Agendada', em_andamento: 'Em andamento',
  concluida: 'Concluída', cancelada: 'Cancelada',
};

function TooltipTAF({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitle}>{formatarData(d.data)}</p>
      <p className={styles.tooltipBody}>
        Nota: <strong>{d.nota_final}</strong>{' '}
        <span className={BG_CONCEITO[d.conceito] ?? ''}>{d.conceito}</span>
      </p>
      <p className={styles.tooltipMuted}>Corrida {d.corrida}m · Flexão {d.flexao} · Abd {d.abdominal}</p>
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}

export default function MeuPerfil() {
  const { usuario }  = useAuth();
  const [soldado,    setSoldado]    = useState(null);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Histórico e totais de guardas via endpoint /soldados/:id/guardas.
  const { historico: guardas, totais: totaisGuardas } = useGuardasSoldado(usuario?.soldado_id);

  useEffect(() => {
    if (!usuario?.soldado_id) { setCarregando(false); return; }
    Promise.all([
      soldadosService.buscarPorId(usuario.soldado_id),
      avaliacoesService.minhaEvolucao(),
    ])
      .then(([sol, av]) => { setSoldado(sol); setAvaliacoes(av); })
      .finally(() => setCarregando(false));
  }, [usuario]);

  if (carregando) {
    return (
      <Layout>
        <div className={styles.loading}>Carregando…</div>
      </Layout>
    );
  }

  const ultimaTAF = avaliacoes.length > 0 ? avaliacoes[avaliacoes.length - 1] : null;
  const melhorTAF = avaliacoes.length > 0
    ? avaliacoes.reduce((m, a) => (a.nota_final > m.nota_final ? a : m))
    : null;

  return (
    <Layout>
      <h1 className={styles.pageTitle}>Meu Perfil</h1>

      <div className={styles.grid}>

        {/* Coluna esquerda */}
        <div className={styles.leftCol}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Dados Pessoais</h2>
              {soldado && <Badge value={soldado.status} />}
            </div>

            {soldado ? (
              <div>
                <p className={styles.soldadoName}>{soldado.nome_completo}</p>
                <p className={styles.soldadoRa}>RA {soldado.ra}</p>
                <InfoRow label="Pelotão"              value={soldado.pelotao} />
                <InfoRow label="Turma"                value={soldado.turma} />
                <InfoRow label="Graduação"            value={soldado.graduacao === 'cabo' ? 'Cabo' : 'Atirador'} />
                <InfoRow label="Data de incorporação" value={soldado.data_incorporacao ? formatarData(soldado.data_incorporacao) : null} />
                <InfoRow label="Data de nascimento"   value={soldado.data_nascimento ? formatarData(soldado.data_nascimento) : null} />
              </div>
            ) : (
              <p className={styles.noProfile}>Perfil não vinculado.</p>
            )}
          </div>

          {ultimaTAF && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle} style={{ marginBottom: 12 }}>Última TAF</h2>
              <div className={styles.tafScore}>
                <span className={styles.tafNum}>{ultimaTAF.nota_final}</span>
                <span className={styles.tafUnit}>pts</span>
                <span className={`${styles.tafBadge} ${BG_CONCEITO[ultimaTAF.conceito] ?? ''}`}>
                  {ultimaTAF.conceito}
                </span>
              </div>
              <p className={styles.tafDate}>{formatarData(ultimaTAF.data)}</p>
              <div className={styles.tafBreakdown}>
                <div><span className={styles.tafBreakdownVal}>{ultimaTAF.corrida}</span>m corrida</div>
                <div><span className={styles.tafBreakdownVal}>{ultimaTAF.flexao}</span>flexões</div>
                <div><span className={styles.tafBreakdownVal}>{ultimaTAF.abdominal}</span>abdominais</div>
              </div>
            </div>
          )}

          {melhorTAF && melhorTAF.id !== ultimaTAF?.id && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle} style={{ marginBottom: 12 }}>Melhor TAF</h2>
              <div className={styles.tafScore}>
                <span className={styles.tafNum}>{melhorTAF.nota_final}</span>
                <span className={styles.tafUnit}>pts</span>
                <span className={`${styles.tafBadge} ${BG_CONCEITO[melhorTAF.conceito] ?? ''}`}>
                  {melhorTAF.conceito}
                </span>
              </div>
              <p className={styles.tafDate}>{formatarData(melhorTAF.data)}</p>
            </div>
          )}
        </div>

        {/* Coluna direita */}
        <div className={styles.rightCol}>

          <div className={styles.card}>
            <h2 className={styles.cardTitle} style={{ marginBottom: 16 }}>Evolução TAF</h2>

            {avaliacoes.length === 0 ? (
              <div className={styles.chartEmpty}>Nenhuma avaliação registrada ainda.</div>
            ) : avaliacoes.length === 1 ? (
              <div className={styles.chartEmpty}>
                Apenas uma avaliação registrada — o gráfico aparece a partir da segunda.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={avaliacoes} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke={COR_GRID} vertical={false} />
                  <XAxis
                    dataKey="data"
                    tickFormatter={(v) => { const [, m, d] = v.split('-'); return `${d}/${m}`; }}
                    tick={{ fontSize: 11, fill: COR_EIXO }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 105]}
                    ticks={[0, 20, 45, 60, 75, 90, 100]}
                    tick={{ fontSize: 11, fill: COR_EIXO }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  {REFS_TAF.map(({ y, label, cor }) => (
                    <ReferenceLine key={y} y={y} stroke={cor} strokeDasharray="4 3" strokeOpacity={0.5}
                      label={{ value: label, fontSize: 10, fill: cor, position: 'insideTopRight' }} />
                  ))}
                  <Tooltip content={<TooltipTAF />} />
                  <Line type="monotone" dataKey="nota_final" stroke={COR_LINHA} strokeWidth={2}
                    dot={{ fill: COR_LINHA, r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {avaliacoes.length > 0 && (
            <div className={styles.tableCardWrap}>
              <div className={styles.tableCardHeader}>
                <h2 className={styles.cardTitle}>Histórico de Avaliações</h2>
              </div>
              <div className={styles.tableScrollWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th className={styles.centered}>Corrida (m)</th>
                      <th className={styles.centered}>Flexão</th>
                      <th className={styles.centered}>Abdominal</th>
                      <th className={styles.centered}>Nota</th>
                      <th>Conceito</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...avaliacoes].reverse().map((a, i) => (
                      <tr key={i}>
                        <td>{formatarData(a.data)}</td>
                        <td className={styles.centered}>{a.corrida}</td>
                        <td className={styles.centered}>{a.flexao}</td>
                        <td className={styles.centered}>{a.abdominal}</td>
                        <td className={`${styles.centered} ${styles.boldCell}`}>{a.nota_final}</td>
                        <td>
                          <span className={`${styles.conceitoBadge} ${BG_CONCEITO[a.conceito] ?? ''}`}>
                            {a.conceito}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {soldado && <DisciplinaSecao soldado={soldado} />}

          <div className={styles.tableCardWrap}>
            <div className={styles.tableCardHeader}>
              <h2 className={styles.cardTitle}>Histórico de Guardas</h2>
            </div>

            {/* Cards de resumo por tipo de guarda */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: 16 }}>
              {[
                { tipo: 'verde',    label: '🟢 Verde',    n: totaisGuardas.verde },
                { tipo: 'preta',    label: '⚫ Preta',    n: totaisGuardas.preta },
                { tipo: 'vermelha', label: '🔴 Vermelha', n: totaisGuardas.vermelha },
              ].map((c) => (
                <div key={c.tipo} style={{ ...TIPO_BADGE_STYLE[c.tipo], borderRadius: 8, padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{c.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.15 }}>{c.n}</div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>guardas</div>
                </div>
              ))}
            </div>

            {guardas.length === 0 ? (
              <p className={styles.emptyMsg}>Nenhuma escala registrada.</p>
            ) : (
              <div className={styles.tableScrollWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Período</th>
                      <th>Função</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guardas.map((g) => {
                      const periodo = g.data_inicio === g.data_fim
                        ? formatarData(g.data_inicio)
                        : `${formatarData(g.data_inicio)} – ${formatarData(g.data_fim)}`;
                      return (
                        <tr key={g.escala_id}>
                          <td>
                            <span className={styles.guardaTipoBadge}
                              style={TIPO_BADGE_STYLE[g.tipo]}>
                              {g.tipo}
                            </span>
                          </td>
                          <td>{periodo}</td>
                          <td>{g.funcao === 'cabo' ? 'Monitor/Cabo' : 'Atirador'}</td>
                          <td>
                            <span className={styles.guardaStatus}
                              style={STATUS_BADGE_STYLE[g.status]}>
                              {STATUS_LABEL_G[g.status] ?? g.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
