import { MaterialIcon } from '@/shared/ui';

interface ReportActionsPanelProps {
  title?: string;
  actions: string[];
}

export const ReportActionsPanel = ({
  title = 'Acciones sugeridas',
  actions,
}: ReportActionsPanelProps) => (
  <div className="rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-text)] text-[var(--app-bg)] p-6 flex flex-col min-h-[200px]">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-black uppercase tracking-widest">{title}</h3>
      <span className="h-6 px-2 rounded-full bg-[color-mix(in_srgb,var(--app-accent-fg,#fff)_12%,transparent)] text-[10px] font-black flex items-center">
        {actions.length} pasos
      </span>
    </div>
    <ol className="space-y-3 flex-1">
      {actions.map((action, i) => (
        <li key={i} className="flex gap-3 text-sm leading-snug opacity-90">
          <span className="h-6 w-6 rounded-full bg-[color-mix(in_srgb,var(--app-accent-fg,#fff)_18%,transparent)] flex items-center justify-center text-[10px] font-black shrink-0">
            {i + 1}
          </span>
          <span>{action}</span>
        </li>
      ))}
    </ol>
    <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider opacity-60">
      <MaterialIcon icon="analytics" className="w-4 h-4" />
      Basado en datos del período seleccionado
    </div>
  </div>
);
