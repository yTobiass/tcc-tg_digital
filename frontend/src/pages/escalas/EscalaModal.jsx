import { useState, useEffect } from 'react';
import { Modal }          from '../../components/ui/Modal';
import { escalasService } from '../../services/escalasService';
import { gerarPdfEscala } from '../../utils/escalaPDF';
import { formatarData }   from '../../utils/data';
import styles from './EscalaModal.module.scss';

const TIPO_LABEL = { verde: 'Verde', preta: 'Preta', vermelha: 'Vermelha' };
const FUNC_LABEL = { cabo: 'Monitor/Cabo', atirador: 'Atirador' };

// ── Detalhe da escala ─────────────────────────────────────────────────────────

function DetalheEscala({ escala, onFechar, onAtualizar }) {
  const cabo = escala.membros?.find((m) => m.funcao === 'cabo');
  const ats  = escala.membros?.filter((m) => m.funcao === 'atirador') ?? [];
  const [mudandoStatus, setMudandoStatus] = useState(false);

  // Troca manual de membro
  const [todos,      setTodos]      = useState([]);
  const [trocandoId, setTrocandoId] = useState(null); // soldado_id a remover
  const [novoId,     setNovoId]     = useState('');
  const [motivo,     setMotivo]     = useState('');
  const [salvando,   setSalvando]   = useState(false);
  const [erro,       setErro]       = useState(null);

  const editavel = escala.status === 'agendada' || escala.status === 'em_andamento';

  useEffect(() => {
    if (!editavel) return;
    escalasService.sugestao(escala.tipo, escala.data_inicio)
      .then((res) => setTodos(res.todosSoldados ?? []))
      .catch(() => setTodos([])); // data bloqueada etc. → troca indisponível
  }, [escala.tipo, escala.data_inicio, editavel]);

  function abrirTroca(soldadoId) {
    setTrocandoId(soldadoId);
    setNovoId('');
    setMotivo('');
    setErro(null);
  }

  async function confirmarTroca() {
    if (!novoId) { setErro('Selecione o soldado substituto.'); return; }
    setSalvando(true);
    setErro(null);
    try {
      const atualizado = await escalasService.trocarMembro(escala.id, trocandoId, Number(novoId), motivo || null);
      onAtualizar(atualizado);
    } catch (e) {
      const msg = e?.response?.data?.error;
      setErro(typeof msg === 'string' ? msg : 'Erro ao trocar membro.');
    } finally {
      setSalvando(false);
    }
  }

  async function mudarStatus(novoStatus) {
    setMudandoStatus(true);
    try {
      const atualizado = await escalasService.status(escala.id, novoStatus);
      onAtualizar(atualizado);
    } finally {
      setMudandoStatus(false);
    }
  }

  const STATUS_NEXT = {
    agendada:     [{ acao: 'em_andamento', label: 'Iniciar guarda' }],
    em_andamento: [{ acao: 'concluida',    label: 'Concluir'       }],
    concluida:    [],
    cancelada:    [],
  };

  // Membro escalado com botão de troca + formulário inline.
  function MembroRow({ membro, badgeClass, badgeLabel }) {
    const idsNaEscala = new Set((escala.membros ?? []).map((m) => m.soldado_id));
    const grad = membro.funcao; // 'cabo' | 'atirador'
    const opcoes = todos.filter((s) => s.graduacao === grad && !idsNaEscala.has(s.soldado_id));
    const aberto = trocandoId === membro.soldado_id;

    return (
      <div className={styles.pessoalRow} style={{ flexWrap: 'wrap' }}>
        <span className={`${styles.funcaoBadge} ${badgeClass}`}>{badgeLabel}</span>
        <span className={styles.membroNome}>{membro.nome_completo}</span>
        <span className={styles.membroRa}>{membro.ra}</span>
        {membro.motivo_repeticao && (
          <span className={styles.membroRa} title="Motivo da troca">↻ {membro.motivo_repeticao}</span>
        )}
        {editavel && !aberto && (
          <button type="button" onClick={() => abrirTroca(membro.soldado_id)} className={styles.moveBtn}
            style={{ marginLeft: 'auto' }}>
            Trocar
          </button>
        )}
        {aberto && (
          <div style={{ width: '100%', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <select value={novoId} onChange={(e) => setNovoId(e.target.value)} className={styles.membroSelect}>
              <option value="">Selecione o substituto ({grad})…</option>
              {opcoes.map((s) => (
                <option key={s.soldado_id} value={s.soldado_id}>{s.nome_completo} — {s.ra}</option>
              ))}
            </select>
            <input type="text" value={motivo} maxLength={200}
              onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo da troca (opcional)"
              className={styles.input} />
            {erro && <p className={styles.error}>{erro}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" disabled={salvando} onClick={confirmarTroca} className={styles.btnStatus}>
                {salvando ? 'Trocando…' : 'Confirmar troca'}
              </button>
              <button type="button" onClick={() => setTrocandoId(null)} className={styles.moveBtn}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Modal aberto titulo="Detalhes da Escala" onFechar={onFechar} largura="max-w-lg">
      <div className={styles.detailStack}>
        <div className={styles.chipRow}>
          <span className={`${styles.tipoChip} ${styles[`tipoChip--${escala.tipo}`] ?? ''}`}>
            Guarda {TIPO_LABEL[escala.tipo]}
          </span>
          <span className={styles.dateText}>
            {formatarData(escala.data_inicio)}
            {escala.data_inicio !== escala.data_fim && ` – ${formatarData(escala.data_fim)}`}
          </span>
        </div>

        <div className={styles.pessoalBox}>
          <div className={styles.pessoalHeader}>Pessoal escalado</div>
          {cabo && (
            <MembroRow membro={cabo} badgeClass={styles['funcaoBadge--monitor']} badgeLabel="MONITOR" />
          )}
          {ats.map((at, i) => (
            <MembroRow key={i} membro={at} badgeClass={styles['funcaoBadge--atirador']} badgeLabel="ATIRADOR" />
          ))}
          {!cabo && ats.length === 0 && (
            <p className={styles.pessoalEmpty}>Nenhum membro registrado.</p>
          )}
        </div>

        {escala.observacoes && (
          <div className={styles.obsBox}>
            <strong>Obs: </strong>{escala.observacoes}
          </div>
        )}

        <div className={styles.detailActions}>
          <button onClick={() => gerarPdfEscala(escala)} className={styles.btnPdf}>
            ⬇ PDF da Escala
          </button>
          {STATUS_NEXT[escala.status]?.map(({ acao, label }) => (
            <button key={acao} disabled={mudandoStatus} onClick={() => mudarStatus(acao)} className={styles.btnStatus}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ── Criar nova escala ─────────────────────────────────────────────────────────

const TIPOS = ['verde', 'preta', 'vermelha'];

function diaDaSemana(iso) {
  if (!iso) return null;
  return new Date(`${iso}T12:00:00`).getDay(); // 0 = Dom, 6 = Sáb
}

function tiposValidosPorData(iso) {
  const d = diaDaSemana(iso);
  if (d === null) return TIPOS;
  if (d === 0 || d === 6) return ['vermelha'];
  return ['verde', 'preta'];
}

function CriarEscala({ dataInicial, tiposJaUsados = [], onFechar, onCriada }) {
  const hojeISO = new Date().toISOString().slice(0, 10);
  const dataInicialEfetiva = dataInicial ?? hojeISO;

  const [tipo, setTipo] = useState(() => {
    const validos    = tiposValidosPorData(dataInicialEfetiva);
    const disponivel = validos.find((t) => !tiposJaUsados.includes(t));
    if (disponivel) return disponivel;
    return validos.includes('preta') ? 'preta' : validos[0];
  });
  const [dataInicio, setDataInicio] = useState(dataInicialEfetiva);
  const [dataFim,    setDataFim]    = useState(dataInicialEfetiva);
  const [obs,        setObs]        = useState('');
  const [membros,    setMembros]    = useState([]);
  const [todos,      setTodos]      = useState([]);
  const [sugestao,   setSugestao]   = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando,   setSalvando]   = useState(false);
  const [erro,       setErro]       = useState(null);

  useEffect(() => {
    if (!dataInicio) return;
    setCarregando(true);
    setErro(null);
    escalasService.sugestao(tipo, dataInicio)
      .then((res) => {
        setSugestao(res);
        setTodos(res.todosSoldados ?? []);
        const novos = [];
        if (res.cabo) novos.push({ soldado_id: res.cabo.soldado_id, funcao: 'cabo', nome: res.cabo.nome_completo, ra: res.cabo.ra });
        (res.atiradores ?? []).forEach((at) => novos.push({ soldado_id: at.soldado_id, funcao: 'atirador', nome: at.nome_completo, ra: at.ra }));
        setMembros(novos);
      })
      .catch((e) => {
        const msg = e?.response?.data?.error;
        setErro(typeof msg === 'string' ? msg : 'Erro ao buscar sugestão.');
        setMembros([]);
      })
      .finally(() => setCarregando(false));
  }, [tipo, dataInicio]);

  useEffect(() => {
    if (tipo === 'verde' || tipo === 'preta') {
      setDataFim(dataInicio);
    } else if (tipo === 'vermelha') {
      const dt = new Date(`${dataInicio}T12:00:00`);
      dt.setDate(dt.getDate() + 1);
      setDataFim(dt.toISOString().slice(0, 10));
    }
  }, [tipo, dataInicio]);

  const tiposValidos = tiposValidosPorData(dataInicio);

  function mudarDataInicio(novaData) {
    setDataInicio(novaData);
    const validos = tiposValidosPorData(novaData);
    if (!validos.includes(tipo)) setTipo(validos[0]);
  }

  function trocarMembro(idx, novoSoldadoId) {
    const sol = todos.find((s) => s.soldado_id === novoSoldadoId);
    if (!sol) return;
    setMembros((prev) => {
      const n = [...prev];
      n[idx] = { ...n[idx], soldado_id: sol.soldado_id, nome: sol.nome_completo, ra: sol.ra };
      return n;
    });
  }

  function trocarFuncao(idx, novaFuncao) {
    setMembros((prev) => {
      const n        = [...prev];
      const grad     = novaFuncao === 'cabo' ? 'cabo' : 'atirador';
      const usados   = new Set(n.filter((_, j) => j !== idx).map((m) => m.soldado_id));
      const solAtual = todos.find((s) => s.soldado_id === n[idx].soldado_id);
      // Mantém o soldado atual se a graduação já bate; senão pega o primeiro livre
      if (solAtual && solAtual.graduacao === grad) {
        n[idx] = { ...n[idx], funcao: novaFuncao };
      } else {
        const livre = todos.find((s) => s.graduacao === grad && !usados.has(s.soldado_id));
        n[idx] = livre
          ? { soldado_id: livre.soldado_id, funcao: novaFuncao, nome: livre.nome_completo, ra: livre.ra }
          : { ...n[idx], funcao: novaFuncao };
      }
      return n;
    });
  }

  function removerMembro(idx) {
    setMembros((prev) => prev.filter((_, i) => i !== idx));
  }

  function adicionarMembro(funcao) {
    const grad   = funcao === 'cabo' ? 'cabo' : 'atirador';
    const usados = new Set(membros.map((m) => m.soldado_id));
    const livre  = todos.find((s) => s.graduacao === grad && !usados.has(s.soldado_id));
    if (!livre) return;
    setMembros((prev) => [
      ...prev,
      { soldado_id: livre.soldado_id, funcao, nome: livre.nome_completo, ra: livre.ra },
    ]);
  }

  const numAtiradoresAlvo = tipo === 'verde' ? 1 : 3;
  const numCabosAlvo      = tipo === 'verde' ? 0 : 1;

  const cabosCount      = membros.filter((m) => m.funcao === 'cabo').length;
  const atiradoresCount = membros.filter((m) => m.funcao === 'atirador').length;

  const escalaCompleta = cabosCount === numCabosAlvo && atiradoresCount === numAtiradoresAlvo;

  const podeAddAtirador =
    atiradoresCount < numAtiradoresAlvo &&
    todos.some((s) => s.graduacao === 'atirador' && !membros.find((m) => m.soldado_id === s.soldado_id));

  const podeAddCabo =
    numCabosAlvo > 0 && cabosCount < numCabosAlvo &&
    todos.some((s) => s.graduacao === 'cabo' && !membros.find((m) => m.soldado_id === s.soldado_id));

  const TYPE_HINT = {
    verde:    'Tarde (1 atirador — apenas dias úteis)',
    preta:    '24h de um dia para o outro (1 cabo + 3 atiradores)',
    vermelha: 'Fim de semana sábado–domingo (1 cabo + 3 atiradores)',
  };

  async function salvar() {
    setErro(null);
    setSalvando(true);
    try {
      const escala = await escalasService.criar({
        tipo, data_inicio: dataInicio, data_fim: dataFim,
        observacoes: obs || null,
        membros: membros.map((m) => ({ soldado_id: m.soldado_id, funcao: m.funcao })),
      });
      onCriada(escala);
    } catch (e) {
      const msg = e?.response?.data?.error;
      setErro(typeof msg === 'string' ? msg : 'Erro ao criar escala.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal aberto titulo="Nova Escala de Guarda" onFechar={onFechar} largura="max-w-xl">
      <div className={styles.createStack}>
        <div>
          <label className={styles.label}>Tipo de Guarda</label>
          <div className={styles.typeBtns}>
            {TIPOS.map((t) => {
              const habilitado = tiposValidos.includes(t);
              const motivoBloqueio = t === 'vermelha'
                ? 'Guarda vermelha só pode ser escalada em sábados ou domingos.'
                : 'Guarda verde e preta só podem ser escaladas em dias úteis (seg–sex).';
              return (
                <button
                  key={t}
                  type="button"
                  disabled={!habilitado}
                  title={!habilitado ? motivoBloqueio : ''}
                  onClick={() => setTipo(t)}
                  className={`${styles.typeBtn} ${tipo === t ? styles[`typeBtn--${t}-active`] : ''}`}
                >
                  {TIPO_LABEL[t]}
                </button>
              );
            })}
          </div>
          <p className={styles.typeHint}>{TYPE_HINT[tipo]}</p>
        </div>

        <div className={styles.datesGrid}>
          <div>
            <label className={styles.label}>Data de início</label>
            <input type="date" className={styles.input}
              value={dataInicio} onChange={(e) => mudarDataInicio(e.target.value)} />
          </div>
          <div>
            <label className={styles.label}>Data de fim</label>
            <input type="date" className={styles.input}
              value={dataFim} onChange={(e) => setDataFim(e.target.value)}
              disabled={tipo === 'verde'} />
          </div>
        </div>

        {carregando && (
          <p className={styles.loadingCtx}>Buscando sugestão da fila…</p>
        )}

        {sugestao?.bloqueado && (
          <div className={styles.alertBlocked}>⚠ Esta data está bloqueada pelo comandante.</div>
        )}

        {!carregando && (
          <div>
            <label className={styles.membrosLabel}>Pessoal escalado</label>
            <p className={styles.membrosHint}>
              Use o seletor de função pra alternar entre Atirador e Cabo. Soldados já escalados nesta guarda não aparecem nos outros seletores.
            </p>
            <div className={styles.membrosStack}>
              {membros.map((m, i) => {
                const usadosOutros = new Set(membros.filter((_, j) => j !== i).map((x) => x.soldado_id));
                const pool = todos.filter((s) =>
                  (m.funcao === 'cabo' ? s.graduacao === 'cabo' : s.graduacao === 'atirador')
                  && !usadosOutros.has(s.soldado_id)
                );
                return (
                  <div key={i} className={styles.membroRow}>
                    <select
                      className={`${styles.membroFuncaoSelect} ${styles[`membroFuncaoSelect--${m.funcao}`] ?? ''}`}
                      value={m.funcao}
                      onChange={(e) => trocarFuncao(i, e.target.value)}
                    >
                      <option value="atirador">Atirador</option>
                      {numCabosAlvo > 0 && <option value="cabo">Cabo</option>}
                    </select>
                    <select
                      className={styles.membroSelect}
                      value={m.soldado_id}
                      onChange={(e) => trocarMembro(i, Number(e.target.value))}
                    >
                      <option value={m.soldado_id}>{m.nome} — {m.ra}</option>
                      {pool
                        .filter((s) => s.soldado_id !== m.soldado_id)
                        .map((s) => (
                          <option key={s.soldado_id} value={s.soldado_id}>
                            {s.nome_completo} — {s.ra}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removerMembro(i)}
                      className={styles.btnRemove}
                      title="Remover"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>

            <div className={styles.addBtnsRow}>
              {numCabosAlvo > 0 && (
                <button
                  type="button"
                  onClick={() => adicionarMembro('cabo')}
                  disabled={!podeAddCabo}
                  className={styles.btnAddAtirador}
                  title={cabosCount >= numCabosAlvo ? 'Já há 1 cabo escalado.' : (!podeAddCabo ? 'Não há cabos disponíveis.' : '')}
                >
                  + Adicionar cabo
                </button>
              )}
              <button
                type="button"
                onClick={() => adicionarMembro('atirador')}
                disabled={!podeAddAtirador}
                className={styles.btnAddAtirador}
                title={
                  atiradoresCount >= numAtiradoresAlvo
                    ? `Limite de ${numAtiradoresAlvo} atiradores atingido.`
                    : (!podeAddAtirador ? 'Não há mais atiradores disponíveis.' : '')
                }
              >
                + Adicionar atirador
              </button>
            </div>

            <p className={`${styles.contagem} ${escalaCompleta ? styles['contagem--ok'] : styles['contagem--falta']}`}>
              {numCabosAlvo > 0 && `${cabosCount}/${numCabosAlvo} cabo · `}
              {atiradoresCount}/{numAtiradoresAlvo} atiradores
              {escalaCompleta ? ' ✓' : ''}
            </p>
          </div>
        )}

        <div>
          <label className={styles.label}>Observações (opcional)</label>
          <textarea rows={2} maxLength={500} className={styles.textarea}
            value={obs} onChange={(e) => setObs(e.target.value)}
            placeholder="Punições, trocas, justificativas…" />
        </div>

        {erro && <p className={styles.error}>{erro}</p>}

        <div className={styles.createFooter}>
          <button type="button" onClick={onFechar} className={styles.cancelBtn}>Cancelar</button>
          <button
            type="button"
            disabled={salvando || carregando || !escalaCompleta}
            onClick={salvar}
            className={styles.confirmBtn}
            title={!escalaCompleta ? `É necessário ${numCabosAlvo > 0 ? '1 cabo + ' : ''}${numAtiradoresAlvo} atiradores.` : ''}
          >
            {salvando ? 'Salvando…' : 'Confirmar Escala'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function EscalaModal({ escala, dataInicial, tiposJaUsados, onFechar, onSalvo }) {
  function handleAtualizar(atualizado) {
    onSalvo(atualizado);
    onFechar();
  }

  if (escala) {
    return <DetalheEscala escala={escala} onFechar={onFechar} onAtualizar={handleAtualizar} />;
  }

  return (
    <CriarEscala
      dataInicial={dataInicial}
      tiposJaUsados={tiposJaUsados}
      onFechar={onFechar}
      onCriada={(nova) => { onSalvo(nova); onFechar(); }}
    />
  );
}
