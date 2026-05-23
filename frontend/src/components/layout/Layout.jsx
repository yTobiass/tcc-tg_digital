import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const NAV_SARGENTO = [
  { to: '/dashboard',   label: 'Dashboard' },
  { to: '/soldados',    label: 'Soldados' },
  { to: '/treinos',     label: 'Treinos' },
  { to: '/avaliacoes',  label: 'TAF' },
  { to: '/diario',      label: 'Diário' },
  { to: '/escalas',     label: 'Escalas' },
  { to: '/relatorios',  label: 'Relatórios' },
];
const NAV_COMANDANTE = [
  ...NAV_SARGENTO,
  { to: '/admin', label: 'Admin' },
];
const NAV_SOLDADO = [{ to: '/meu-perfil', label: 'Meu Perfil' }];

const LINK_ATIVO   = 'bg-green-700 text-white';
const LINK_INATIVO = 'text-green-200 hover:text-white hover:bg-green-700';

export function Layout({ children }) {
  const { usuario, logout }   = useAuth();
  const navigate              = useNavigate();
  const location              = useLocation();
  const [menuAberto, setMenu] = useState(false);

  const links = usuario?.role === 'soldado'    ? NAV_SOLDADO
              : usuario?.role === 'comandante' ? NAV_COMANDANTE
              : NAV_SARGENTO;

  const paginaAtual = links.find((l) => location.pathname.startsWith(l.to));

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function fecharMenu() { setMenu(false); }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <nav className="bg-green-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">

          {/* Logo */}
          <span className="font-bold tracking-wide text-sm flex-shrink-0 mr-4">TG 02-032</span>

          {/* Desktop nav ─ hidden below sm */}
          <div className="hidden sm:flex items-center gap-0.5 flex-1 overflow-x-auto">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded text-sm transition-colors flex-shrink-0 ${isActive ? LINK_ATIVO : LINK_INATIVO}`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>

          {/* Mobile: nome da página atual */}
          <span className="sm:hidden text-green-200 text-sm font-medium flex-1 text-center">
            {paginaAtual?.label ?? 'TG 02-032'}
          </span>

          {/* Direita: usuário + sair (desktop) + hambúrguer (mobile) */}
          <div className="flex items-center gap-3 ml-3">
            <span className="text-green-200 text-sm hidden md:block truncate max-w-[140px]">
              {usuario?.nome}
            </span>
            <button
              onClick={handleLogout}
              className="text-green-200 hover:text-white text-sm transition-colors hidden sm:block"
            >
              Sair
            </button>

            {/* Hambúrguer — só no mobile */}
            <button
              onClick={() => setMenu((v) => !v)}
              aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
              className="sm:hidden p-1.5 rounded text-green-200 hover:text-white hover:bg-green-700 transition-colors"
            >
              {menuAberto ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Menu mobile dropdown */}
        {menuAberto && (
          <div className="sm:hidden bg-green-900 border-t border-green-700 px-3 py-2 space-y-0.5">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={fecharMenu}
                className={({ isActive }) =>
                  `block px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive ? LINK_ATIVO : LINK_INATIVO}`
                }
              >
                {label}
              </NavLink>
            ))}
            <div className="border-t border-green-700 pt-2 mt-2">
              {usuario?.nome && (
                <p className="px-3 py-1 text-xs text-green-400 truncate">{usuario.nome}</p>
              )}
              <button
                onClick={() => { fecharMenu(); handleLogout(); }}
                className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm ${LINK_INATIVO}`}
              >
                Sair
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
