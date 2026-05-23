import { useRef, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { soldadosService } from '../../services/soldadosService';

export function ImportarModal({ onImportado, onFechar }) {
  const inputRef = useRef(null);
  const [arquivo, setArquivo] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [baixando, setBaixando] = useState(false);

  function handleArquivo(e) {
    const f = e.target.files[0];
    if (!f) return;
    setArquivo(f);
    setResultado(null);
    setErro('');
  }

  async function handleImportar() {
    if (!arquivo) return;
    setEnviando(true);
    try {
      const res = await soldadosService.importar(arquivo);
      setResultado(res);
      if (res.importados > 0) onImportado();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao importar arquivo.');
      const errosExtra = err.response?.data?.erros;
      if (errosExtra?.length) setResultado({ importados: 0, erros: errosExtra });
    } finally {
      setEnviando(false);
    }
  }

  async function handleBaixarModelo() {
    setBaixando(true);
    try {
      await soldadosService.baixarModelo();
    } finally {
      setBaixando(false);
    }
  }

  return (
    <Modal aberto onFechar={onFechar} titulo="Importar Soldados">
      <div className="space-y-4">
        {/* Modelo */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Modelo de planilha</p>
            <p className="text-xs text-gray-500 mt-0.5">Preencha e importe para cadastrar em lote.</p>
          </div>
          <button
            onClick={handleBaixarModelo}
            disabled={baixando}
            className="text-sm text-green-700 hover:text-green-900 font-medium disabled:opacity-60"
          >
            {baixando ? 'Baixando...' : 'Baixar modelo'}
          </button>
        </div>

        {/* Upload */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Arquivo (.xlsx ou .csv)</p>
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-500 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            {arquivo ? (
              <p className="text-sm text-gray-700 font-medium">{arquivo.name}</p>
            ) : (
              <p className="text-sm text-gray-400">Clique para selecionar o arquivo</p>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleArquivo}
            />
          </div>
        </div>

        {/* Resultado */}
        {resultado && (
          <div className={`rounded-lg px-4 py-3 text-sm ${resultado.importados > 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            {resultado.importados > 0 && (
              <p className="font-medium text-green-800">
                {resultado.importados} soldado{resultado.importados !== 1 ? 's' : ''} importado{resultado.importados !== 1 ? 's' : ''} com sucesso.
              </p>
            )}
            {resultado.erros?.length > 0 && (
              <div className="mt-2">
                <p className="font-medium text-yellow-800">{resultado.erros.length} linha{resultado.erros.length !== 1 ? 's' : ''} com erro:</p>
                <ul className="mt-1 space-y-0.5 list-disc list-inside text-yellow-700">
                  {resultado.erros.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {erro && !resultado && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onFechar} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            {resultado?.importados > 0 ? 'Fechar' : 'Cancelar'}
          </button>
          {!resultado?.importados && (
            <button
              onClick={handleImportar}
              disabled={!arquivo || enviando}
              className="px-5 py-2 text-sm font-medium bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white rounded-lg transition-colors"
            >
              {enviando ? 'Importando...' : 'Importar'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
