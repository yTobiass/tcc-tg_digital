import { useEffect, useState, useCallback } from 'react';
import { Layout }        from '../../components/layout/Layout';
import { diarioService } from '../../services/diarioService';
import { formatarData, hoje } from '../../utils/data';
import { gerarPdfDiario }    from '../../utils/diarioPDF';
import DiarioForm   from './DiarioForm';

function BadgePdf({ gerado }) {
  return gerado
    ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">PDF gerado</span>
    : <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">Rascunho</span>;
}

export default function Diario() {
  const [view,       setView]       = useState('lista'); // 'lista' | 'form'
  const [editando,   setEditando]   = useState(null);    // null | objeto diário
  const [diarios,    setDiarios]    = useState([]);
  const [total,      setTotal]      = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [paginando,  setPaginando]  = useState(false);
  const [offset,     setOffset]     = useState(0);
  const LIMIT = 20;

  const carregar = useCallback(async (off = 0) => {
    off === 0 ? setCarregando(true) : setPaginando(true);
    try {
      const { dados, total: t } = await diarioService.listar({ limit: LIMIT, offset: off });
      setDiarios(off === 0 ? dados : (prev) => [...prev, ...dados]);
      setTotal(t);
      setOffset(off);
    } finally {
      setCarregando(false);
      setPaginando(false);
    }
  }, []);

  useEffect(() => { carregar(0); }, [carregar]);

  function abrirNovo() {
    setEditando(null);
    setView('form');
  }

  async function abrirEditar(d) {
    // Busca dados completos pelo dia (inclui postos_sentinela e atiradores parseados)
    try {
      const completo = await diarioService.buscarPorData(d.data_servico);
      setEditando(completo);
    } catch {
      setEditando(d);
    }
    setView('form');
  }

  async function reimprimir(d) {
    try {
      const completo = await diarioService.buscarPorData(d.data_servico);
      gerarPdfDiario(completo);
    } catch {
      alert('Erro ao recuperar dados para reimpressão.');
    }
  }

  function onSalvo(diario) {
    setDiarios((prev) => {
      const idx = prev.findIndex((d) => d.id === diario.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = diario; return n; }
      return [diario, ...prev];
    });
    setTotal((t) => t + 1);
    setView('lista');
  }

  if (view === 'form') {
    return (
      <DiarioForm
        inicial={editando}
        onSalvo={onSalvo}
        onCancelar={() => setView('lista')}
      />
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Diário de Rotina</h1>
          <p className="text-xs text-gray-400 mt-0.5">{total} registro{total !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={abrirNovo}
          className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700"
        >
          + Novo Diário
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {carregando ? (
          <div className="p-10 text-center text-gray-400 text-sm">Carregando…</div>
        ) : diarios.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            Nenhum diário registrado ainda.
            <br />
            <button onClick={abrirNovo} className="mt-2 text-green-600 hover:underline text-sm">
              Registrar o primeiro diário
            </button>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">
                  <th className="px-5 py-3">Dia do serviço</th>
                  <th className="px-5 py-3">Para o dia</th>
                  <th className="px-5 py-3">Parada diária</th>
                  <th className="px-5 py-3">Situação</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {diarios.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{formatarData(d.data_servico)}</td>
                    <td className="px-5 py-3 text-gray-500">{formatarData(d.data_para)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium ${d.parada_diaria_status === 'Com Alteração' ? 'text-red-600' : 'text-gray-500'}`}>
                        {d.parada_diaria_status}
                      </span>
                    </td>
                    <td className="px-5 py-3"><BadgePdf gerado={d.pdf_gerado} /></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3 justify-end">
                        {d.pdf_gerado ? (
                          <>
                            <button
                              onClick={() => reimprimir(d)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Reimprimir PDF
                            </button>
                            <button
                              onClick={() => abrirEditar(d)}
                              className="text-xs text-gray-400 hover:underline"
                            >
                              Visualizar
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => abrirEditar(d)}
                            className="text-xs text-green-600 hover:underline"
                          >
                            Editar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {diarios.length < total && (
              <div className="p-4 text-center border-t border-gray-100">
                <button
                  onClick={() => carregar(offset + LIMIT)}
                  disabled={paginando}
                  className="text-sm text-green-600 hover:underline disabled:opacity-40"
                >
                  {paginando ? 'Carregando…' : `Ver mais (${total - diarios.length} restantes)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
