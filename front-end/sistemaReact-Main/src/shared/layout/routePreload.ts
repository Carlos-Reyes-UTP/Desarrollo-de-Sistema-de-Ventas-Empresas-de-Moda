import { APP_PATHS } from "./navigationConfig";

type PreloadFn = () => Promise<unknown>;

const preloadByPath: Record<string, PreloadFn> = {
  [APP_PATHS.dashboardAdmin]: () => import("@/pages/dashboard/DashboardAdminPage"),
  [APP_PATHS.dashboardGerente]: () => import("@/pages/dashboard/DashboardGerentePage"),
  [APP_PATHS.dashboardAlmacenero]: () => import("@/pages/dashboard/DashboardAlmaceneroPage"),
  [APP_PATHS.almacenTablero]: () => import("@/pages/almacen/AlmacenTableroPedidosPage"),
  [APP_PATHS.caja]: () => import("@/pages/ventas/PuntoDeVentaPage"),
  [APP_PATHS.vendedorPiso]: () => import("@/pages/ventas/VendedorPisoVentasPage"),
  [APP_PATHS.gestionUsuarios]: () => import("@/pages/usuarios/GestionUsuariosPage"),
  [APP_PATHS.gerenteUsuarios]: () => import("@/pages/usuarios/GestionUsuariosPage"),
  [APP_PATHS.gerentePisos]: () => import("@/pages/gerente/GestionEstructuraAlmacenPage"),
  [APP_PATHS.productos]: () => import("@/pages/inventario/GestionProductosPage"),
  [APP_PATHS.proveedores]: () => import("@/pages/inventario/GestionProveedoresPage"),
  [APP_PATHS.categorias]: () => import("@/pages/inventario/GestionCategoriasPage"),
  [APP_PATHS.reportes]: () => import("@/pages/reportes/ReportesPage"),
};

const preloadedPaths = new Set<string>();

export const preloadRoutePath = (path?: string): void => {
  if (!path) return;

  const loader = preloadByPath[path];
  if (!loader || preloadedPaths.has(path)) return;

  preloadedPaths.add(path);
  void loader().catch(() => {
    preloadedPaths.delete(path);
  });
};
