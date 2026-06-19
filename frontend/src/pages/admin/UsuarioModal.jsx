import { useState, useEffect } from 'react';
import { Modal }           from '../../components/ui/Modal';
import { InfoTooltip }     from '../../components/ui/Tooltip';
import { usuariosService } from '../../services/usuariosService';
import { soldadosService } from '../../services/soldadosService';
import { raExibicao }      from '../../utils/nomes';
import styles from './UsuarioModal.module.scss';

const ROLES = [
  { value: 'comandante', label: 'Comandante' },
  { value: 'sargento',   label: 'Sargento' },
  { value: 'soldado',    label: 'Soldado' },
];

function Campo({ label, children, dica }) {
  return (
    <div>
      <label className={styles.label}>{label}</label>
      {children}
      {dica && <p className={styles.hint}>{dica}</p>}
    </div>
  );
}

export default function UsuarioModal({ usuario, onFechar, onSalvo }) {
  const editando = !!usuario;

  const [nome,      setNome]      = useState(usuario?.nome       ?? '');
  const [login,     setLogin]     = useState(usuario?.login      ?? '');
  const [senha,     setSenha]     = useState('');
  const [role,      setRole]      = useState(usuario?.role       ?? 'sargento');
  const [soldadoId, setSoldadoId] = useState(usuario?.soldado_id ?? '');
  const [soldados,  setSoldados]  = useState([]);
  const [salvando,  setSalvando]  = useState(false);
  const [erro,      setErro]      = useState(null);

  useEffect(() => {
    soldadosService.listar({ status: 'ativo' }).then(setSoldados).catch(() => {});
  }, []);

  useEffect(() => {
    if (role !== 'soldado') setSoldadoId('');
  }, [role]);

  async function salvar() {
    setErro(null);
    if (!nome.trim() || !login.trim()) {
      setErro('Nome e login são obrigatórios.');
      return;
    }
    if (!editando && !senha.trim()) {
      setErro('Senha é obrigatória ao criar um usuário.');
      return;
    }
    if (senha.trim() && senha.trim().length < 6) {
      setErro('A senha deve ter ao menos 6 caracteres.');
      return;
    }
    if (role === 'soldado' && !soldadoId) {
      setErro('Selecione o soldado vinculado.');
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        nome:       nome.trim(),
        login:      login.trim(),
        role,
        soldado_id: role === 'soldado' ? Number(soldadoId) : null,
      };
      if (senha.trim()) payload.senha = senha.trim();

      const salvo = editando
        ? await usuariosService.atualizar(usuario.id, payload)
        : await usuariosService.criar(payload);

      onSalvo(salvo);
    } catch (e) {
      const msg = e?.response?.data?.error;
      setErro(typeof msg === 'string' ? msg : 'Erro ao salvar usuário.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal aberto titulo={editando ? 'Editar Usuário' : 'Novo Usuário'} onFechar={onFechar} largura="max-w-md">
      <div className={styles.stack}>
        <Campo label="Nome completo">
          <input type="text" className={styles.input} value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do usuário" maxLength={100} />
        </Campo>

        <Campo label="Login">
          <input type="text" className={styles.input} value={login}
            onChange={(e) => setLogin(e.target.value.trim())}
            placeholder="Login de acesso" maxLength={50} autoComplete="off" />
        </Campo>

        <Campo
          label={editando ? 'Nova senha (opcional)' : 'Senha'}
          dica={editando ? 'Deixe em branco para manter a senha atual.' : 'Mínimo 6 caracteres.'}
        >
          <input type="password" className={styles.input} value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder={editando ? '••••••' : 'Mínimo 6 caracteres'}
            autoComplete="new-password" />
        </Campo>

        <Campo label={
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            Perfil de acesso
            <InfoTooltip
              text="Comandante: acesso total + admin. Sargento: operacional (sem admin). Soldado: apenas próprio perfil e escalas."
              position="right"
            />
          </span>
        }>
          <div className={styles.roleBtns}>
            {ROLES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={`${styles.roleBtn} ${role === value ? styles['roleBtn--active'] : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </Campo>

        {role === 'soldado' && (
          <Campo label="Soldado vinculado" dica="O soldado poderá acessar seu próprio perfil com este login.">
            <select className={styles.select} value={soldadoId}
              onChange={(e) => setSoldadoId(e.target.value)}>
              <option value="">Selecione o soldado…</option>
              {soldados.map((s) => (
                <option key={s.id} value={s.id}>{s.nome_completo} — {raExibicao(s.ra)}</option>
              ))}
            </select>
          </Campo>
        )}

        {erro && <p className={styles.error}>{erro}</p>}

        <div className={styles.footer}>
          <button type="button" onClick={onFechar} className={styles.cancelBtn}>Cancelar</button>
          <button type="button" onClick={salvar} disabled={salvando} className={styles.saveBtn}>
            {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar usuário'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
