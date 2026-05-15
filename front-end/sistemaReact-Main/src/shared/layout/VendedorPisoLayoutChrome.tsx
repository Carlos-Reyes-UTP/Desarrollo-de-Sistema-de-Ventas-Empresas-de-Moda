import { LogOut, Package } from "lucide-react";
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
    <header className="fixed top-0 left-0 right-0 z-[40] flex h-14 items-center justify-between border-b border-gray-100 bg-white/95 px-4 shadow-sm backdrop-blur-md">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black">
          <Package className="h-4 w-4 text-white" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Piso de ventas
          </p>
          <p className="truncate text-sm font-semibold leading-tight text-black">
            {usuario?.usuario ?? "Vendedor"}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={salir}
        className="flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Cerrar sesión</span>
      </button>
    </header>
  );
}
