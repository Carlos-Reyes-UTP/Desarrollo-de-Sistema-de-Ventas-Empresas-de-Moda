// Interfaces para los reportes de ventas

export interface ProductoMasVendido {
  idProducto: number;
  nombreProducto: string;
  codigoIdentificacion: string;
  cantidadVendida: number;
  ingresosTotales: number;
  categoria?: string;
  subcategoria?: string;
  categoriaPadre?: string;
  subCategoria2?: string;
  proveedor?: string;
  precioPromedio: number;
  ultimaVenta?: string;
}

export interface ReporteCategoriaData {
  idCategoria?: number;
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

export interface TallaProducto {
  idTalla: number;
  nombreTalla: string;
  cantidadVariantes: number;
}

export interface VariantesPorColor {
  idColor: number;
  nombreColor: string;
  hexColor?: string; // Color en formato hexadecimal para mostrar en la UI
  cantidadStock: number;
  cantidadVendida: number;
  ingresosTotales: number;
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
  idCategoriaPadre?: string;
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

export interface PrediccionIARequest {
  id_producto: number;
  color: string;
  talla: string;
  semana_ano: number;
  es_campana: number;
  ventas_semana_pasada: number;
}

export interface PrediccionIAResponse {
  cantidad_recomendada: number;
}
