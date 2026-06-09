import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// roles: array de roles permitidos, ex: ['comandante', 'sargento']
// Se omitido, qualquer usuário autenticado passa.
export function ProtectedRoute({ children, roles }) {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (!usuario) return <Navigate to="/login" replace />;

  // Enquanto a senha provisória não for trocada, o usuário fica preso na tela de troca.
  if (usuario.precisa_trocar_senha) return <Navigate to="/trocar-senha" replace />;

  if (roles && !roles.includes(usuario.role)) {
    return <Navigate to={rotaInicial(usuario.role)} replace />;
  }

  return children;
}

// Guard só de autenticação (sem checar a flag de troca de senha) — usado pela
// própria tela de troca, para não criar um loop de redirecionamento.
export function ExigeAutenticacao({ children }) {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (!usuario) return <Navigate to="/login" replace />;

  return children;
}

export function rotaInicial(role) {
  if (role === 'soldado') return '/meu-perfil';
  return '/dashboard';
}
