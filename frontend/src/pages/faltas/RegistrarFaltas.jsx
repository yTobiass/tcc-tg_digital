import { useState, useEffect, useMemo, useCallback } from 'react';
import { soldadosService } from '../../services/soldadosService';
import { faltasService } from '../../services/faltasService';
import { formatarData } from '../../utils/data';
import { nomeExibicao, raExibicao } from '../../utils/nomes';

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const input = { padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 };
const btn = { padding: '9px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none' };
const th = { padding: '10px 8px', textAlign: 'left', color: '#6b7280', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 };
const td = { padding: '10px 8px', fontSize: 14, borderBottom: '1px solid #f3f4f6' };

const TIPO_OPCOES = [
  { value: 'falta', label: 'Falta Comum' },
  { value: 'falta_guarda', label: 'Falta em Guarda' },
];

export default function RegistrarFaltas() {
  const [data, setData] = useState(hojeISO());
  const [busca, setBusca] = useState('');
  const [soldados, setSoldados] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // soldado_id -> tipo selecionado nesta sessão de marcação.
  const [marcados, setMarcados] = useState({});
  // soldado_id -> justificativa (opcional) digitada nesta sessão.
  const [justificativas, setJustificativas] = useState({});
  // soldado_id -> tipo já registrado na data (pré-marcado, não re-registra).
  const [jaRegistrados, setJaRegistrados] = useState({});

  const [confirmando, setConfirmando] = useState(false); // modal de resumo
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState(null);     // { msg, expulsoes? }

  const carregar = useCallback(async (dia) => {
    setCarregando(true);
    try {
      const [lista, doDia] = await Promise.all([
        soldadosService.listar({ status: 'ativo' }),
        faltasService.doDia(dia),
      ]);
      setSoldados(lista);
      const reg = {};
      doDia.forEach((f) => { reg[f.soldado_id] = f.tipo; });
      setJaRegistrados(reg);
      setMarcados(reg);            // pré-marca quem já tem falta na data
      setJustificativas({});       // justificativas são por sessão de marcação
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(data); }, [data, carregar]);

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return soldados;
    return soldados.filter((s) =>
      s.nome_completo?.toLowerCase().includes(t)
      || s.nome_guerra?.toLowerCase().includes(t)
      || s.ra?.toLowerCase().includes(t));
  }, [soldados, busca]);

  function toggle(soldadoId) {
    setMarcados((m) => {
      const novo = { ...m };
      if (novo[soldadoId] !== undefined) delete novo[soldadoId];
      else novo[soldadoId] = 'falta';
      return novo;
    });
    // Ao desmarcar, limpa a justificativa associada.
    setJustificativas((j) => {
      if (j[soldadoId] === undefined) return j;
      const novo = { ...j };
      delete novo[soldadoId];
      return novo;
    });
  }

  function setTipo(soldadoId, tipo) {
    setMarcados((m) => ({ ...m, [soldadoId]: tipo }));
  }

  function setJustificativa(soldadoId, texto) {
    setJustificativas((j) => ({ ...j, [soldadoId]: texto }));
  }

  // Apenas faltas NOVAS (não já registradas naquela data) entram no lote.
  const novas = useMemo(
    () => Object.entries(marcados).filter(([id]) => jaRegistrados[id] === undefined),
    [marcados, jaRegistrados]
  );

  async function confirmar() {
    setSalvando(true);
    try {
      const faltas = novas.map(([id, tipo]) => ({
        soldado_id: Number(id),
        tipo,
        justificativa: justificativas[id]?.trim() || null,
      }));
      const r = await faltasService.lote(data, faltas);
      setToast({
        msg: `${r.registradas} falta(s) registradas. ${r.pontos_distribuidos} pontos distribuídos.`,
        expulsoes: r.expulsoes || [],
      });
      setConfirmando(false);
      await carregar(data);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Data</label>
          <input type="date" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} style={input} />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Buscar por nome ou RA</label>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite o nome ou RA…" style={{ ...input, width: '100%' }} />
        </div>
        <button
          onClick={() => setConfirmando(true)}
          disabled={novas.length === 0}
          style={{ ...btn, background: novas.length ? '#dc2626' : '#fca5a5', color: '#fff' }}
        >
          Confirmar Faltas {novas.length ? `(${novas.length})` : ''}
        </button>
      </div>

      {carregando ? (
        <p style={{ color: '#9ca3af' }}>Carregando…</p>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ ...th, width: 40, textAlign: 'center' }}>☐</th>
                <th style={th}>RA</th>
                <th style={th}>Nome</th>
                <th style={th}>Pelotão</th>
                <th style={{ ...th, textAlign: 'center' }}>Faltas</th>
                <th style={{ ...th, textAlign: 'center' }}>Pontos</th>
                <th style={th}>Tipo</th>
                <th style={th}>Justificativa (opcional)</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((s) => {
                const marcado = marcados[s.id] !== undefined;
                const jaReg = jaRegistrados[s.id] !== undefined;
                const alerta = (s.total_pontos ?? 0) >= 90;
                return (
                  <tr key={s.id} style={{ background: alerta ? '#fff7ed' : marcado ? '#fef2f2' : '#fff' }}>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <input type="checkbox" checked={marcado} onChange={() => toggle(s.id)} />
                    </td>
                    <td style={td}>{raExibicao(s.ra)}</td>
                    <td style={{ ...td, fontWeight: 600, color: '#1f2937' }}>{nomeExibicao(s)}</td>
                    <td style={td}>{s.pelotao || '—'}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{s.total_faltas ?? 0}</td>
                    <td style={{ ...td, textAlign: 'center', color: alerta ? '#9a3412' : '#374151', fontWeight: alerta ? 700 : 400 }}>
                      {s.total_pontos ?? 0}pts
                    </td>
                    <td style={td}>
                      {marcado ? (
                        <select
                          value={marcados[s.id]}
                          disabled={jaReg}
                          onChange={(e) => setTipo(s.id, e.target.value)}
                          style={{ ...input, padding: '5px 8px' }}
                        >
                          {TIPO_OPCOES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      ) : <span style={{ color: '#9ca3af' }}>—</span>}
                      {jaReg && <span style={{ marginLeft: 8, fontSize: 11, color: '#9ca3af' }}>já registrada</span>}
                    </td>
                    <td style={td}>
                      {marcado && !jaReg ? (
                        <input
                          type="text"
                          value={justificativas[s.id] ?? ''}
                          onChange={(e) => setJustificativa(s.id, e.target.value)}
                          placeholder="Ex: atestado médico, motivo pessoal... (pode deixar em branco)"
                          style={{ ...input, width: '100%', padding: '5px 8px' }}
                        />
                      ) : <span style={{ color: '#9ca3af' }}>—</span>}
                    </td>
                  </tr>
                );
              })}
              {filtrados.length === 0 && (
                <tr><td colSpan={8} style={{ ...td, textAlign: 'center', color: '#9ca3af' }}>Nenhum soldado encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de resumo */}
      {confirmando && (
        <Overlay onClose={() => !salvando && setConfirmando(false)}>
          <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Confirmar faltas</h3>
          <p style={{ color: '#374151', margin: '0 0 20px' }}>
            Registrando <strong>{novas.length}</strong> falta(s) para <strong>{formatarData(data)}</strong>. Confirmar?
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setConfirmando(false)} disabled={salvando} style={{ ...btn, background: '#f3f4f6', color: '#374151' }}>Cancelar</button>
            <button onClick={confirmar} disabled={salvando} style={{ ...btn, background: '#dc2626', color: '#fff' }}>
              {salvando ? 'Registrando…' : 'Confirmar'}
            </button>
          </div>
        </Overlay>
      )}

      {/* Toast de sucesso */}
      {toast && (
        <Overlay onClose={() => setToast(null)}>
          <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: '#15803d' }}>✓ Faltas registradas</h3>
          <p style={{ color: '#374151', margin: '0 0 12px' }}>{toast.msg}</p>
          {toast.expulsoes?.length > 0 && (
            <div style={{ background: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#991b1b' }}>⛔ Soldado(s) expulso(s):</p>
              {toast.expulsoes.map((e) => (
                <p key={e.soldado_id} style={{ margin: 0, color: '#dc2626', fontWeight: 600 }}>
                  {nomeExibicao(e)} — {e.motivo}
                </p>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setToast(null)} style={{ ...btn, background: '#15803d', color: '#fff' }}>Fechar</button>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 24, width: 'min(440px, 100%)' }}>
        {children}
      </div>
    </div>
  );
}
