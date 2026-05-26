import { useMemo } from 'react';
import type { AreaCatalogo, CombinacionFaltante, Piso } from '@/types/EstructuraAlmacen';
import AppModal from '@/shared/ui/AppModal';
import { AppSelect, MaterialIcon } from '@/shared/ui';
import type { FormUbicacion } from './types';
import {
  etiquetaUbicacion,
  parEsCreable,
  pisosDisponiblesParaCrear,
  sectoresDisponiblesParaCrear,
} from './utils';

interface FormUbicacionModalProps {
  form: FormUbicacion | null;
  pisos: Piso[];
  sectores: AreaCatalogo[];
  faltantes: CombinacionFaltante[];
  combinacionesFaltantesTotal: number;
  guardando: boolean;
  onClose: () => void;
  onChange: (form: FormUbicacion) => void;
  onGuardar: () => void;
}

const FormUbicacionModal = ({
  form,
  pisos,
  sectores,
  faltantes,
  combinacionesFaltantesTotal,
  guardando,
  onClose,
  onChange,
  onGuardar,
}: FormUbicacionModalProps) => {
  const pisosOpciones = useMemo(
    () => pisosDisponiblesParaCrear(faltantes, pisos, form?.idArea || undefined),
    [faltantes, pisos, form?.idArea]
  );

  const sectoresOpciones = useMemo(
    () => sectoresDisponiblesParaCrear(faltantes, sectores, form?.idUbicacion || undefined),
    [faltantes, sectores, form?.idUbicacion]
  );

  if (!form) return null;

  const pisoSel = pisos.find((p) => p.idUbicacion === form.idUbicacion);
  const sectorSel = sectores.find((s) => s.idArea === form.idArea);
  const preview =
    pisoSel && sectorSel
      ? etiquetaUbicacion(pisoSel.nombre, sectorSel.nombre)
      : 'Seleccione piso y sector';

  const parValido =
    form.idUbicacion > 0 &&
    form.idArea > 0 &&
    parEsCreable(faltantes, form.idUbicacion, form.idArea);

  const listaFaltantesIncompleta =
    combinacionesFaltantesTotal > faltantes.length && combinacionesFaltantesTotal > 0;

  const onChangePiso = (idUbicacion: number) => {
    const sectoresParaPiso = sectoresDisponiblesParaCrear(faltantes, sectores, idUbicacion);
    const idArea =
      sectoresParaPiso.some((s) => s.idArea === form.idArea)
        ? form.idArea
        : (sectoresParaPiso[0]?.idArea ?? 0);
    onChange({ idUbicacion, idArea });
  };

  const onChangeSector = (idArea: number) => {
    const pisosParaSector = pisosDisponiblesParaCrear(faltantes, pisos, idArea);
    const idUbicacion =
      pisosParaSector.some((p) => p.idUbicacion === form.idUbicacion)
        ? form.idUbicacion
        : (pisosParaSector[0]?.idUbicacion ?? 0);
    onChange({ idUbicacion, idArea });
  };

  return (
    <AppModal
      open
      onClose={onClose}
      title="Nueva ubicación"
      subtitle="Elige el piso y el sector donde registrarás inventario"
      icon={<MaterialIcon icon="place" className="w-5 h-5 text-white" />}
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
            disabled={guardando || !parValido}
            onClick={onGuardar}
            className="flex-1 py-4 app-btn-primary rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] disabled:opacity-50"
          >
            {guardando ? 'Creando…' : 'Crear ubicación'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="text-sm app-text-muted leading-relaxed">
          {combinacionesFaltantesTotal === 0
            ? 'No hay ubicaciones pendientes por registrar.'
            : `Quedan ${combinacionesFaltantesTotal} ubicación${combinacionesFaltantesTotal === 1 ? '' : 'es'} por registrar. Elige una combinación de piso y sector.`}
        </p>
        {listaFaltantesIncompleta && (
          <p className="text-xs app-text-muted flex items-start gap-2 rounded-2xl app-modal-callout px-3 py-2">
            <MaterialIcon icon="info" className="w-4 h-4 shrink-0 mt-0.5 app-text-faint" />
            Hay más pendientes; usa los selects para elegir cualquier par que aún no exista.
          </p>
        )}

        <div>
          <AppSelect
            label="Sector"
            surface="muted"
            value={form.idArea || ''}
            onChange={(v) => onChangeSector(Number(v))}
            disabled={sectoresOpciones.length === 0}
            placeholder="Seleccione un sector"
            options={sectoresOpciones.map((s) => ({ value: s.idArea, label: s.nombre }))}
          />
          {form.idArea > 0 && pisosOpciones.length === 0 && (
            <p className="text-xs app-text-muted mt-2">Este sector ya está en todos los pisos.</p>
          )}
        </div>

        <div>
          <AppSelect
            label="Piso"
            surface="muted"
            value={form.idUbicacion || ''}
            onChange={(v) => onChangePiso(Number(v))}
            disabled={pisosOpciones.length === 0}
            placeholder="Seleccione un piso"
            options={pisosOpciones.map((p) => ({ value: p.idUbicacion, label: p.nombre }))}
          />
          {form.idUbicacion > 0 && sectoresOpciones.length === 0 && (
            <p className="text-xs app-text-muted mt-2">Este piso ya tiene todos los sectores.</p>
          )}
        </div>

        <div className="rounded-2xl app-modal-callout px-4 py-4">
          <p className="text-[10px] font-bold app-text-faint uppercase tracking-widest mb-1">
            Vista previa
          </p>
          <p className="text-base font-bold text-[var(--app-text)]">{preview}</p>
        </div>
      </div>
    </AppModal>
  );
};

export default FormUbicacionModal;
