import { useState, useEffect } from 'react';
import { Layout }          from '../../components/layout/Layout';
import { useAuth }         from '../../hooks/useAuth';
import { usuariosService } from '../../services/usuariosService';
import { formatarData }    from '../../utils/data';
import UsuarioModal        from './UsuarioModal';
import styles from './Admin.module.scss';

function BadgeRole({ role }) {
  return (
    <span className={`${styles.roleBadge} ${styles[`roleBadge--${role}`] ?? ''}`}>
      {{ comandante: 'Comandante', sargento: 'Sargento', soldado: 'Soldado' }[role] ?? role}
    </span>
  );
}

function BadgeAtivo({ ativo }) {
  return (
    <span className={ativo ? styles.ativoBadge : styles.inativoBadge}>
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  );
}

function BotaoConfirmar({ label, onConfirm, cls }) {
  const [confirmar, setConfirmar] = useState(false);

  if (confirmar) {
    return (
      <span className={styles.confirmGroup}>
        <span className={styles.confirmText}>Confirmar?</span>
        <button className={styles.confirmYes} onClick={() => { setConfirmar(false); onConfirm(); }}>Sim</button>
        <button className={styles.confirmNo}  onClick={() => setConfirmar(false)}>Não</button>
      </span>
    );
  }

  return (
    <button onClick={() => setConfirmar(true)} className={cls}>{label}</button>
  );
}

const SUMMARY_KEY = ['gray', 'green', 'muted'];

export default function Admin() {
  const { usuario: eu } = useAuth();
  const [usuarios,   setUsuarios]   = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modal,      setModal]      = useState(null);
  const [erro,       setErro]       = useState(null);
  const [busca,      setBusca]      = useState('');

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setCarregando(true);
    try {
      setUsuarios(await usuariosService.listar());
    } finally {
      setCarregando(false);
    }
  }

  function abrirCriar()  { setModal({ modo: 'criar' }); }
  function abrirEditar(u){ setModal({ modo: 'editar', usuario: u }); }
  function fecharModal() { setModal(null); }

  function aoSalvar(salvo) {
    setUsuarios((prev) => {
      const idx = prev.findIndex((u) => u.id === salvo.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = salvo; return n; }
      return [...prev, salvo].sort((a, b) => a.nome.localeCompare(b.nome));
    });
    fecharModal();
  }

  async function desativar(id) {
    setErro(null);
    try {
      await usuariosService.remover(id);
      setUsuarios((prev) => prev.map((u) => u.id === id ? { ...u, ativo: 0 } : u));
    } catch (e) {
      setErro(e?.response?.data?.error ?? 'Erro ao desativar.');
    }
  }

  async function reativar(id) {
    setErro(null);
    try {
      const atualizado = await usuariosService.reativar(id);
      setUsuarios((prev) => prev.map((u) => u.id === id ? atualizado : u));
    } catch (e) {
      setErro(e?.response?.data?.error ?? 'Erro ao reativar.');
    }
  }

  const filtrados = usuarios.filter((u) => {
    if (!busca) return true;
    const b = busca.toLowerCase();
    return u.nome.toLowerCase().includes(b) || u.login.toLowerCase().includes(b);
  });

  const totalAtivos   = usuarios.filter((u) => u.ativo).length;
  const totalInativos = usuarios.length - totalAtivos;

  const summaryItems = [
    { label: 'Total',    value: usuarios.length, key: 'gray' },
    { label: 'Ativos',   value: totalAtivos,     key: 'green' },
    { label: 'Inativos', value: totalInativos,   key: 'muted' },
  ];

  return (
    <Layout>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.pageTitle}>Administração de Usuários</h1>
          <p className={styles.pageDesc}>Acesso exclusivo do comandante</p>
        </div>
        <button onClick={abrirCriar} className={styles.btnNew}>+ Novo Usuário</button>
      </div>

      <div className={styles.summaryGrid}>
        {summaryItems.map(({ label, value, key }) => (
          <div key={label} className={styles.summaryCard}>
            <p className={`${styles.summaryNum} ${styles[`summaryNum--${key}`]}`}>{value}</p>
            <p className={styles.summaryLabel}>{label}</p>
          </div>
        ))}
      </div>

      {erro && <div className={styles.errorBanner}>{erro}</div>}

      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h2 className={styles.tableTitle}>Usuários do sistema</h2>
          <input
            type="text"
            placeholder="Buscar nome ou login…"
            className={styles.searchInput}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {carregando ? (
          <div className={styles.loading}>Carregando…</div>
        ) : filtrados.length === 0 ? (
          <div className={styles.empty}>Nenhum usuário encontrado.</div>
        ) : (
          <div className={styles.tableScrollWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Login</th>
                  <th>Perfil</th>
                  <th>Soldado vinculado</th>
                  <th>Criado em</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((u) => {
                  const souEu = u.id === eu?.id;
                  return (
                    <tr key={u.id} className={!u.ativo ? styles.inactiveRow : ''}>
                      <td>
                        <span className={styles.userName}>{u.nome}</span>
                        {souEu && <span className={styles.youTag}>(você)</span>}
                      </td>
                      <td><span className={styles.monoText}>{u.login}</span></td>
                      <td><BadgeRole role={u.role} /></td>
                      <td className={styles.monoText}>
                        {u.soldado_nome
                          ? <>{u.soldado_nome} <span style={{ color: 'var(--clr-gray-400)' }}>({u.soldado_ra})</span></>
                          : <span style={{ color: 'var(--clr-gray-300)' }}>—</span>
                        }
                      </td>
                      <td className={styles.monoText}>
                        {u.created_at ? formatarData(u.created_at.slice(0, 10)) : '—'}
                      </td>
                      <td><BadgeAtivo ativo={u.ativo} /></td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            onClick={() => abrirEditar(u)}
                            className={`${styles.actionBtn} ${styles['actionBtn--blue']}`}
                          >
                            Editar
                          </button>

                          {u.ativo ? (
                            !souEu && (
                              <BotaoConfirmar
                                label="Desativar"
                                onConfirm={() => desativar(u.id)}
                                cls={`${styles.actionBtn} ${styles['actionBtn--red']}`}
                              />
                            )
                          ) : (
                            <button
                              onClick={() => reativar(u.id)}
                              className={`${styles.actionBtn} ${styles['actionBtn--green']}`}
                            >
                              Reativar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.tableFooter}>
          {filtrados.length} de {usuarios.length} usuário(s)
        </div>
      </div>

      <div className={styles.warningBox}>
        <strong>Atenção:</strong> O comandante padrão (<code>comandante</code>) não pode ser
        desativado se for o único administrador ativo. Ao criar um novo usuário para um soldado,
        certifique-se de vincular o cadastro correto — o soldado terá acesso somente ao próprio
        perfil e escalas.
      </div>

      {modal && (
        <UsuarioModal
          usuario={modal.usuario}
          onFechar={fecharModal}
          onSalvo={aoSalvar}
        />
      )}
    </Layout>
  );
}
