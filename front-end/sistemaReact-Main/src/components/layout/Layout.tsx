import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SidebarMenu from './SidebarMenu';
import { useAuth } from '../../context/AuthContext';

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const location = useLocation();
  const { usuario, cerrarSesion } = useAuth();
  
  // Determinar la vista inicial basada en la URL actual
  const determinarVistaInicial = () => {
    const path = location.pathname;
    
    if (path.includes('/dashboard/admin')) return 'dashboard-admin';
    if (path.includes('/dashboard/almacenero')) return 'dashboard-almacenero';
    if (path.includes('/pages/CajeroSistemaVentas')) {
      // Si hay un state con una vista específica de cajero
      if (location.state && location.state.view) {
        return location.state.view;
      }
      return 'ventas';
    }
    
    return 'ventas'; // Vista por defecto
  };
  
  const [vistaActual, setVistaActual] = useState(determinarVistaInicial());
  
  // Actualizar la vista cuando cambie la ubicación
  useEffect(() => {
    setVistaActual(determinarVistaInicial());
  }, [location.pathname, location.state]);
  
  console.log('Layout renderizado con vista:', vistaActual);

  return (
    <div className="flex h-screen bg-gray-100">
      <SidebarMenu 
        vistaActual={vistaActual} 
        cambiarVista={setVistaActual} 
        usuario={usuario}
        cerrarSesion={cerrarSesion}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-5">
          {/* Renderizar los hijos directos si se proporcionan */}
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default Layout;