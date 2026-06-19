import { useEffect, useState, useCallback, useMemo } from 'react';
import { Layout } from '../../components/layout/Layout';
import { avaliacoesService } from '../../services/avaliacoesService';
import { soldadosService }   from '../../services/soldadosService';
import { BG_CONCEITO }       from '../../utils/tafCalculo';
import { formatarData }      from '../../utils/data';
import { raExibicao }        from '../../utils/nomes';
import AvaliacaoFormModal    from './AvaliacaoFormModal';
import EvolucaoModal         from './EvolucaoModal';
import styles from './Avaliacoes.module.scss';

function BadgeConceito({ conceito }) {
  return <span className={BG_CONCEITO[conceito] ?? ''}>{conceito}</span>;
}

export default function Avaliacoes() {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [soldados,   setSoldados]   = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [busca,          setBusca]          = useState('');
  const [filtroCanceito, setFiltroCanceito] = useState('');

  const [modalForm,     setModalForm]     = useState(null);
  const [modalEvolucao, setModalEvolucao] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [av, sol] = await Promise.all([
        avaliacoesService.listar({ limit: 200 }),
        soldadosService.listar({ status: 'ativo' }),
      ]);
      setAvaliacoes(av);
      setSoldados(sol);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase();
    return avaliacoes.filter((a) => {
      const nomeOk = a.nome?.toLowerCase().includes(q) || a.ra?.toLowerCase().includes(q);
      const concOk = !filtroCanceito || a.conceito === filtroCanceito;
      return nomeOk && concOk;
    });
  }, [avaliacoes, busca, filtroCanceito]);

  function abrirEvolucao(avaliacao) {
    const soldado = soldados.find((s) => s.id === avaliacao.soldado_id);
    setModalEvolucao(
      soldado
        ? { id: soldado.id, nome: soldado.nome_completo ?? soldado.nome }
        : { id: avaliacao.soldado_id, nome: avaliacao.nome }
    );
  }

  async function excluir(av) {
    if (!window.confirm(`Excluir avaliação de ${av.nome} em ${formatarData(av.data)}?`)) return;
    await avaliacoesService.remover(av.id);
    setAvaliacoes((prev) => prev.filter((a) => a.id !== av.id));
  }

  function onSaved(salvo) {
    setAvaliacoes((prev) => {
      const idx = prev.findIndex((a) => a.id === salvo.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = salvo; return n; }
      return [salvo, ...prev];
    });
    setModalForm(null);
  }

  const CONCEITOS = ['Excelente', 'Muito Bom', 'Bom', 'Regular', 'Insuficiente'];

  return (
    <Layout>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Avaliações Físicas (TAF)</h1>
        <button onClick={() => setModalForm('nova')} className={styles.btnNew}>
          + Nova avaliação
        </button>
      </div>

      <div className={styles.filterBar}>
        <input
          type="text"
          placeholder="Buscar por nome ou RA…"
          className={styles.searchInput}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          className={styles.select}
          value={filtroCanceito}
          onChange={(e) => setFiltroCanceito(e.target.value)}
        >
          <option value="">Todos os conceitos</option>
          {CONCEITOS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className={styles.tableWrap}>
        {carregando ? (
          <div className={styles.tableEmpty}>Carregando…</div>
        ) : filtradas.length === 0 ? (
          <div className={styles.tableEmpty}>
            {avaliacoes.length === 0 ? 'Nenhuma avaliação registrada.' : 'Nenhuma avaliação encontrada para o filtro.'}
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Soldado</th>
                <th>Data</th>
                <th className={styles.centered}>Corrida (m)</th>
                <th className={styles.centered}>Flexão</th>
                <th className={styles.centered}>Abdominal</th>
                <th className={styles.centered}>Barra</th>
                <th className={styles.centered}>Nota</th>
                <th>Conceito</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((av) => (
                <tr key={av.id}>
                  <td>
                    <p className={styles.soldadoName}>{av.nome}</p>
                    <p className={styles.soldadoRa}>{raExibicao(av.ra)}</p>
                  </td>
                  <td>{formatarData(av.data)}</td>
                  <td className={styles.centered}>{av.corrida}</td>
                  <td className={styles.centered}>{av.flexao}</td>
                  <td className={styles.centered}>{av.abdominal}</td>
                  <td className={styles.centered}>{av.barra_resultado ?? '—'}</td>
                  <td className={`${styles.centered} ${styles.boldValue}`}>{av.nota_final}</td>
                  <td><BadgeConceito conceito={av.conceito} /></td>
                  <td>
                    <div className={styles.actions}>
                      <button onClick={() => abrirEvolucao(av)} className={`${styles.actionBtn} ${styles['actionBtn--blue']}`}>Evolução</button>
                      <button onClick={() => setModalForm(av)} className={`${styles.actionBtn} ${styles['actionBtn--green']}`}>Editar</button>
                      <button onClick={() => excluir(av)} className={`${styles.actionBtn} ${styles['actionBtn--red']}`}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalForm && (
        <AvaliacaoFormModal
          key={modalForm === 'nova' ? 'nova' : modalForm.id}
          avaliacao={modalForm === 'nova' ? null : modalForm}
          soldados={soldados}
          onClose={() => setModalForm(null)}
          onSaved={onSaved}
        />
      )}

      {modalEvolucao && (
        <EvolucaoModal
          soldado={modalEvolucao}
          onClose={() => setModalEvolucao(null)}
        />
      )}
    </Layout>
  );
}
