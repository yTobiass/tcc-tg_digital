import { useState, useEffect, useCallback } from 'react';
import { faltasService } from '../../services/faltasService';
import { formatarData } from '../../utils/data';
import { TIPO_PONTO_LABEL } from '../../utils/pontos';

const POR_PAGINA = 20;

const input = { padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 };
const btn = { padding: '9px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none' };
const th = { padding: '10px 8px', textAlign: 'left', color: '#6b7280', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 };
const td = { padding: '10px 8px', fontSize: 14, borderBottom: '1px solid #f3f4f6' };

const FILTRO_VAZIO = { busca: '', de: '', ate: '', tipo: '' };

export default function HistoricoFaltas() {
  const [filtros, setFiltros] = useState(FILTRO_VAZIO);
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [pagina, setPagina] = useState(0);
  const [estornando, setEstornando] = useState(null); // registro selecionado
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async (f) => {
    setCarregando(true);
    try {
      const params = {};
      if (f.busca) params.busca = f.busca;
      if (f.de) params.de = f.de;
      if (f.ate) params.ate = f.ate;
      if (f.tipo) params.tipo = f.tipo;
      setRegistros(await faltasService.historico(params));
      setPagina(0);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(filtros); }, []); // carga inicial

  function aplicar() { carregar(filtros); }
  function limpar() { setFiltros(FILTRO_VAZIO); carregar(FILTRO_VAZIO); }

  async function confirmarEstorno() {
    if (!motivo.trim()) return;
    setSalvando(true);
    try {
      await faltasService.estornar(estornando.id, motivo.trim());
      setEstornando(null);
      setMotivo('');
      await carregar(filtros);
    } finally {
      setSalvando(false);
    }
  }

  const totalPaginas = Math.ceil(registros.length / POR_PAGINA);
  const visiveis = registros.slice(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA);

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Nome ou RA</label>
          <input value={filtros.busca} onChange={(e) => setFiltros((f) => ({ ...f, busca: e.target.value }))}
            placeholder="Buscar…" style={{ ...input, width: '100%' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>De</label>
          <input type="date" value={filtros.de} onChange={(e) => setFiltros((f) => ({ ...f, de: e.target.value }))} style={input} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Até</label>
          <input type="date" value={filtros.ate} onChange={(e) => setFiltros((f) => ({ ...f, ate: e.target.value }))} style={input} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Tipo</label>
          <select value={filtros.tipo} onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value }))} style={input}>
            <option value="">Todos</option>
            <option value="falta">Falta Comum</option>
            <option value="falta_guarda">Falta em Guarda</option>
          </select>
        </div>
        <button onClick={aplicar} style={{ ...btn, background: '#1d4ed8', color: '#fff' }}>Filtrar</button>
        <button onClick={limpar} style={{ ...btn, background: '#f3f4f6', color: '#374151' }}>Limpar filtros</button>
      </div>

      {carregando ? (
        <p style={{ color: '#9ca3af' }}>Carregando…</p>
      ) : registros.length === 0 ? (
        <p style={{ color: '#9ca3af' }}>Nenhuma falta encontrada.</p>
      ) : (
        <>
          <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={th}>Data</th>
                  <th style={th}>Soldado</th>
                  <th style={th}>Pelotão</th>
                  <th style={th}>Tipo</th>
                  <th style={{ ...th, textAlign: 'center' }}>Pontos</th>
                  <th style={{ ...th, textAlign: 'center' }}>Total após</th>
                  <th style={th}>Registrado por</th>
                  <th style={{ ...th, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((r) => (
                  <tr key={r.id}>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{formatarData(r.data)}</td>
                    <td style={{ ...td, fontWeight: 600, color: '#1f2937' }}>{r.nome_completo}<span style={{ color: '#9ca3af', fontWeight: 400 }}> · {r.ra}</span></td>
                    <td style={td}>{r.pelotao || '—'}</td>
                    <td style={td}>{TIPO_PONTO_LABEL[r.tipo] || r.tipo}</td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 600, color: '#b91c1c' }}>+{r.pontos}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{r.total_acumulado}pts</td>
                    <td style={td}>{r.registrado_por_nome || '—'}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button onClick={() => { setEstornando(r); setMotivo(''); }}
                        style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        Estornar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <button style={{ ...btn, background: '#f3f4f6', color: '#374151', opacity: pagina === 0 ? 0.5 : 1 }}
                onClick={() => setPagina((p) => Math.max(0, p - 1))} disabled={pagina === 0}>← Anterior</button>
              <span style={{ fontSize: 13, color: '#6b7280' }}>Página {pagina + 1} de {totalPaginas}</span>
              <button style={{ ...btn, background: '#f3f4f6', color: '#374151', opacity: pagina >= totalPaginas - 1 ? 0.5 : 1 }}
                onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))} disabled={pagina >= totalPaginas - 1}>Próxima →</button>
            </div>
          )}
        </>
      )}

      {/* Modal de estorno */}
      {estornando && (
        <div onClick={() => !salvando && setEstornando(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 24, width: 'min(440px, 100%)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Estornar falta</h3>
            <p style={{ color: '#374151', margin: '0 0 12px' }}>
              {TIPO_PONTO_LABEL[estornando.tipo]} de <strong>{estornando.nome_completo}</strong> em {formatarData(estornando.data)} (+{estornando.pontos} pts).
              Os pontos serão desfeitos e a ação registrada em ocorrências.
            </p>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Motivo (obrigatório)</label>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3}
              style={{ ...input, width: '100%', resize: 'vertical', marginBottom: 16 }} placeholder="Justifique o estorno…" />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setEstornando(null)} disabled={salvando} style={{ ...btn, background: '#f3f4f6', color: '#374151' }}>Cancelar</button>
              <button onClick={confirmarEstorno} disabled={salvando || !motivo.trim()}
                style={{ ...btn, background: motivo.trim() ? '#dc2626' : '#fca5a5', color: '#fff' }}>
                {salvando ? 'Estornando…' : 'Confirmar estorno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
