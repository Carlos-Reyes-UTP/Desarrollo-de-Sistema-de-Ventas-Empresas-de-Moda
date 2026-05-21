import { useBandeja } from "../../context/BandejaSolicitudContext";
import { MaterialIcon } from "@/shared/ui";

interface Props {
  onClick: () => void;
}

/**
 * Botón flotante que muestra el número de ítems en la bandeja de solicitudes.
 * Solo visible cuando hay al menos 1 ítem. Se anima con un bounce al cambiar el conteo.
 */
export function BandejaFAB({ onClick }: Props) {
  const { total } = useBandeja();

  if (total === 0) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ver bandeja de solicitudes (${total} ítems)`}
      className="fixed bottom-24 right-6 z-[150] flex items-center gap-2.5 rounded-[2rem] bg-black px-5 py-3.5 text-white shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-all hover:bg-gray-900 hover:scale-105 active:scale-95 animate-fadeIn"
      style={{
        // Por encima del dock de pedidos (z-[100]) pero debajo de modals (z-[200])
      }}
    >
      <MaterialIcon icon="assignment" className="h-5 w-5 flex-shrink-0" />
      <span className="text-sm font-black tracking-tight">Lista</span>
      {/* Badge */}
      <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-black text-black shadow-sm">
        {total}
      </span>
    </button>
  );
}
