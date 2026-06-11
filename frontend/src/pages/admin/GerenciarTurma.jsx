import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { turmasService } from '../../services/turmasService';
import { formatarData } from '../../utils/data';

const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 16 };
const btn = { padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none' };
const th = { padding: '10px 8px', textAlign: 'left', color: '#6b7280', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 };
const td = { padding: '10px 8px', fontSize: 14, borderBottom: '1px solid #f3f4f6' };

export default function GerenciarTurma() {
  const navigate = useNavigate();
  const [turmas, setTurmas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try { setTurmas(await turmasService.listar()); }
    finally { setCarregando(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const ativa = turmas.find((t) => t.status === 'ativa');
  const encerradas = turmas.filter((t) => t.status === 'encerrada');

  async function confirmarEncerramento() {
    setEncerrando(true);
    setErro(null);
    try {
      const r = await turmasService.encerrar();
      setResultado(`Turma ${r.turma_encerrada} encerrada. Turma ${r.nova_turma} criada e ativa.`);
      setConfirmando(false);
      await carregar();
    } catch (e) {
      setErro(e?.response?.data?.error ?? 'Erro ao encerrar a turma.');
    } finally {
      setEncerrando(false);
    }
  }

  if (carregando) return <div style={{ ...card, color: '#9ca3af' }}>Carregando turma…</div>;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', margin: '24px 0 12px' }}>Gerenciar Turma</h2>

      {resultado && (
        <div style={{ ...card, background: '#f0fdf4', borderColor: '#bbf7d0', color: '#15803d', cursor: 'pointer' }} onClick={() => setResultado(null)}>
          ✓ {resultado}
        </div>
      )}

      {/* Card da turma ativa */}
      {ativa && (
        <div style={{ ...card, borderColor: '#bfdbfe', background: '#eff6ff' }}>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a', margin: '0 0 8px' }}>Turma Ativa: {ativa.ano}</p>
          <p style={{ margin: '2px 0', color: '#374151' }}>Início: <strong>{ativa.data_inicio ? formatarData(ativa.data_inicio.slice(0, 10)) : '—'}</strong></p>
          <p style={{ margin: '2px 0 16px', color: '#374151' }}>Soldados na turma: <strong>{ativa.total_soldados ?? 0}</strong></p>
          <button onClick={() => setConfirmando(true)} style={{ ...btn, background: '#dc2626', color: '#fff' }}>
            Encerrar Turma {ativa.ano}
          </button>
        </div>
      )}

      {/* Histórico de turmas encerradas */}
      <div style={card}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', margin: '0 0 12px' }}>Histórico de Turmas</h3>
        {encerradas.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: 14 }}>Nenhuma turma encerrada ainda.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={th}>Ano</th>
                  <th style={th}>Início</th>
                  <th style={th}>Encerramento</th>
                  <th style={{ ...th, textAlign: 'center' }}>Soldados</th>
                  <th style={{ ...th, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {encerradas.map((t) => (
                  <tr key={t.id}>
                    <td style={{ ...td, fontWeight: 600 }}>{t.ano}</td>
                    <td style={td}>{t.data_inicio ? formatarData(t.data_inicio.slice(0, 10)) : '—'}</td>
                    <td style={td}>{t.data_encerramento ? formatarData(t.data_encerramento.slice(0, 10)) : '—'}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{t.total_soldados ?? 0}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button onClick={() => navigate(`/turmas/${t.id}`)} style={{ ...btn, padding: '6px 12px', background: '#1d4ed8', color: '#fff' }}>
                        Ver Histórico
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de confirmação de encerramento */}
      {confirmando && ativa && (
        <div onClick={() => !encerrando && setConfirmando(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 24, width: 'min(480px, 100%)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: '#b91c1c' }}>⚠️ Atenção!</h3>
            <p style={{ color: '#374151', margin: '0 0 12px' }}>
              Você está prestes a encerrar a <strong>Turma {ativa.ano}</strong>. Isso irá:
            </p>
            <ul style={{ color: '#374151', margin: '0 0 12px', paddingLeft: 20, lineHeight: 1.7 }}>
              <li>Encerrar a turma e inativar os <strong>{ativa.total_soldados ?? 0}</strong> soldados atuais</li>
              <li>Cancelar todas as escalas futuras agendadas</li>
              <li>Zerar as filas de rotação</li>
              <li>Criar a <strong>Turma {ativa.ano + 1}</strong> automaticamente</li>
            </ul>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 8px' }}>
              Os dados históricos serão preservados e poderão ser consultados a qualquer momento.
            </p>
            <p style={{ color: '#b91c1c', fontSize: 13, fontWeight: 600, margin: '0 0 20px' }}>
              Esta ação não pode ser desfeita.
            </p>
            {erro && <p style={{ color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>{erro}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setConfirmando(false)} disabled={encerrando} style={{ ...btn, background: '#f3f4f6', color: '#374151' }}>Cancelar</button>
              <button onClick={confirmarEncerramento} disabled={encerrando} style={{ ...btn, background: '#dc2626', color: '#fff' }}>
                {encerrando ? 'Encerrando…' : 'Confirmar Encerramento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
