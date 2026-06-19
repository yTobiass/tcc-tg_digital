import { useMemo, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { soldadosService } from '../../services/soldadosService';
import { formatarCelular } from '../../utils/nomes';
import styles from './SoldadoFormModal.module.scss';

function campo(soldado, key) {
  return soldado?.[key] ?? '';
}

// `soldadosExistentes`: efetivo da turma ativa já carregado pela tela de Soldados,
// usado para validar inline se o RA digitado já está em uso.
export function SoldadoFormModal({ soldado, soldadosExistentes = [], onSalvar, onFechar }) {
  const editando = !!soldado;
  const [form, setForm] = useState({
    ra: campo(soldado, 'ra'),
    nome_completo: campo(soldado, 'nome_completo'),
    nome_guerra: campo(soldado, 'nome_guerra'),
    celular: campo(soldado, 'celular'),
    data_nascimento: campo(soldado, 'data_nascimento'),
    data_incorporacao: campo(soldado, 'data_incorporacao'),
    pelotao: campo(soldado, 'pelotao'),
    turma: campo(soldado, 'turma'),
    graduacao: soldado?.graduacao ?? 'atirador',
    status: soldado?.status ?? 'ativo',
  });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Conflito de RA dentro da turma ativa (lista já é a da turma ativa).
  // Na edição, ignora o próprio registro.
  const raEmUso = useMemo(() => {
    const ra = form.ra.trim();
    if (!ra) return false;
    return soldadosExistentes.some((s) => s.ra === ra && s.id !== soldado?.id);
  }, [form.ra, soldadosExistentes, soldado?.id]);

  function set(key, valor) {
    setForm((f) => ({ ...f, [key]: valor }));
    setErro('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.ra.trim()) { setErro('RA é obrigatório.'); return; }
    if (raEmUso) { setErro('Este RA já está em uso nesta turma.'); return; }
    if (!form.nome_completo.trim()) { setErro('Nome completo é obrigatório.'); return; }
    if (!form.nome_guerra.trim()) { setErro('O nome de guerra é obrigatório.'); return; }

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
        <div className={styles.grid}>
          <Field label="RA *">
            <input
              className={styles.input}
              value={form.ra}
              onChange={(e) => set('ra', e.target.value)}
              placeholder="001-1"
              aria-invalid={raEmUso}
              style={raEmUso ? { borderColor: '#dc2626' } : undefined}
            />
            {raEmUso && <p className={styles.fieldError}>Este RA já está em uso nesta turma.</p>}
          </Field>

          <Field label="Graduação">
            <select className={styles.select} value={form.graduacao} onChange={(e) => set('graduacao', e.target.value)}>
              <option value="atirador">Atirador</option>
              <option value="cabo">Cabo</option>
            </select>
          </Field>

          <Field label="Nome Completo *" fullWidth>
            <input className={styles.input} value={form.nome_completo} onChange={(e) => set('nome_completo', e.target.value)} placeholder="SILVA, João Pedro" />
          </Field>

          <Field label="Nome de Guerra *">
            <input className={styles.input} value={form.nome_guerra} onChange={(e) => set('nome_guerra', e.target.value)} placeholder="SILVA" />
            <p className={styles.fieldHelp}>Nome pelo qual o soldado é reconhecido no TG. Será exibido em todo o sistema.</p>
          </Field>

          <Field label="Celular">
            <input
              className={styles.input}
              value={form.celular}
              onChange={(e) => set('celular', formatarCelular(e.target.value))}
              placeholder="(19) 99999-1234"
              inputMode="numeric"
            />
            <p className={styles.fieldHelp}>Opcional — deixe em branco se o soldado não tiver celular.</p>
          </Field>

          <Field label="Data de Nascimento">
            <input className={styles.input} type="date" value={form.data_nascimento} onChange={(e) => set('data_nascimento', e.target.value)} />
          </Field>

          <Field label="Data de Incorporação">
            <input className={styles.input} type="date" value={form.data_incorporacao} onChange={(e) => set('data_incorporacao', e.target.value)} />
          </Field>

          <Field label="Pelotão">
            <input className={styles.input} value={form.pelotao} onChange={(e) => set('pelotao', e.target.value)} placeholder="1º Pelotão" />
          </Field>

          <Field label="Turma">
            <input className={styles.input} value={form.turma} onChange={(e) => set('turma', e.target.value)} placeholder="2024" />
          </Field>

          {editando && (
            <Field label="Status" fullWidth>
              <select className={styles.select} value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="ativo">Ativo</option>
                <option value="licenca">Licença</option>
                <option value="baixado">Baixado</option>
                <option value="dispensado">Dispensado</option>
              </select>
            </Field>
          )}
        </div>

        {erro && <p className={styles.error}>{erro}</p>}

        <div className={styles.footer}>
          <button type="button" onClick={onFechar} className={styles.cancelBtn}>
            Cancelar
          </button>
          <button type="submit" disabled={salvando || raEmUso} className={styles.saveBtn}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, fullWidth, children }) {
  return (
    <div className={fullWidth ? styles.colSpan2 : undefined}>
      <label className={styles.label}>{label}</label>
      {children}
    </div>
  );
}
