import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  UsersIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import { ReporteService } from '../../services/ReporteService';
import { AlertModal, Skeleton, TableSkeleton } from '@/shared/ui';

// Interfaz local para el componente hasta que se alinee con el backend
interface ResumenVentasLocal {
  totalVentas: number;
  totalOrdenes: number;
  clientesActivos: number;
  ticketPromedio: number;
  crecimientoVentas: number;
  crecimientoOrdenes: number;
  crecimientoClientes: number;
  crecimientoTicket: number;
  ventasPorPeriodo: Array<{ periodo: string; total: number }>;
  ventasPorCategoria: Array<{ nombre: string; total: number; porcentaje: number }>;
  topProductos: Array<{ nombre: string; cantidad: number }>;
}

const ResumenGeneral: React.FC = () => {
  const [resumen, setResumen] = useState<ResumenVentasLocal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertModal, setAlertModal] = useState<{ open: boolean; message: string; variant: 'error' | 'info' | 'success' }>({ open: false, message: '', variant: 'info' });

  useEffect(() => {
    const construirResumenDesdeVentas = async (ventas: any[]): Promise<ResumenVentasLocal> => {
      const totalVentas = ventas.reduce((sum, venta) => sum + (venta.totalVentas || 0), 0);
      const cantidadVentas = ventas.length;
      const ticketPromedio = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0;

      const metricasCrecimiento = await ReporteService.calcularCrecimiento.obtenerMetricasCrecimiento();

      const data: ResumenVentasLocal = {
        totalVentas,
        totalOrdenes: cantidadVentas,
        clientesActivos: 0,
        ticketPromedio,
        crecimientoVentas: metricasCrecimiento.crecimiento.ingresos,
        crecimientoOrdenes: metricasCrecimiento.crecimiento.ventas,
        crecimientoClientes: 0,
        crecimientoTicket: metricasCrecimiento.crecimiento.ticket,
        ventasPorPeriodo: [],
        ventasPorCategoria: [],
        topProductos: []
      };

      try {
        const { ClienteService } = await import('../../services/ClienteService');
        const clientes = await ClienteService.obtenerTodosClientes();
        if (Array.isArray(clientes)) {
          data.clientesActivos = clientes.length;
        }
      } catch {
        data.clientesActivos = 0;
      }

      return data;
    };

    const cargarResumen = async () => {
      try {
        setLoading(true);
        setError(null);

        const { VentaService } = await import('../../services/VentaService');

        try {
          await ReporteService.getResumenGeneral();
        } catch {
          console.warn('Backend resumen no disponible, usando ventas directamente');
        }

        const todasLasVentas = await VentaService.obtenerTodasVentas();

        if (!Array.isArray(todasLasVentas)) {
          throw new Error('No se pudieron obtener datos de ventas');
        }

        const data = await construirResumenDesdeVentas(todasLasVentas);
        setResumen(data);
      } catch (err: any) {
        console.error('Error al cargar resumen general:', err);
        setError('Error al cargar el resumen general. Intenta nuevamente.');
        setResumen({
          totalVentas: 0,
          totalOrdenes: 0,
          clientesActivos: 0,
          ticketPromedio: 0,
          crecimientoVentas: 0,
          crecimientoOrdenes: 0,
          crecimientoClientes: 0,
          crecimientoTicket: 0,
          ventasPorPeriodo: [],
          ventasPorCategoria: [],
          topProductos: []
        });
      } finally {
        setLoading(false);
      }
    };

    cargarResumen();
  }, []);

  const exportarAExcel = async () => {
    if (!resumen) {
      setAlertModal({ open: true, message: 'No hay datos para exportar', variant: 'info' });
      return;
    }

    try {
      // Mostrar indicador de carga
      const loadingToast = document.createElement('div');
      loadingToast.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2';
      loadingToast.innerHTML = `
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        <span>Generando resumen ejecutivo...</span>
      `;
      document.body.appendChild(loadingToast);

      const workbook = XLSX.utils.book_new();

      // Hoja 1: Resumen Ejecutivo
      const resumenData = [
        ['RESUMEN EJECUTIVO', '', '', ''],
        ['Fecha de generación:', new Date().toLocaleDateString(), '', ''],
        ['', '', '', ''],
        ['MÉTRICAS PRINCIPALES', '', '', ''],
        ['Total de Ingresos:', `S/${resumen.totalVentas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, '', ''],
        ['Total de Ventas:', resumen.totalOrdenes.toLocaleString(), '', ''],
        ['Clientes Registrados:', resumen.clientesActivos.toLocaleString(), '', ''],
        ['Ticket Promedio:', `S/${resumen.ticketPromedio.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, '', ''],
        ['', '', '', ''],
        ['CRECIMIENTO VS PERÍODO ANTERIOR', '', '', ''],
        ['Ingresos:', 
          resumen.crecimientoVentas !== 0 ? 
            `${resumen.crecimientoVentas > 0 ? '+' : ''}${resumen.crecimientoVentas.toFixed(1)}%` : 
            'Sin datos históricos', 
          resumen.crecimientoVentas > 0 ? '↑' : resumen.crecimientoVentas < 0 ? '↓' : '-', 
          ''
        ],
        ['Ventas:', 
          resumen.crecimientoOrdenes !== 0 ? 
            `${resumen.crecimientoOrdenes > 0 ? '+' : ''}${resumen.crecimientoOrdenes.toFixed(1)}%` : 
            'Sin datos históricos', 
          resumen.crecimientoOrdenes > 0 ? '↑' : resumen.crecimientoOrdenes < 0 ? '↓' : '-', 
          ''
        ],
        ['Ticket Promedio:', 
          resumen.crecimientoTicket !== 0 ? 
            `${resumen.crecimientoTicket > 0 ? '+' : ''}${resumen.crecimientoTicket.toFixed(1)}%` : 
            'Sin datos históricos', 
          resumen.crecimientoTicket > 0 ? '↑' : resumen.crecimientoTicket < 0 ? '↓' : '-', 
          ''
        ],
        ['', '', '', ''],
        ['INTERPRETACIÓN:', '', '', ''],
        ['Mes actual vs mes anterior', '', '', ''],
        ['Tendencia general:', 
          (() => {
            const promedioCrec = (resumen.crecimientoVentas + resumen.crecimientoOrdenes + resumen.crecimientoTicket) / 3;
            if (promedioCrec > 10) return 'Crecimiento fuerte';
            if (promedioCrec > 0) return 'Crecimiento moderado';
            if (promedioCrec > -10) return 'Estable con ligera baja';
            return 'Requiere atención';
          })(), 
          '', 
          ''
        ]
      ];

      const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);

      // Aplicar estilos a la hoja
      const range = XLSX.utils.decode_range(wsResumen['!ref'] || 'A1');
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!wsResumen[cellAddress]) continue;

          if (R === 0 || R === 3 || R === 9) {
            wsResumen[cellAddress].s = {
              font: { bold: true, sz: 14 },
              fill: { fgColor: { rgb: "CCCCCC" } }
            };
          }
        }
      }

      wsResumen['!cols'] = [{ width: 25 }, { width: 20 }, { width: 15 }, { width: 15 }];
      XLSX.utils.book_append_sheet(workbook, wsResumen, "Resumen Ejecutivo");

      // Generar archivo
      const fileName = `resumen-general-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      // Remover indicador de carga y mostrar éxito
      document.body.removeChild(loadingToast);
      
      const successToast = document.createElement('div');
      successToast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2';
      successToast.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>Resumen ejecutivo exportado exitosamente</span>
      `;
      document.body.appendChild(successToast);
      
      setTimeout(() => {
        if (document.body.contains(successToast)) {
          document.body.removeChild(successToast);
        }
      }, 3000);

      console.log('✅ Archivo Excel exportado exitosamente:', fileName);
    } catch (error) {
      console.error('❌ Error al exportar a Excel:', error);

      // Remover indicador de carga si existe
      const existingToast = document.querySelector('.fixed.top-4.right-4.bg-blue-600');
      if (existingToast && document.body.contains(existingToast)) {
        document.body.removeChild(existingToast);
      }

      setAlertModal({ open: true, message: 'Error al exportar archivo Excel. Intenta nuevamente.', variant: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="rounded-lg bg-white p-6 shadow-md">
                <Skeleton className="mb-3 h-4 w-32" />
                <Skeleton className="mb-2 h-8 w-28" />
                <Skeleton className="h-3 w-24" variant="muted" />
              </div>
            ))}
          </div>
          <TableSkeleton rows={6} columns={4} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error al cargar datos</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!resumen) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-700">No hay datos disponibles</p>
      </div>
    );
  }

  const metricas = [
    {
      nombre: 'Total de Ingresos',
      valor: `S/ ${resumen.totalVentas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`,
      icono: CurrencyDollarIcon,
      crecimiento: resumen.crecimientoVentas,
      color: 'bg-green-100 text-green-800'
    },
    {
      nombre: 'Total de Ventas',
      valor: resumen.totalOrdenes.toLocaleString(),
      icono: ShoppingBagIcon,
      crecimiento: resumen.crecimientoOrdenes,
      color: 'bg-blue-100 text-blue-800'
    },
    {
      nombre: 'Clientes Registrados',
      valor: resumen.clientesActivos.toLocaleString(),
      icono: UsersIcon,
      crecimiento: resumen.crecimientoClientes,
      color: 'bg-purple-100 text-purple-800'
    },
    {
      nombre: 'Ticket Promedio',
      valor: `S/ ${resumen.ticketPromedio.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icono: ChartBarIcon,
      crecimiento: resumen.crecimientoTicket,
      color: 'bg-orange-100 text-orange-800'
    }
  ];

  return (
    <div className="p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Resumen General</h2>
            <button
              onClick={exportarAExcel}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              Exportar Excel
            </button>
          </div>

          {/* Métricas principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metricas.map((metrica, index) => {
              const IconComponent = metrica.icono;
              return (
                <div key={index} className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{metrica.nombre}</p>
                      <p className="text-3xl font-bold text-gray-900">{metrica.valor}</p>
                      <div className="flex items-center mt-2">
                        {metrica.nombre === 'Clientes Registrados' ? (
                          <span className="text-xs text-gray-500">Total registrados</span>
                        ) : metrica.crecimiento !== 0 ? (
                          <>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${metrica.color}`}>
                              {metrica.crecimiento > 0 ? '+' : ''}{metrica.crecimiento.toFixed(1)}%
                            </span>
                            <span className="text-xs text-gray-500 ml-2">vs período anterior</span>
                          </>
                        ) : (
                          <span className="text-xs text-gray-500">Sin datos históricos</span>
                        )}
                      </div>
                    </div>
                    <div className={`p-3 rounded-full ${metrica.color}`}>
                      <IconComponent className="h-8 w-8" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mensaje informativo */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Información del Sistema</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    Los datos mostrados son calculados desde las ventas registradas en el sistema.
                    Para análisis más detallados, consulta los reportes específicos por categoría,
                    productos más vendidos o exporta los datos a Excel.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Modal */}
      <AlertModal
        open={alertModal.open}
        message={alertModal.message}
        variant={alertModal.variant}
        onClose={() => setAlertModal({ open: false, message: '', variant: 'info' })}
      />
    </div>
  );
};

export default ResumenGeneral;
