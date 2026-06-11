import { useState } from 'react';
import { Modal } from './Modal';
import { pontosService } from '../../services/pontosService';

const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 };
const textarea = {
  width: '100%', minHeight: 90, padding: '8px 10px', borderRadius: 8,
  border: '1px solid #d1d5db', fontSize: 14, resize: 'vertical', boxSizing: 'border-box',
};
const btnBase = { padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none' };

// Modal de aplicação de FATD (+10 pontos). O 3º FATD expulsa o soldado.
export function FATDModal({ soldado, onFechar, onAplicado }) {
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const proximoNumero = (soldado.total_fatd ?? 0) + 1;
  const ehTerceiro = proximoNumero >= 3;

  async function confirmar() {
    if (!observacao.trim()) { setErro('A observação é obrigatória.'); return; }
    const aviso = ehTerceiro
      ? 'Este é o 3º FATD. O soldado será expulso automaticamente. Confirmar?'
      : 'Isso adicionará 10 pontos ao soldado. Confirmar?';
    if (!window.confirm(aviso)) return;

    setSalvando(true);
    setErro(null);
    try {
      await pontosService.aplicarFATD(soldado.id, observacao.trim());
      onAplicado?.();
      onFechar();
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao aplicar FATD.');
      setSalvando(false);
    }
  }

  return (
    <Modal aberto onFechar={onFechar} titulo={`Aplicar FATD — ${soldado.nome_completo}`} largura="max-w-md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
          Este será o <strong>{proximoNumero}º FATD</strong> do soldado (cada FATD vale +10 pontos).
        </p>
        {ehTerceiro && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>
            ⚠️ Este é o 3º FATD — o soldado será <strong>expulso automaticamente</strong>.
          </div>
        )}
        <div>
          <label style={lbl}>Observação (motivo do FATD) *</label>
          <textarea
            style={textarea}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Descreva o motivo do FATD…"
            autoFocus
          />
        </div>
        {erro && <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{erro}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button style={{ ...btnBase, background: '#f3f4f6', color: '#374151' }} onClick={onFechar} disabled={salvando}>
            Cancelar
          </button>
          <button style={{ ...btnBase, background: '#dc2626', color: '#fff', opacity: salvando ? 0.6 : 1 }} onClick={confirmar} disabled={salvando}>
            {salvando ? 'Aplicando…' : 'Aplicar FATD'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
