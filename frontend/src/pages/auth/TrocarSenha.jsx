import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { rotaInicial } from '../../routes/ProtectedRoute';
import styles from './TrocarSenha.module.scss';

export default function TrocarSenha() {
  const { usuario, trocarSenha, logout } = useAuth();
  const navigate = useNavigate();

  const obrigatoria = !!usuario?.precisa_trocar_senha;

  const [form, setForm] = useState({ senhaAtual: '', novaSenha: '', confirmar: '' });
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErro('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.senhaAtual || !form.novaSenha) { setErro('Preencha todos os campos.'); return; }
    if (form.novaSenha.length < 6) { setErro('A nova senha deve ter ao menos 6 caracteres.'); return; }
    if (form.novaSenha !== form.confirmar) { setErro('A confirmação não confere com a nova senha.'); return; }

    setCarregando(true);
    try {
      const atualizado = await trocarSenha(form.senhaAtual, form.novaSenha);
      navigate(rotaInicial(atualizado.role), { replace: true });
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao trocar a senha.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <span className={styles.cTL} aria-hidden="true" />
        <span className={styles.cTR} aria-hidden="true" />
        <span className={styles.cBL} aria-hidden="true" />
        <span className={styles.cBR} aria-hidden="true" />

        <div className={styles.header}>
          <span className={styles.emblem} aria-hidden="true">★</span>
          <h1 className={styles.title}>Trocar Senha</h1>
          <p className={styles.subtitle}>
            {obrigatoria
              ? 'Este acesso usa uma senha provisória. Defina uma nova senha para continuar.'
              : 'Defina uma nova senha de acesso.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="senhaAtual">// Senha atual</label>
            <input
              id="senhaAtual"
              name="senhaAtual"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={form.senhaAtual}
              onChange={handleChange}
              className={styles.input}
              placeholder="••••••••"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="novaSenha">// Nova senha</label>
            <input
              id="novaSenha"
              name="novaSenha"
              type="password"
              autoComplete="new-password"
              value={form.novaSenha}
              onChange={handleChange}
              className={styles.input}
              placeholder="mínimo 6 caracteres"
            />
          </div>

          <div className={styles.fieldLast}>
            <label className={styles.label} htmlFor="confirmar">// Confirmar nova senha</label>
            <input
              id="confirmar"
              name="confirmar"
              type="password"
              autoComplete="new-password"
              value={form.confirmar}
              onChange={handleChange}
              className={styles.input}
              placeholder="••••••••"
            />
          </div>

          {erro && <p className={styles.error}>&#x26A0; {erro}</p>}

          <button type="submit" disabled={carregando} className={styles.submitBtn}>
            {carregando ? 'Processando...' : 'Confirmar nova senha'}
          </button>
        </form>

        <button type="button" className={styles.logout} onClick={logout}>
          Sair
        </button>
      </div>
    </div>
  );
}
