import { NavigationType } from "react-router-dom";
import {
  APP_PATHS,
  type CajeroView,
  resolveCajeroView,
} from "./navigationConfig";

export type PageTransitionPattern = "fade-through" | "shared-x" | "shared-y" | "fade";
export type PageTransitionDirection = "forward" | "backward";

export interface PageTransitionSpec {
  pattern: PageTransitionPattern;
  direction: PageTransitionDirection;
}

export type PageTransitionPhase =
  | "idle"
  | "exiting"
  | "loading"
  | "enter-prep"
  | "entering";

export const PAGE_ENTER_DURATION_MS = 350;
export const PAGE_EXIT_DURATION_MS = 150;
export const PAGE_MINI_ENTER_DURATION_MS = 150;

const INVENTORY_PATHS = [
  APP_PATHS.productos,
  APP_PATHS.proveedores,
  APP_PATHS.categorias,
] as const;

const KIOSK_PATHS = [APP_PATHS.almacenTablero, APP_PATHS.vendedorPiso] as const;

const REPORT_TAB_ORDER = [
  "resumen",
  "ventas",
  "productos",
  "categorias",
  "prediccion",
] as const;

const CAJERO_VIEW_ORDER: readonly CajeroView[] = ["apertura", "ventas", "cierre"];

const PRODUCT_TAB_ORDER = ["catalogo", "pisos"] as const;

const isInventoryPath = (pathname: string): boolean =>
  INVENTORY_PATHS.some((path) => pathname.includes(path));

export const isKioskPath = (pathname: string): boolean =>
  KIOSK_PATHS.some((path) => pathname.includes(path));

const getInventoryIndex = (pathname: string): number =>
  INVENTORY_PATHS.findIndex((path) => pathname.includes(path));

export const getReportTabIndexById = (tab: string): number => {
  const index = REPORT_TAB_ORDER.indexOf(tab as (typeof REPORT_TAB_ORDER)[number]);
  return index >= 0 ? index : 0;
};

export const getCajeroViewIndex = (view: string): number => {
  const index = CAJERO_VIEW_ORDER.indexOf(view as CajeroView);
  return index >= 0 ? index : CAJERO_VIEW_ORDER.indexOf("ventas");
};

export const getProductTabIndex = (tab: string): number => {
  const index = PRODUCT_TAB_ORDER.indexOf(tab as (typeof PRODUCT_TAB_ORDER)[number]);
  return index >= 0 ? index : 0;
};

const directionFromIndices = (
  fromIndex: number,
  toIndex: number,
  navigationType: NavigationType
): PageTransitionDirection => {
  if (navigationType === NavigationType.Pop) return "backward";
  if (fromIndex === toIndex) return "forward";
  return toIndex > fromIndex ? "forward" : "backward";
};

export interface PageLocationInput {
  pathname: string;
  search?: string;
  stateView?: unknown;
}

export interface PageTransitionClassOptions {
  miniEnter?: boolean;
}

export const buildLayoutTransitionKey = (pathname: string): string => pathname;

export const buildLocationKey = ({
  pathname,
  search = "",
}: PageLocationInput): string => `${pathname}${search}`;

interface ResolvePageTransitionInput {
  from: PageLocationInput;
  to: PageLocationInput;
  navigationType?: NavigationType;
}

export const resolvePageTransition = ({
  from,
  to,
  navigationType = NavigationType.Push,
}: ResolvePageTransitionInput): PageTransitionSpec => {
  const fromPath = from.pathname;
  const toPath = to.pathname;

  if (
    fromPath.includes(APP_PATHS.login) ||
    toPath.includes(APP_PATHS.login)
  ) {
    return { pattern: "fade", direction: "forward" };
  }

  if (isKioskPath(fromPath) || isKioskPath(toPath)) {
    return {
      pattern: "fade",
      direction: navigationType === NavigationType.Pop ? "backward" : "forward",
    };
  }

  if (isInventoryPath(fromPath) && isInventoryPath(toPath)) {
    return {
      pattern: "shared-x",
      direction: directionFromIndices(
        getInventoryIndex(fromPath),
        getInventoryIndex(toPath),
        navigationType
      ),
    };
  }

  if (
    fromPath.includes(APP_PATHS.caja) &&
    toPath.includes(APP_PATHS.caja)
  ) {
    const fromView = resolveCajeroView(from.stateView);
    const toView = resolveCajeroView(to.stateView);
    return {
      pattern: "shared-y",
      direction: directionFromIndices(
        getCajeroViewIndex(fromView),
        getCajeroViewIndex(toView),
        navigationType
      ),
    };
  }

  return {
    pattern: "fade-through",
    direction: navigationType === NavigationType.Pop ? "backward" : "forward",
  };
};

export const resolveSubViewTransition = (
  pattern: PageTransitionPattern,
  fromKey: string,
  toKey: string,
  indexOf: (key: string) => number
): PageTransitionSpec => ({
  pattern,
  direction: directionFromIndices(indexOf(fromKey), indexOf(toKey), NavigationType.Push),
});

export const getPageTransitionClass = (
  spec: PageTransitionSpec,
  phase: PageTransitionPhase,
  options: PageTransitionClassOptions = {}
): string => {
  if (phase === "idle") {
    return "page-transition--idle";
  }

  if (phase === "loading") {
    return "page-transition--loading";
  }

  if (phase === "enter-prep") {
    return "page-transition--enter-prep";
  }

  if (phase === "entering" && options.miniEnter) {
    return "page-transition--mini-enter";
  }

  const phaseSuffix = phase === "exiting" ? "exit" : "enter";
  const { pattern, direction } = spec;

  switch (pattern) {
    case "fade-through":
      return `page-transition--fade-through-${phaseSuffix}`;
    case "shared-x":
      return `page-transition--shared-x-${direction}-${phaseSuffix}`;
    case "shared-y":
      return `page-transition--shared-y-${direction}-${phaseSuffix}`;
    case "fade":
      return `page-transition--fade-${phaseSuffix}`;
    default:
      return "page-transition--idle";
  }
};

export const parseLocationKey = (key: string): PageLocationInput => {
  const queryIndex = key.indexOf("?");
  if (queryIndex === -1) {
    return { pathname: key, search: "" };
  }
  return {
    pathname: key.slice(0, queryIndex),
    search: key.slice(queryIndex),
  };
};
