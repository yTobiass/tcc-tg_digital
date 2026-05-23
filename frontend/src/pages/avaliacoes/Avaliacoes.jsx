import { useEffect, useState, useCallback, useMemo } from 'react';
import { Layout } from '../../components/layout/Layout';
import { avaliacoesService } from '../../services/avaliacoesService';
import { soldadosService }   from '../../services/soldadosService';
import { BG_CONCEITO }       from '../../utils/tafCalculo';
import { formatarData }      from '../../utils/data';
import AvaliacaoFormModal    from './AvaliacaoFormModal';
import EvolucaoModal         from './EvolucaoModal';

function BadgeConceito({ conceito }) {
  const cls = BG_CONCEITO[conceito] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {conceito}
    </span>
  );
}

export default function Avaliacoes() {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [soldados,   setSoldados]   = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [busca,          setBusca]          = useState('');
  const [filtroCanceito, setFiltroCanceito] = useState('');

  const [modalForm,     setModalForm]     = useState(null); // null | 'nova' | avaliacao object
  const [modalEvolucao, setModalEvolucao] = useState(null); // null | soldado object

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [av, sol] = await Promise.all([
        avaliacoesService.listar({ limit: 200 }),
        soldadosService.listar({ status: 'ativo' }),
      ]);
      setAvaliacoes(av);
      setSoldados(sol);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase();
    return avaliacoes.filter((a) => {
      const nomeOk    = a.nome?.toLowerCase().includes(q) || a.ra?.toLowerCase().includes(q);
      const concOk    = !filtroCanceito || a.conceito === filtroCanceito;
      return nomeOk && concOk;
    });
  }, [avaliacoes, busca, filtroCanceito]);

  function abrirEvolucao(avaliacao) {
    const soldado = soldados.find((s) => s.id === avaliacao.soldado_id)
      ?? { id: avaliacao.soldado_id, nome: avaliacao.nome };
    setModalEvolucao(soldado);
  }

  async function excluir(av) {
    if (!window.confirm(`Excluir avaliação de ${av.nome} em ${formatarData(av.data)}?`)) return;
    await avaliacoesService.remover(av.id);
    setAvaliacoes((prev) => prev.filter((a) => a.id !== av.id));
  }

  function onSaved(salvo) {
    setAvaliacoes((prev) => {
      const idx = prev.findIndex((a) => a.id === salvo.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = salvo; return n; }
      return [salvo, ...prev];
    });
    setModalForm(null);
  }

  const CONCEITOS = ['Excelente', 'Muito Bom', 'Bom', 'Regular', 'Insuficiente'];

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Avaliações Físicas (TAF)</h1>
        <button
          onClick={() => setModalForm('nova')}
          className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700"
        >
          + Nova avaliação
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar por nome ou RA…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-64"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          value={filtroCanceito}
          onChange={(e) => setFiltroCanceito(e.target.value)}
        >
          <option value="">Todos os conceitos</option>
          {CONCEITOS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {carregando ? (
          <div className="p-8 text-center text-gray-400 text-sm">Carregando…</div>
        ) : filtradas.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {avaliacoes.length === 0 ? 'Nenhuma avaliação registrada.' : 'Nenhuma avaliação encontrada para o filtro.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <th className="px-4 py-3">Soldado</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3 text-center">Corrida (m)</th>
                <th className="px-4 py-3 text-center">Flexão</th>
                <th className="px-4 py-3 text-center">Abdominal</th>
                <th className="px-4 py-3 text-center">Nota</th>
                <th className="px-4 py-3">Conceito</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtradas.map((av) => (
                <tr key={av.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{av.nome}</p>
                    <p className="text-xs text-gray-400">{av.ra}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatarData(av.data)}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{av.corrida}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{av.flexao}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{av.abdominal}</td>
                  <td className="px-4 py-3 text-center font-bold text-gray-800">{av.nota_final}</td>
                  <td className="px-4 py-3"><BadgeConceito conceito={av.conceito} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => abrirEvolucao(av)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Evolução
                      </button>
                      <button
                        onClick={() => setModalForm(av)}
                        className="text-xs text-green-600 hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => excluir(av)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {modalForm && (
        <AvaliacaoFormModal
          key={modalForm === 'nova' ? 'nova' : modalForm.id}
          avaliacao={modalForm === 'nova' ? null : modalForm}
          soldados={soldados}
          onClose={() => setModalForm(null)}
          onSaved={onSaved}
        />
      )}

      {modalEvolucao && (
        <EvolucaoModal
          soldado={modalEvolucao}
          onClose={() => setModalEvolucao(null)}
        />
      )}
    </Layout>
  );
}
