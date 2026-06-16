import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { Usuario } from "@/types/Usuario";
import {
  APP_PATHS,
  isCajeroView,
  resolveSidebarState,
  buildNavTree,
  getNavDestinationVista,
  type NavDestination,
} from "./navigationConfig";
import { NavigationRail } from "./navigation/NavigationRail";
import { NavigationFlyout } from "./navigation/NavigationFlyout";
import { NavigationDrawer } from "./navigation/NavigationDrawer";
import { MaterialIcon } from "@/shared/ui";
import { preloadRoutePath } from "./routePreload";

interface SidebarMenuProps {
  vistaActual: string;
  cambiarVista: (vista: string) => void;
  usuario: Usuario | null;
  cerrarSesion: () => void;
}

const SidebarMenu = ({ vistaActual, cambiarVista, usuario, cerrarSesion }: SidebarMenuProps) => {
  const [openAccordion, setOpenAccordion] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [openFlyoutId, setOpenFlyoutId] = useState<string | null>(null);
  const [flyoutAnchorTop, setFlyoutAnchorTop] = useState<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { tieneRol } = useAuth();

  const destinations = useMemo(() => buildNavTree(tieneRol), [tieneRol]);

  const navigationState = resolveSidebarState({
    pathname: location.pathname,
    stateView: location.state?.view,
    hasRole: tieneRol,
  });

  const flyoutParent = useMemo(
    () => destinations.find((d) => d.id === openFlyoutId) ?? null,
    [destinations, openFlyoutId]
  );

  useEffect(() => {
    if (navigationState.view !== vistaActual) {
      cambiarVista(navigationState.view);
    }

    if (navigationState.accordion > 0) {
      setOpenAccordion(navigationState.accordion);
    }
  }, [navigationState, cambiarVista, vistaActual]);

  useEffect(() => {
    setOpenFlyoutId(null);
    setFlyoutAnchorTop(null);
  }, [location.pathname]);

  const getRoleLabel = () => {
    if (tieneRol("ROLE_ADMIN")) return "ADMINISTRADOR";
    if (tieneRol("ROLE_GERENTE")) return "GERENTE";
    if (tieneRol("ROLE_SUPERVISOR_ALMACEN")) return "SUPERVISOR ALMACÉN";
    if (tieneRol("ROLE_ALMACENERO")) return "GESTOR DE ALMACÉN";
    if (tieneRol("ROLE_VENDEDOR")) return "VENDEDOR";
    if (tieneRol("ROLE_CAJERO")) return "CAJERO";
    return "USUARIO";
  };

  const handleLogout = () => {
    cerrarSesion();
    navigate(APP_PATHS.login);
  };

  const preloadDestination = useCallback((dest: NavDestination) => {
    preloadRoutePath(dest.path);
    dest.children?.forEach((child) => preloadRoutePath(child.path));
  }, []);

  const navigateToDestination = useCallback(
    (dest: NavDestination, closeDrawer = false) => {
      preloadDestination(dest);
      const vista = getNavDestinationVista(dest, tieneRol);
      if (vista !== vistaActual) {
        cambiarVista(vista);
      }

      if (closeDrawer) {
        setIsDrawerOpen(false);
        setTimeout(() => {
          if (dest.path) {
            navigate(dest.path);
          } else if (isCajeroView(vista)) {
            navigate(APP_PATHS.caja, { state: { view: vista } });
          }
        }, 220);
        return;
      }

      setOpenFlyoutId(null);
      if (dest.path) {
        navigate(dest.path);
      } else if (isCajeroView(vista)) {
        navigate(APP_PATHS.caja, { state: { view: vista } });
      }
    },
    [cambiarVista, navigate, preloadDestination, tieneRol, vistaActual]
  );

  const handleRailDestinationClick = (dest: NavDestination) => {
    if (dest.children?.length) {
      setOpenFlyoutId((current) => (current === dest.id ? null : dest.id));
      return;
    }
    navigateToDestination(dest);
  };

  const handleDrawerNavigate = (dest: NavDestination) => {
    navigateToDestination(dest, true);
  };

  return (
    <>
      <NavigationRail
        destinations={destinations}
        vistaActual={vistaActual}
        openFlyoutId={openFlyoutId}
        onDestinationClick={handleRailDestinationClick}
        onDestinationIntent={preloadDestination}
        onLogout={handleLogout}
        onAnchorTopChange={setFlyoutAnchorTop}
      />

      {flyoutParent?.children?.length && flyoutAnchorTop != null ? (
        <NavigationFlyout
          parent={flyoutParent}
          vistaActual={vistaActual}
          anchorTop={flyoutAnchorTop}
          onSelect={(child) => navigateToDestination(child)}
          onIntent={preloadDestination}
          onClose={() => setOpenFlyoutId(null)}
        />
      ) : null}

      <div
        className={`fixed top-0 left-0 right-0 z-[40] border-b border-[var(--app-border-strong)] bg-[var(--app-surface)] shadow-sm transition-opacity duration-200 ease-out md:hidden ${
          isDrawerOpen ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
        aria-hidden={isDrawerOpen}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-elevated)] shadow-sm transition-all duration-200 hover:bg-[var(--app-input)]"
            aria-label="Abrir menú"
          >
            <MaterialIcon icon="menu" className="h-5 w-5 text-[var(--app-text)]" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--app-accent)]">
              <span className="text-[10px] font-bold text-[var(--app-accent-fg)]">DK</span>
            </div>
            <h2 className="text-sm font-bold tracking-widest text-[var(--app-text)]">DK-SYSTEM</h2>
          </div>
        </div>
      </div>

      <NavigationDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        destinations={destinations}
        vistaActual={vistaActual}
        usuario={usuario}
        roleLabel={getRoleLabel()}
        openAccordion={openAccordion}
        onAccordionOpen={(value) => setOpenAccordion(openAccordion === value ? 0 : value)}
        onNavigate={handleDrawerNavigate}
        onLogout={handleLogout}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
      `}</style>
    </>
  );
};

export default SidebarMenu;
