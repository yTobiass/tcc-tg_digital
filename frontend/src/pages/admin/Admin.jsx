import { useState, useEffect } from 'react';
import { Layout }          from '../../components/layout/Layout';
import { useAuth }         from '../../hooks/useAuth';
import { usuariosService } from '../../services/usuariosService';
import { formatarData }    from '../../utils/data';
import UsuarioModal        from './UsuarioModal';

// ── Badges ────────────────────────────────────────────────────────────────────

const ROLE_BADGE = {
  comandante: 'bg-purple-100 text-purple-800',
  sargento:   'bg-blue-100 text-blue-800',
  soldado:    'bg-gray-100 text-gray-700',
};

const ROLE_LABEL = {
  comandante: 'Comandante',
  sargento:   'Sargento',
  soldado:    'Soldado',
};

function BadgeRole({ role }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE[role] ?? 'bg-gray-100 text-gray-600'}`}>
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

function BadgeAtivo({ ativo }) {
  return ativo ? (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Ativo</span>
  ) : (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Inativo</span>
  );
}

// ── Linha de confirmação inline ───────────────────────────────────────────────

function BotaoConfirmar({ label, labelConfirm, onConfirm, cls }) {
  const [confirmar, setConfirmar] = useState(false);

  if (confirmar) {
    return (
      <span className="flex items-center gap-1">
        <span className="text-xs text-gray-500">Confirmar?</span>
        <button
          onClick={() => { setConfirmar(false); onConfirm(); }}
          className="text-xs font-semibold text-red-600 hover:underline"
        >
          Sim
        </button>
        <button
          onClick={() => setConfirmar(false)}
          className="text-xs text-gray-400 hover:underline"
        >
          Não
        </button>
      </span>
    );
  }

  return (
    <button onClick={() => setConfirmar(true)} className={cls}>
      {label}
    </button>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Admin() {
  const { usuario: eu } = useAuth();
  const [usuarios,   setUsuarios]   = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modal,      setModal]      = useState(null); // null | { modo: 'criar' | 'editar', usuario? }
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

  function abrirCriar() { setModal({ modo: 'criar' }); }
  function abrirEditar(u) { setModal({ modo: 'editar', usuario: u }); }
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
      setErro(e?.response?.data?.erro ?? 'Erro ao desativar.');
    }
  }

  async function reativar(id) {
    setErro(null);
    try {
      const atualizado = await usuariosService.reativar(id);
      setUsuarios((prev) => prev.map((u) => u.id === id ? atualizado : u));
    } catch (e) {
      setErro(e?.response?.data?.erro ?? 'Erro ao reativar.');
    }
  }

  const filtrados = usuarios.filter((u) => {
    if (!busca) return true;
    const b = busca.toLowerCase();
    return u.nome.toLowerCase().includes(b) || u.login.toLowerCase().includes(b);
  });

  const totalAtivos   = usuarios.filter((u) => u.ativo).length;
  const totalInativos = usuarios.length - totalAtivos;

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Administração de Usuários</h1>
          <p className="text-xs text-gray-400 mt-0.5">Acesso exclusivo do comandante</p>
        </div>
        <button
          onClick={abrirCriar}
          className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700"
        >
          + Novo Usuário
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total',    value: usuarios.length, cls: 'text-gray-800' },
          { label: 'Ativos',   value: totalAtivos,     cls: 'text-green-700' },
          { label: 'Inativos', value: totalInativos,   cls: 'text-gray-400' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <p className={`text-2xl font-bold ${cls}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {erro && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {erro}
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700 flex-1">Usuários do sistema</h2>
          <input
            type="text"
            placeholder="Buscar nome ou login…"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-52"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {carregando ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            Carregando…
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            Nenhum usuário encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">
                  <th className="px-5 py-3">Nome</th>
                  <th className="px-5 py-3">Login</th>
                  <th className="px-5 py-3">Perfil</th>
                  <th className="px-5 py-3">Soldado vinculado</th>
                  <th className="px-5 py-3">Criado em</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map((u) => {
                  const souEu = u.id === eu?.id;
                  return (
                    <tr key={u.id} className={`hover:bg-gray-50 ${!u.ativo ? 'opacity-60' : ''}`}>
                      <td className="px-5 py-3 font-medium text-gray-800">
                        {u.nome}
                        {souEu && (
                          <span className="ml-2 text-xs text-green-600 font-normal">(você)</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-500 font-mono text-xs">{u.login}</td>
                      <td className="px-5 py-3">
                        <BadgeRole role={u.role} />
                      </td>
                      <td className="px-5 py-3 text-gray-600 text-xs">
                        {u.soldado_nome
                          ? <span>{u.soldado_nome} <span className="text-gray-400">({u.soldado_ra})</span></span>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {u.created_at ? formatarData(u.created_at.slice(0, 10)) : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <BadgeAtivo ativo={u.ativo} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => abrirEditar(u)}
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            Editar
                          </button>

                          {u.ativo ? (
                            !souEu && (
                              <BotaoConfirmar
                                label="Desativar"
                                onConfirm={() => desativar(u.id)}
                                cls="text-xs font-medium text-red-500 hover:underline"
                              />
                            )
                          ) : (
                            <button
                              onClick={() => reativar(u.id)}
                              className="text-xs font-medium text-green-600 hover:underline"
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

        <div className="px-5 py-2 border-t border-gray-100 text-xs text-gray-400">
          {filtrados.length} de {usuarios.length} usuário(s)
        </div>
      </div>

      {/* Aviso de segurança */}
      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
        <strong>Atenção:</strong> O comandante padrão (<code className="bg-amber-100 px-1 rounded">comandante</code>)
        não pode ser desativado se for o único administrador ativo.
        Ao criar um novo usuário para um soldado, certifique-se de vincular o cadastro correto — o soldado terá
        acesso somente ao próprio perfil e escalas.
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
