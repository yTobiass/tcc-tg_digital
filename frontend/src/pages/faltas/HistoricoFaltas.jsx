import { useState, useEffect, useCallback } from 'react';
import { faltasService } from '../../services/faltasService';
import { formatarData } from '../../utils/data';
import { TIPO_PONTO_LABEL } from '../../utils/pontos';
import { nomeExibicao, raExibicao } from '../../utils/nomes';

const POR_PAGINA = 20;

const input = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  fontSize: 14,
  background: '#fff',
  color: '#1f2937',
  outline: 'none',
};
const btn = {
  padding: '9px 16px',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
  transition: 'background-color .15s, color .15s',
};
const th = {
  padding: '12px 12px',
  textAlign: 'left',
  color: '#6b7280',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  fontWeight: 600,
  background: '#f9fafb',
  borderBottom: '1px solid #e5e7eb',
};
const td = {
  padding: '12px 12px',
  fontSize: 14,
  color: '#374151',
  borderBottom: '1px solid #f3f4f6',
  verticalAlign: 'middle',
};

const TIPO_BADGE = {
  falta:        { background: '#fef3c7', color: '#92400e' },
  falta_guarda: { background: '#fee2e2', color: '#991b1b' },
};

const FILTRO_VAZIO = { busca: '', de: '', ate: '', tipo: '' };

function FiltroCampo({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{label}</span>
      {children}
    </div>
  );
}

function TipoBadge({ tipo }) {
  const style = TIPO_BADGE[tipo] || { background: '#f3f4f6', color: '#374151' };
  return (
    <span style={{
      ...style,
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {TIPO_PONTO_LABEL[tipo] || tipo}
    </span>
  );
}

export default function HistoricoFaltas() {
  const [filtros, setFiltros] = useState(FILTRO_VAZIO);
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [pagina, setPagina] = useState(0);
  const [estornando, setEstornando] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [linhaHover, setLinhaHover] = useState(null);

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

  useEffect(() => { carregar(filtros); }, []);

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
      {/* Card de filtros */}
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 1fr) auto auto auto',
          gap: 12,
          alignItems: 'end',
        }}>
          <FiltroCampo label="Nome ou RA">
            <input
              value={filtros.busca}
              onChange={(e) => setFiltros((f) => ({ ...f, busca: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && aplicar()}
              placeholder="Buscar soldado…"
              style={{ ...input, width: '100%' }}
            />
          </FiltroCampo>
          <FiltroCampo label="De">
            <input type="date" value={filtros.de}
              onChange={(e) => setFiltros((f) => ({ ...f, de: e.target.value }))}
              style={input} />
          </FiltroCampo>
          <FiltroCampo label="Até">
            <input type="date" value={filtros.ate}
              onChange={(e) => setFiltros((f) => ({ ...f, ate: e.target.value }))}
              style={input} />
          </FiltroCampo>
          <FiltroCampo label="Tipo">
            <select value={filtros.tipo}
              onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value }))}
              style={{ ...input, minWidth: 160 }}>
              <option value="">Todos</option>
              <option value="falta">Falta Comum</option>
              <option value="falta_guarda">Falta em Guarda</option>
            </select>
          </FiltroCampo>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12, borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
          <button onClick={limpar}
            style={{ ...btn, background: 'transparent', color: '#6b7280' }}>
            Limpar filtros
          </button>
          <button onClick={aplicar}
            style={{ ...btn, background: '#1d4ed8', color: '#fff' }}>
            Aplicar filtros
          </button>
        </div>
      </div>

      {/* Resumo */}
      {!carregando && registros.length > 0 && (
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>
          <strong style={{ color: '#1f2937' }}>{registros.length}</strong>{' '}
          {registros.length === 1 ? 'registro encontrado' : 'registros encontrados'}
        </p>
      )}

      {carregando ? (
        <div style={{
          padding: 40, textAlign: 'center',
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, color: '#9ca3af',
        }}>
          Carregando…
        </div>
      ) : registros.length === 0 ? (
        <div style={{
          padding: 40, textAlign: 'center',
          background: '#fff', border: '1px dashed #d1d5db', borderRadius: 12,
        }}>
          <p style={{ color: '#374151', fontWeight: 600, margin: '0 0 4px' }}>Nenhuma falta encontrada.</p>
          <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>Ajuste os filtros e tente novamente.</p>
        </div>
      ) : (
        <>
          <div style={{
            overflowX: 'auto',
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Data</th>
                  <th style={th}>Soldado</th>
                  <th style={th}>Pelotão</th>
                  <th style={th}>Tipo</th>
                  <th style={th}>Justificativa</th>
                  <th style={{ ...th, textAlign: 'center' }}>Pontos</th>
                  <th style={{ ...th, textAlign: 'center' }}>Total após</th>
                  <th style={th}>Registrado por</th>
                  <th style={{ ...th, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((r, i) => {
                  const ehUltima = i === visiveis.length - 1;
                  const corFundo = linhaHover === r.id
                    ? '#f9fafb'
                    : (i % 2 === 1 ? '#fafafa' : '#fff');
                  const tdLinha = ehUltima ? { ...td, borderBottom: 'none' } : td;
                  return (
                    <tr
                      key={r.id}
                      onMouseEnter={() => setLinhaHover(r.id)}
                      onMouseLeave={() => setLinhaHover(null)}
                      style={{ background: corFundo, transition: 'background-color .12s' }}
                    >
                      <td style={{ ...tdLinha, whiteSpace: 'nowrap', color: '#1f2937', fontWeight: 500 }}>
                        {formatarData(r.data)}
                      </td>
                      <td style={tdLinha}>
                        <div style={{ fontWeight: 600, color: '#1f2937' }}>{nomeExibicao(r)}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'ui-monospace, monospace' }}>RA {raExibicao(r.ra)}</div>
                      </td>
                      <td style={tdLinha}>{r.pelotao || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                      <td style={tdLinha}><TipoBadge tipo={r.tipo} /></td>
                      <td style={{ ...tdLinha, maxWidth: 260, whiteSpace: 'normal', lineHeight: 1.4 }}>
                        {r.observacao
                          ? r.observacao
                          : <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>sem justificativa</span>}
                      </td>
                      <td style={{ ...tdLinha, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          background: '#fee2e2',
                          color: '#b91c1c',
                          padding: '3px 10px',
                          borderRadius: 9999,
                          fontWeight: 700,
                          fontSize: 13,
                          minWidth: 36,
                        }}>+{r.pontos}</span>
                      </td>
                      <td style={{ ...tdLinha, textAlign: 'center', fontWeight: 600, color: '#1f2937' }}>
                        {r.total_acumulado}<span style={{ color: '#9ca3af', fontWeight: 400, fontSize: 12 }}> pts</span>
                      </td>
                      <td style={{ ...tdLinha, color: '#6b7280' }}>{r.registrado_por_nome || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                      <td style={{ ...tdLinha, textAlign: 'right' }}>
                        <button
                          onClick={() => { setEstornando(r); setMotivo(''); }}
                          style={{
                            background: linhaHover === r.id ? '#fee2e2' : 'transparent',
                            border: '1px solid transparent',
                            color: '#dc2626',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                            padding: '5px 10px',
                            borderRadius: 6,
                            transition: 'background-color .12s',
                          }}
                        >
                          Estornar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 16,
              padding: '0 4px',
            }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                Mostrando <strong style={{ color: '#1f2937' }}>{pagina * POR_PAGINA + 1}</strong>–
                <strong style={{ color: '#1f2937' }}>{Math.min((pagina + 1) * POR_PAGINA, registros.length)}</strong>
                {' '}de <strong style={{ color: '#1f2937' }}>{registros.length}</strong>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  style={{
                    ...btn,
                    padding: '7px 12px',
                    background: '#fff',
                    color: pagina === 0 ? '#d1d5db' : '#374151',
                    border: '1px solid #e5e7eb',
                    cursor: pagina === 0 ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => setPagina((p) => Math.max(0, p - 1))}
                  disabled={pagina === 0}
                >← Anterior</button>
                <span style={{ fontSize: 13, color: '#6b7280', padding: '0 4px' }}>
                  Página {pagina + 1} de {totalPaginas}
                </span>
                <button
                  style={{
                    ...btn,
                    padding: '7px 12px',
                    background: '#fff',
                    color: pagina >= totalPaginas - 1 ? '#d1d5db' : '#374151',
                    border: '1px solid #e5e7eb',
                    cursor: pagina >= totalPaginas - 1 ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
                  disabled={pagina >= totalPaginas - 1}
                >Próxima →</button>
              </div>
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
              {TIPO_PONTO_LABEL[estornando.tipo]} de <strong>{nomeExibicao(estornando)}</strong> em {formatarData(estornando.data)} (+{estornando.pontos} pts).
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
