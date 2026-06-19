import { useState, useEffect } from 'react';
import { Layout }             from '../../components/layout/Layout';
import { relatoriosService }  from '../../services/relatoriosService';
import { turmasService }      from '../../services/turmasService';
import { gerarPdfPresenca }   from '../../utils/relatoriosPDF';
import { hoje }               from '../../utils/data';
import { raExibicao }         from '../../utils/nomes';
import styles from './Relatorios.module.scss';

function primeiroDiaMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

const STATUS_BADGE_STYLE = {
  ativo:      { background: 'var(--clr-primary-100)', color: '#166534' },
  licenca:    { background: 'var(--clr-yellow-100)',  color: 'var(--clr-yellow-800)' },
  baixado:    { background: 'var(--clr-red-100)',     color: 'var(--clr-red-800)' },
  dispensado: { background: 'var(--clr-gray-100)',    color: 'var(--clr-gray-500)' },
};

const STATUS_LABEL = { ativo: 'Ativo', licenca: 'Licença', baixado: 'Baixado', dispensado: 'Dispensado' };

function InputLabel({ label, children }) {
  return (
    <div>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

// ── Aba: Presença ─────────────────────────────────────────────────────────────

function AbaPresenca({ turmaId }) {
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
      if (turmaId) params.turma_id = turmaId;
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

  const totalFalt   = dados?.reduce((a, s) => a + (s.faltas        ?? 0), 0) ?? 0;
  const totalFaltGd = dados?.reduce((a, s) => a + (s.faltas_guarda ?? 0), 0) ?? 0;

  const summaryItems = [
    { label: 'Soldados',           value: dados?.length ?? 0, key: 'gray' },
    { label: 'Faltas',             value: totalFalt,          key: 'red' },
    { label: 'Faltas nas Guardas', value: totalFaltGd,        key: 'red' },
  ];

  return (
    <div className={styles.stack}>
      <div className={styles.filterCard}>
        <p className={styles.filterTitle}>Filtros</p>
        <div className={styles.filterGrid}>
          <InputLabel label="Data início">
            <input type="date" className={styles.input} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </InputLabel>
          <InputLabel label="Data fim">
            <input type="date" className={styles.input} value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </InputLabel>
          <InputLabel label="Turma">
            <input type="text" className={styles.input} value={turma} onChange={(e) => setTurma(e.target.value)} placeholder="Ex: 2024-A" />
          </InputLabel>
          <InputLabel label="Pelotão">
            <input type="text" className={styles.input} value={pelotao} onChange={(e) => setPelotao(e.target.value)} placeholder="Ex: 1º Pel" />
          </InputLabel>
        </div>
        <div className={styles.filterActions}>
          <button onClick={buscar} disabled={carregando || !dataInicio || !dataFim} className={styles.searchBtn}>
            {carregando ? 'Buscando…' : 'Buscar'}
          </button>
          {dados?.length > 0 && (
            <button onClick={exportarPDF} className={styles.exportBtn}>⬇ Exportar PDF</button>
          )}
        </div>
        {erro && <p className={styles.error}>{erro}</p>}
      </div>

      {dados && (
        <div className={styles.summaryGrid}>
          {summaryItems.map(({ label, value, key }) => (
            <div key={label} className={styles.summaryCard}>
              <p className={`${styles.summaryValue} ${styles[`summaryValue--${key}`]}`}>{value}</p>
              <p className={styles.summaryLabel}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {dados && (
        <div className={styles.tableCard}>
          <div className={styles.tableCardHeader}>
            <h2 className={styles.tableCardTitle}>Resultado por Soldado</h2>
            <span className={styles.tableCount}>{dados.length} soldado(s)</span>
          </div>
          {dados.length === 0 ? (
            <p className={styles.emptyTable}>Nenhum dado encontrado para os filtros selecionados.</p>
          ) : (
            <div className={styles.tableScrollWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>RA</th>
                    <th>Pelotão</th>
                    <th>Turma</th>
                    <th className={styles.centered}>Faltas</th>
                    <th className={styles.centered}>Faltas nas Guardas</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.map((s) => (
                    <tr key={s.soldado_id}>
                      <td>{s.nome_completo}</td>
                      <td className={styles.monoCell}>{raExibicao(s.ra)}</td>
                      <td>{s.pelotao || '—'}</td>
                      <td>{s.turma   || '—'}</td>
                      <td className={`${styles.centered} ${styles.redCell}`}>{s.faltas}</td>
                      <td className={`${styles.centered} ${styles.redCell}`}>{s.faltas_guarda}</td>
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

// ── Aba: Efetivo ──────────────────────────────────────────────────────────────

const STATUS_ORDER = ['ativo', 'licenca', 'baixado', 'dispensado'];
const STATUS_CARD_LABEL = { ativo: 'Ativos', licenca: 'Licença', baixado: 'Baixados', dispensado: 'Dispensados' };

function AbaEfetivo({ turmaId }) {
  const [dados,        setDados]        = useState(null);
  const [carregando,   setCarregando]   = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [busca,        setBusca]        = useState('');

  useEffect(() => {
    setCarregando(true);
    const params = turmaId ? { turma_id: turmaId } : {};
    relatoriosService.efetivo(params).then(setDados).finally(() => setCarregando(false));
  }, [turmaId]);

  if (carregando) {
    return <div className={styles.chartEmpty}>Carregando…</div>;
  }

  const { soldados = [], resumo = {} } = dados ?? {};
  const porStatus = resumo.por_status    ?? {};
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
    <div className={styles.stack}>
      <div className={styles.statusCards}>
        {STATUS_ORDER.map((st) => (
          <button
            key={st}
            onClick={() => setFiltroStatus(filtroStatus === st ? '' : st)}
            className={`${styles.statusCard} ${styles[`statusCard--${st}`]} ${filtroStatus === st ? styles['statusCard--selected'] : ''}`}
          >
            <p className={`${styles.statusNum} ${styles[`statusNum--${st}`]}`}>{porStatus[st] ?? 0}</p>
            <p className={styles.statusLabel}>{STATUS_CARD_LABEL[st]}</p>
          </button>
        ))}
      </div>

      <div className={styles.gradCards}>
        <div className={styles.gradCard}>
          <p className={`${styles.gradNum} ${styles.gradGray}`}>{porGrad.cabo ?? 0}</p>
          <p className={styles.gradLabel}>Cabos (ativos)</p>
        </div>
        <div className={styles.gradCard}>
          <p className={`${styles.gradNum} ${styles.gradBlue}`}>{porGrad.atirador ?? 0}</p>
          <p className={styles.gradLabel}>Atiradores (ativos)</p>
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.efTableHeader}>
          <h2 className={styles.tableCardTitle}>
            Efetivo completo{filtroStatus && ` — ${STATUS_LABEL[filtroStatus]}`}
          </h2>
          <div className={styles.efSearchRow}>
            <input
              type="text"
              placeholder="Buscar nome ou RA…"
              className={styles.efSearchInput}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {filtroStatus && (
              <button onClick={() => setFiltroStatus('')} className={styles.clearFilterBtn}>
                Limpar filtro
              </button>
            )}
          </div>
        </div>
        <div className={styles.tableScrollWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>RA</th>
                <th>Graduação</th>
                <th>Pelotão</th>
                <th>Turma</th>
                <th className={styles.centered}>Guardas</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyTable}>Nenhum soldado encontrado.</td>
                </tr>
              ) : filtrados.map((s) => (
                <tr key={s.id}>
                  <td>{s.nome_completo}</td>
                  <td className={styles.monoCell}>{raExibicao(s.ra)}</td>
                  <td>{s.graduacao === 'cabo' ? 'Cabo' : 'Atirador'}</td>
                  <td>{s.pelotao || '—'}</td>
                  <td>{s.turma   || '—'}</td>
                  <td className={styles.centered}>{s.guardas_concluidas ?? 0}</td>
                  <td>
                    <span className={styles.statusBadge} style={STATUS_BADGE_STYLE[s.status]}>
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.tableFooter}>
          {filtrados.length} de {soldados.length} soldado(s)
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

const ABAS = [
  { key: 'presenca', label: 'Presença' },
  { key: 'efetivo',  label: 'Efetivo' },
];

export default function Relatorios() {
  const [aba, setAba] = useState('presenca');
  const [turmas, setTurmas] = useState([]);
  const [turmaId, setTurmaId] = useState('');

  useEffect(() => {
    turmasService.listar().then((ts) => {
      setTurmas(ts);
      const ativa = ts.find((t) => t.status === 'ativa');
      if (ativa) setTurmaId(String(ativa.id));
    }).catch(() => {});
  }, []);

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 className={styles.pageTitle}>Relatórios</h1>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#374151' }}>
          Turma:
          <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>{t.ano}{t.status === 'ativa' ? ' (ativa)' : ''}</option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.tabs}>
        {ABAS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setAba(key)}
            className={`${styles.tab} ${aba === key ? styles['tab--active'] : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {aba === 'presenca' && <AbaPresenca turmaId={turmaId} />}
      {aba === 'efetivo'  && <AbaEfetivo turmaId={turmaId} />}
    </Layout>
  );
}
