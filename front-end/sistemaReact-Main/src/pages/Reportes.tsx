import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  TableCellsIcon, 
  CubeIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline';
import ProductosMasVendidos from '../components/reportes/ProductosMasVendidos';
import ReportePorCategoria from '../components/reportes/ReportePorCategoria';
import ResumenGeneral from '../components/reportes/ResumenGeneral';
import ReporteDeVentas from '../components/reportes/ReporteDeVentas';
import { useAuth } from '../context/AuthContext';

type TabReporte = 'resumen' | 'productos' | 'categorias' | 'ventas';

const Reportes: React.FC = () => {
  const [tabActiva, setTabActiva] = useState<TabReporte>('ventas');
  const { tieneRol } = useAuth();

  // Verificar permisos de administrador o almacenero
  useEffect(() => {
    if (!tieneRol('ROLE_ADMIN') && !tieneRol('ROLE_ALMACENERO')) {
      console.warn('Acceso denegado: Se requieren permisos de administrador o almacenero');
    }
  }, [tieneRol]);

  const tabs = [
    {
      id: 'resumen' as TabReporte,
      nombre: 'Resumen General',
      icono: ChartBarIcon,
      descripcion: 'Vista general de las ventas y métricas principales'
    },
    {
      id: 'ventas' as TabReporte,
      nombre: 'Reporte de Ventas',
      icono: DocumentChartBarIcon,
      descripcion: 'Análisis detallado de ventas por períodos con exportación Excel'
    },
    {
      id: 'productos' as TabReporte,
      nombre: 'Productos Más Vendidos',
      icono: CubeIcon,
      descripcion: 'Ranking de productos por cantidad vendida e ingresos generados'
    },
    {
      id: 'categorias' as TabReporte,
      nombre: 'Por Categoría',
      icono: TableCellsIcon,
      descripcion: 'Análisis de ventas segmentado por categorías de productos'
    }
  ];

  const renderizarContenidoTab = () => {
    switch (tabActiva) {
      case 'resumen':
        return <ResumenGeneral />;
      case 'ventas':
        return <ReporteDeVentas />;
      case 'productos':
        return <ProductosMasVendidos />;
      case 'categorias':
        return <ReportePorCategoria />;
      default:
        return <ReporteDeVentas />;
    }
  };

  if (!tieneRol('ROLE_ADMIN') && !tieneRol('ROLE_ALMACENERO')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ChartBarIcon className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso Restringido</h2>
          <p className="text-gray-600">
            Los reportes están disponibles únicamente para administradores y almaceneros.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Cabecera */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
          </div>
          <p className="text-gray-600">
            Análisis detallado de productos más vendidos, categorías, colores y tallas
          </p>
        </div>

        {/* Navegación por Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
              {tabs.map((tab) => {
                const IconoTab = tab.icono;
                const esActiva = tabActiva === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setTabActiva(tab.id)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
                      esActiva
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <IconoTab className="w-5 h-5" />
                    <span className="hidden sm:block">{tab.nombre}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          
          {/* Descripción del tab activo */}
          <div className="px-6 py-3 bg-gray-50">
            <p className="text-sm text-gray-600">
              {tabs.find(tab => tab.id === tabActiva)?.descripcion}
            </p>
          </div>
        </div>

        {/* Contenido del Tab */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[600px]">
          <div className="p-6">
            {renderizarContenidoTab()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reportes;
