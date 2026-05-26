import { MaterialIcon } from "@/shared/ui";
import { useNavigate } from "react-router-dom";
import type { Usuario } from "../../types/Usuario";
import { APP_PATHS } from "./navigationConfig";

interface VendedorPisoLayoutChromeProps {
  usuario: Usuario | null;
  cerrarSesion: () => void;
}

/** Barra mínima: solo contexto de piso y salir (sin menú de navegación). */
export function VendedorPisoLayoutChrome({
  usuario,
  cerrarSesion,
}: VendedorPisoLayoutChromeProps) {
  const navigate = useNavigate();

  const salir = () => {
    cerrarSesion();
    navigate(APP_PATHS.login, { replace: true });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[40] flex h-14 items-center justify-between app-card-glass border-b px-4 shadow-sm">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black">
          <MaterialIcon icon="inventory_2" className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-widest app-text-muted">
            Piso de ventas
          </p>
          <p className="truncate text-sm font-semibold leading-tight app-heading">
            {usuario?.usuario ?? "Vendedor"}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={salir}
        className="flex shrink-0 items-center gap-2 rounded-xl border app-btn-secondary px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
      >
        <MaterialIcon icon="logout" className="h-4 w-4" />
        <span className="hidden sm:inline">Cerrar sesión</span>
      </button>
    </header>
  );
}
