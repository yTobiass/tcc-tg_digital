import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../../components/layout/Layout';
import { Badge } from '../../components/ui/Badge';
import { useSoldados } from '../../hooks/useSoldados';
import { SoldadoFormModal } from './SoldadoFormModal';
import { ImportarModal } from './ImportarModal';
import styles from './Soldados.module.scss';

const STATUS_OPTS = [
  { value: '', label: 'Todos os status' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'licenca', label: 'Licença' },
  { value: 'baixado', label: 'Baixado' },
  { value: 'dispensado', label: 'Dispensado' },
];
const GRAD_OPTS = [
  { value: '', label: 'Todas as graduações' },
  { value: 'atirador', label: 'Atirador' },
  { value: 'cabo', label: 'Cabo' },
];

// Cores dos badges de contagem de guardas por tipo.
const GUARDA_BADGE_STYLE = {
  verde:    { background: '#dcfce7', color: '#166534' },
  preta:    { background: '#374151', color: '#ffffff' },
  vermelha: { background: '#fee2e2', color: '#991b1b' },
};

// Badge numérico centralizado. Valor 0/ausente vira "—" para não poluir.
function GuardaCount({ valor, tipo }) {
  if (!valor) return <span style={{ color: '#9ca3af' }}>—</span>;
  return (
    <span
      style={{
        ...GUARDA_BADGE_STYLE[tipo],
        display: 'inline-block',
        minWidth: 24,
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        textAlign: 'center',
      }}
    >
      {valor}
    </span>
  );
}

export default function Soldados() {
  const { soldados, carregando, erro, carregar } = useSoldados();
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroGrad, setFiltroGrad] = useState('');
  const [modalForm, setModalForm] = useState(null);
  const [modalImportar, setModalImportar] = useState(false);

  useEffect(() => { carregar(); }, [carregar]);

  const filtrados = useMemo(() => {
    const b = busca.toLowerCase();
    return soldados.filter((s) => {
      if (b && !s.nome_completo.toLowerCase().includes(b) && !s.ra.toLowerCase().includes(b)) return false;
      if (filtroStatus && s.status !== filtroStatus) return false;
      if (filtroGrad && s.graduacao !== filtroGrad) return false;
      return true;
    });
  }, [soldados, busca, filtroStatus, filtroGrad]);

  function handleSalvar() {
    setModalForm(null);
    carregar();
  }

  function handleImportado() {
    carregar();
  }

  return (
    <Layout>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Soldados</h1>
        <div className={styles.headerActions}>
          <button onClick={() => setModalImportar(true)} className={styles.btnImport}>
            Importar planilha
          </button>
          <button onClick={() => setModalForm('novo')} className={styles.btnNew}>
            + Novo soldado
          </button>
        </div>
      </div>

      <div className={styles.filterBar}>
        <input
          type="search"
          placeholder="Buscar por nome ou RA..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className={styles.select}
        >
          {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={filtroGrad}
          onChange={(e) => setFiltroGrad(e.target.value)}
          className={styles.select}
        >
          {GRAD_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {(busca || filtroStatus || filtroGrad) && (
          <button
            onClick={() => { setBusca(''); setFiltroStatus(''); setFiltroGrad(''); }}
            className={styles.clearBtn}
          >
            Limpar
          </button>
        )}
      </div>

      <div className={styles.tableWrap}>
        {carregando ? (
          <div className={styles.tableEmpty}>Carregando...</div>
        ) : erro ? (
          <div className={styles.tableError}>{erro}</div>
        ) : filtrados.length === 0 ? (
          <div className={styles.tableEmpty}>
            {soldados.length === 0 ? 'Nenhum soldado cadastrado.' : 'Nenhum resultado para os filtros selecionados.'}
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>RA</th>
                <th>Nome</th>
                <th className={styles.hideMd}>Pelotão</th>
                <th className={styles.hideMd}>Turma</th>
                <th>Graduação</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>🟢 Verde</th>
                <th style={{ textAlign: 'center' }}>⚫ Preta</th>
                <th style={{ textAlign: 'center' }}>🔴 Vermelha</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((s) => (
                <tr key={s.id}>
                  <td className={styles.raCell}>{s.ra}</td>
                  <td className={styles.nameCell}>{s.nome_completo}</td>
                  <td className={`${styles.muteCell} ${styles.hideMd}`}>{s.pelotao || '—'}</td>
                  <td className={`${styles.muteCell} ${styles.hideMd}`}>{s.turma || '—'}</td>
                  <td><Badge value={s.graduacao} /></td>
                  <td><Badge value={s.status} /></td>
                  {/* Cabos nunca fazem guarda verde → traço fixo na coluna verde */}
                  <td style={{ textAlign: 'center' }}>
                    {s.graduacao === 'cabo'
                      ? <span style={{ color: '#9ca3af' }}>—</span>
                      : <GuardaCount valor={s.total_verde} tipo="verde" />}
                  </td>
                  <td style={{ textAlign: 'center' }}><GuardaCount valor={s.total_preta} tipo="preta" /></td>
                  <td style={{ textAlign: 'center' }}><GuardaCount valor={s.total_vermelha} tipo="vermelha" /></td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => setModalForm(s)} className={styles.editBtn}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!carregando && !erro && filtrados.length > 0 && (
          <div className={styles.tableFooter}>
            {filtrados.length} de {soldados.length} soldado{soldados.length !== 1 ? 's' : ''}
            {filtrados.filter(s => s.status === 'ativo').length !== filtrados.length && (
              <span> · {filtrados.filter(s => s.status === 'ativo').length} ativo{filtrados.filter(s => s.status === 'ativo').length !== 1 ? 's' : ''}</span>
            )}
          </div>
        )}
      </div>

      {modalForm && (
        <SoldadoFormModal
          key={modalForm === 'novo' ? 'novo' : modalForm.id}
          soldado={modalForm === 'novo' ? null : modalForm}
          onSalvar={handleSalvar}
          onFechar={() => setModalForm(null)}
        />
      )}
      {modalImportar && (
        <ImportarModal
          onImportado={handleImportado}
          onFechar={() => setModalImportar(false)}
        />
      )}
    </Layout>
  );
}
