import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import type { RolNombre } from "./interfaces/enums";
import DashboardAdmin from "./pages/DashboardAdmin";
import DashboardAlmacenero from "./pages/DashboardAlmacenero";
import CajeroSistemaVentas from "./pages/CajeroSistemaVentas";
import GestionUsuarios from "./pages/GestionUsuarios";
import Login from "./pages/Login";
import PaginaNoEncontrada from "./pages/PaginaNoEncontrada";
import Reportes from "./pages/Reportes";
import GestionCategorias from "./components/categorias/GestionCategorias";
import Layout from "./components/layout/Layout";
import GestionColores from "./components/productos/GestionColores";
import GestionProductos from "./components/productos/GestionProductos";
import GestionTallas from "./components/productos/GestionTallas";
import GestionProveedores from "./components/proveedores/GestionProveedores";

const ROLES_ADMIN_O_ALMACENERO: RolNombre[] = [
  "ROLE_ADMIN",
  "ROLE_ALMACENERO",
];
const ROLES_CAJERO_O_ADMIN: RolNombre[] = ["ROLE_CAJERO", "ROLE_ADMIN"];

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
    return <Navigate to="/dashboard/admin" />;
  }

  if (tieneRol("ROLE_ALMACENERO")) {
    console.log(
      "RedirectToDashboard - Usuario es ALMACENERO, redirigiendo a /dashboard/almacenero"
    );
    return <Navigate to="/dashboard/almacenero" />;
  }

  if (tieneRol("ROLE_CAJERO")) {
    console.log(
      "RedirectToDashboard - Usuario es CAJERO, redirigiendo a /pages/CajeroSistemaVentas"
    );
    return <Navigate to="/pages/CajeroSistemaVentas" />;
  }

  console.log(
    "RedirectToDashboard - Usuario sin rol reconocido, redirigiendo a /login"
  );
  return <Navigate to="/login" />;
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
    return <Navigate to="/login" state={{ from: location }} replace />;
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
        path="/login"
        element={usuario && !cargando ? <Navigate to="/" replace /> : <Login />}
      />

      <Route
        path="/dashboard/admin"
        element={
          <RutaProtegidaConLayout rolRequerido="ROLE_ADMIN">
            <DashboardAdmin />
          </RutaProtegidaConLayout>
        }
      />

      <Route
        path="/dashboard/almacenero"
        element={
          <RutaProtegidaConLayout rolRequerido="ROLE_ALMACENERO">
            <DashboardAlmacenero />
          </RutaProtegidaConLayout>
        }
      />

      <Route
        path="/pages/CajeroSistemaVentas"
        element={
          <RutaProtegidaConLayout rolRequerido={ROLES_CAJERO_O_ADMIN}>
            <CajeroSistemaVentas />
          </RutaProtegidaConLayout>
        }
      />

      <Route
        path="/pages/gestion-usuarios"
        element={
          <RutaProtegidaConLayout rolRequerido="ROLE_ADMIN">
            <GestionUsuarios />
          </RutaProtegidaConLayout>
        }
      />

      <Route
        path="/pages/productos"
        element={
          <RutaProtegidaConLayout rolRequerido={ROLES_ADMIN_O_ALMACENERO}>
            <GestionProductos />
          </RutaProtegidaConLayout>
        }
      />

      <Route
        path="/pages/colores"
        element={
          <RutaProtegidaConLayout rolRequerido={ROLES_ADMIN_O_ALMACENERO}>
            <GestionColores />
          </RutaProtegidaConLayout>
        }
      />

      <Route
        path="/pages/tallas"
        element={
          <RutaProtegidaConLayout rolRequerido={ROLES_ADMIN_O_ALMACENERO}>
            <GestionTallas />
          </RutaProtegidaConLayout>
        }
      />

      <Route
        path="/pages/proveedores"
        element={
          <RutaProtegidaConLayout rolRequerido={ROLES_ADMIN_O_ALMACENERO}>
            <GestionProveedores />
          </RutaProtegidaConLayout>
        }
      />

      <Route
        path="/pages/categorias"
        element={
          <RutaProtegidaConLayout rolRequerido={ROLES_ADMIN_O_ALMACENERO}>
            <GestionCategorias />
          </RutaProtegidaConLayout>
        }
      />

      <Route
        path="/pages/reportes"
        element={
          <RutaProtegidaConLayout rolRequerido="ROLE_ADMIN">
            <Reportes />
          </RutaProtegidaConLayout>
        }
      />

      <Route path="*" element={<PaginaNoEncontrada />} />
    </Routes>
  );
}

export default App;
