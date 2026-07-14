import type { ProductoMasVendido, VarianteMasVendida } from '@/types/ReporteVentas';

export type RankableByUnits = {
  cantidadVendida: number;
  ingresosTotales: number;
};

/** Orden canónico: mayor rotación (unidades) primero. Empate: ingresos desc. */
export function orderByUnitsDesc<T extends RankableByUnits>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (b.cantidadVendida !== a.cantidadVendida) {
      return b.cantidadVendida - a.cantidadVendida;
    }
    return b.ingresosTotales - a.ingresosTotales;
  });
}

export function getTopNByUnits<T extends RankableByUnits>(items: T[], n = 10): T[] {
  return orderByUnitsDesc(items).slice(0, n);
}

/**
 * Bottom N por rotación: los N con menos unidades del set ordenado desc.
 * Requiere más de N ítems; si no, lista vacía.
 */
export function getBottomNByUnits<T extends RankableByUnits>(items: T[], n = 10): T[] {
  if (items.length <= n) return [];
  const ordered = orderByUnitsDesc(items);
  return ordered.slice(-n).reverse();
}

export function formatVarianteLabel(v: Pick<VarianteMasVendida, 'nombreProducto' | 'color' | 'talla'>): string {
  return `${v.nombreProducto} · ${v.color} · ${v.talla}`;
}

export function formatVarianteCategoria(v: VarianteMasVendida): string {
  const partes: string[] = [];
  if (v.categoriaPadre) partes.push(v.categoriaPadre);
  if (v.categoria) partes.push(v.categoria);
  if (v.subCategoria2) partes.push(v.subCategoria2);
  return partes.length > 0 ? partes.join(' · ') : 'Sin categoría';
}

export function formatProductoCategoria(producto: ProductoMasVendido): string {
  const partes: string[] = [];
  if (producto.categoriaPadre) partes.push(producto.categoriaPadre);
  if (producto.categoria) partes.push(producto.categoria);
  if (producto.subCategoria2) partes.push(producto.subCategoria2);
  return partes.length > 0 ? partes.join(' · ') : 'Sin categoría';
}

/** Construye un ProductoMasVendido mínimo para abrir análisis individual desde una variante. */
export function varianteToProductoShell(v: VarianteMasVendida): ProductoMasVendido {
  return {
    idProducto: v.idProducto,
    nombreProducto: v.nombreProducto,
    codigoIdentificacion: v.codigoIdentificacion,
    cantidadVendida: v.cantidadVendida,
    ingresosTotales: v.ingresosTotales,
    categoria: v.categoria,
    categoriaPadre: v.categoriaPadre,
    subCategoria2: v.subCategoria2,
    proveedor: v.proveedor,
    precioPromedio: v.precioPromedio,
    ultimaVenta: v.ultimaVenta,
  };
}
