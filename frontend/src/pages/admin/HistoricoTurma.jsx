import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { turmasService } from '../../services/turmasService';
import { formatarData } from '../../utils/data';
import { TIPO_PONTO_LABEL } from '../../utils/pontos';

const th = { padding: '10px 8px', textAlign: 'left', color: '#6b7280', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #e5e7eb' };
const td = { padding: '10px 8px', fontSize: 14, borderBottom: '1px solid #f3f4f6' };

const TIPO_ESCALA = { verde: 'Verde', preta: 'Preta', vermelha: 'Vermelha' };
const STATUS_ESCALA = { agendada: 'Agendada', em_andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada' };

const ABAS = [
  { key: 'soldados', label: 'Soldados' },
  { key: 'escalas', label: 'Escalas' },
  { key: 'faltas', label: 'Faltas' },
  { key: 'ocorrencias', label: 'Ocorrências' },
];

export default function HistoricoTurma() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [turma, setTurma] = useState(null);
  const [aba, setAba] = useState('soldados');
  const [dados, setDados] = useState({});      // cache por aba
  const [carregando, setCarregando] = useState(false);

  useEffect(() => { turmasService.buscar(id).then(setTurma).catch(() => setTurma(null)); }, [id]);

  const carregarAba = useCallback(async (k) => {
    if (dados[k]) return;
    setCarregando(true);
    try {
      const fn = { soldados: turmasService.soldados, escalas: turmasService.escalas, faltas: turmasService.faltas, ocorrencias: turmasService.ocorrencias }[k];
      const lista = await fn(id);
      setDados((d) => ({ ...d, [k]: lista }));
    } finally {
      setCarregando(false);
    }
  }, [id, dados]);

  useEffect(() => { carregarAba(aba); }, [aba, carregarAba]);

  const lista = dados[aba] ?? [];

  return (
    <Layout>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontSize: 14, marginBottom: 8 }}>
        ← Voltar
      </button>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: '0 0 4px' }}>
        Turma {turma?.ano ?? '…'}
        {turma?.status === 'encerrada' && <span style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', background: '#fee2e2', borderRadius: 9999, padding: '2px 10px', marginLeft: 10 }}>Encerrada</span>}
        {turma?.status === 'ativa' && <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d', background: '#dcfce7', borderRadius: 9999, padding: '2px 10px', marginLeft: 10 }}>Ativa</span>}
      </h1>
      <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 16px' }}>
        Início: {turma?.data_inicio ? formatarData(turma.data_inicio.slice(0, 10)) : '—'}
        {turma?.data_encerramento && ` · Encerrada em ${formatarData(turma.data_encerramento.slice(0, 10))}`}
        {' · '}Somente leitura
      </p>

      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e5e7eb', marginBottom: 16 }}>
        {ABAS.map(({ key, label }) => {
          const ativo = aba === key;
          return (
            <button key={key} onClick={() => setAba(key)}
              style={{ padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: ativo ? '#1d4ed8' : '#6b7280', borderBottom: ativo ? '2px solid #1d4ed8' : '2px solid transparent', marginBottom: -1 }}>
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, overflowX: 'auto' }}>
        {carregando && !dados[aba] ? (
          <p style={{ color: '#9ca3af' }}>Carregando…</p>
        ) : lista.length === 0 ? (
          <p style={{ color: '#9ca3af' }}>Nenhum registro nesta aba.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            {aba === 'soldados' && (
              <>
                <thead><tr>
                  <th style={th}>RA</th><th style={th}>Nome</th><th style={th}>Pelotão</th>
                  <th style={th}>Graduação</th><th style={th}>Status final</th>
                  <th style={{ ...th, textAlign: 'center' }}>Pontos</th><th style={{ ...th, textAlign: 'center' }}>FATDs</th><th style={{ ...th, textAlign: 'center' }}>Faltas</th>
                </tr></thead>
                <tbody>{lista.map((s) => (
                  <tr key={s.id}>
                    <td style={td}>{s.ra}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{s.nome_completo}</td>
                    <td style={td}>{s.pelotao || '—'}</td>
                    <td style={td}>{s.graduacao === 'cabo' ? 'Cabo' : 'Atirador'}</td>
                    <td style={td}>{s.status}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{s.total_pontos ?? 0}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{s.total_fatd ?? 0}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{s.total_faltas ?? 0}</td>
                  </tr>
                ))}</tbody>
              </>
            )}
            {aba === 'escalas' && (
              <>
                <thead><tr>
                  <th style={th}>Início</th><th style={th}>Fim</th><th style={th}>Tipo</th>
                  <th style={th}>Status</th><th style={{ ...th, textAlign: 'center' }}>Membros</th>
                </tr></thead>
                <tbody>{lista.map((e) => (
                  <tr key={e.id}>
                    <td style={td}>{formatarData(e.data_inicio)}</td>
                    <td style={td}>{formatarData(e.data_fim)}</td>
                    <td style={td}>{TIPO_ESCALA[e.tipo] || e.tipo}</td>
                    <td style={td}>{STATUS_ESCALA[e.status] || e.status}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{e.total_membros}</td>
                  </tr>
                ))}</tbody>
              </>
            )}
            {aba === 'faltas' && (
              <>
                <thead><tr>
                  <th style={th}>Data</th><th style={th}>Soldado</th><th style={th}>Pelotão</th>
                  <th style={th}>Tipo</th><th style={{ ...th, textAlign: 'center' }}>Pontos</th><th style={th}>Registrado por</th>
                </tr></thead>
                <tbody>{lista.map((f) => (
                  <tr key={f.id}>
                    <td style={td}>{formatarData(f.data)}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{f.nome_completo}<span style={{ color: '#9ca3af', fontWeight: 400 }}> · {f.ra}</span></td>
                    <td style={td}>{f.pelotao || '—'}</td>
                    <td style={td}>{TIPO_PONTO_LABEL[f.tipo] || f.tipo}</td>
                    <td style={{ ...td, textAlign: 'center', color: '#b91c1c', fontWeight: 600 }}>+{f.pontos}</td>
                    <td style={td}>{f.registrado_por_nome || '—'}</td>
                  </tr>
                ))}</tbody>
              </>
            )}
            {aba === 'ocorrencias' && (
              <>
                <thead><tr>
                  <th style={th}>Data</th><th style={th}>Soldado</th><th style={th}>Tipo</th><th style={th}>Descrição</th>
                </tr></thead>
                <tbody>{lista.map((o) => (
                  <tr key={o.id}>
                    <td style={td}>{o.data ? formatarData(o.data.slice(0, 10)) : '—'}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{o.nome_completo}<span style={{ color: '#9ca3af', fontWeight: 400 }}> · {o.ra}</span></td>
                    <td style={td}>{o.tipo || '—'}</td>
                    <td style={td}>{o.descricao}</td>
                  </tr>
                ))}</tbody>
              </>
            )}
          </table>
        )}
      </div>
    </Layout>
  );
}
