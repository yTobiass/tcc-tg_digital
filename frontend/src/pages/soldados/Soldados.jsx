import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../../components/layout/Layout';
import { Badge } from '../../components/ui/Badge';
import { useSoldados } from '../../hooks/useSoldados';
import { SoldadoFormModal } from './SoldadoFormModal';
import { ImportarModal } from './ImportarModal';

const STATUS_OPTS = [
  { value: '', label: 'Todos os status' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'licenca', label: 'Licença' },
  { value: 'baixado', label: 'Baixado' },
  { value: 'dispensado', label: 'Dispensado' },
];
const GRAD_OPTS = [
  { value: '', label: 'Todas as graduações' },
  { value: 'atirador', label: 'Atirador' },
  { value: 'cabo', label: 'Cabo' },
];

export default function Soldados() {
  const { soldados, carregando, erro, carregar } = useSoldados();
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroGrad, setFiltroGrad] = useState('');
  const [modalForm, setModalForm] = useState(null); // null | 'novo' | soldadoObj
  const [modalImportar, setModalImportar] = useState(false);

  useEffect(() => { carregar(); }, [carregar]);

  const filtrados = useMemo(() => {
    const b = busca.toLowerCase();
    return soldados.filter((s) => {
      if (b && !s.nome_completo.toLowerCase().includes(b) && !s.ra.toLowerCase().includes(b)) return false;
      if (filtroStatus && s.status !== filtroStatus) return false;
      if (filtroGrad && s.graduacao !== filtroGrad) return false;
      return true;
    });
  }, [soldados, busca, filtroStatus, filtroGrad]);

  function handleSalvar() {
    setModalForm(null);
    carregar();
  }

  function handleImportado() {
    carregar();
  }

  return (
    <Layout>
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-bold text-gray-800">Soldados</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setModalImportar(true)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Importar planilha
          </button>
          <button
            onClick={() => setModalForm('novo')}
            className="px-4 py-2 text-sm font-medium bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors"
          >
            + Novo soldado
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Buscar por nome ou RA..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        />
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        >
          {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={filtroGrad}
          onChange={(e) => setFiltroGrad(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        >
          {GRAD_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {(busca || filtroStatus || filtroGrad) && (
          <button
            onClick={() => { setBusca(''); setFiltroStatus(''); setFiltroGrad(''); }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {carregando ? (
          <div className="py-16 text-center text-gray-400 text-sm">Carregando...</div>
        ) : erro ? (
          <div className="py-16 text-center text-red-500 text-sm">{erro}</div>
        ) : filtrados.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            {soldados.length === 0 ? 'Nenhum soldado cadastrado.' : 'Nenhum resultado para os filtros selecionados.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">RA</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3 hidden md:table-cell">Pelotão</th>
                <th className="px-4 py-3 hidden md:table-cell">Turma</th>
                <th className="px-4 py-3">Graduação</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-gray-600">{s.ra}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{s.nome_completo}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{s.pelotao || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{s.turma || '—'}</td>
                  <td className="px-4 py-3"><Badge value={s.graduacao} /></td>
                  <td className="px-4 py-3"><Badge value={s.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setModalForm(s)}
                      className="text-sm text-green-700 hover:text-green-900 font-medium"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Rodapé com contagem */}
        {!carregando && !erro && filtrados.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            {filtrados.length} de {soldados.length} soldado{soldados.length !== 1 ? 's' : ''}
            {filtrados.filter(s => s.status === 'ativo').length !== filtrados.length && (
              <span> · {filtrados.filter(s => s.status === 'ativo').length} ativo{filtrados.filter(s => s.status === 'ativo').length !== 1 ? 's' : ''}</span>
            )}
          </div>
        )}
      </div>

      {/* Modais */}
      {modalForm && (
        <SoldadoFormModal
          key={modalForm === 'novo' ? 'novo' : modalForm.id}
          soldado={modalForm === 'novo' ? null : modalForm}
          onSalvar={handleSalvar}
          onFechar={() => setModalForm(null)}
        />
      )}
      {modalImportar && (
        <ImportarModal
          onImportado={handleImportado}
          onFechar={() => setModalImportar(false)}
        />
      )}
    </Layout>
  );
}
