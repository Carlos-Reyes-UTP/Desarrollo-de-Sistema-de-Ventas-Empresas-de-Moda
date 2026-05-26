import type { CoberturaUbicaciones, ResumenGlobalUbicaciones } from '@/types/EstructuraAlmacen';
import { MaterialIcon } from '@/shared/ui';

interface UbicacionesResumenBarProps {
  global: ResumenGlobalUbicaciones;
  cobertura: CoberturaUbicaciones;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: string;
  muted?: boolean;
  iconIndex: 1 | 2 | 3 | 4 | 5;
}

const MetricCard = ({ label, value, icon, muted, iconIndex }: MetricCardProps) => (
  <div className="app-metric-card rounded-[30px] border p-5 min-h-[100px] flex flex-col justify-between text-left transition-all duration-300 ease-out hover:-translate-y-0.5 animate-slideUpFade">
    <div className="flex items-start justify-between gap-2">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 app-metric-icon-${iconIndex} transition-all duration-300`}>
        <MaterialIcon icon={icon} className="w-5 h-5" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] app-metric-label text-right leading-tight pt-0.5">
        {label}
      </p>
    </div>
    <p
      className={`text-3xl font-black tabular-nums leading-none mt-3 app-metric-value ${
        muted ? 'opacity-50' : ''
      }`}
    >
      {value}
    </p>
  </div>
);

const UbicacionesResumenBar = ({ global, cobertura }: UbicacionesResumenBarProps) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4 pt-4 pb-3">
    <MetricCard label="Ubicaciones" value={global.totalUbicaciones} icon="place" iconIndex={2} />
    <MetricCard label="Operativas" value={global.totalOperativas} icon="check_circle" iconIndex={1} />
    <MetricCard label="Con stock" value={global.totalConStock} icon="inventory_2" iconIndex={3} />
    <MetricCard
      label="Por crear"
      value={cobertura.combinacionesFaltantes}
      icon="post_add"
      iconIndex={4}
      muted={cobertura.combinacionesFaltantes === 0}
    />
  </div>
);

export default UbicacionesResumenBar;
