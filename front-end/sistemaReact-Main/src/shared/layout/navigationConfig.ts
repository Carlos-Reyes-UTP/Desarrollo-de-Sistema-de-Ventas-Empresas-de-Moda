import type { RolNombre } from "../../types/enums";
import { esRolModuloAlmacen } from "../constants/rolesAlmacen";

type RoleChecker = (role: RolNombre) => boolean;

const esPersonalAlmacen = (hasRole: RoleChecker): boolean => esRolModuloAlmacen(hasRole);

export type CajeroView = "apertura" | "ventas" | "cierre";

interface ResolveViewInput {
  pathname: string;
  stateView?: unknown;
  hasRole: RoleChecker;
}

interface RouteViewConfig {
  ruta: string;
  admin: string;
  almacenero: string;
  accordionAdmin: number;
  accordionAlmacenero: number;
}

export const APP_PATHS = {
  dashboardAdmin: "/dashboard/admin",
  dashboardGerente: "/dashboard/gerente",
  dashboardAlmacenero: "/dashboard/almacenero",
  caja: "/ventas/punto-de-venta",
  vendedorPiso: "/ventas/vendedor-solicitud-almacen",
  gestionUsuarios: "/admin/usuarios",
  gerenteUsuarios: "/gerente/usuarios",
  gerentePisos: "/gerente/pisos",
  productos: "/inventario/productos",
  proveedores: "/inventario/proveedores",
  categorias: "/inventario/categorias",
  reportes: "/admin/reportes",
  login: "/login",
  almacenTablero: "/almacen/tablero-pedidos",
} as const;

const CAJERO_VIEWS: readonly CajeroView[] = ["apertura", "ventas", "cierre"];

const INVENTORY_ROUTE_CONFIG: readonly RouteViewConfig[] = [
  {
    ruta: APP_PATHS.productos,
    admin: "productos-admin",
    almacenero: "productos-inventario",
    accordionAdmin: 2,
    accordionAlmacenero: 3,
  },
  {
    ruta: APP_PATHS.proveedores,
    admin: "proveedores-admin",
    almacenero: "proveedores",
    accordionAdmin: 2,
    accordionAlmacenero: 3,
  },
  {
    ruta: APP_PATHS.categorias,
    admin: "categorias-admin",
    almacenero: "categorias",
    accordionAdmin: 2,
    accordionAlmacenero: 3,
  },
];

export const isCajeroView = (value: unknown): value is CajeroView =>
  typeof value === "string" &&
  CAJERO_VIEWS.includes(value as CajeroView);

export const getDefaultCajeroView = (): CajeroView =>
  // UX: la pantalla principal del POS debe ser Ventas.
  // Apertura/Cierre se acceden explícitamente con `state.view`.
  "ventas";

export const resolveCajeroView = (
  stateView: unknown
): CajeroView =>
  isCajeroView(stateView) ? stateView : getDefaultCajeroView();

export const resolveRouteView = ({
  pathname,
  stateView,
  hasRole,
}: ResolveViewInput): string => {
  if (pathname.includes(APP_PATHS.dashboardAdmin)) {
    return "dashboard-admin";
  }

  if (pathname.includes(APP_PATHS.dashboardGerente)) {
    return "dashboard-gerente";
  }

  if (pathname.includes(APP_PATHS.dashboardAlmacenero)) {
    return "dashboard-almacenero";
  }

  if (pathname.includes(APP_PATHS.caja)) {
    return resolveCajeroView(stateView);
  }

  if (pathname.includes(APP_PATHS.vendedorPiso)) {
    return "vendedor-piso";
  }

  if (pathname.includes(APP_PATHS.almacenTablero)) {
    return "almacen-tablero";
  }

  if (pathname.includes(APP_PATHS.gestionUsuarios)) {
    return "usuarios";
  }

  if (pathname.includes(APP_PATHS.gerenteUsuarios)) {
    return "gerente-usuarios";
  }

  if (pathname.includes(APP_PATHS.gerentePisos)) {
    return "gerente-pisos";
  }

  if (pathname.includes(APP_PATHS.reportes) && (hasRole("ROLE_ADMIN") || hasRole("ROLE_GERENTE"))) {
    return hasRole("ROLE_GERENTE") ? "reportes-gerente" : "reportes-admin";
  }

  const matchingConfig = INVENTORY_ROUTE_CONFIG.find(config => pathname.includes(config.ruta));
  if (matchingConfig && esPersonalAlmacen(hasRole)) {
    return matchingConfig.almacenero;
  }

  return getDefaultCajeroView();
};

export const resolveSidebarState = (input: ResolveViewInput) => {
  const view = resolveRouteView(input);

  if (input.pathname.includes(APP_PATHS.caja)) {
    return { view, accordion: 1 };
  }

  if (input.pathname.includes(APP_PATHS.vendedorPiso)) {
    return { view, accordion: 0 };
  }

  if (input.pathname.includes(APP_PATHS.almacenTablero)) {
    return { view, accordion: 0 };
  }

  if (input.pathname.includes(APP_PATHS.gestionUsuarios)) {
    return { view, accordion: 2 };
  }

  if (input.pathname.includes(APP_PATHS.gerenteUsuarios)) {
    return { view, accordion: 2 };
  }

  if (input.pathname.includes(APP_PATHS.gerentePisos)) {
    return { view, accordion: 0 };
  }

  if (input.pathname.includes(APP_PATHS.dashboardGerente)) {
    return { view, accordion: 0 };
  }

  if (input.pathname.includes(APP_PATHS.reportes) && input.hasRole("ROLE_GERENTE")) {
    return { view, accordion: 0 };
  }

  for (const config of INVENTORY_ROUTE_CONFIG) {
    if (input.pathname.includes(config.ruta) && esPersonalAlmacen(input.hasRole)) {
      return { view, accordion: config.accordionAlmacenero };
    }
  }

  return { view, accordion: 0 };
};
