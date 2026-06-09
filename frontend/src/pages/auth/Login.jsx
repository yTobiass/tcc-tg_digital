import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { rotaInicial } from '../../routes/ProtectedRoute';
import styles from './Login.module.scss';

const TITULO = 'TG 02-032';
const RINGS  = [1, 2, 3, 4, 5];

export default function Login() {
  const { login }   = useAuth();
  const navigate    = useNavigate();

  const [form, setForm]       = useState({ login: '', senha: '' });
  const [erro, setErro]       = useState('');
  const [carregando, setLoad] = useState(false);
  const [typed, setTyped]     = useState('');
  const [hideCursor, setHide] = useState(false);

  // Typewriter on mount
  useEffect(() => {
    let i = 0;
    const tick = setInterval(() => {
      i++;
      setTyped(TITULO.slice(0, i));
      if (i >= TITULO.length) {
        clearInterval(tick);
        setTimeout(() => setHide(true), 2000);
      }
    }, 110);
    return () => clearInterval(tick);
  }, []);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErro('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.login || !form.senha) { setErro('Preencha login e senha.'); return; }
    setLoad(true);
    try {
      const usuario = await login(form.login, form.senha);
      const destino = usuario.precisa_trocar_senha ? '/trocar-senha' : rotaInicial(usuario.role);
      navigate(destino, { replace: true });
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao conectar ao servidor.');
    } finally {
      setLoad(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* Hexagonal grid background — SVG pattern tiles seamlessly */}
      <svg className={styles.hexBg} width="100%" height="100%" aria-hidden="true">
        <defs>
          <pattern id="hexPat" x="0" y="0" width="52" height="90" patternUnits="userSpaceOnUse">
            <path d="M26,-7.5 L51.98,7.5 L51.98,37.5 L26,52.5 L0.02,37.5 L0.02,7.5 Z"
                  fill="none" stroke="rgba(0,224,65,0.13)" strokeWidth="1"/>
            <path d="M0,37.5 L25.98,52.5 L25.98,82.5 L0,97.5 L-25.98,82.5 L-25.98,52.5 Z"
                  fill="none" stroke="rgba(0,224,65,0.13)" strokeWidth="1"/>
            <path d="M52,37.5 L77.98,52.5 L77.98,82.5 L52,97.5 L26.02,82.5 L26.02,52.5 Z"
                  fill="none" stroke="rgba(0,224,65,0.13)" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hexPat)" />
      </svg>

      {/* Moving scan line */}
      <div className={styles.scanLine} aria-hidden="true" />

      {/* Pulsing radar rings */}
      <div className={styles.rings} aria-hidden="true">
        {RINGS.map((i) => <div key={i} className={styles.ring} />)}
      </div>

      {/* Login card */}
      <div className={styles.card}>
        {/* HUD corner brackets */}
        <span className={styles.cTL} aria-hidden="true" />
        <span className={styles.cTR} aria-hidden="true" />
        <span className={styles.cBL} aria-hidden="true" />
        <span className={styles.cBR} aria-hidden="true" />

        <div className={styles.header}>
          <span className={styles.emblem} aria-hidden="true">★</span>
          <p className={styles.eyebrow}>Exército Brasileiro</p>
          <h1 className={styles.title}>
            {typed}
            {!hideCursor && <span className={styles.cursor} aria-hidden="true" />}
          </h1>
          <p className={styles.subtitle}>Rio Claro-SP · Sistema de Gestão</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login">// Identificação</label>
            <input
              id="login"
              name="login"
              type="text"
              autoComplete="username"
              autoFocus
              value={form.login}
              onChange={handleChange}
              className={styles.input}
              placeholder="login"
            />
          </div>

          <div className={styles.fieldLast}>
            <label className={styles.label} htmlFor="senha">// Senha</label>
            <input
              id="senha"
              name="senha"
              type="password"
              autoComplete="current-password"
              value={form.senha}
              onChange={handleChange}
              className={styles.input}
              placeholder="••••••••"
            />
          </div>

          {erro && <p className={styles.error}>&#x26A0; {erro}</p>}

          <button type="submit" disabled={carregando} className={styles.submitBtn}>
            {carregando ? (
              <span className={styles.loadingDots}>
                PROCESSANDO<span className={styles.d1}>.</span><span className={styles.d2}>.</span><span className={styles.d3}>.</span>
              </span>
            ) : (
              'Acessar Sistema'
            )}
          </button>
        </form>

        <p className={styles.statusLine}>
          <span className={styles.statusDot} aria-hidden="true" />
          Sistema Operacional
        </p>
      </div>

      {/* Bottom info strip */}
      <div className={styles.footer} aria-hidden="true">
        <span>CMSE · CMDO 2ª RM</span>
        <span>TG 02-032 · Rio Claro-SP</span>
        <span>v1.0</span>
      </div>
    </div>
  );
}
