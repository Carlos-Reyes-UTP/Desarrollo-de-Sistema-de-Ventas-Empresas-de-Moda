// Interfaces para los reportes de ventas

export interface ProductoMasVendido {
  idProducto: number;
  nombreProducto: string;
  codigoIdentificacion: string;
  cantidadVendida: number;
  ingresosTotales: number;
  categoria?: string;
  subcategoria?: string;
  proveedor?: string;
  precioPromedio: number;
  ultimaVenta?: string;
}

export interface ReporteCategoriaData {
  categoria: string;
  subcategoria?: string;
  cantidadProductosVendidos: number;
  cantidadTotalVendida: number;
  ingresosTotales: number;
  productoMasVendido: {
    nombre: string;
    cantidadVendida: number;
  };
}

export interface ReporteColorData {
  nombreColor: string;
  cantidadVendida: number;
  ingresosTotales: number;
  productosDistintos: number;
  porcentajeDelTotal: number;
}

export interface ReporteTallaData {
  nombreTalla: string;
  cantidadVendida: number;
  ingresosTotales: number;
  productosDistintos: number;
  porcentajeDelTotal: number;
}

export interface FiltrosReporte {
  fechaInicio?: string;
  fechaFin?: string;
  categoria?: string;
  subcategoria?: string;
  proveedor?: string;
  idVendedor?: number;
  metodoPago?: string;
  tipoCliente?: 'MAYORISTA' | 'REGULAR' | 'TODOS';
  limite?: number;
}

export interface ResumenGeneralVentas {
  totalProductosVendidos: number;
  totalIngresos: number;
  totalVentas: number;
  promedioVentaPorDia: number;
  categoriaTopVentas: string;
  colorMasVendido: string;
  tallaMasVendida: string;
  periodoAnalizado: {
    fechaInicio: string;
    fechaFin: string;
    dias: number;
  };
}

export interface ProductoDetalleVenta {
  idProductoVariante: number;
  nombreProducto: string;
  color: string;
  talla: string;
  cantidadVendida: number;
  precioUnitario: number;
  totalIngresos: number;
  fechaUltimaVenta: string;
}

// Para gráficos y visualizaciones
export interface DatosGrafico {
  etiqueta: string;
  valor: number;
  porcentaje?: number;
  color?: string;
}

export interface VentasPorPeriodo {
  fecha: string;
  cantidadVentas: number;
  ingresosTotales: number;
  productosVendidos: number;
}
