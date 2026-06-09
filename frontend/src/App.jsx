import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, ExigeAutenticacao, rotaInicial } from './routes/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import Login from './pages/auth/Login';
import TrocarSenha from './pages/auth/TrocarSenha';
import Dashboard from './pages/dashboard/Dashboard';
import Soldados from './pages/soldados/Soldados';
import MeuPerfil from './pages/soldados/MeuPerfil';
import Treinos    from './pages/treinos/Treinos';
import Avaliacoes from './pages/avaliacoes/Avaliacoes';
import Diario     from './pages/diario/Diario';
import Escalas    from './pages/escalas/Escalas';
import Relatorios from './pages/relatorios/Relatorios';
import Admin      from './pages/admin/Admin';

function RootRedirect() {
  const { usuario, carregando } = useAuth();
  if (carregando) return null;
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.precisa_trocar_senha) return <Navigate to="/trocar-senha" replace />;
  return <Navigate to={rotaInicial(usuario.role)} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/trocar-senha"
            element={
              <ExigeAutenticacao>
                <TrocarSenha />
              </ExigeAutenticacao>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={['comandante', 'sargento']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/soldados"
            element={
              <ProtectedRoute roles={['comandante', 'sargento']}>
                <Soldados />
              </ProtectedRoute>
            }
          />
          <Route
            path="/treinos"
            element={
              <ProtectedRoute roles={['comandante', 'sargento']}>
                <Treinos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/avaliacoes"
            element={
              <ProtectedRoute roles={['comandante', 'sargento']}>
                <Avaliacoes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/diario"
            element={
              <ProtectedRoute roles={['comandante', 'sargento']}>
                <Diario />
              </ProtectedRoute>
            }
          />
          <Route
            path="/escalas"
            element={
              <ProtectedRoute roles={['comandante', 'sargento']}>
                <Escalas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/relatorios"
            element={
              <ProtectedRoute roles={['comandante', 'sargento']}>
                <Relatorios />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['comandante']}>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meu-perfil"
            element={
              <ProtectedRoute roles={['soldado']}>
                <MeuPerfil />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
