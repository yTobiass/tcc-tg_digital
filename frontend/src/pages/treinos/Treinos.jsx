import { useCallback, useEffect, useRef, useState } from 'react';
import { Layout } from '../../components/layout/Layout';
import { InfoTooltip } from '../../components/ui/Tooltip';
import { treinosService } from '../../services/treinosService';
import { hoje, formatarData } from '../../utils/data';
import styles from './Treinos.module.scss';

function linhaVazia(d) {
  return {
    soldado_id: d.soldado_id,
    ra: d.ra,
    nome_completo: d.nome_completo,
    pelotao: d.pelotao || '—',
    presente: d.registro_id != null ? Boolean(d.presente) : false,
    resultado: d.resultado != null ? String(d.resultado) : '',
    observacao: d.observacao || '',
  };
}

function Tabs({ aba, onChange }) {
  return (
    <div className={styles.tabs}>
      <button
        className={aba === 'registrar' ? styles['tab--active'] : styles.tab}
        onClick={() => onChange('registrar')}
      >
        Registrar presença
      </button>
      <button
        className={aba === 'historico' ? styles['tab--active'] : styles.tab}
        onClick={() => onChange('historico')}
      >
        Histórico
      </button>
    </div>
  );
}

function TabelaRegistro({ linhas, visiveis, tipoUnidade, onChange }) {
  const todosVisiveisPresentes = visiveis.length > 0 && visiveis.every((l) => l.presente);
  const filtrando = visiveis.length !== linhas.length;

  function toggleTodos() {
    const novoValor = !todosVisiveisPresentes;
    const idsVisiveis = new Set(visiveis.map((l) => l.soldado_id));
    onChange(linhas.map((l) =>
      idsVisiveis.has(l.soldado_id)
        ? { ...l, presente: novoValor, resultado: novoValor ? l.resultado : '' }
        : l
    ));
  }

  function setLinha(soldadoId, campo, valor) {
    onChange(linhas.map((l) => l.soldado_id === soldadoId ? { ...l, [campo]: valor } : l));
  }

  function togglePresente(soldadoId, checked) {
    onChange(linhas.map((l) =>
      l.soldado_id === soldadoId
        ? { ...l, presente: checked, resultado: checked ? l.resultado : '' }
        : l
    ));
  }

  const presentes = linhas.filter((l) => l.presente).length;

  return (
    <div>
      <div className={styles.batchBar}>
        <button type="button" onClick={toggleTodos} className={styles.toggleAllBtn}>
          {todosVisiveisPresentes
            ? (filtrando ? 'Desmarcar visíveis' : 'Desmarcar todos')
            : (filtrando ? 'Marcar visíveis presentes' : 'Marcar todos presentes')}
        </button>
        <span className={styles.batchCount}>
          {presentes} de {linhas.length} presente{presentes !== 1 ? 's' : ''}
          {filtrando && ` · ${visiveis.length} exibido${visiveis.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkCell}>Pres.</th>
              <th>Nome</th>
              <th className={styles.hideSm}>RA</th>
              <th className={styles.hideMd}>Pelotão</th>
              <th>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  Resultado {tipoUnidade && <span style={{ fontWeight: 400, color: 'var(--clr-gray-400)', textTransform: 'none' }}>({tipoUnidade})</span>}
                  <InfoTooltip text="Opcional — preencha apenas se o resultado foi medido." position="top" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((l) => (
              <tr key={l.soldado_id}
                style={!l.presente ? { background: 'rgba(249,250,251,0.8)' } : undefined}>
                <td className={styles.checkCell}>
                  <input
                    type="checkbox"
                    checked={l.presente}
                    onChange={(e) => togglePresente(l.soldado_id, e.target.checked)}
                    className={styles.checkbox}
                  />
                </td>
                <td style={!l.presente ? { color: 'var(--clr-gray-400)' } : undefined}>
                  {l.nome_completo}
                </td>
                <td className={`${styles.raCell} ${styles.hideSm}`}>{l.ra}</td>
                <td className={`${styles.muteCell} ${styles.hideMd}`}>{l.pelotao}</td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={l.resultado}
                    disabled={!l.presente}
                    onChange={(e) => setLinha(l.soldado_id, 'resultado', e.target.value)}
                    placeholder={l.presente ? '—' : ''}
                    className={styles.resultInput}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {linhas.length === 0 && (
          <p className={styles.tableEmpty}>Nenhum soldado ativo encontrado.</p>
        )}
        {linhas.length > 0 && visiveis.length === 0 && (
          <p className={styles.tableEmpty}>Nenhum soldado corresponde aos filtros.</p>
        )}
      </div>
    </div>
  );
}

export default function Treinos() {
  const [aba, setAba] = useState('registrar');

  const [tipos, setTipos] = useState([]);

  const [data,         setData]         = useState(hoje());
  const [tipoId,       setTipoId]       = useState('');
  const [linhas,       setLinhas]       = useState([]);
  const [estadoSessao, setEstadoSessao] = useState('idle');
  const [mensagem,     setMensagem]     = useState(null);
  const msgTimer = useRef(null);

  const [filtroPelotao, setFiltroPelotao] = useState('');
  const [busca,         setBusca]         = useState('');

  const [sessoes,        setSessoes]        = useState([]);
  const [filtroHist,     setFiltroHist]     = useState({ tipo_treino_id: '', data_inicio: '', data_fim: '' });
  const [carregandoHist, setCarregandoHist] = useState(false);

  useEffect(() => {
    treinosService.listarTipos().then((lista) => {
      setTipos(lista);
      if (lista.length > 0) setTipoId(String(lista[0].id));
    });
  }, []);

  const carregarSessao = useCallback(async (d, t) => {
    if (!d || !t) return;
    setEstadoSessao('carregando');
    setMensagem(null);
    try {
      const dados = await treinosService.buscarSessao(d, t);
      setLinhas(dados.map(linhaVazia));
      setEstadoSessao('pronto');
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.response?.data?.error || 'Erro ao carregar sessão.' });
      setEstadoSessao('idle');
    }
  }, []);

  useEffect(() => {
    if (tipoId) carregarSessao(data, tipoId);
  }, [data, tipoId, carregarSessao]);

  function mostrarMensagem(tipo, texto) {
    clearTimeout(msgTimer.current);
    setMensagem({ tipo, texto });
    msgTimer.current = setTimeout(() => setMensagem(null), 4000);
  }

  async function handleSalvar() {
    if (!tipoId || linhas.length === 0) return;
    setEstadoSessao('salvando');
    try {
      const payload = {
        data,
        tipo_treino_id: Number(tipoId),
        registros: linhas.map((l) => ({
          soldado_id: l.soldado_id,
          presente: l.presente,
          resultado: l.presente && l.resultado !== '' ? Number(l.resultado) : null,
          observacao: null,
        })),
      };
      const { salvos } = await treinosService.salvarLote(payload);
      mostrarMensagem('sucesso', `${salvos} registro${salvos !== 1 ? 's' : ''} salvo${salvos !== 1 ? 's' : ''} com sucesso.`);
      setEstadoSessao('pronto');
    } catch (err) {
      mostrarMensagem('erro', err.response?.data?.error || 'Erro ao salvar.');
      setEstadoSessao('pronto');
    }
  }

  const carregarHistorico = useCallback(async (params) => {
    setCarregandoHist(true);
    try {
      const data = await treinosService.listarSessoes(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''))
      );
      setSessoes(data);
    } finally {
      setCarregandoHist(false);
    }
  }, []);

  useEffect(() => {
    if (aba === 'historico') carregarHistorico(filtroHist);
  }, [aba, filtroHist, carregarHistorico]);

  function abrirSessao(sessao) {
    setData(sessao.data);
    setTipoId(String(sessao.tipo_treino_id));
    setAba('registrar');
  }

  const tipoAtual = tipos.find((t) => String(t.id) === String(tipoId));
  const salvando  = estadoSessao === 'salvando';

  const pelotoes = [...new Set(linhas.map((l) => l.pelotao).filter((p) => p && p !== '—'))].sort();

  const termoBusca = busca.trim().toLowerCase();
  const linhasVisiveis = linhas.filter((l) =>
    (filtroPelotao === '' || l.pelotao === filtroPelotao) &&
    (termoBusca === '' ||
      l.nome_completo.toLowerCase().includes(termoBusca) ||
      String(l.ra).toLowerCase().includes(termoBusca))
  );

  return (
    <Layout>
      <h1 className={styles.pageTitle}>Treinos e Presenças</h1>

      <Tabs aba={aba} onChange={setAba} />

      {aba === 'registrar' && (
        <div>
          <div className={styles.sessionBar}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Data</label>
              <input
                type="date"
                value={data}
                max={hoje()}
                onChange={(e) => setData(e.target.value)}
                className={styles.dateInput}
              />
            </div>
            <div className={styles.fieldGroup} style={{ flex: 1 }}>
              <label className={styles.fieldLabel}>Tipo de atividade</label>
              <select
                value={tipoId}
                onChange={(e) => setTipoId(e.target.value)}
                className={styles.typeSelect}
              >
                <option value="">Selecione...</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {estadoSessao === 'pronto' && (
            <p className={styles.hint}>
              Todos os soldados ativos são carregados automaticamente. Use{' '}
              <strong>Marcar todos presentes</strong> para agilizar.
            </p>
          )}

          {mensagem && estadoSessao !== 'pronto' && estadoSessao !== 'salvando' && (
            <div className={`${styles.feedback} ${styles[`feedback--${mensagem.tipo === 'sucesso' ? 'success' : 'error'}`]}`}>
              {mensagem.texto}
            </div>
          )}

          {estadoSessao === 'carregando' && (
            <p className={styles.loading}>Carregando soldados...</p>
          )}

          {(estadoSessao === 'pronto' || estadoSessao === 'salvando') && tipoId && (
            <>
              <div className={styles.filterBar}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Pelotão</label>
                  <select
                    value={filtroPelotao}
                    onChange={(e) => setFiltroPelotao(e.target.value)}
                    className={styles.filterSelect}
                  >
                    <option value="">Todos</option>
                    {pelotoes.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className={styles.fieldGroup} style={{ flex: 1 }}>
                  <label className={styles.fieldLabel}>Buscar por nome ou RA</label>
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Digite o nome do soldado..."
                    className={styles.searchInput}
                  />
                </div>
                {(filtroPelotao || busca) && (
                  <button
                    type="button"
                    onClick={() => { setFiltroPelotao(''); setBusca(''); }}
                    className={styles.clearBtn}
                  >
                    Limpar
                  </button>
                )}
              </div>

              <TabelaRegistro
                linhas={linhas}
                visiveis={linhasVisiveis}
                tipoUnidade={tipoAtual?.unidade}
                onChange={setLinhas}
              />
              <div className={styles.saveFooter}>
                {mensagem && (
                  <span className={`${styles.footerMsg} ${styles[`footerMsg--${mensagem.tipo === 'sucesso' ? 'success' : 'error'}`]}`}>
                    {mensagem.texto}
                  </span>
                )}
                <button
                  onClick={handleSalvar}
                  disabled={salvando || linhas.length === 0}
                  className={styles.saveBtn}
                >
                  {salvando ? 'Salvando...' : 'Salvar sessão'}
                </button>
              </div>
            </>
          )}

          {estadoSessao === 'idle' && !tipoId && (
            <p className={styles.loading}>Selecione uma atividade para começar.</p>
          )}
        </div>
      )}

      {aba === 'historico' && (
        <div>
          <div className={styles.sessionBar}>
            <div className={styles.fieldGroup} style={{ flex: 1, minWidth: 160 }}>
              <label className={styles.fieldLabel}>Atividade</label>
              <select
                value={filtroHist.tipo_treino_id}
                onChange={(e) => setFiltroHist((f) => ({ ...f, tipo_treino_id: e.target.value }))}
                className={styles.typeSelect}
              >
                <option value="">Todas</option>
                {tipos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>De</label>
              <input
                type="date"
                value={filtroHist.data_inicio}
                onChange={(e) => setFiltroHist((f) => ({ ...f, data_inicio: e.target.value }))}
                className={styles.dateInput}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Até</label>
              <input
                type="date"
                value={filtroHist.data_fim}
                onChange={(e) => setFiltroHist((f) => ({ ...f, data_fim: e.target.value }))}
                className={styles.dateInput}
              />
            </div>
          </div>

          <div className={styles.tableWrap}>
            {carregandoHist ? (
              <p className={styles.tableEmpty}>Carregando...</p>
            ) : sessoes.length === 0 ? (
              <p className={styles.tableEmpty}>Nenhuma sessão registrada.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Atividade</th>
                    <th style={{ textAlign: 'center' }}>Presença</th>
                    <th style={{ textAlign: 'center' }}>Taxa</th>
                    <th style={{ textAlign: 'right' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {sessoes.map((s) => {
                    const taxa = s.total > 0 ? Math.round((s.presentes / s.total) * 100) : 0;
                    const taxaKey = taxa >= 80 ? 'high' : taxa >= 50 ? 'medium' : 'low';
                    return (
                      <tr key={`${s.data}-${s.tipo_treino_id}`}>
                        <td>{formatarData(s.data)}</td>
                        <td className={styles.muteCell}>{s.tipo_nome}</td>
                        <td style={{ textAlign: 'center' }} className={styles.muteCell}>
                          {s.presentes}/{s.total}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`${styles.historyBadge} ${styles[`historyBadge--${taxaKey}`]}`}>
                            {taxa}%
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => abrirSessao(s)} className={styles.openBtn}>
                            Abrir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
