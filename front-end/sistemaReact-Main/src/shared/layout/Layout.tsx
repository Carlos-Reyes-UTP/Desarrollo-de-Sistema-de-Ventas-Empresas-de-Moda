import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigationType } from "react-router-dom";
import SidebarMenu from "./SidebarMenu";
import { VendedorPisoLayoutChrome } from "./VendedorPisoLayoutChrome";
import { useAuth } from "@/context/AuthContext";
import { resolveRouteView } from "./navigationConfig";
import { usePageTransition } from "./usePageTransition";
import MeshGradientBackground from "../ui/MeshGradientBackground";
import { useAppTheme } from "@/context/AppThemeContext";
import { useSessionExpiryWarning } from "@/hooks/useSessionExpiryWarning";

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { usuario, cerrarSesion, tieneRol } = useAuth();
  const { showMesh } = useAppTheme();
  const { avisoVisible, minutosRestantes, descartar } = useSessionExpiryWarning();

  const pageContent = children ?? <Outlet />;
  const { displayedContent, transitionClass, phase } = usePageTransition(
    location,
    pageContent,
    navigationType
  );

  const meshRgb =
    typeof document !== "undefined"
      ? getComputedStyle(document.documentElement)
          .getPropertyValue("--app-mesh-rgb")
          .trim() || "15, 15, 15"
      : "15, 15, 15";

  const vistaDesdeRuta = resolveRouteView({
    pathname: location.pathname,
    stateView: location.state?.view,
    hasRole: tieneRol,
  });
  const [vistaActual, setVistaActual] = useState(vistaDesdeRuta);
  const [vistaLayout, setVistaLayout] = useState(vistaDesdeRuta);

  useEffect(() => {
    setVistaActual((vistaAnterior) =>
      vistaAnterior === vistaDesdeRuta ? vistaAnterior : vistaDesdeRuta
    );
  }, [vistaDesdeRuta]);

  useEffect(() => {
    if (phase === "idle" || phase === "enter-prep" || phase === "entering") {
      setVistaLayout(vistaActual);
    }
  }, [phase, vistaActual]);

  const esKioskAlmacen = vistaLayout === "almacen-tablero";
  const esVendedorPisoKiosk = vistaLayout === "vendedor-piso";

  return (
    <div 
      className="flex h-screen overflow-hidden relative app-layout-bg caj-layout-bg"
      data-view={vistaActual}
      data-user-role={usuario?.roles?.[0]?.nombreRol}
    >
      {/* Barra de arrastre invisible para arrastrar la ventana en modo PWA (Window Controls Overlay) */}
      <div className="fixed top-0 left-0 right-0 h-8 pointer-events-none z-[9999] md:flex hidden" style={{ WebkitAppRegion: 'drag' } as any}></div>

      {showMesh && (
        <MeshGradientBackground
          blobColorRgb={meshRgb}
          soloPuntero={
            vistaActual === "vendedor-piso" || vistaActual === "almacen-tablero"
          }
        />
      )}
      {esVendedorPisoKiosk ? (
        <VendedorPisoLayoutChrome usuario={usuario} cerrarSesion={cerrarSesion} />
      ) : (
        <SidebarMenu
          vistaActual={vistaActual}
          cambiarVista={setVistaActual}
          usuario={usuario}
          cerrarSesion={cerrarSesion}
        />
      )}
      <div
        className={`flex min-w-0 flex-1 flex-col overflow-hidden bg-transparent ${
          esVendedorPisoKiosk ? "pt-14" : esKioskAlmacen ? "pt-16 lg:pt-0" : "pt-16 md:pt-0"
        }`}
      >
        <main
          id="main-scroll-area"
          className={`flex-1 min-h-0 ${
            esKioskAlmacen ? "overflow-hidden" : "overflow-y-auto"
          }`}
        >
          <div className="relative w-full h-full min-h-0">
            {phase !== "idle" && (
              <div id="page-transition-live-mount" className="page-transition-live-mount" aria-hidden="true">
                {pageContent}
              </div>
            )}
            <div
              className={`w-full h-full min-h-0 page-transition ${transitionClass} ${
                esKioskAlmacen || esVendedorPisoKiosk ? "" : "px-4 py-6 sm:px-6 lg:px-8"
              }`}
            >
              {displayedContent}
            </div>
          </div>
        </main>
      </div>
      {/* Banner de sesión próxima a expirar */}
      {avisoVisible && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border border-amber-400/60 bg-amber-50/95 dark:bg-amber-950/95 backdrop-blur-sm animate-fadeIn"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-100">
            ⚠&nbsp; Tu sesión expira en{' '}
            <strong>{minutosRestantes} min</strong>. Guarda tu trabajo o recarga la página.
          </span>
          <button
            onClick={descartar}
            className="ml-2 text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 transition-colors text-[14px] font-bold leading-none"
            aria-label="Descartar aviso"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default Layout;
