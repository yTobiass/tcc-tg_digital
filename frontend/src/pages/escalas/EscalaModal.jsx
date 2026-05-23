import { useState, useEffect } from 'react';
import { Modal }          from '../../components/ui/Modal';
import { escalasService } from '../../services/escalasService';
import { gerarPdfEscala } from '../../utils/escalaPDF';
import { formatarData }   from '../../utils/data';

const TIPO_COR = {
  verde:    { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-300' },
  preta:    { bg: 'bg-gray-200',   text: 'text-gray-800',   border: 'border-gray-400'  },
  vermelha: { bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-red-300'   },
};
const TIPO_LABEL = { verde: 'Verde', preta: 'Preta', vermelha: 'Vermelha' };
const FUNC_LABEL = { cabo: 'Monitor/Cabo', atirador: 'Atirador' };

// ── Modo: detalhe de escala existente ────────────────────────────────────────

function DetalheEscala({ escala, onFechar, onAtualizar }) {
  const cor = TIPO_COR[escala.tipo] ?? TIPO_COR.verde;
  const cabo = escala.membros?.find((m) => m.funcao === 'cabo');
  const ats  = escala.membros?.filter((m) => m.funcao === 'atirador') ?? [];

  const [mudandoStatus, setMudandoStatus] = useState(false);

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

  return (
    <Modal aberto titulo="Detalhes da Escala" onFechar={onFechar} largura="max-w-lg">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${cor.bg} ${cor.text}`}>
            Guarda {TIPO_LABEL[escala.tipo]}
          </span>
          <span className="text-sm text-gray-500">
            {formatarData(escala.data_inicio)}
            {escala.data_inicio !== escala.data_fim && ` – ${formatarData(escala.data_fim)}`}
          </span>
        </div>

        {/* Pessoal */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Pessoal escalado
          </div>
          <div className="divide-y divide-gray-100">
            {cabo && (
              <div className="px-4 py-2.5 flex gap-3 items-center">
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-medium">MONITOR</span>
                <span className="text-sm font-medium text-gray-800">{cabo.nome_completo}</span>
                <span className="text-xs text-gray-400 ml-auto">{cabo.ra}</span>
              </div>
            )}
            {ats.map((at, i) => (
              <div key={i} className="px-4 py-2.5 flex gap-3 items-center">
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">ATIRADOR</span>
                <span className="text-sm text-gray-700">{at.nome_completo}</span>
                <span className="text-xs text-gray-400 ml-auto">{at.ra}</span>
              </div>
            ))}
            {!cabo && ats.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-400 italic">Nenhum membro registrado.</p>
            )}
          </div>
        </div>

        {escala.observacoes && (
          <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-3">
            <span className="font-medium">Obs: </span>{escala.observacoes}
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => gerarPdfEscala(escala)}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
          >
            ⬇ PDF da Escala
          </button>
          {STATUS_NEXT[escala.status]?.map(({ acao, label }) => (
            <button
              key={acao}
              disabled={mudandoStatus}
              onClick={() => mudarStatus(acao)}
              className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ── Modo: criar nova escala ───────────────────────────────────────────────────

const TIPOS = ['verde', 'preta', 'vermelha'];

function CriarEscala({ dataInicial, onFechar, onCriada }) {
  const hoje = new Date().toISOString().slice(0, 10);

  const [tipo,       setTipo]       = useState('preta');
  const [dataInicio, setDataInicio] = useState(dataInicial ?? hoje);
  const [dataFim,    setDataFim]    = useState(dataInicial ?? hoje);
  const [obs,        setObs]        = useState('');
  const [membros,    setMembros]    = useState([]);
  const [todos,      setTodos]      = useState([]);
  const [sugestao,   setSugestao]   = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando,   setSalvando]   = useState(false);
  const [erro,       setErro]       = useState(null);

  // Quando tipo ou data_inicio mudam, busca sugestão
  useEffect(() => {
    if (!dataInicio) return;
    setCarregando(true);
    setErro(null);
    escalasService.sugestao(tipo, dataInicio)
      .then((res) => {
        setSugestao(res);
        setTodos(res.todosSoldados ?? []);
        // Monta membros sugeridos
        const novos = [];
        if (res.cabo) novos.push({ soldado_id: res.cabo.soldado_id, funcao: 'cabo', nome: res.cabo.nome_completo, ra: res.cabo.ra });
        (res.atiradores ?? []).forEach((at) => novos.push({ soldado_id: at.soldado_id, funcao: 'atirador', nome: at.nome_completo, ra: at.ra }));
        setMembros(novos);
      })
      .catch((e) => {
        const msg = e?.response?.data?.erro;
        setErro(typeof msg === 'string' ? msg : 'Erro ao buscar sugestão.');
        setMembros([]);
      })
      .finally(() => setCarregando(false));
  }, [tipo, dataInicio]);

  // Ao mudar tipo, ajusta dataFim
  useEffect(() => {
    if (tipo === 'verde' || tipo === 'preta') setDataFim(dataInicio);
    else if (tipo === 'vermelha') {
      // Fim = sábado + 1 (domingo)
      const dt = new Date(`${dataInicio}T12:00:00`);
      dt.setDate(dt.getDate() + 1);
      setDataFim(dt.toISOString().slice(0, 10));
    }
  }, [tipo, dataInicio]);

  function trocarMembro(idx, novoSoldadoId) {
    const sol = todos.find((s) => s.soldado_id === novoSoldadoId);
    if (!sol) return;
    setMembros((prev) => {
      const n = [...prev];
      n[idx] = { ...n[idx], soldado_id: sol.soldado_id, nome: sol.nome_completo, ra: sol.ra };
      return n;
    });
  }

  const numAtiradores = tipo === 'verde' ? 1 : 3;
  const temCabo = tipo !== 'verde';

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
      const msg = e?.response?.data?.erro;
      setErro(typeof msg === 'string' ? msg : 'Erro ao criar escala.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal aberto titulo="Nova Escala de Guarda" onFechar={onFechar} largura="max-w-xl">
      <div className="space-y-4">
        {/* Tipo */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de Guarda</label>
          <div className="flex gap-2">
            {TIPOS.map((t) => {
              const cor = TIPO_COR[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg border-2 transition-colors ${
                    tipo === t ? `${cor.bg} ${cor.text} ${cor.border}` : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {TIPO_LABEL[t]}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {tipo === 'verde'    && 'Tarde (1 atirador — apenas dias úteis)'}
            {tipo === 'preta'    && '24h de um dia para o outro (1 cabo + 3 atiradores)'}
            {tipo === 'vermelha' && 'Fim de semana sábado–domingo (1 cabo + 3 atiradores)'}
          </p>
        </div>

        {/* Datas */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Data de início</label>
            <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Data de fim</label>
            <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
              value={dataFim} onChange={(e) => setDataFim(e.target.value)}
              disabled={tipo === 'verde'} />
          </div>
        </div>

        {/* Membros sugeridos */}
        {carregando && (
          <p className="text-xs text-blue-600 animate-pulse py-2">Buscando sugestão da fila…</p>
        )}

        {sugestao?.bloqueado && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 font-medium">
            ⚠ Esta data está bloqueada pelo comandante.
          </div>
        )}

        {membros.length > 0 && !carregando && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Pessoal escalado
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Sugestão automática da fila de rotação. Use os seletores para substituir qualquer membro.
            </p>
            <div className="space-y-2">
              {membros.map((m, i) => {
                const pool = todos.filter((s) => s.funcao === m.funcao || (m.funcao === 'cabo' && s.graduacao === 'cabo') || (m.funcao === 'atirador' && s.graduacao === 'atirador'));
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded font-medium w-20 text-center ${
                      m.funcao === 'cabo' ? 'bg-gray-200 text-gray-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {FUNC_LABEL[m.funcao]}
                    </span>
                    <select
                      className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  </div>
                );
              })}
            </div>

            {/* Indica membros faltantes */}
            {temCabo && !membros.find((m) => m.funcao === 'cabo') && (
              <p className="text-xs text-red-600 mt-1">Nenhum cabo disponível na fila.</p>
            )}
            {membros.filter((m) => m.funcao === 'atirador').length < numAtiradores && (
              <p className="text-xs text-yellow-600 mt-1">
                Apenas {membros.filter((m) => m.funcao === 'atirador').length} de {numAtiradores} atiradores disponíveis.
              </p>
            )}
          </div>
        )}

        {/* Observações */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Observações (opcional)</label>
          <textarea rows={2} maxLength={500}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
            value={obs} onChange={(e) => setObs(e.target.value)}
            placeholder="Punições, trocas, justificativas…" />
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onFechar} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancelar
          </button>
          <button
            type="button"
            disabled={salvando || carregando || membros.length === 0}
            onClick={salvar}
            className="px-5 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {salvando ? 'Salvando…' : 'Confirmar Escala'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function EscalaModal({ escala, dataInicial, onFechar, onSalvo }) {
  function handleAtualizar(atualizado) {
    onSalvo(atualizado);
    onFechar();
  }

  if (escala) {
    return (
      <DetalheEscala
        escala={escala}
        onFechar={onFechar}
        onAtualizar={handleAtualizar}
      />
    );
  }

  return (
    <CriarEscala
      dataInicial={dataInicial}
      onFechar={onFechar}
      onCriada={(nova) => { onSalvo(nova); onFechar(); }}
    />
  );
}
