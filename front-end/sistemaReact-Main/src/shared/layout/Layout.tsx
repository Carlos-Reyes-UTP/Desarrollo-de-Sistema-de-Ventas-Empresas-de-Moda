import React, { useState, useEffect } from "react";
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
    setVistaActual((vistaAnterior) =>
      vistaAnterior === vistaDesdeRuta ? vistaAnterior : vistaDesdeRuta
    );
  }, [vistaDesdeRuta]);

  const esKioskAlmacen = vistaActual === "almacen-tablero";
  const esVendedorPisoKiosk = vistaActual === "vendedor-piso";

  return (
    <div className="flex h-screen overflow-hidden relative app-layout-bg caj-layout-bg">
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
          className={`flex-1 min-h-0 ${
            esKioskAlmacen ? "overflow-hidden" : "overflow-y-auto"
          }`}
        >
          <div
            className={`w-full h-full min-h-0 ${
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
