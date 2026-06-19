import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { calcularTAF, BG_CONCEITO } from '../../utils/tafCalculo';
import { avaliacoesService } from '../../services/avaliacoesService';
import { hoje } from '../../utils/data';
import { raExibicao } from '../../utils/nomes';
import styles from './AvaliacaoFormModal.module.scss';

const CAMPO = [
  { key: 'corrida',         label: 'Corrida (m)',     placeholder: 'ex: 2400' },
  { key: 'flexao',          label: 'Flexão de braço', placeholder: 'ex: 35'   },
  { key: 'abdominal',       label: 'Abdominal',       placeholder: 'ex: 48'   },
  { key: 'barra_resultado', label: 'Barra fixa',      placeholder: 'ex: 8'    },
];

function Preview({ corrida, flexao, abdominal, barra }) {
  const vals = [corrida, flexao, abdominal, barra].map(Number);
  if (vals.some((v) => isNaN(v) || v < 0)) return null;
  const { nota, conceito, ptsCorrida, ptsFlexao, ptsAbdominal, ptsBarra } = calcularTAF(...vals);
  return (
    <div className={styles.preview}>
      <div className={styles.previewHeader}>
        <span className={styles.previewLabel}>Prévia do resultado</span>
        <span className={BG_CONCEITO[conceito] ?? ''}>{conceito}</span>
      </div>
      <p className={styles.previewNote}>
        {nota} <span className={styles.previewUnit}>pts</span>
      </p>
      <div className={styles.previewBreakdown}>
        <div><span className={styles.breakdownValue}>{ptsCorrida}</span>Corrida</div>
        <div><span className={styles.breakdownValue}>{ptsFlexao}</span>Flexão</div>
        <div><span className={styles.breakdownValue}>{ptsAbdominal}</span>Abdominal</div>
        <div><span className={styles.breakdownValue}>{ptsBarra}</span>Barra</div>
      </div>
    </div>
  );
}

export default function AvaliacaoFormModal({ avaliacao, soldados, onClose: onFechar, onSaved }) {
  const editando = Boolean(avaliacao);

  const [form, setForm] = useState({
    soldado_id:  avaliacao?.soldado_id  ?? '',
    data:        avaliacao?.data        ?? hoje(),
    corrida:         avaliacao?.corrida         ?? '',
    flexao:          avaliacao?.flexao          ?? '',
    abdominal:       avaliacao?.abdominal       ?? '',
    barra_resultado: avaliacao?.barra_resultado ?? '',
    observacoes:     avaliacao?.observacoes     ?? '',
  });
  const [salvando, setSalvando] = useState(false);
  const [erro,     setErro]     = useState(null);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function submit(e) {
    e.preventDefault();
    setErro(null);
    if (!form.soldado_id) return setErro('Selecione um soldado.');
    setSalvando(true);
    try {
      const payload = {
        ...form,
        soldado_id:      Number(form.soldado_id),
        corrida:         Number(form.corrida),
        flexao:          Number(form.flexao),
        abdominal:       Number(form.abdominal),
        barra_resultado: Number(form.barra_resultado),
      };
      const salvo = editando
        ? await avaliacoesService.atualizar(avaliacao.id, payload)
        : await avaliacoesService.criar(payload);
      onSaved(salvo);
    } catch {
      setErro('Erro ao salvar avaliação.');
    } finally {
      setSalvando(false);
    }
  }

  const previewValida = form.corrida !== '' && form.flexao !== '' && form.abdominal !== '' && form.barra_resultado !== '';

  return (
    <Modal aberto titulo={editando ? 'Editar avaliação' : 'Nova avaliação (TAF)'} onFechar={onFechar}>
      <form onSubmit={submit} className={styles.form}>
        <div>
          <label className={styles.label}>Soldado</label>
          <select
            className={styles.select}
            value={form.soldado_id}
            onChange={(e) => set('soldado_id', e.target.value)}
            disabled={editando}
            required
          >
            <option value="">Selecione…</option>
            {soldados.map((s) => (
              <option key={s.id} value={s.id}>{s.nome_completo ?? s.nome} — {raExibicao(s.ra)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={styles.label}>Data</label>
          <input
            type="date"
            className={styles.input}
            value={form.data}
            onChange={(e) => set('data', e.target.value)}
            required
          />
        </div>

        <div className={styles.metricsGrid}>
          {CAMPO.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className={styles.label}>{label}</label>
              <input
                type="number"
                min="0"
                className={styles.input}
                placeholder={placeholder}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                required
              />
            </div>
          ))}
        </div>

        {previewValida && (
          <Preview corrida={form.corrida} flexao={form.flexao} abdominal={form.abdominal} barra={form.barra_resultado} />
        )}

        <div>
          <label className={styles.label}>Observações (opcional)</label>
          <textarea
            className={styles.textarea}
            rows={2}
            maxLength={500}
            value={form.observacoes}
            onChange={(e) => set('observacoes', e.target.value)}
          />
        </div>

        {erro && <p className={styles.error}>{erro}</p>}

        <div className={styles.footer}>
          <button type="button" onClick={onFechar} className={styles.cancelBtn}>Cancelar</button>
          <button type="submit" disabled={salvando} className={styles.saveBtn}>
            {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Registrar TAF'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
