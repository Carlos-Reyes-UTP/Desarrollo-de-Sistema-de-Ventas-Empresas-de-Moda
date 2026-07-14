import React, { useState, useEffect } from 'react';

import { useSearchParams } from 'react-router-dom';

import { ChartBarIcon } from '@heroicons/react/24/outline';

import ProductosMasVendidos from '@/components/reportes/ProductosMasVendidos';

import ReportePorCategoria from '@/components/reportes/ReportePorCategoria';

import PrediccionVentas from '@/components/reportes/PrediccionVentas';

import ResumenGeneral from '@/components/reportes/ResumenGeneral';

import ReporteDeVentas from '@/components/reportes/ReporteDeVentas';

import { useAuth } from '@/context/AuthContext';

import { ReportPeriodProvider } from '@/components/reportes/context/ReportPeriodContext';

import { ReportPageActionsProvider, useReportPageActions } from '@/components/reportes/context/ReportPageActionsContext';

import { ReportPageShell, type ReportTabConfig } from '@/components/reportes/layout/ReportPageShell';



type TabReporte = 'resumen' | 'productos' | 'categorias' | 'ventas' | 'prediccion';



const TABS: ReportTabConfig[] = [

  {

    id: 'resumen',

    nombre: 'Resumen',

    icon: 'dashboard',

    descripcion: 'Cómo vamos hoy y comparación entre meses',

  },

  {

    id: 'ventas',

    nombre: 'Ventas',

    icon: 'bar_chart',

    descripcion: 'Serie temporal, tickets y registro exportable',

  },

  {

    id: 'productos',

    nombre: 'Productos',

    icon: 'inventory_2',

    descripcion: 'Ranking y variantes del mix',

  },

  {

    id: 'categorias',

    nombre: 'Categorías',

    icon: 'category',

    descripcion: 'Drill-down por líneas',

  },

  {

    id: 'prediccion',

    nombre: 'Inventario y Demanda',

    icon: 'insights',

    descripcion: 'Stock y predicción de demanda',

  },

];



const ReportesPageContent: React.FC = () => {

  const [searchParams, setSearchParams] = useSearchParams();

  const [tabActiva, setTabActiva] = useState<TabReporte>('resumen');



  const { setActions } = useReportPageActions();

  useEffect(() => {

    setActions(null);

  }, [tabActiva, setActions]);

  useEffect(() => {

    const tabParam = searchParams.get('tab') as TabReporte;

    if (tabParam && TABS.some((t) => t.id === tabParam)) {

      setTabActiva(tabParam);

    }

  }, [searchParams]);



  const cambiarTab = (id: string) => {

    const tab = id as TabReporte;

    setTabActiva(tab);

    setSearchParams({ tab }, { replace: true });

  };



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

      case 'prediccion':

        return <PrediccionVentas />;

      default:

        return <ResumenGeneral />;

    }

  };



  return (

    <div
      className={`reports-analytics app-page min-h-screen p-4 md:p-8${
        tabActiva === 'resumen' ? ' reports-analytics--signal' : ''
      }`}
    >
      <ReportPageShell tabs={TABS} tabActiva={tabActiva} onTabChange={cambiarTab}>
        {renderizarContenidoTab()}
      </ReportPageShell>
    </div>

  );

};



const ReportesPage: React.FC = () => {

  const { tieneRol } = useAuth();



  useEffect(() => {

    if (!tieneRol('ROLE_ADMIN') && !tieneRol('ROLE_GERENTE')) {

      console.warn('Acceso denegado: Se requieren permisos de administrador o gerente');

    }

  }, [tieneRol]);



  if (!tieneRol('ROLE_ADMIN') && !tieneRol('ROLE_GERENTE')) {

    return (

      <div className="app-page min-h-screen flex items-center justify-center p-4">

        <div className="app-panel rounded-xl shadow-lg p-8 max-w-md w-full text-center">

          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-[var(--app-bg-muted)]">

            <ChartBarIcon className="w-8 h-8 text-[var(--app-accent)]" />

          </div>

          <h2 className="text-xl font-bold app-heading mb-2">Acceso restringido</h2>

          <p className="app-text-muted">

            Los reportes están disponibles para administradores y gerentes.

          </p>

        </div>

      </div>

    );

  }



  return (

    <ReportPeriodProvider>

      <ReportPageActionsProvider>

        <ReportesPageContent />

      </ReportPageActionsProvider>

    </ReportPeriodProvider>

  );

};



export default ReportesPage;

