import { PERIODOS_REPORTE } from '@/components/reportes/hooks/useReportPeriod';
import { useReportPeriodContext } from '@/components/reportes/context/ReportPeriodContext';

export const ReportPeriodPicker = () => {
  const { periodo, setPeriodo } = useReportPeriodContext();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[10px] font-black app-text-faint uppercase tracking-widest">Período de análisis</p>
      <div className="flex bg-[var(--app-bg-muted)] p-1 rounded-xl border border-[var(--app-border)]">
        {PERIODOS_REPORTE.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriodo(p.id)}
            className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
              periodo === p.id ? 'app-btn-primary shadow-sm' : 'app-text-muted'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
};
