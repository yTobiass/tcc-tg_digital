import { useState } from 'react';
import { usePontos } from '../../hooks/usePontos';
import { pontosService } from '../../services/pontosService';
import { FATDModal } from '../../components/ui/FATDModal';
import { AjustePontosModal } from '../../components/ui/AjustePontosModal';
import { corPontos, LIMITE_PONTOS, LIMITE_FATD, TIPO_PONTO_LABEL } from '../../utils/pontos';
import { formatarData } from '../../utils/data';

const POR_PAGINA = 10;

const card = {
  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20,
};
const cardTitle = { fontSize: 16, fontWeight: 700, color: '#1f2937', margin: '0 0 16px' };
const btn = {
  padding: '8px 14px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none',
};

// Converte um registro de ponto em data legível (created_at = 'YYYY-MM-DD HH:MM:SS').
function dataRegistro(r) {
  if (!r.created_at) return '—';
  return formatarData(r.created_at.split(' ')[0]);
}

// Seção "Disciplina": barra de pontos, indicador de FATDs e histórico.
// editavel=true habilita aplicar FATD, ajustar e estornar (sargento/comandante).
export function DisciplinaSecao({ soldado, editavel = false, onChange }) {
  const { registros, resumo, loading, recarregar } = usePontos(soldado?.id);
  const [pagina, setPagina] = useState(0);
  const [modal, setModal] = useState(null); // 'fatd' | 'ajuste'

  if (!soldado?.id) return null;

  // Usa o resumo do endpoint (mais atual) com fallback ao objeto soldado.
  const pontos = resumo?.total_pontos ?? soldado.total_pontos ?? 0;
  const fatd = resumo?.total_fatd ?? soldado.total_fatd ?? 0;
  const statusAtual = resumo?.status ?? soldado.status;
  const cor = corPontos(pontos);
  const pctBarra = Math.min(100, (pontos / LIMITE_PONTOS) * 100);

  // soldado "vivo" para os modais (mantém totais atualizados).
  const soldadoAtual = { ...soldado, total_pontos: pontos, total_fatd: fatd, status: statusAtual };

  async function atualizar() {
    await recarregar();
    onChange?.();
  }

  async function estornar(registro) {
    if (!window.confirm(`Estornar este registro (${TIPO_PONTO_LABEL[registro.tipo] || registro.tipo}, ${registro.pontos > 0 ? '+' : ''}${registro.pontos} pts)?`)) return;
    const motivo = window.prompt('Motivo do estorno:', 'Registro lançado por engano');
    if (motivo === null) return;
    await pontosService.estornar(soldado.id, registro.id, motivo);
    await atualizar();
  }

  const totalPaginas = Math.ceil(registros.length / POR_PAGINA);
  const paginaSegura = Math.min(pagina, Math.max(0, totalPaginas - 1));
  const visiveis = registros.slice(paginaSegura * POR_PAGINA, paginaSegura * POR_PAGINA + POR_PAGINA);

  return (
    <div style={{ ...card }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={cardTitle}>Disciplina</h2>
        {editavel && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...btn, background: '#fef2f2', color: '#b91c1c' }} onClick={() => setModal('fatd')}>
              + Aplicar FATD
            </button>
            <button style={{ ...btn, background: '#f0fdf4', color: '#15803d' }} onClick={() => setModal('ajuste')}>
              Ajustar pontos
            </button>
          </div>
        )}
      </div>

      {statusAtual === 'dispensado' && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 600 }}>
          ⛔ Soldado dispensado (expulso).
        </div>
      )}

      {/* Barra de progresso de pontos */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', marginBottom: 6 }}>
          <span style={{ fontWeight: 600 }}>Pontos</span>
          <span><strong style={{ color: cor.barra }}>{pontos}</strong> / {LIMITE_PONTOS}</span>
        </div>
        <div style={{ height: 14, background: '#f3f4f6', borderRadius: 9999, overflow: 'hidden' }}>
          <div style={{ width: `${pctBarra}%`, height: '100%', background: cor.barra, transition: 'width .3s' }} />
        </div>
      </div>

      {/* Indicador de FATDs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>FATDs</span>
        <span style={{ fontSize: 18, letterSpacing: 2 }}>
          {Array.from({ length: LIMITE_FATD }).map((_, i) => (
            <span key={i} style={{ color: i < fatd ? '#dc2626' : '#d1d5db' }}>{i < fatd ? '●' : '○'}</span>
          ))}
        </span>
        <span style={{ fontSize: 13, color: '#6b7280' }}>({fatd} de {LIMITE_FATD})</span>
      </div>

      {/* Tabela de histórico */}
      {loading ? (
        <p style={{ color: '#9ca3af', fontSize: 14 }}>Carregando…</p>
      ) : registros.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: 14 }}>Nenhum registro de pontos.</p>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '8px 6px' }}>Data</th>
                  <th style={{ padding: '8px 6px' }}>Tipo</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center' }}>Pontos</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center' }}>Total</th>
                  <th style={{ padding: '8px 6px' }}>Observação</th>
                  {editavel && <th style={{ padding: '8px 6px' }} />}
                </tr>
              </thead>
              <tbody>
                {visiveis.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>{dataRegistro(r)}</td>
                    <td style={{ padding: '8px 6px' }}>
                      {TIPO_PONTO_LABEL[r.tipo] || r.tipo}
                      {r.tipo === 'fatd' && r.fatd_numero ? ` (${r.fatd_numero}º)` : ''}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600, color: r.pontos < 0 ? '#16a34a' : '#b91c1c' }}>
                      {r.pontos > 0 ? `+${r.pontos}` : r.pontos}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>{r.total_acumulado}</td>
                    <td style={{ padding: '8px 6px', color: '#6b7280' }}>{r.observacao || '—'}</td>
                    {editavel && (
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                        <button
                          onClick={() => estornar(r)}
                          style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 12 }}
                          title="Estornar registro"
                        >
                          Estornar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <button
                style={{ ...btn, background: '#f3f4f6', color: '#374151', opacity: paginaSegura === 0 ? 0.5 : 1 }}
                onClick={() => setPagina((p) => Math.max(0, p - 1))}
                disabled={paginaSegura === 0}
              >
                ← Anterior
              </button>
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                Página {paginaSegura + 1} de {totalPaginas}
              </span>
              <button
                style={{ ...btn, background: '#f3f4f6', color: '#374151', opacity: paginaSegura >= totalPaginas - 1 ? 0.5 : 1 }}
                onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
                disabled={paginaSegura >= totalPaginas - 1}
              >
                Próxima →
              </button>
            </div>
          )}
        </>
      )}

      {modal === 'fatd' && (
        <FATDModal soldado={soldadoAtual} onFechar={() => setModal(null)} onAplicado={atualizar} />
      )}
      {modal === 'ajuste' && (
        <AjustePontosModal soldado={soldadoAtual} onFechar={() => setModal(null)} onAjustado={atualizar} />
      )}
    </div>
  );
}
