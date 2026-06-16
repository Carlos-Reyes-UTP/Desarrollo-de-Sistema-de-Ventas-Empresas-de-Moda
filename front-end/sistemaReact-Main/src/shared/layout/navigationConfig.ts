import type { RolNombre } from "../../types/enums";
import { esRolModuloAlmacen } from "../constants/rolesAlmacen";

type RoleChecker = (role: RolNombre) => boolean;

export type NavDestination = {
  id: string;
  icon: string;
  label: string;
  shortLabel?: string;
  roles: RolNombre[];
  path?: string;
  vista: string;
  children?: NavDestination[];
  section?: string;
  accordionId?: number;
};

export const NAV_ACCORDION_BY_ID: Record<string, number> = {
  caja: 1,
  inventario: 3,
};

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

const ALMACEN_ROLES: RolNombre[] = ["ROLE_ALMACENERO", "ROLE_SUPERVISOR_ALMACEN"];

export const NAV_DESTINATIONS: NavDestination[] = [
  {
    id: "dashboard-admin",
    icon: "speed",
    label: "Dashboard Admin",
    shortLabel: "Inicio",
    roles: ["ROLE_ADMIN"],
    path: APP_PATHS.dashboardAdmin,
    vista: "dashboard-admin",
  },
  {
    id: "dashboard-gerente",
    icon: "speed",
    label: "Dashboard Gerente",
    shortLabel: "Inicio",
    roles: ["ROLE_GERENTE"],
    path: APP_PATHS.dashboardGerente,
    vista: "dashboard-gerente",
  },
  {
    id: "dashboard-almacenero",
    icon: "speed",
    label: "Dashboard Almacén",
    shortLabel: "Inicio",
    roles: ALMACEN_ROLES,
    path: APP_PATHS.dashboardAlmacenero,
    vista: "dashboard-almacenero",
  },
  {
    id: "almacen-tablero",
    icon: "dashboard",
    label: "Tablero pedidos",
    shortLabel: "Tablero",
    roles: ALMACEN_ROLES,
    path: APP_PATHS.almacenTablero,
    vista: "almacen-tablero",
  },
  {
    id: "vendedor-piso",
    icon: "manage_search",
    label: "Solicitud a almacén",
    shortLabel: "Solicitud",
    roles: ["ROLE_VENDEDOR"],
    path: APP_PATHS.vendedorPiso,
    vista: "vendedor-piso",
  },
  {
    id: "caja",
    icon: "storefront",
    label: "Sistema de Caja",
    shortLabel: "Caja",
    roles: ["ROLE_CAJERO"],
    vista: "caja",
    section: "Módulo Comercial",
    accordionId: NAV_ACCORDION_BY_ID.caja,
    children: [
      {
        id: "apertura",
        icon: "login",
        label: "Apertura",
        roles: ["ROLE_CAJERO"],
        vista: "apertura",
      },
      {
        id: "ventas",
        icon: "point_of_sale",
        label: "Ventas",
        roles: ["ROLE_CAJERO"],
        vista: "ventas",
      },
      {
        id: "cierre",
        icon: "logout",
        label: "Cierre",
        roles: ["ROLE_CAJERO"],
        vista: "cierre",
      },
    ],
  },
  {
    id: "usuarios-admin",
    icon: "manage_accounts",
    label: "Usuarios",
    roles: ["ROLE_ADMIN"],
    path: APP_PATHS.gestionUsuarios,
    vista: "usuarios",
    section: "Configuración",
  },
  {
    id: "gerente-usuarios",
    icon: "manage_accounts",
    label: "Usuarios",
    roles: ["ROLE_GERENTE"],
    path: APP_PATHS.gerenteUsuarios,
    vista: "gerente-usuarios",
    section: "Gestión",
  },
  {
    id: "gerente-pisos",
    icon: "corporate_fare",
    label: "Pisos, áreas y ubicaciones",
    shortLabel: "Pisos",
    roles: ["ROLE_GERENTE"],
    path: APP_PATHS.gerentePisos,
    vista: "gerente-pisos",
    section: "Gestión",
  },
  {
    id: "inventario",
    icon: "checkroom",
    label: "Control Inventario",
    shortLabel: "Inventario",
    roles: ALMACEN_ROLES,
    vista: "inventario",
    section: "Gestión",
    accordionId: NAV_ACCORDION_BY_ID.inventario,
    children: [
      {
        id: "productos",
        icon: "checkroom",
        label: "Productos",
        roles: ALMACEN_ROLES,
        path: APP_PATHS.productos,
        vista: "productos-inventario",
      },
      {
        id: "proveedores",
        icon: "inventory",
        label: "Proveedores",
        roles: ALMACEN_ROLES,
        path: APP_PATHS.proveedores,
        vista: "proveedores",
      },
      {
        id: "categorias",
        icon: "auto_awesome",
        label: "Categorías",
        roles: ALMACEN_ROLES,
        path: APP_PATHS.categorias,
        vista: "categorias",
      },
    ],
  },
  {
    id: "reportes",
    icon: "bar_chart",
    label: "Reportes",
    roles: ["ROLE_ADMIN", "ROLE_GERENTE"],
    path: APP_PATHS.reportes,
    vista: "reportes",
    section: "Análisis",
  },
];

const hasAnyRole = (dest: NavDestination, hasRole: RoleChecker): boolean =>
  dest.roles.some((role) => hasRole(role));

export const buildNavTree = (hasRole: RoleChecker): NavDestination[] =>
  NAV_DESTINATIONS.filter((dest) => {
    if (!hasAnyRole(dest, hasRole)) return false;
    if (dest.id === "inventario" && hasRole("ROLE_ADMIN")) return false;
    return true;
  }).map((dest) => ({
    ...dest,
    children: dest.children?.filter((child) => hasAnyRole(child, hasRole)),
  }));

export const isNavDestinationActive = (
  dest: NavDestination,
  vistaActual: string
): boolean => {
  if (dest.children?.length) {
    return dest.children.some((child) => isNavDestinationActive(child, vistaActual));
  }

  if (dest.id === "reportes") {
    return vistaActual === "reportes-admin" || vistaActual === "reportes-gerente";
  }

  if (dest.id === "productos") return vistaActual.includes("productos");
  if (dest.id === "proveedores") return vistaActual.includes("proveedores");
  if (dest.id === "categorias") return vistaActual.includes("categorias");

  return vistaActual === dest.vista;
};

export const getNavDestinationVista = (
  dest: NavDestination,
  hasRole: RoleChecker
): string => {
  if (dest.id === "reportes") {
    return hasRole("ROLE_GERENTE") ? "reportes-gerente" : "reportes-admin";
  }
  return dest.vista;
};
