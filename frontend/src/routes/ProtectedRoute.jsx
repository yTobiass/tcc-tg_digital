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

  if (roles && !roles.includes(usuario.role)) {
    return <Navigate to={rotaInicial(usuario.role)} replace />;
  }

  return children;
}

export function rotaInicial(role) {
  if (role === 'soldado') return '/meu-perfil';
  return '/dashboard';
}
