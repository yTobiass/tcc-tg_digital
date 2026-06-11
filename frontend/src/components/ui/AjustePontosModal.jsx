import { useState } from 'react';
import { Modal } from './Modal';
import { pontosService } from '../../services/pontosService';
import { LIMITE_PONTOS } from '../../utils/pontos';

const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 };
const input = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box',
};
const btnBase = { padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none' };

// Modal de ajuste manual do total de pontos (sargento/comandante).
export function AjustePontosModal({ soldado, onFechar, onAjustado }) {
  const atual = soldado.total_pontos ?? 0;
  const [novoTotal, setNovoTotal] = useState(String(atual));
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const valor = Number(novoTotal);
  const dispensavel = Number.isFinite(valor) && valor >= LIMITE_PONTOS;
  const reativavel = soldado.status === 'dispensado' && Number.isFinite(valor)
    && valor < LIMITE_PONTOS && (soldado.total_fatd ?? 0) < 3;

  async function confirmar() {
    if (!Number.isInteger(valor) || valor < 0) { setErro('Informe um total de pontos válido (≥ 0).'); return; }
    if (!motivo.trim()) { setErro('O motivo do ajuste é obrigatório.'); return; }

    if (dispensavel && !window.confirm('Este ajuste resultará na expulsão do soldado. Confirmar?')) return;
    if (reativavel && !window.confirm('O soldado será reativado automaticamente. Confirmar?')) return;

    setSalvando(true);
    setErro(null);
    try {
      await pontosService.ajustar(soldado.id, valor, motivo.trim());
      onAjustado?.();
      onFechar();
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao ajustar pontos.');
      setSalvando(false);
    }
  }

  return (
    <Modal aberto onFechar={onFechar} titulo={`Ajustar pontos — ${soldado.nome_completo}`} largura="max-w-md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>
          Pontos atuais: <strong>{atual}</strong> → Novo valor:
        </p>
        <div>
          <label style={lbl}>Novo total de pontos *</label>
          <input
            style={input}
            type="number"
            min="0"
            value={novoTotal}
            onChange={(e) => setNovoTotal(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label style={lbl}>Motivo do ajuste *</label>
          <input
            style={input}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Justifique o ajuste…"
          />
        </div>
        {dispensavel && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>
            ⚠️ Este ajuste resultará na <strong>expulsão</strong> do soldado (≥ {LIMITE_PONTOS} pontos).
          </div>
        )}
        {reativavel && (
          <div style={{ background: '#dcfce7', color: '#166534', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>
            ℹ️ O soldado será <strong>reativado automaticamente</strong>.
          </div>
        )}
        {erro && <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{erro}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button style={{ ...btnBase, background: '#f3f4f6', color: '#374151' }} onClick={onFechar} disabled={salvando}>
            Cancelar
          </button>
          <button style={{ ...btnBase, background: '#16a34a', color: '#fff', opacity: salvando ? 0.6 : 1 }} onClick={confirmar} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar ajuste'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
