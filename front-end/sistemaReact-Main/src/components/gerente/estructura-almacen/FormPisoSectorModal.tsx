import AppModal from '@/shared/ui/AppModal';
import { MaterialIcon } from '@/shared/ui';
import type { FormPisoSector } from './types';

interface FormPisoSectorModalProps {
  form: FormPisoSector | null;
  guardando: boolean;
  onClose: () => void;
  onChange: (form: FormPisoSector) => void;
  onGuardar: () => void;
}

const FormPisoSectorModal = ({
  form,
  guardando,
  onClose,
  onChange,
  onGuardar,
}: FormPisoSectorModalProps) => {
  if (!form) return null;

  const esPiso = form.tipo === 'piso';
  const titulo =
    form.modo === 'crear'
      ? esPiso
        ? 'Nuevo piso'
        : 'Nuevo sector'
      : esPiso
        ? 'Editar piso'
        : 'Editar sector';

  return (
    <AppModal
      open
      onClose={onClose}
      title={titulo}
      subtitle={esPiso ? 'Nivel físico del local' : 'Línea de catálogo'}
      icon={<MaterialIcon icon={esPiso ? 'layers' : 'category'} className="w-5 h-5 text-white" />}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 app-modal-cancel rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={guardando}
            onClick={onGuardar}
            className="flex-1 py-4 app-btn-primary rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      }
    >
      <label className="block text-[10px] font-bold app-text-faint uppercase tracking-widest mb-2">
        Nombre
      </label>
      <input
        type="text"
        autoFocus
        maxLength={120}
        value={form.nombre}
        onChange={(e) => onChange({ ...form, nombre: e.target.value })}
        className="app-input-surface w-full py-4 px-4 rounded-xl text-sm font-medium text-[var(--app-text)] border border-[var(--app-border-strong)] focus:ring-2 focus:ring-[var(--app-ring)] transition-all"
        placeholder={esPiso ? 'Ej. Piso 2' : 'Ej. Accesorios'}
      />
    </AppModal>
  );
};

export default FormPisoSectorModal;
