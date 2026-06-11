import { useState, useEffect, useCallback } from 'react';
import { Layout }         from '../../components/layout/Layout';
import { escalasService } from '../../services/escalasService';
import { formatarData }   from '../../utils/data';
import { useAuth }        from '../../hooks/useAuth';
import EscalaModal        from './EscalaModal';
import styles from './Escalas.module.scss';

const TIPO_LABEL = { verde: 'Verde', preta: 'Preta', vermelha: 'Vermelha' };

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const MESES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function dataISO(ano, mes, dia) {
  return `${ano}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
}
function diasNoMes(ano, mes) { return new Date(ano, mes, 0).getDate(); }
function primeiroDiaDaSemana(ano, mes) { return new Date(ano, mes - 1, 1).getDay(); }
function hoje() { return new Date().toISOString().slice(0, 10); }

// ── Calendário ────────────────────────────────────────────────────────────────

function Calendario({ ano, mes, escalas, bloqueios, onDayClick, onNovaEscala }) {
  const total     = diasNoMes(ano, mes);
  const diaInicio = primeiroDiaDaSemana(ano, mes);
  const hojeISO   = hoje();

  const cells = [];
  for (let i = 0; i < diaInicio; i++) cells.push(null);
  for (let d = 1; d <= total; d++) {
    const iso = dataISO(ano, mes, d);
    // Toda escala aparece APENAS no dia de início (data_inicio), para os três
    // tipos — nunca no dia de fim. Preta (vira a noite) e vermelha (sáb→dom)
    // ficam só no data_inicio. A validação de conflito no backend continua
    // usando data_inicio + data_fim; só a exibição muda.
    const escalasNoDia = escalas.filter((e) => e.data_inicio === iso);
    const bloqueado    = bloqueios.some((b) => b.data_inicio <= iso && b.data_fim >= iso);
    cells.push({ dia: d, iso, escalasNoDia, bloqueado });
  }

  return (
    <div>
      <div className={styles.calHeader}>
        {DIAS_SEMANA.map((d) => <div key={d} className={styles.dayLabel}>{d}</div>)}
      </div>

      <div className={styles.calGrid}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={`vazio-${i}`} />;
          const { dia, iso, escalasNoDia, bloqueado } = cell;
          const isHoje = iso === hojeISO;

          const tiposNoDia = escalasNoDia.map((e) => e.tipo);
          return (
            <div
              key={iso}
              onClick={() => { if (!bloqueado) onNovaEscala(iso, tiposNoDia); }}
              className={`${styles.calCell} ${isHoje ? styles['calCell--today'] : ''} ${bloqueado ? styles['calCell--blocked'] : ''}`}
            >
              <div className={`${styles.calDayNum} ${isHoje ? styles['calDayNum--today'] : ''}`}>
                {dia}
              </div>

              {bloqueado && <div className={styles.calBlockedTag}>Bloqueado</div>}

              {escalasNoDia.slice(0, 2).map((e) => (
                <div
                  key={e.id}
                  onClick={(ev) => { ev.stopPropagation(); onDayClick(e); }}
                  className={`${styles.calEscalaTag} ${styles[`calEscalaTag--${e.tipo}`] ?? ''}`}
                >
                  <span className={styles.calTagLabel}>{TIPO_LABEL[e.tipo]}</span>
                  <span className={styles.calTagDot}>●</span>
                </div>
              ))}
              {escalasNoDia.length > 2 && (
                <div className={styles.calMore}>+{escalasNoDia.length - 2}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Fila de Rotação ───────────────────────────────────────────────────────────

const FILA_LABEL = { cabos: 'Fila de Cabos', atiradores: 'Fila de Atiradores' };

function FilaView() {
  const [tipo,       setTipo]       = useState('cabos');
  const [fila,       setFila]       = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [punindo,    setPunindo]    = useState(null);

  const carregar = useCallback(async (t) => {
    setCarregando(true);
    try { setFila(await escalasService.fila(t)); }
    finally { setCarregando(false); }
  }, []);

  useEffect(() => { carregar(tipo); }, [tipo, carregar]);

  async function mover(soldadoId, acao) {
    await escalasService.reordenar(tipo, soldadoId, acao);
    setPunindo(null);
    carregar(tipo);
  }

  async function inicializar() {
    setCarregando(true);
    try { await escalasService.inicializarFila(); }
    finally { carregar(tipo); }
  }

  return (
    <div>
      <p className={styles.filaHint}>
        Filas compartilhadas: <strong>cabos</strong> (guardas preta/vermelha) e{' '}
        <strong>atiradores</strong> (preta, vermelha e verde). Posição 1 = próximo a ser escalado. ·{' '}
        <strong>Punir (início)</strong>: escalona na próxima guarda. ·{' '}
        <strong>Adiar (fim)</strong>: move para o final da fila.
      </p>

      <div className={styles.typeBtns}>
        {['cabos', 'atiradores'].map((t) => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={`${styles.typeBtn} ${tipo === t ? styles[`typeBtn--${t}`] : ''}`}
          >
            {FILA_LABEL[t]}
          </button>
        ))}
      </div>

      {carregando ? (
        <div className={styles.filaLoading}>Carregando…</div>
      ) : fila.length === 0 ? (
        <div className={styles.filaEmpty}>
          Fila não inicializada.{' '}
          <button onClick={inicializar} className={styles.moveBtn}>Inicializar fila</button>
        </div>
      ) : (
        <div className={styles.filaTable}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 48 }}>Pos.</th>
                <th>Soldado</th>
                <th>Graduação</th>
                <th>Situação</th>
                <th>Última guarda</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {fila.map((row) => (
                <tr key={row.soldado_id}>
                  <td><span className={styles.posBubble}>{row.posicao}</span></td>
                  <td>
                    <p className={styles.soldadoName}>{row.nome_completo}</p>
                    <p className={styles.soldadoRa}>{row.ra}</p>
                  </td>
                  <td>
                    <span className={`${styles.gradBadge} ${styles[`gradBadge--${row.graduacao}`] ?? ''}`}>
                      {row.graduacao === 'cabo' ? 'Cabo' : 'Atirador'}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.statusText} ${styles[`statusText--${row.status}`] ?? ''}`}>
                      {row.status}
                    </span>
                  </td>
                  <td>{row.ultima_data ? formatarData(row.ultima_data) : '—'}</td>
                  <td>
                    {punindo === row.soldado_id ? (
                      <div className={styles.moveActions}>
                        <button
                          onClick={() => mover(row.soldado_id, 'inicio')}
                          className={`${styles.moveBtn} ${styles.punirBtn}`}
                        >
                          Punir (início)
                        </button>
                        <span className={styles.sepText}>|</span>
                        <button
                          onClick={() => mover(row.soldado_id, 'fim')}
                          className={`${styles.moveBtn} ${styles.adiarBtn}`}
                        >
                          Adiar (fim)
                        </button>
                        <span className={styles.sepText}>|</span>
                        <button onClick={() => setPunindo(null)} className={styles.moveBtn}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setPunindo(row.soldado_id)}
                        className={styles.moveBtn}
                        title="Mover na fila"
                      >
                        Mover
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Bloqueios ─────────────────────────────────────────────────────────────────

function BloqueiosView() {
  const [bloqueios,  setBloqueios]  = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [form,       setForm]       = useState({ data_inicio: '', data_fim: '', motivo: '' });
  const [salvando,   setSalvando]   = useState(false);
  const [erro,       setErro]       = useState(null);

  const carregar = async () => {
    setCarregando(true);
    try { setBloqueios(await escalasService.bloqueios()); }
    finally { setCarregando(false); }
  };

  useEffect(() => { carregar(); }, []);

  async function adicionar(e) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      await escalasService.criarBloqueio(form);
      setForm({ data_inicio: '', data_fim: '', motivo: '' });
      carregar();
    } catch (err) {
      setErro(err?.response?.data?.error ?? 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id) {
    if (!window.confirm('Remover este bloqueio?')) return;
    await escalasService.removerBloqueio(id);
    carregar();
  }

  return (
    <div className={styles.bloqueiosStack}>
      <div className={styles.bloqueioCard}>
        <h3 className={styles.bloqueioTitle}>Novo Período Bloqueado</h3>
        <p className={styles.bloqueioDesc}>
          Recessos e feriados cadastrados aqui ficam marcados no calendário e impedem a criação de escalas.
        </p>
        <form onSubmit={adicionar} className={styles.bloqueioForm}>
          <div className={styles.bloqueioGrid}>
            <div>
              <label className={styles.bloqueioLabel}>Data de início</label>
              <input type="date" required className={styles.bloqueioInput}
                value={form.data_inicio} onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))} />
            </div>
            <div>
              <label className={styles.bloqueioLabel}>Data de fim</label>
              <input type="date" required className={styles.bloqueioInput}
                value={form.data_fim} onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className={styles.bloqueioLabel}>Motivo</label>
            <input type="text" maxLength={200} placeholder="Recesso, feriado, exercício de campo…"
              className={styles.bloqueioInput} value={form.motivo}
              onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))} />
          </div>
          {erro && <p className={styles.bloqueioError}>{erro}</p>}
          <div className={styles.bloqueioFooter}>
            <button type="submit" disabled={salvando} className={styles.bloqueioBtn}>
              {salvando ? 'Salvando…' : '+ Adicionar bloqueio'}
            </button>
          </div>
        </form>
      </div>

      <div className={styles.tableWrap}>
        {carregando ? (
          <div className={styles.filaLoading}>Carregando…</div>
        ) : bloqueios.length === 0 ? (
          <div className={styles.filaEmpty}>Nenhum período bloqueado.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Início</th>
                <th>Fim</th>
                <th>Motivo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bloqueios.map((b) => (
                <tr key={b.id}>
                  <td>{formatarData(b.data_inicio)}</td>
                  <td>{formatarData(b.data_fim)}</td>
                  <td>{b.motivo || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => remover(b.id)} className={styles.removeBtn}>Remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Escalas() {
  const { usuario }  = useAuth();
  const isComandante = usuario?.role === 'comandante';
  const isStaff      = usuario?.role === 'comandante' || usuario?.role === 'sargento';

  const agora = new Date();
  const [ano,        setAno]        = useState(agora.getFullYear());
  const [mes,        setMes]        = useState(agora.getMonth() + 1);
  const [aba,        setAba]        = useState('calendario');
  const [dadosCal,   setDadosCal]   = useState({ escalas: [], bloqueios: [] });
  const [carregando, setCarregando] = useState(true);
  const [modal,      setModal]      = useState(null);

  // Geração automática de escalas
  const [temFuturas, setTemFuturas] = useState(false);
  const [gerando,    setGerando]    = useState(false);
  const [resultado,  setResultado]  = useState(null); // string de resumo
  const [erroGerar,  setErroGerar]  = useState(null);

  const carregarCalendario = useCallback(async (a, m) => {
    setCarregando(true);
    try { setDadosCal(await escalasService.calendario(a, m)); }
    finally { setCarregando(false); }
  }, []);

  // Há escalas agendadas a partir de hoje? Define se o botão é "Gerar" ou "Regenerar".
  const verificarFuturas = useCallback(async () => {
    try {
      const lista = await escalasService.listar({ status: 'agendada' });
      const hojeISO = hoje();
      setTemFuturas(lista.some((e) => e.data_inicio >= hojeISO));
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    if (aba === 'calendario') carregarCalendario(ano, mes);
  }, [aba, ano, mes, carregarCalendario]);

  useEffect(() => { if (isStaff) verificarFuturas(); }, [isStaff, verificarFuturas]);

  async function gerar(regenerar) {
    if (regenerar && !window.confirm(
      'Isso cancelará todas as escalas futuras agendadas e regerará do zero. Confirmar?'
    )) return;
    setGerando(true);
    setErroGerar(null);
    setResultado(null);
    try {
      const r = regenerar ? await escalasService.regenerarAno() : await escalasService.gerarAno();
      setResultado(
        `${r.geradas} escalas geradas: ${r.verdes} verdes, ${r.pretas} pretas, ${r.vermelhas} vermelhas` +
        (r.dias_pulados ? ` · ${r.dias_pulados} slots pulados (sem efetivo disponível)` : '')
      );
      await Promise.all([carregarCalendario(ano, mes), verificarFuturas()]);
    } catch (e) {
      setErroGerar(e?.response?.data?.error || 'Erro ao gerar escalas.');
    } finally {
      setGerando(false);
    }
  }

  function navMes(delta) {
    let novoMes = mes + delta;
    let novoAno = ano;
    if (novoMes < 1)  { novoMes = 12; novoAno--; }
    if (novoMes > 12) { novoMes = 1;  novoAno++; }
    setMes(novoMes);
    setAno(novoAno);
  }

  function handleSalvo(escala) {
    setDadosCal((prev) => {
      const sem = prev.escalas.filter((e) => e.id !== escala.id);
      return { ...prev, escalas: [...sem, escala] };
    });
  }

  // Soldado vê somente o calendário; staff vê fila; só comandante vê bloqueios.
  const ABAS = [
    { key: 'calendario', label: 'Calendário' },
    ...(isStaff ? [{ key: 'fila', label: 'Fila de Rotação' }] : []),
    ...(isComandante ? [{ key: 'bloqueios', label: 'Períodos Bloqueados' }] : []),
  ];

  return (
    <Layout>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Escalas de Guarda</h1>
        {isStaff && (
          <button
            onClick={() => gerar(temFuturas)}
            disabled={gerando}
            className={styles.btnNew}
          >
            {gerando
              ? 'Gerando…'
              : temFuturas ? '↻ Regenerar Escalas' : '⚡ Gerar Escalas do Ano'}
          </button>
        )}
      </div>

      {gerando && (
        <div className={styles.genInfo}>
          Gerando escalas… Isso pode levar alguns segundos.
        </div>
      )}
      {resultado && !gerando && (
        <div className={styles.genOk} onClick={() => setResultado(null)}>
          ✓ {resultado}
        </div>
      )}
      {erroGerar && !gerando && (
        <div className={styles.genErr} onClick={() => setErroGerar(null)}>
          {erroGerar}
        </div>
      )}

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

      {aba === 'calendario' && (
        <div>
          <div className={styles.calNav}>
            <button onClick={() => navMes(-1)} className={styles.calNavBtn}>← Anterior</button>
            <h2 className={styles.calMonth}>{MESES_PT[mes - 1]} {ano}</h2>
            <button onClick={() => navMes(1)} className={styles.calNavBtn}>Próximo →</button>
          </div>

          <div className={styles.legend}>
            {['verde', 'preta', 'vermelha'].map((tipo) => (
              <div key={tipo} className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles[`legendDot--${tipo}`]}`} />
                <span>{TIPO_LABEL[tipo]}</span>
              </div>
            ))}
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles['legendDot--blocked']}`} />
              <span>Bloqueado</span>
            </div>
          </div>
          <p className={styles.calHint}>
            As escalas são geradas automaticamente pelo botão acima · Clique em uma escala para ver detalhes{isStaff ? ' e trocar membros' : ''}
          </p>

          {carregando ? (
            <div className={styles.calLoading}>Carregando…</div>
          ) : (
            <div className={styles.calCard}>
              <Calendario
                ano={ano}
                mes={mes}
                escalas={dadosCal.escalas}
                bloqueios={dadosCal.bloqueios}
                onDayClick={(escala) => {
                  escalasService.buscar(escala.id).then((e) => setModal({ escala: e }));
                }}
                onNovaEscala={() => { /* criação manual substituída pela geração automática */ }}
              />
            </div>
          )}
        </div>
      )}

      {aba === 'fila' && <FilaView />}

      {aba === 'bloqueios' && isComandante && <BloqueiosView />}

      {modal && (
        <EscalaModal
          escala={modal.escala ?? null}
          dataInicial={modal.dataInicial ?? null}
          tiposJaUsados={modal.tiposJaUsados ?? []}
          podeEditar={isStaff}
          onFechar={() => setModal(null)}
          onSalvo={(escala) => { handleSalvo(escala); setModal(null); }}
        />
      )}
    </Layout>
  );
}
