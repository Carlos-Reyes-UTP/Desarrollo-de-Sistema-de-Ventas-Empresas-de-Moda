import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import type { RolNombre } from "./types/enums";
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

const ROLES_ADMIN_O_ALMACENERO: RolNombre[] = [
  "ROLE_ADMIN",
  "ROLE_ALMACENERO",
];
const ROLES_DASHBOARD_ALMACENERO: RolNombre[] = ["ROLE_ALMACENERO"];
const ROLES_CAJERO_O_ADMIN: RolNombre[] = ["ROLE_CAJERO", "ROLE_ADMIN"];

/** Tablero de pedidos (almacén ↔ vendedor) — solo personal de almacén y admin */
const ROLES_TABLERO_ALMACEN: RolNombre[] = [
  "ROLE_ALMACENERO",
  "ROLE_ADMIN",
];

/** Quién puede usar la pantalla y la API de solicitud desde piso de ventas */
const ROLES_VENDEDOR_PISO: RolNombre[] = [
  "ROLE_VENDEDOR",
];

const RedirectToDashboard = () => {
  const { usuario, tieneRol } = useAuth();
  console.log(
    "RedirectToDashboard - Usuario:",
    usuario?.usuario,
    "Roles:",
    usuario?.roles
  );

  if (tieneRol("ROLE_ADMIN")) {
    console.log(
      "RedirectToDashboard - Usuario es ADMIN, redirigiendo a /dashboard/admin"
    );
    return <Navigate to={APP_PATHS.dashboardAdmin} />;
  }

  if (tieneRol("ROLE_ALMACENERO")) {
    console.log(
      "RedirectToDashboard - Usuario es ALMACENERO, redirigiendo al tablero de pedidos"
    );
    return <Navigate to={APP_PATHS.almacenTablero} />;
  }

  if (tieneRol("ROLE_VENDEDOR")) {
    return <Navigate to={APP_PATHS.vendedorPiso} />;
  }

  if (tieneRol("ROLE_CAJERO")) {
    console.log(
      "RedirectToDashboard - Usuario es CAJERO, redirigiendo al punto de venta"
    );
  return <Navigate to={APP_PATHS.caja} state={{ view: "apertura" }} />;
  }

  console.log(
    "RedirectToDashboard - Usuario sin rol reconocido, redirigiendo a /login"
  );
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

  console.log("RutaProtegida - Verificando acceso:", {
    ruta: location.pathname,
    usuarioPresente: !!usuario,
    rolRequerido,
    tieneRolRequerido: rolRequerido ? tieneAlgunRol(rolRequerido) : true,
  });

  if (!usuario) {
    console.log("RutaProtegida - No hay usuario, redirigiendo a /login");
    return <Navigate to={APP_PATHS.login} state={{ from: location }} replace />;
  }

  if (rolRequerido && !tieneAlgunRol(rolRequerido)) {
    console.log(
      `RutaProtegida - Usuario no tiene rol(es) ${rolRequerido}, redirigiendo a /`
    );
    return <Navigate to="/" replace />;
  }

  console.log("RutaProtegida - Acceso permitido");
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
  console.log("App renderizando");
  const { usuario, cargando } = useAuth();
  console.log(
    "App - Estado de usuario:",
    usuario ? "Autenticado" : "No autenticado",
    "Cargando:",
    cargando
  );

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
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
            <VendedorPisoVentasPage />
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
          <RutaProtegidaConLayout rolRequerido={ROLES_ADMIN_O_ALMACENERO}>
            <GestionProductosPage />
          </RutaProtegidaConLayout>
        }
      />

      <Route
        path={APP_PATHS.proveedores}
        element={
          <RutaProtegidaConLayout rolRequerido={ROLES_ADMIN_O_ALMACENERO}>
            <GestionProveedoresPage />
          </RutaProtegidaConLayout>
        }
      />

      <Route
        path={APP_PATHS.categorias}
        element={
          <RutaProtegidaConLayout rolRequerido={ROLES_ADMIN_O_ALMACENERO}>
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
