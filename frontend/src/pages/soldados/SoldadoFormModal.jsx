import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { soldadosService } from '../../services/soldadosService';

const VAZIO = {
  ra: '', nome_completo: '', data_nascimento: '', data_incorporacao: '',
  pelotao: '', turma: '', graduacao: 'atirador', status: 'ativo',
};

function campo(soldado, key) {
  return soldado?.[key] ?? '';
}

export function SoldadoFormModal({ soldado, onSalvar, onFechar }) {
  const editando = !!soldado;
  const [form, setForm] = useState({
    ra: campo(soldado, 'ra'),
    nome_completo: campo(soldado, 'nome_completo'),
    data_nascimento: campo(soldado, 'data_nascimento'),
    data_incorporacao: campo(soldado, 'data_incorporacao'),
    pelotao: campo(soldado, 'pelotao'),
    turma: campo(soldado, 'turma'),
    graduacao: soldado?.graduacao ?? 'atirador',
    status: soldado?.status ?? 'ativo',
  });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErro('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.ra.trim()) { setErro('RA é obrigatório.'); return; }
    if (!form.nome_completo.trim()) { setErro('Nome completo é obrigatório.'); return; }

    setSalvando(true);
    try {
      if (editando) {
        await soldadosService.atualizar(soldado.id, form);
      } else {
        await soldadosService.criar(form);
      }
      onSalvar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal aberto onFechar={onFechar} titulo={editando ? 'Editar Soldado' : 'Novo Soldado'}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-2 gap-4">
          <Field label="RA *" colSpan={1}>
            <input className={input} value={form.ra} onChange={(e) => set('ra', e.target.value)} placeholder="001-1" />
          </Field>

          <Field label="Graduação" colSpan={1}>
            <select className={input} value={form.graduacao} onChange={(e) => set('graduacao', e.target.value)}>
              <option value="atirador">Atirador</option>
              <option value="cabo">Cabo</option>
            </select>
          </Field>

          <Field label="Nome Completo *" colSpan={2}>
            <input className={input} value={form.nome_completo} onChange={(e) => set('nome_completo', e.target.value)} placeholder="SILVA, João Pedro" />
          </Field>

          <Field label="Data de Nascimento" colSpan={1}>
            <input className={input} type="date" value={form.data_nascimento} onChange={(e) => set('data_nascimento', e.target.value)} />
          </Field>

          <Field label="Data de Incorporação" colSpan={1}>
            <input className={input} type="date" value={form.data_incorporacao} onChange={(e) => set('data_incorporacao', e.target.value)} />
          </Field>

          <Field label="Pelotão" colSpan={1}>
            <input className={input} value={form.pelotao} onChange={(e) => set('pelotao', e.target.value)} placeholder="1º Pelotão" />
          </Field>

          <Field label="Turma" colSpan={1}>
            <input className={input} value={form.turma} onChange={(e) => set('turma', e.target.value)} placeholder="2024" />
          </Field>

          {editando && (
            <Field label="Status" colSpan={2}>
              <select className={input} value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="ativo">Ativo</option>
                <option value="licenca">Licença</option>
                <option value="baixado">Baixado</option>
                <option value="dispensado">Dispensado</option>
              </select>
            </Field>
          )}
        </div>

        {erro && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {erro}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onFechar} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="px-5 py-2 text-sm font-medium bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white rounded-lg transition-colors"
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent';

function Field({ label, colSpan, children }) {
  return (
    <div className={colSpan === 2 ? 'col-span-2' : ''}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
