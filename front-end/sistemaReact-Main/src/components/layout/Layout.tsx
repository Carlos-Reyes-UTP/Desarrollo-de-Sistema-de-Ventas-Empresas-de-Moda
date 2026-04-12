import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SidebarMenu from './SidebarMenu';
import { useAuth } from '../../context/AuthContext';

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const location = useLocation();
  const { usuario, cerrarSesion, tieneRol } = useAuth();
  
  // Determinar la vista inicial basada en la URL actual
  const determinarVistaInicial = () => {
    const path = location.pathname;
    const estado = location.state;
    
    if (path.includes('/dashboard/admin')) {
      return 'dashboard-admin';
    }
    
    if (path.includes('/dashboard/almacenero')) {
      return 'dashboard-almacenero';
    }
    
    if (path.includes('/pages/CajeroSistemaVentas')) {
      // Si hay un estado específico, usarlo; si no, para cajeros usar 'apertura' como defecto
      const vista = estado?.view ?? (tieneRol?.('ROLE_CAJERO') ? 'apertura' : 'ventas');
      return vista;
    }
    
    if (path.includes('/pages/GestionUsuarios')) {
      return 'usuarios';
    }
    
    if (path.includes('/pages/reportes')) {
      if (tieneRol?.('ROLE_ADMIN')) {
        return 'reportes-admin';
      }
    }
    
    // Rutas que dependen del rol
    const rutasRol = [
      { ruta: '/pages/productos', admin: 'productos-admin', almacenero: 'productos-inventario' },
      { ruta: '/pages/colores', admin: 'colores-admin', almacenero: 'colores-inventario' },
      { ruta: '/pages/tallas', admin: 'tallas-admin', almacenero: 'tallas-inventario' },
      { ruta: '/pages/proveedores', admin: 'proveedores-admin', almacenero: 'proveedores' },
      { ruta: '/pages/categorias', admin: 'categorias-admin', almacenero: 'categorias' }
    ];
    
    for (const config of rutasRol) {
      if (path.includes(config.ruta)) {
        if (tieneRol?.('ROLE_ADMIN')) {
          return config.admin;
        } else if (tieneRol?.('ROLE_ALMACENERO')) {
          return config.almacenero;
        }
      }
    }
    
    // Vista por defecto basada en el rol del usuario
    if (tieneRol?.('ROLE_CAJERO')) {
      return 'apertura'; // Los cajeros empiezan en apertura de caja
    }
    
    return 'ventas'; // Vista por defecto para otros roles
  };
  
  const [vistaActual, setVistaActual] = useState(determinarVistaInicial());
  
  // Actualizar la vista cuando cambie la ubicación
  useEffect(() => {
    const nuevaVista = determinarVistaInicial();
    if (nuevaVista !== vistaActual) {
      setVistaActual(nuevaVista);
    }
  }, [location.pathname, location.state, tieneRol]);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden relative">
      <SidebarMenu 
        vistaActual={vistaActual} 
        cambiarVista={setVistaActual} 
        usuario={usuario}
        cerrarSesion={cerrarSesion}
      />
      {/* Contenedor principal con margen superior en móviles */}
      <div className="flex-1 flex flex-col overflow-hidden pt-16 md:pt-0 bg-gray-50">
        <main className="flex-1 overflow-y-auto">
          <div className="w-full h-full">
            {/* Contenedor con restricciones flexibles */}
            <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
              {/* Renderizar los hijos directos si se proporcionan */}
              {children || <Outlet />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;