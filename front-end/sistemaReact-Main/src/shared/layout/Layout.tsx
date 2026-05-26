import React, { useState, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import SidebarMenu from "./SidebarMenu";
import { VendedorPisoLayoutChrome } from "./VendedorPisoLayoutChrome";
import { useAuth } from "@/context/AuthContext";
import { resolveRouteView } from "./navigationConfig";

import MeshGradientBackground from "../ui/MeshGradientBackground";
import { useAppTheme } from "@/context/AppThemeContext";

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const location = useLocation();
  const { usuario, cerrarSesion, tieneRol } = useAuth();
  const { showMesh } = useAppTheme();

  // visible controla el fade-in del contenido.
  // Se oculta INSTANTÁNEAMENTE (sin transición) y se muestra SUAVEMENTE.
  const [visible, setVisible] = useState(true);
  const rafRef = useRef<number | null>(null);

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

  useEffect(() => {
    // 1. Ocultar instantáneamente (sin transición, evita ver el contenido viejo+nuevo superpuestos)
    setVisible(false);

    // 2. Resetear scroll mientras el contenido es invisible
    const mainEl = document.getElementById("main-scroll-area");
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: "instant" });

    // 3. Esperar dos frames: el primero permite que React renderice el nuevo contenido,
    //    el segundo garantiza que el browser lo haya pintado antes del fade-in.
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        setVisible(true); // Ahora sí fade-in suave con el contenido ya listo
      });
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [location.pathname]);

  useEffect(() => {
    setVistaActual((vistaAnterior) =>
      vistaAnterior === vistaDesdeRuta ? vistaAnterior : vistaDesdeRuta
    );
  }, [vistaDesdeRuta]);

  const esKioskAlmacen = vistaActual === "almacen-tablero";
  const esVendedorPisoKiosk = vistaActual === "vendedor-piso";

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
          <div
            className={`w-full h-full min-h-0 page-transition ${
              visible ? "page-transition--visible" : "page-transition--hidden"
            } ${
              esKioskAlmacen || esVendedorPisoKiosk ? "" : "px-4 py-6 sm:px-6 lg:px-8"
            }`}
          >
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
