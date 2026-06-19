import { useEffect, useState, useCallback } from 'react';
import { Layout }        from '../../components/layout/Layout';
import { diarioService } from '../../services/diarioService';
import { formatarData }  from '../../utils/data';
import { gerarPdfDiario } from '../../utils/diarioPDF';
import DiarioForm from './DiarioForm';
import styles from './Diario.module.scss';

function BadgePdf({ gerado }) {
  return gerado
    ? <span className={styles.badgePdf}>PDF gerado</span>
    : <span className={styles.badgeDraft}>Rascunho</span>;
}

export default function Diario() {
  const [view,       setView]       = useState('lista');
  const [editando,   setEditando]   = useState(null);
  const [diarios,    setDiarios]    = useState([]);
  const [total,      setTotal]      = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [paginando,  setPaginando]  = useState(false);
  const [offset,     setOffset]     = useState(0);
  const LIMIT = 20;

  const carregar = useCallback(async (off = 0) => {
    off === 0 ? setCarregando(true) : setPaginando(true);
    try {
      const { dados, total: t } = await diarioService.listar({ limit: LIMIT, offset: off });
      setDiarios(off === 0 ? dados : (prev) => [...prev, ...dados]);
      setTotal(t);
      setOffset(off);
    } finally {
      setCarregando(false);
      setPaginando(false);
    }
  }, []);

  useEffect(() => { carregar(0); }, [carregar]);

  function abrirNovo() { setEditando(null); setView('form'); }

  async function abrirEditar(d) {
    try {
      const completo = await diarioService.buscarPorData(d.data_servico);
      setEditando(completo);
    } catch {
      setEditando(d);
    }
    setView('form');
  }

  async function reimprimir(d) {
    try {
      const completo = await diarioService.buscarPorData(d.data_servico);
      gerarPdfDiario(completo);
    } catch {
      alert('Erro ao recuperar dados para reimpressão.');
    }
  }

  function onSalvo(diario) {
    setDiarios((prev) => {
      const idx = prev.findIndex((d) => d.id === diario.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = diario; return n; }
      return [diario, ...prev];
    });
    setTotal((t) => t + 1);
    setView('lista');
  }

  if (view === 'form') {
    return <DiarioForm inicial={editando} onSalvo={onSalvo} onCancelar={() => setView('lista')} />;
  }

  return (
    <Layout>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.pageTitle}>Diário de Rotina</h1>
          <p className={styles.counter}>{total} registro{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={abrirNovo} className={styles.btnNew}>+ Novo Diário</button>
      </div>

      <div className={styles.tableWrap}>
        {carregando ? (
          <div className={styles.tableEmpty}>Carregando…</div>
        ) : diarios.length === 0 ? (
          <div className={styles.tableEmpty}>
            Nenhum diário registrado ainda.
            <button onClick={abrirNovo} className={styles.firstLink}>
              Registrar o primeiro diário
            </button>
          </div>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Dia do serviço</th>
                  <th>Para o dia</th>
                  <th>Parada diária</th>
                  <th>Registrado por</th>
                  <th>Situação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {diarios.map((d) => (
                  <tr key={d.id}>
                    <td className={styles.boldCell}>{formatarData(d.data_servico)}</td>
                    <td className={styles.muteCell}>{formatarData(d.data_para)}</td>
                    <td>
                      <span className={d.parada_diaria_status === 'Com Alteração' ? styles.comAlteracao : styles.semAlteracao}>
                        {d.parada_diaria_status}
                      </span>
                    </td>
                    <td className={styles.muteCell}>{d.registrado_por_nome || '—'}</td>
                    <td><BadgePdf gerado={d.pdf_gerado} /></td>
                    <td>
                      <div className={styles.actions}>
                        {d.pdf_gerado ? (
                          <>
                            <button onClick={() => reimprimir(d)} className={`${styles.actionBtn} ${styles['actionBtn--blue']}`}>
                              Reimprimir PDF
                            </button>
                            <button onClick={() => abrirEditar(d)} className={`${styles.actionBtn} ${styles['actionBtn--muted']}`}>
                              Visualizar
                            </button>
                          </>
                        ) : (
                          <button onClick={() => abrirEditar(d)} className={`${styles.actionBtn} ${styles['actionBtn--green']}`}>
                            Editar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {diarios.length < total && (
              <div className={styles.loadMore}>
                <button
                  onClick={() => carregar(offset + LIMIT)}
                  disabled={paginando}
                  className={styles.loadMoreBtn}
                >
                  {paginando ? 'Carregando…' : `Ver mais (${total - diarios.length} restantes)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
