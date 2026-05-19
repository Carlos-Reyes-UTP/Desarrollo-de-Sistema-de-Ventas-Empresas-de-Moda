import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { RolNombre } from "./types/enums";
import { logger } from "./utils/logger";
import DashboardAdminPage from "./pages/dashboard/DashboardAdminPage";
import DashboardAlmaceneroPage from "./pages/dashboard/DashboardAlmaceneroPage";
import PuntoDeVentaPage from "./pages/ventas/PuntoDeVentaPage";
import VendedorPisoVentasPage from "./pages/ventas/VendedorPisoVentasPage";
import AlmacenTableroPedidosPage from "./pages/almacen/AlmacenTableroPedidosPage";
import GestionUsuariosPage from "./pages/usuarios/GestionUsuariosPage";
import LoginPage from "./pages/auth/LoginPage";
import PaginaNoEncontradaPage from "./pages/errores/PaginaNoEncontradaPage";
import GestionCategoriasPage from "./pages/inventario/GestionCategoriasPage";
import GestionProductosPage from "./pages/inventario/GestionProductosPage";
import GestionProveedoresPage from "./pages/inventario/GestionProveedoresPage";
import ReportesPage from "./pages/reportes/ReportesPage";
import Layout from "./shared/layout/Layout";
import { APP_PATHS } from "./shared/layout/navigationConfig";
import { ROLES_MODULO_ALMACEN } from "./shared/constants/rolesAlmacen";
import { AppShellSkeleton } from "./shared/ui";
import { BandejaSolicitudProvider } from "./context/BandejaSolicitudContext";

const ROLES_DASHBOARD_ALMACENERO: RolNombre[] = [
  "ROLE_ALMACENERO",
  "ROLE_SUPERVISOR_ALMACEN",
];
const ROLES_CAJERO_O_ADMIN: RolNombre[] = ["ROLE_CAJERO", "ROLE_ADMIN"];

/** Tablero de pedidos (almacén ↔ vendedor) — personal de almacén y admin */
const ROLES_TABLERO_ALMACEN: RolNombre[] = [
  "ROLE_ALMACENERO",
  "ROLE_SUPERVISOR_ALMACEN",
  "ROLE_ADMIN",
];

/** Quién puede usar la pantalla y la API de solicitud desde piso de ventas */
const ROLES_VENDEDOR_PISO: RolNombre[] = [
  "ROLE_VENDEDOR",
];

const RedirectToDashboard = () => {
  const { usuario, tieneRol } = useAuth();
  logger.debug("RedirectToDashboard - Usuario:", usuario?.usuario, "Roles:", usuario?.roles);

  if (tieneRol("ROLE_ADMIN")) {
    logger.debug("RedirectToDashboard - redirigiendo a /dashboard/admin");
    return <Navigate to={APP_PATHS.dashboardAdmin} />;
  }

  if (tieneRol("ROLE_ALMACENERO") || tieneRol("ROLE_SUPERVISOR_ALMACEN")) {
    logger.debug("RedirectToDashboard - redirigiendo al tablero de pedidos");
    return <Navigate to={APP_PATHS.almacenTablero} />;
  }

  if (tieneRol("ROLE_VENDEDOR")) {
    return <Navigate to={APP_PATHS.vendedorPiso} />;
  }

  if (tieneRol("ROLE_CAJERO")) {
    logger.debug("RedirectToDashboard - redirigiendo al punto de venta");
    return <Navigate to={APP_PATHS.caja} state={{ view: "apertura" }} />;
  }

  logger.warn("RedirectToDashboard - usuario sin rol reconocido, redirigiendo a /login");
  return <Navigate to={APP_PATHS.login} />;
};

interface RutaProtegidaProps {
  children: ReactNode;
  rolRequerido?: RolNombre | RolNombre[];
}

const RutaProtegida = ({ children, rolRequerido }: RutaProtegidaProps) => {
  const { usuario, tieneRol } = useAuth();
  const location = useLocation();

  const tieneAlgunRol = (roles: RolNombre | RolNombre[]) => {
    if (Array.isArray(roles)) {
      return roles.some((rol) => tieneRol(rol));
    }
    return tieneRol(roles);
  };

  logger.debug("RutaProtegida - Verificando acceso:", location.pathname);

  if (!usuario) {
    logger.debug("RutaProtegida - Sin usuario, redirigiendo a /login");
    return <Navigate to={APP_PATHS.login} state={{ from: location }} replace />;
  }

  if (rolRequerido && !tieneAlgunRol(rolRequerido)) {
    logger.warn(`RutaProtegida - Acceso denegado: se requiere ${rolRequerido}`);
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

interface RutaProtegidaConLayoutProps {
  children: ReactNode;
  rolRequerido?: RolNombre | RolNombre[];
}

const RutaProtegidaConLayout = ({
  children,
  rolRequerido,
}: RutaProtegidaConLayoutProps) => (
  <RutaProtegida rolRequerido={rolRequerido}>
    <Layout>{children}</Layout>
  </RutaProtegida>
);

function App() {
  const { usuario, cargando } = useAuth();
  logger.debug("App - Estado:", usuario ? "Autenticado" : "No autenticado", "| Cargando:", cargando);

  if (cargando) {
    return <AppShellSkeleton />;
  }

  return (
    <Routes>
      <Route path="/" element={<RedirectToDashboard />} />
      <Route
        path={APP_PATHS.login}
        element={usuario && !cargando ? <Navigate to="/" replace /> : <LoginPage />}
      />

      <Route
        path={APP_PATHS.dashboardAdmin}
        element={
          <RutaProtegidaConLayout rolRequerido="ROLE_ADMIN">
            <DashboardAdminPage />
          </RutaProtegidaConLayout>
        }
      />

      <Route
        path={APP_PATHS.dashboardAlmacenero}
        element={
          <RutaProtegidaConLayout rolRequerido={ROLES_DASHBOARD_ALMACENERO}>
            <DashboardAlmaceneroPage />
          </RutaProtegidaConLayout>
        }
      />

      <Route
        path={APP_PATHS.almacenTablero}
        element={
          <RutaProtegidaConLayout rolRequerido={ROLES_TABLERO_ALMACEN}>
            <AlmacenTableroPedidosPage />
          </RutaProtegidaConLayout>
        }
      />

      <Route
        path={APP_PATHS.caja}
        element={
          <RutaProtegidaConLayout rolRequerido={ROLES_CAJERO_O_ADMIN}>
            <PuntoDeVentaPage />
          </RutaProtegidaConLayout>
        }
      />

      <Route
        path={APP_PATHS.vendedorPiso}
        element={
          <RutaProtegidaConLayout rolRequerido={ROLES_VENDEDOR_PISO}>
            <BandejaSolicitudProvider>
              <VendedorPisoVentasPage />
            </BandejaSolicitudProvider>
          </RutaProtegidaConLayout>
        }
      />

      <Route
        path={APP_PATHS.gestionUsuarios}
        element={
          <RutaProtegidaConLayout rolRequerido="ROLE_ADMIN">
            <GestionUsuariosPage />
          </RutaProtegidaConLayout>
        }
      />

      <Route
        path={APP_PATHS.productos}
        element={
          <RutaProtegidaConLayout rolRequerido={ROLES_MODULO_ALMACEN}>
            <GestionProductosPage />
          </RutaProtegidaConLayout>
        }
      />

      <Route
        path={APP_PATHS.proveedores}
        element={
          <RutaProtegidaConLayout rolRequerido={ROLES_MODULO_ALMACEN}>
            <GestionProveedoresPage />
          </RutaProtegidaConLayout>
        }
      />

      <Route
        path={APP_PATHS.categorias}
        element={
          <RutaProtegidaConLayout rolRequerido={ROLES_MODULO_ALMACEN}>
            <GestionCategoriasPage />
          </RutaProtegidaConLayout>
        }
      />

      <Route
        path={APP_PATHS.reportes}
        element={
          <RutaProtegidaConLayout rolRequerido="ROLE_ADMIN">
            <ReportesPage />
          </RutaProtegidaConLayout>
        }
      />

      <Route path="*" element={<PaginaNoEncontradaPage />} />
    </Routes>
  );
}

export default App;
