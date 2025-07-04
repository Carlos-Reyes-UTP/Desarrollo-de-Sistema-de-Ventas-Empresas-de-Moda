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
    
    console.log('Layout - determinarVistaInicial para ruta:', path);
    
    if (path.includes('/dashboard/admin')) {
      return 'dashboard-admin';
    }
    
    if (path.includes('/dashboard/almacenero')) {
      return 'dashboard-almacenero';
    }
    
    if (path.includes('/pages/CajeroSistemaVentas')) {
      const vista = estado?.view ?? 'ventas';
      return vista;
    }
    
    if (path.includes('/pages/GestionUsuarios')) {
      return 'usuarios';
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
    
    return 'ventas'; // Vista por defecto
  };
  
  const [vistaActual, setVistaActual] = useState(determinarVistaInicial());
  
  // Actualizar la vista cuando cambie la ubicación
  useEffect(() => {
    const nuevaVista = determinarVistaInicial();
    console.log('Layout - useEffect: nueva vista determinada:', nuevaVista);
    if (nuevaVista !== vistaActual) {
      console.log('Layout - Actualizando vista de', vistaActual, 'a', nuevaVista);
      setVistaActual(nuevaVista);
    }
  }, [location.pathname, location.state, tieneRol]);
  
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