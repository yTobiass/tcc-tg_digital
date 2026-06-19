import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { Badge } from '../../components/ui/Badge';
import { soldadosService } from '../../services/soldadosService';
import { useGuardasSoldado } from '../../hooks/useGuardas';
import { DisciplinaSecao } from './DisciplinaSecao';
import { formatarData } from '../../utils/data';
import { nomeExibicao, raExibicao } from '../../utils/nomes';

const TIPO_BADGE_STYLE = {
  verde:    { background: '#dcfce7', color: '#166534' },
  preta:    { background: '#e5e7eb', color: '#1f2937' },
  vermelha: { background: '#fee2e2', color: '#991b1b' },
};

const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 };
const cardTitle = { fontSize: 16, fontWeight: 700, color: '#1f2937', margin: '0 0 16px' };

function Info({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: 14 }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ color: '#1f2937', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export default function PerfilSoldado() {
  const { id } = useParams();
  const soldadoId = Number(id);
  const [soldado, setSoldado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState('');
  const { historico: guardas, totais } = useGuardasSoldado(soldadoId, {
    tipo:     filtroTipo     || undefined,
    situacao: filtroSituacao || undefined,
  });

  const carregar = useCallback(() => {
    setCarregando(true);
    soldadosService.buscarPorId(soldadoId)
      .then((s) => { setSoldado(s); setErro(null); })
      .catch(() => setErro('Erro ao carregar o soldado.'))
      .finally(() => setCarregando(false));
  }, [soldadoId]);

  useEffect(() => { carregar(); }, [carregar]);

  if (carregando) return <Layout><p style={{ color: '#6b7280' }}>Carregando…</p></Layout>;
  if (erro || !soldado) {
    return (
      <Layout>
        <p style={{ color: '#dc2626' }}>{erro || 'Soldado não encontrado.'}</p>
        <Link to="/soldados" style={{ color: '#16a34a' }}>← Voltar para a lista</Link>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ marginBottom: 16 }}>
        <Link to="/soldados" style={{ color: '#16a34a', fontSize: 14, textDecoration: 'none' }}>← Soldados</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) 1fr', gap: 20, alignItems: 'start' }}>
        {/* Coluna esquerda: identidade */}
        <div style={{ ...card }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', margin: 0 }}>{nomeExibicao(soldado)}</h1>
            <Badge value={soldado.status} />
          </div>
          <p style={{ fontFamily: 'ui-monospace, monospace', color: '#6b7280', margin: '0 0 12px' }}>RA {raExibicao(soldado.ra)}</p>
          <Info label="Nome completo" value={soldado.nome_completo} />
          <Info label="Pelotão" value={soldado.pelotao} />
          <Info label="Turma" value={soldado.turma} />
          <Info label="Graduação" value={soldado.graduacao === 'cabo' ? 'Cabo' : 'Atirador'} />
          <Info label="Celular" value={soldado.celular || '—'} />
          <Info label="Incorporação" value={soldado.data_incorporacao ? formatarData(soldado.data_incorporacao) : null} />
          <Info label="Nascimento" value={soldado.data_nascimento ? formatarData(soldado.data_nascimento) : null} />

          {/* Resumo de guardas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16 }}>
            {[
              { tipo: 'verde', label: '🟢', n: totais.verde },
              { tipo: 'preta', label: '⚫', n: totais.preta },
              { tipo: 'vermelha', label: '🔴', n: totais.vermelha },
            ].map((c) => (
              <div key={c.tipo} style={{ ...TIPO_BADGE_STYLE[c.tipo], borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
                <div style={{ fontSize: 12 }}>{c.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{c.n}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna direita: disciplina + guardas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <DisciplinaSecao soldado={soldado} editavel onChange={carregar} />

          <div style={{ ...card }}>
            <h2 style={cardTitle}>Histórico de Guardas</h2>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, fontSize: 13 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#374151' }}>
                Tipo:
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', fontSize: 13 }}
                >
                  <option value="">Todos</option>
                  <option value="verde">Verde</option>
                  <option value="preta">Preta</option>
                  <option value="vermelha">Vermelha</option>
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#374151' }}>
                Situação:
                <select
                  value={filtroSituacao}
                  onChange={(e) => setFiltroSituacao(e.target.value)}
                  style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', fontSize: 13 }}
                >
                  <option value="">Todas</option>
                  <option value="agendada">Agendada</option>
                  <option value="concluida">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </label>
            </div>

            {guardas.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 14 }}>
                {filtroTipo || filtroSituacao
                  ? 'Nenhuma guarda encontrada com esses filtros.'
                  : 'Nenhuma guarda registrada.'}
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '8px 6px' }}>Tipo</th>
                      <th style={{ padding: '8px 6px' }}>Função</th>
                      <th style={{ padding: '8px 6px' }}>Período</th>
                      <th style={{ padding: '8px 6px' }}>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guardas.map((g) => {
                      const periodo = g.data_inicio === g.data_fim
                        ? formatarData(g.data_inicio)
                        : `${formatarData(g.data_inicio)} – ${formatarData(g.data_fim)}`;
                      return (
                        <tr key={g.escala_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '8px 6px' }}>
                            <span style={{ ...TIPO_BADGE_STYLE[g.tipo], padding: '2px 8px', borderRadius: 9999, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
                              {g.tipo}
                            </span>
                          </td>
                          <td style={{ padding: '8px 6px' }}>{g.funcao === 'cabo' ? 'Cabo' : 'Atirador'}</td>
                          <td style={{ padding: '8px 6px' }}>{periodo}</td>
                          <td style={{ padding: '8px 6px', textTransform: 'capitalize' }}>{g.status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
