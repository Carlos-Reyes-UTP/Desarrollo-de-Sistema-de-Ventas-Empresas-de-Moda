import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import type { RolNombre } from "./interfaces/enums";
import Login from "./pages/Login";
import DashboardAdmin from "./pages/DashboardAdmin";
import DashboardAlmacenero from "./pages/DashboardAlmacenero";
import PaginaNoEncontrada from "./pages/PaginaNoEncontrada";
import CajeroSistemaVentas from "./pages/CajeroSistemaVentas";
import Layout from "./components/layout/Layout";
import GestionUsuarios from "./pages/GestionUsuarios";

// Componente para depuración

// Componente para redirigir al dashboard según el rol
const RedirectToDashboard = () => {
  const { usuario, tieneRol } = useAuth();
  console.log(
    "RedirectToDashboard - Usuario:",
    usuario?.usuario,
    "Roles:",
    usuario?.roles
  );

  if (tieneRol("ROLE_ADMIN")) {
    // Cambiado de 'ADMIN'
    console.log(
      "RedirectToDashboard - Usuario es ADMIN, redirigiendo a /dashboard/admin"
    );
    return <Navigate to="/dashboard/admin" />;
  } else if (tieneRol("ROLE_ALMACENERO")) {
    // Cambiado de 'ALMACENERO'
    console.log(
      "RedirectToDashboard - Usuario es ALMACENERO, redirigiendo a /dashboard/almacenero"
    );
    return <Navigate to="/dashboard/almacenero" />;
  } else if (tieneRol("ROLE_CAJERO")) {
    // Cambiado de 'CAJERO'
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

// Componente para rutas protegidas
interface RutaProtegidaProps {
  children: React.ReactNode;
  rolRequerido?: RolNombre | RolNombre[];
}

const RutaProtegida = ({ children, rolRequerido }: RutaProtegidaProps) => {
  const { usuario, tieneRol } = useAuth();
  const location = useLocation();

  const tieneAlgunRol = (roles: RolNombre | RolNombre[]) => {
    if (Array.isArray(roles)) {
      return roles.some(rol => tieneRol(rol));
    }
    return tieneRol(roles);
  };

  console.log("RutaProtegida - Verificando acceso:", {
    ruta: location.pathname,
    usuarioPresente: !!usuario,
    rolRequerido: rolRequerido,
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

function App() {
  console.log("App renderizando");
  const { usuario, cargando } = useAuth();
  console.log(
    "App - Estado de usuario:",
    usuario ? "Autenticado" : "No autenticado",
    "Cargando:",
    cargando
  );

  // Mostrar un indicador de carga mientras se verifica el token
  if (cargando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Ruta principal redirige al dashboard según el rol */}
      <Route path="/" element={<RedirectToDashboard />} />

      {/* Ruta de login - IMPORTANTE: No redirigir si cargando es true */}
      <Route
        path="/login"
        element={usuario && !cargando ? <Navigate to="/" replace /> : <Login />}
      />

      {/* Rutas protegidas con layout global */}
      <Route
        path="/dashboard/admin"
        element={
          <RutaProtegida rolRequerido="ROLE_ADMIN">
            {" "}
            {/* Cambiado de "ADMIN" */}
            <Layout>
              <DashboardAdmin />
            </Layout>
          </RutaProtegida>
        }
      />

      <Route
        path="/dashboard/almacenero"
        element={
          <RutaProtegida rolRequerido="ROLE_ALMACENERO">
            {" "}
            {/* Cambiado de "ALMACENERO" */}
            <Layout>
              <DashboardAlmacenero />
            </Layout>
          </RutaProtegida>
        }
      />

      <Route
        path="/pages/CajeroSistemaVentas"
        element={
          <RutaProtegida rolRequerido={["ROLE_CAJERO", "ROLE_ADMIN"]}>
            <Layout>
              <CajeroSistemaVentas />
            </Layout>
          </RutaProtegida>
        }
      />

      <Route
        path="/pages/GestionUsuarios"
        element={
          <RutaProtegida rolRequerido="ROLE_ADMIN">
            {" "}
            {/* Cambiado de "ADMIN" */}
            <Layout>
              <GestionUsuarios />
            </Layout>
          </RutaProtegida>
        }
      />

      {/* Ruta para páginas no encontradas */}
      <Route path="*" element={<PaginaNoEncontrada />} />
    </Routes>
  );
}

export default App;
