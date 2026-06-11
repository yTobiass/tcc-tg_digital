import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { rotaInicial } from '../routes/ProtectedRoute';

// Exibida quando um usuário tenta acessar uma rota sem permissão (ex.: soldado
// digitando a URL de uma aba bloqueada).
export default function SemPermissao() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const destino = rotaInicial(usuario?.role);
  const ehSoldado = usuario?.role === 'soldado';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, maxWidth: 420, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>⛔</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#991b1b', margin: '0 0 8px' }}>Acesso Negado</h1>
        <p style={{ color: '#4b5563', margin: '0 0 24px' }}>
          Você não tem permissão para acessar esta página.
        </p>
        <button
          onClick={() => navigate(destino, { replace: true })}
          style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
        >
          {ehSoldado ? 'Voltar para o Calendário de Escalas' : 'Voltar para o início'}
        </button>
      </div>
    </div>
  );
}
