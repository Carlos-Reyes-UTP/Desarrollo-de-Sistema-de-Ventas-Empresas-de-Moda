import { MaterialIcon } from '@/shared/ui';
import { DashboardPanel } from '@/shared/ui/dashboard/DashboardPanel';
import type { VarianteRankItem } from '@/utils/dashboardMes';

export interface DashboardVariantRankPanelProps {
  top: VarianteRankItem[];
  bottom: VarianteRankItem[];
}

function RankList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: VarianteRankItem[];
  emptyLabel: string;
}) {
  return (
    <DashboardPanel className="!p-5">
      <h3 className="text-sm font-black app-heading mb-3">{title}</h3>
      {items.length === 0 ? (
        <div className="py-6 flex flex-col items-center gap-2 text-center">
          <MaterialIcon icon="inventory_2" className="w-7 h-7 app-text-faint" />
          <p className="text-xs font-bold app-text-muted">{emptyLabel}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-baseline justify-between gap-3 border-b border-[var(--app-border)] pb-2 last:border-0"
            >
              <span className="text-sm app-heading leading-snug">{item.label}</span>
              <span className="text-sm font-bold tabular-nums app-heading shrink-0">{item.unidades}</span>
            </li>
          ))}
        </ul>
      )}
    </DashboardPanel>
  );
}

export function DashboardVariantRankPanel({ top, bottom }: DashboardVariantRankPanelProps) {
  return (
    <div className="space-y-4">
      <RankList title="Más vendidas" items={top} emptyLabel="Sin movimiento este mes" />
      <RankList title="Menos vendidas" items={bottom} emptyLabel="No hay suficientes variantes para el ranking" />
    </div>
  );
}
