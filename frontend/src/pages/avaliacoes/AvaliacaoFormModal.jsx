import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { calcularTAF, BG_CONCEITO } from '../../utils/tafCalculo';
import { avaliacoesService } from '../../services/avaliacoesService';
import { hoje } from '../../utils/data';

const CAMPO = [
  { key: 'corrida',   label: 'Corrida (m)',      placeholder: 'ex: 2400' },
  { key: 'flexao',    label: 'Flexão de braço',  placeholder: 'ex: 35'   },
  { key: 'abdominal', label: 'Abdominal',        placeholder: 'ex: 48'   },
];

function Preview({ corrida, flexao, abdominal }) {
  const vals = [corrida, flexao, abdominal].map(Number);
  if (vals.some((v) => isNaN(v) || v < 0)) return null;
  const { nota, conceito, ptsCorrida, ptsFlexao, ptsAbdominal } = calcularTAF(...vals);
  const badge = BG_CONCEITO[conceito] ?? '';
  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Prévia do resultado</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge}`}>{conceito}</span>
      </div>
      <p className="text-3xl font-bold text-gray-800 mb-2">{nota} <span className="text-base font-normal text-gray-400">pts</span></p>
      <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-500">
        <div><p className="font-semibold text-gray-700">{ptsCorrida}</p><p>Corrida</p></div>
        <div><p className="font-semibold text-gray-700">{ptsFlexao}</p><p>Flexão</p></div>
        <div><p className="font-semibold text-gray-700">{ptsAbdominal}</p><p>Abdominal</p></div>
      </div>
    </div>
  );
}

export default function AvaliacaoFormModal({ avaliacao, soldados, onClose: onFechar, onSaved }) {
  const editando = Boolean(avaliacao);

  const [form, setForm] = useState({
    soldado_id:  avaliacao?.soldado_id  ?? '',
    data:        avaliacao?.data        ?? hoje(),
    corrida:     avaliacao?.corrida     ?? '',
    flexao:      avaliacao?.flexao      ?? '',
    abdominal:   avaliacao?.abdominal   ?? '',
    observacoes: avaliacao?.observacoes ?? '',
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
        soldado_id: Number(form.soldado_id),
        corrida:    Number(form.corrida),
        flexao:     Number(form.flexao),
        abdominal:  Number(form.abdominal),
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

  const previewValida = form.corrida !== '' && form.flexao !== '' && form.abdominal !== '';

  return (
    <Modal aberto titulo={editando ? 'Editar avaliação' : 'Nova avaliação (TAF)'} onFechar={onFechar}>
      <form onSubmit={submit} className="space-y-4">

        {/* Soldado */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Soldado</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
            value={form.soldado_id}
            onChange={(e) => set('soldado_id', e.target.value)}
            disabled={editando}
            required
          >
            <option value="">Selecione…</option>
            {soldados.map((s) => (
              <option key={s.id} value={s.id}>{s.nome} — {s.ra}</option>
            ))}
          </select>
        </div>

        {/* Data */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Data</label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            value={form.data}
            onChange={(e) => set('data', e.target.value)}
            required
          />
        </div>

        {/* Desempenho */}
        <div className="grid grid-cols-3 gap-3">
          {CAMPO.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
              <input
                type="number"
                min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder={placeholder}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                required
              />
            </div>
          ))}
        </div>

        {/* Prévia em tempo real */}
        {previewValida && (
          <Preview corrida={form.corrida} flexao={form.flexao} abdominal={form.abdominal} />
        )}

        {/* Observações */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Observações (opcional)</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            rows={2}
            maxLength={500}
            value={form.observacoes}
            onChange={(e) => set('observacoes', e.target.value)}
          />
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onFechar}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancelar
          </button>
          <button type="submit" disabled={salvando}
            className="px-5 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
            {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Registrar TAF'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
