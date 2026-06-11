import { useRef, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { soldadosService } from '../../services/soldadosService';
import styles from './ImportarModal.module.scss';

export function ImportarModal({ onImportado, onFechar }) {
  const inputRef = useRef(null);
  const [arquivo, setArquivo] = useState(null);
  const [dataIncorporacao, setDataIncorporacao] = useState('');
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
    if (!arquivo || !dataIncorporacao) return;
    setEnviando(true);
    try {
      const res = await soldadosService.importar(arquivo, dataIncorporacao);
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
      <div className={styles.stack}>
        <div className={styles.modeloBar}>
          <div>
            <p className={styles.modeloTitle}>Modelo de planilha</p>
            <p className={styles.modeloDesc}>
              A planilha tem apenas a coluna <strong>Nome Completo</strong>. RA (sequencial), pelotão,
              graduação (atirador) e turma são preenchidos automaticamente.
            </p>
          </div>
          <button onClick={handleBaixarModelo} disabled={baixando} className={styles.downloadBtn}>
            {baixando ? 'Baixando...' : 'Baixar modelo'}
          </button>
        </div>

        <div>
          <p className={styles.uploadLabel}>Data de Incorporação (aplicada a todos)</p>
          <input
            type="date"
            value={dataIncorporacao}
            onChange={(e) => setDataIncorporacao(e.target.value)}
            className={styles.dateInput}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
          />
        </div>

        <div>
          <p className={styles.uploadLabel}>Arquivo (.xlsx ou .csv)</p>
          <div className={styles.dropZone} onClick={() => inputRef.current?.click()}>
            {arquivo ? (
              <p className={styles.dropFile}>{arquivo.name}</p>
            ) : (
              <p className={styles.dropText}>Clique para selecionar o arquivo</p>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={handleArquivo}
            />
          </div>
        </div>

        {resultado && (
          <div className={resultado.importados > 0 ? styles.resultSuccess : styles.resultWarn}>
            {resultado.importados > 0 && (
              <p className={styles.resultTitle}>
                {resultado.importados} soldado{resultado.importados !== 1 ? 's' : ''} importado{resultado.importados !== 1 ? 's' : ''} com sucesso.
              </p>
            )}
            {resultado.erros?.length > 0 && (
              <div>
                <p className={styles.resultTitle}>{resultado.erros.length} linha{resultado.erros.length !== 1 ? 's' : ''} com erro:</p>
                <ul className={styles.errorList}>
                  {resultado.erros.map((e, i) => <li key={i} className={styles.errorItem}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {erro && !resultado && (
          <p className={styles.errorMsg}>{erro}</p>
        )}

        <div className={styles.footer}>
          <button onClick={onFechar} className={styles.cancelBtn}>
            {resultado?.importados > 0 ? 'Fechar' : 'Cancelar'}
          </button>
          {!resultado?.importados && (
            <button
              onClick={handleImportar}
              disabled={!arquivo || !dataIncorporacao || enviando}
              className={styles.importBtn}
            >
              {enviando ? 'Importando...' : 'Importar'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
