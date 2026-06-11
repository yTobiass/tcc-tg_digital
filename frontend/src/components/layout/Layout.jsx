import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import styles from './Layout.module.scss';

const NAV_SARGENTO = [
  { to: '/dashboard',   label: 'Dashboard' },
  { to: '/soldados',    label: 'Soldados' },
  { to: '/treinos',     label: 'Treinos' },
  { to: '/avaliacoes',  label: 'TAF' },
  { to: '/diario',      label: 'Diário' },
  { to: '/escalas',     label: 'Escalas' },
  { to: '/faltas',      label: 'Faltas' },
  { to: '/relatorios',  label: 'Relatórios' },
];
const NAV_COMANDANTE = [...NAV_SARGENTO, { to: '/admin', label: 'Admin' }];
// Soldado só enxerga Diário (leitura) e Escalas (calendário).
const NAV_SOLDADO = [
  { to: '/diario',  label: 'Diário' },
  { to: '/escalas', label: 'Escalas' },
];

export function Layout({ children }) {
  const { usuario, logout }   = useAuth();
  const navigate              = useNavigate();
  const location              = useLocation();
  const [menuAberto, setMenu] = useState(false);

  const links = usuario?.role === 'soldado'    ? NAV_SOLDADO
              : usuario?.role === 'comandante' ? NAV_COMANDANTE
              : NAV_SARGENTO;

  const paginaAtual = links.find((l) => location.pathname.startsWith(l.to));

  function handleLogout() { logout(); navigate('/login', { replace: true }); }
  function fecharMenu()   { setMenu(false); }

  return (
    <div className={styles.root}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <span className={styles.logo}>TG 02-032</span>

          {/* Desktop nav */}
          <div className={styles.desktopLinks}>
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `${styles.navLink}${isActive ? ` ${styles.navLinkActive}` : ''}`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>

          {/* Mobile: current page name */}
          <span className={styles.mobilePageTitle}>
            {paginaAtual?.label ?? 'TG 02-032'}
          </span>

          <div className={styles.navRight}>
            <span className={styles.userName}>{usuario?.nome}</span>
            <button onClick={handleLogout} className={styles.logoutBtn}>
              Sair
            </button>
            <button
              onClick={() => setMenu((v) => !v)}
              aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
              className={styles.hamburger}
            >
              {menuAberto ? (
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuAberto && (
          <div className={styles.mobileMenu}>
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={fecharMenu}
                className={({ isActive }) =>
                  `${styles.mobileLink}${isActive ? ` ${styles.mobileLinkActive}` : ''}`
                }
              >
                {label}
              </NavLink>
            ))}
            <div className={styles.mobileDivider}>
              {usuario?.nome && (
                <p className={styles.mobileUser}>{usuario.nome}</p>
              )}
              <button
                onClick={() => { fecharMenu(); handleLogout(); }}
                className={styles.mobileLink}
              >
                Sair
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
