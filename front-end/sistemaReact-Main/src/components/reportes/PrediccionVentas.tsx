import React, { useMemo, useState } from 'react';
import { MaterialIcon, AlertModal, PageActionButton, SectionHeader } from '@/shared/ui';
import { DashboardPanel } from '@/shared/ui/dashboard/DashboardPanel';
import { useReportPeriodContext } from '@/components/reportes/context/ReportPeriodContext';
import { ReporteService } from '@/services/ReporteService';
import type { PrediccionIARequest, PrediccionIAResponse } from '@/types/ReporteVentas';

const formatterNumero = new Intl.NumberFormat('es-PE');

const getWeekOfYear = (date: Date) => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const PrediccionVentas: React.FC = () => {
  const { etiqueta } = useReportPeriodContext();
  const [form, setForm] = useState<PrediccionIARequest>(() => {
    const hoy = new Date();
    return {
      id_producto: 1,
      color: 'ROJO',
      talla: 'M',
      semana_ano: getWeekOfYear(hoy),
      es_campana: 0,
      ventas_semana_pasada: 0,
    };
  });
  const [resultado, setResultado] = useState<PrediccionIAResponse | null>(null);
  const [cargando, setCargando] = useState(false);
  const [alertModal, setAlertModal] = useState<{ open: boolean; message: string; variant: 'error' | 'info' | 'success' }>({
    open: false,
    message: '',
    variant: 'info',
  });

  const cantidadFormateada = useMemo(
    () => (resultado ? formatterNumero.format(resultado.cantidad_recomendada) : '—'),
    [resultado]
  );

  const onChange = (field: keyof PrediccionIARequest, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const enviarPrediccion = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setCargando(true);
      setResultado(null);
      const response = await ReporteService.predecirCantidadRecomendada(form);
      setResultado(response);
    } catch (error) {
      console.error('Error al consultar la predicción:', error);
      setAlertModal({
        open: true,
        message: 'No se pudo obtener la predicción desde el backend.',
        variant: 'error',
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <DashboardPanel className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="h-11 w-11 rounded-2xl bg-[var(--app-bg-muted)] flex items-center justify-center shrink-0">
            <MaterialIcon icon="query_stats" className="h-5 w-5 text-[var(--app-accent)]" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] app-text-faint">Predicción IA</p>
            <h2 className="text-2xl font-black app-heading">Cantidad recomendada</h2>
            <p className="text-sm app-text-muted mt-1">
              Envía los datos al microservicio local y recibe una sola recomendación para el período {etiqueta}.
            </p>
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel className="p-5 sm:p-6">
        <SectionHeader title="Datos de entrada" subtitle="Completa los seis campos que espera el microservicio de IA" />

        <form className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5" onSubmit={enviarPrediccion}>
          <label className="space-y-2">
            <span className="block text-[10px] font-black uppercase tracking-wider app-text-faint">ID de Producto</span>
            <input
              type="number"
              min={1}
              value={form.id_producto}
              onChange={(e) => onChange('id_producto', Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] app-heading text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="block text-[10px] font-black uppercase tracking-wider app-text-faint">Color</span>
            <input
              type="text"
              value={form.color}
              onChange={(e) => onChange('color', e.target.value.toUpperCase())}
              className="w-full px-3 py-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] app-heading text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="block text-[10px] font-black uppercase tracking-wider app-text-faint">Talla</span>
            <input
              type="text"
              value={form.talla}
              onChange={(e) => onChange('talla', e.target.value.toUpperCase())}
              className="w-full px-3 py-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] app-heading text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="block text-[10px] font-black uppercase tracking-wider app-text-faint">Semana del año</span>
            <input
              type="number"
              min={1}
              max={53}
              value={form.semana_ano}
              onChange={(e) => onChange('semana_ano', Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] app-heading text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="block text-[10px] font-black uppercase tracking-wider app-text-faint">Es campaña</span>
            <select
              value={form.es_campana}
              onChange={(e) => onChange('es_campana', Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] app-heading text-sm"
            >
              <option value={0}>No</option>
              <option value={1}>Sí</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="block text-[10px] font-black uppercase tracking-wider app-text-faint">Ventas semana pasada</span>
            <input
              type="number"
              min={0}
              value={form.ventas_semana_pasada}
              onChange={(e) => onChange('ventas_semana_pasada', Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] app-heading text-sm"
            />
          </label>

          <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-2">
            <PageActionButton type="submit" disabled={cargando}>
              <MaterialIcon icon="psychology" className="h-4 w-4" />
              {cargando ? 'Consultando...' : 'Predecir cantidad'}
            </PageActionButton>
          </div>
        </form>
      </DashboardPanel>

      <DashboardPanel className="p-5 sm:p-6">
        <SectionHeader title="Resultado" subtitle="El backend devuelve solo la cantidad recomendada" />

        <div className="mt-5 grid grid-cols-1 gap-4">
          <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-bg-muted)] p-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] app-text-faint">Cantidad recomendada</p>
              <p className="mt-2 text-4xl font-black app-heading tabular-nums">{cantidadFormateada}</p>
            </div>
            <span className="h-14 w-14 rounded-2xl bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] flex items-center justify-center">
              <MaterialIcon icon="shopping_bag" className="h-7 w-7 text-[var(--app-accent)]" />
            </span>
          </div>

          {resultado ? (
            <div className="text-sm app-text-muted">
              La recomendación se obtuvo correctamente con el backend principal conectado a FastAPI.
            </div>
          ) : (
            <div className="text-sm app-text-muted">
              Todavía no se ha ejecutado ninguna predicción.
            </div>
          )}
        </div>
      </DashboardPanel>

      <AlertModal
        open={alertModal.open}
        message={alertModal.message}
        variant={alertModal.variant}
        onClose={() => setAlertModal((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default PrediccionVentas;
