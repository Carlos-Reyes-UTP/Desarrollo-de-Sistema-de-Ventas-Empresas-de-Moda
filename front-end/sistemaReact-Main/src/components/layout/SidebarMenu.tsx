// @ts-nocheck - Supresión temporal para compatibilidad Material Tailwind v2.1.10 con React 19
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { Usuario } from '../../interfaces/Usuario';
import {
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemPrefix,
  Accordion,
  AccordionHeader,
  AccordionBody,
  Drawer,
  Card,
} from "@material-tailwind/react";
import {
  PresentationChartBarIcon,
  ShoppingBagIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  PowerIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/solid";
import {
  ChevronRightIcon,
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface SidebarMenuProps {
  vistaActual: string;
  cambiarVista: (vista: string) => void;
  usuario: Usuario | null;
  cerrarSesion: () => void;
}

const SidebarMenu = ({ vistaActual, cambiarVista, usuario, cerrarSesion }: SidebarMenuProps) => {
  const [openAccordion, setOpenAccordion] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { tieneRol } = useAuth();

  const handleAccordionOpen = (value: number) => {
    setOpenAccordion(openAccordion === value ? 0 : value);
  };

  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);
  
  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  // Función helper para determinar la vista y submenús según la ruta
  const determinarVistaYSubmenu = (path: string) => {
    const estado = location.state;
    
    if (path.includes('/dashboard/admin')) {
      return { vista: 'dashboard-admin', accordion: 0 };
    }
    
    if (path.includes('/dashboard/almacenero')) {
      return { vista: 'dashboard-almacenero', accordion: 0 };
    }
    
    if (path.includes('CajeroSistemaVentas')) {
      const vista = estado?.view ?? (tieneRol('ROLE_CAJERO') ? 'apertura' : 'ventas');
      return { vista, accordion: 1 };
    }
    
    if (path.includes('/pages/GestionUsuarios')) {
      return { vista: 'usuarios', accordion: 2 };
    }
    
    if (path.includes('/pages/reportes')) {
      if (tieneRol('ROLE_ADMIN')) {
        return { vista: 'reportes-admin', accordion: 0 };
      }
    }
    
    const rutasRol = [
      { ruta: '/pages/productos', admin: 'productos-admin', almacenero: 'productos-inventario', accordion: 2 },
      { ruta: '/pages/colores', admin: 'colores-admin', almacenero: 'colores-inventario', accordion: 2 },
      { ruta: '/pages/tallas', admin: 'tallas-admin', almacenero: 'tallas-inventario', accordion: 2 },
      { ruta: '/pages/proveedores', admin: 'proveedores-admin', almacenero: 'proveedores', accordion: 2 },
      { ruta: '/pages/categorias', admin: 'categorias-admin', almacenero: 'categorias', accordion: 2 }
    ];
    
    for (const config of rutasRol) {
      if (path.includes(config.ruta)) {
        if (tieneRol('ROLE_ADMIN')) {
          return { vista: config.admin, accordion: config.accordion };
        } else if (tieneRol('ROLE_ALMACENERO')) {
          return { vista: config.almacenero, accordion: 3 };
        }
      }
    }
    
    return null;
  };

  // Detectar cambios en la ruta para actualizar la vista activa
  useEffect(() => {
    const path = location.pathname;
    const resultado = determinarVistaYSubmenu(path);
    
    if (resultado) {
      const { vista, accordion } = resultado;
      
      if (vista !== vistaActual) {
        cambiarVista(vista);
      }
      
      if (accordion > 0) {
        setOpenAccordion(accordion);
      }
    }
  }, [location.pathname, location.state, tieneRol, cambiarVista, vistaActual]);

  const handleLogout = () => {
    cerrarSesion();
    navigate('/login');
  };

  const handleMenuClick = (vista: string, onClick?: () => void) => {
    if (vista !== vistaActual) {
      cambiarVista(vista);
    }
    
    if (onClick) {
      onClick();
    } else {
      const vistasDeCarjero = ['apertura', 'ventas', 'cierre'];
      if (vistasDeCarjero.includes(vista)) {
        navigate('/pages/CajeroSistemaVentas', { state: { view: vista } });
      }
    }
    
    // Cerrar drawer en dispositivos móviles
    closeDrawer();
  };

  return (
    <>
      {/* Barra de navegación superior fija en móviles */}
      {!isDrawerOpen && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-gray-900 border-b border-gray-700 shadow-lg md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button 
              onClick={openDrawer} 
              className="w-10 h-10 bg-gray-800 hover:bg-gray-700 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-600 hover:border-gray-500 rounded-lg flex items-center justify-center"
            >
              <Bars3Icon className="h-5 w-5 stroke-2 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center">
                <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <Typography variant="h6" className="font-bold text-white text-sm">
                VENTASPRO
              </Typography>
            </div>
          </div>
        </div>
      )}

      {/* Botón hamburguesa para pantallas grandes - Solo visible cuando el drawer está cerrado */}
      {!isDrawerOpen && (
        <div className="fixed top-4 left-4 z-[60] hidden md:block">
          <button 
            onClick={openDrawer} 
            className="w-12 h-12 bg-gray-800 hover:bg-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-600 hover:border-gray-500 rounded-lg flex items-center justify-center"
          >
            <Bars3Icon className="h-6 w-6 stroke-2 text-white" />
          </button>
        </div>
      )}
      
      {/* Drawer sin overlay para evitar oscurecimiento del fondo */}
      <Drawer 
        open={isDrawerOpen} 
        onClose={closeDrawer} 
        className="z-[50] bg-gray-900 rounded-none"
        overlay={false}
        placement="left"
        size={320}
      >
        {/* Botón de cerrar dentro del drawer */}
        <div className="absolute top-4 right-4 z-[70] md:top-6 md:right-6">
          <button 
            onClick={closeDrawer}
            className="w-10 h-10 bg-gray-800 hover:bg-gray-700 transition-all duration-200 text-gray-300 hover:text-white border border-gray-600 hover:border-gray-500 shadow-md hover:shadow-lg rounded-lg flex items-center justify-center cursor-pointer"
          >
            <XMarkIcon className="h-5 w-5 stroke-2" />
          </button>
        </div>

        <Card
          color="transparent"
          shadow={false}
          className="h-full w-full p-0 bg-gray-900 rounded-none"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-black flex items-center justify-center">
                <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div>
                <Typography variant="h6" className="font-bold text-white">
                  VENTASPRO
                </Typography>
                <Typography variant="small" className="text-gray-400 font-medium">
                  Sistema de Gestión
                </Typography>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <UserCircleIcon className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <Typography variant="small" className="font-semibold text-white">
                  {usuario?.usuario ?? 'Usuario'}
                </Typography>
                <Typography variant="small" className="text-blue-400 font-medium">
                  {tieneRol('ROLE_CAJERO') && 'Cajero'}
                  {tieneRol('ROLE_ADMIN') && 'Administrador'}
                  {tieneRol('ROLE_ALMACENERO') && 'Almacenero'}
                </Typography>
              </div>
            </div>
          </div>

          {/* Contenedor con scroll para el menú */}
          <div className="flex-1 overflow-y-auto px-4 py-2">
            <List className="p-0 space-y-1">
              {/* Dashboard para Admin */}
              {tieneRol('ROLE_ADMIN') && (
                <ListItem 
                  selected={vistaActual === 'dashboard-admin'}
                  onClick={() => handleMenuClick('dashboard-admin', () => navigate('/dashboard/admin'))}
                  className={`rounded-lg transition-all duration-200 ${
                    vistaActual === 'dashboard-admin' 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'hover:bg-gray-800 text-gray-300 hover:text-white'
                  }`}
                >
                  <ListItemPrefix>
                    <PresentationChartBarIcon className="h-5 w-5" />
                  </ListItemPrefix>
                  <span className="font-medium">Dashboard Admin</span>
                </ListItem>
              )}
              
              {/* Dashboard para Almacenero */}
              {tieneRol('ROLE_ALMACENERO') && (
                <ListItem 
                  selected={vistaActual === 'dashboard-almacenero'}
                  onClick={() => handleMenuClick('dashboard-almacenero', () => navigate('/dashboard/almacenero'))}
                  className={`rounded-lg transition-all duration-200 ${
                    vistaActual === 'dashboard-almacenero' 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'hover:bg-gray-800 text-gray-300 hover:text-white'
                  }`}
                >
                  <ListItemPrefix>
                    <Squares2X2Icon className="h-5 w-5" />
                  </ListItemPrefix>
                  <span className="font-medium">Dashboard Almacén</span>
                </ListItem>
              )}

              {/* Sistema de Caja */}
              {(tieneRol('ROLE_CAJERO') || tieneRol('ROLE_ADMIN')) && (
                <div className="mb-2">
                  <Accordion
                    open={openAccordion === 1}
                    icon={
                      <ChevronDownIcon
                        strokeWidth={2.5}
                        className={`h-4 w-4 transition-transform text-gray-400 ${
                          openAccordion === 1 ? "rotate-180" : ""
                        }`}
                      />
                    }
                  >
                    <ListItem className="p-0" selected={openAccordion === 1}>
                      <AccordionHeader
                        onClick={() => handleAccordionOpen(1)}
                        className="border-b-0 p-3 hover:bg-gray-800 rounded-lg transition-all duration-200"
                      >
                        <ListItemPrefix>
                          <ShoppingBagIcon className="h-5 w-5 text-green-400" />
                        </ListItemPrefix>
                        <Typography className="mr-auto font-medium text-gray-300">
                          Sistema de Caja
                        </Typography>
                      </AccordionHeader>
                    </ListItem>
                    <AccordionBody className="py-1 pl-4">
                      <List className="p-0 space-y-1">
                        <ListItem 
                          selected={vistaActual === 'apertura'}
                          onClick={() => handleMenuClick('apertura')}
                          className={`rounded-lg transition-all duration-200 ${
                            vistaActual === 'apertura' 
                              ? 'bg-green-600 text-white shadow-lg' 
                              : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          <ListItemPrefix>
                            <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                          </ListItemPrefix>
                          <span className="font-medium">Apertura de Caja</span>
                        </ListItem>
                        <ListItem 
                          selected={vistaActual === 'ventas'}
                          onClick={() => handleMenuClick('ventas')}
                          className={`rounded-lg transition-all duration-200 ${
                            vistaActual === 'ventas' 
                              ? 'bg-green-600 text-white shadow-lg' 
                              : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          <ListItemPrefix>
                            <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                          </ListItemPrefix>
                          <span className="font-medium">Ventas</span>
                        </ListItem>
                        <ListItem 
                          selected={vistaActual === 'cierre'}
                          onClick={() => handleMenuClick('cierre')}
                          className={`rounded-lg transition-all duration-200 ${
                            vistaActual === 'cierre' 
                              ? 'bg-green-600 text-white shadow-lg' 
                              : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          <ListItemPrefix>
                            <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                          </ListItemPrefix>
                          <span className="font-medium">Cierre de Caja</span>
                        </ListItem>
                      </List>
                    </AccordionBody>
                  </Accordion>
                </div>
              )}

              {/* Administración */}
              {tieneRol('ROLE_ADMIN') && (
                <div className="mb-2">
                  <Accordion
                    open={openAccordion === 2}
                    icon={
                      <ChevronDownIcon
                        strokeWidth={2.5}
                        className={`h-4 w-4 transition-transform text-gray-400 ${
                          openAccordion === 2 ? "rotate-180" : ""
                        }`}
                      />
                    }
                  >
                    <ListItem className="p-0" selected={openAccordion === 2}>
                      <AccordionHeader
                        onClick={() => handleAccordionOpen(2)}
                        className="border-b-0 p-3 hover:bg-gray-800 rounded-lg transition-all duration-200"
                      >
                        <ListItemPrefix>
                          <Cog6ToothIcon className="h-5 w-5 text-purple-400" />
                        </ListItemPrefix>
                        <Typography className="mr-auto font-medium text-gray-300">
                          Administración
                        </Typography>
                      </AccordionHeader>
                    </ListItem>
                    <AccordionBody className="py-1 pl-4">
                      <List className="p-0 space-y-1">
                        <ListItem 
                          selected={vistaActual === 'usuarios'}
                          onClick={() => handleMenuClick('usuarios', () => navigate('/pages/GestionUsuarios'))}
                          className={`rounded-lg transition-all duration-200 ${
                            vistaActual === 'usuarios' 
                              ? 'bg-purple-600 text-white shadow-lg' 
                              : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          <ListItemPrefix>
                            <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                          </ListItemPrefix>
                          <span className="font-medium">Usuarios</span>
                        </ListItem>
                        <ListItem 
                          selected={vistaActual === 'productos-admin'}
                          onClick={() => handleMenuClick('productos-admin', () => navigate('/pages/productos'))}
                          className={`rounded-lg transition-all duration-200 ${
                            vistaActual === 'productos-admin' 
                              ? 'bg-purple-600 text-white shadow-lg' 
                              : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          <ListItemPrefix>
                            <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                          </ListItemPrefix>
                          <span className="font-medium">Productos</span>
                        </ListItem>
                        <ListItem 
                          selected={vistaActual === 'colores-admin'}
                          onClick={() => handleMenuClick('colores-admin', () => navigate('/pages/colores'))}
                          className={`rounded-lg transition-all duration-200 ${
                            vistaActual === 'colores-admin' 
                              ? 'bg-purple-600 text-white shadow-lg' 
                              : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          <ListItemPrefix>
                            <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                          </ListItemPrefix>
                          <span className="font-medium">Colores</span>
                        </ListItem>
                        <ListItem 
                          selected={vistaActual === 'tallas-admin'}
                          onClick={() => handleMenuClick('tallas-admin', () => navigate('/pages/tallas'))}
                          className={`rounded-lg transition-all duration-200 ${
                            vistaActual === 'tallas-admin' 
                              ? 'bg-purple-600 text-white shadow-lg' 
                              : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          <ListItemPrefix>
                            <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                          </ListItemPrefix>
                          <span className="font-medium">Tallas</span>
                        </ListItem>
                        <ListItem 
                          selected={vistaActual === 'proveedores-admin'}
                          onClick={() => handleMenuClick('proveedores-admin', () => navigate('/pages/proveedores'))}
                          className={`rounded-lg transition-all duration-200 ${
                            vistaActual === 'proveedores-admin' 
                              ? 'bg-purple-600 text-white shadow-lg' 
                              : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          <ListItemPrefix>
                            <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                          </ListItemPrefix>
                          <span className="font-medium">Proveedores</span>
                        </ListItem>
                        <ListItem 
                          selected={vistaActual === 'categorias-admin'}
                          onClick={() => handleMenuClick('categorias-admin', () => navigate('/pages/categorias'))}
                          className={`rounded-lg transition-all duration-200 ${
                            vistaActual === 'categorias-admin' 
                              ? 'bg-purple-600 text-white shadow-lg' 
                              : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          <ListItemPrefix>
                            <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                          </ListItemPrefix>
                          <span className="font-medium">Categorías</span>
                        </ListItem>
                      </List>
                    </AccordionBody>
                  </Accordion>
                </div>
              )}

              {/* Inventario para Almacenero */}
              {tieneRol('ROLE_ALMACENERO') && (
                <div className="mb-2">
                  <Accordion
                    open={openAccordion === 3}
                    icon={
                      <ChevronDownIcon
                        strokeWidth={2.5}
                        className={`h-4 w-4 transition-transform text-gray-400 ${
                          openAccordion === 3 ? "rotate-180" : ""
                        }`}
                      />
                    }
                  >
                    <ListItem className="p-0" selected={openAccordion === 3}>
                      <AccordionHeader
                        onClick={() => handleAccordionOpen(3)}
                        className="border-b-0 p-3 hover:bg-gray-800 rounded-lg transition-all duration-200"
                      >
                        <ListItemPrefix>
                          <Squares2X2Icon className="h-5 w-5 text-orange-400" />
                        </ListItemPrefix>
                        <Typography className="mr-auto font-medium text-gray-300">
                          Inventario
                        </Typography>
                      </AccordionHeader>
                    </ListItem>
                    <AccordionBody className="py-1 pl-4">
                      <List className="p-0 space-y-1">
                        <ListItem 
                          selected={vistaActual === 'productos-inventario'}
                          onClick={() => handleMenuClick('productos-inventario', () => navigate('/pages/productos'))}
                          className={`rounded-lg transition-all duration-200 ${
                            vistaActual === 'productos-inventario' 
                              ? 'bg-orange-600 text-white shadow-lg' 
                              : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          <ListItemPrefix>
                            <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                          </ListItemPrefix>
                          <span className="font-medium">Productos</span>
                        </ListItem>
                        <ListItem 
                          selected={vistaActual === 'colores-inventario'}
                          onClick={() => handleMenuClick('colores-inventario', () => navigate('/pages/colores'))}
                          className={`rounded-lg transition-all duration-200 ${
                            vistaActual === 'colores-inventario' 
                              ? 'bg-orange-600 text-white shadow-lg' 
                              : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          <ListItemPrefix>
                            <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                          </ListItemPrefix>
                          <span className="font-medium">Colores</span>
                        </ListItem>
                        <ListItem 
                          selected={vistaActual === 'tallas-inventario'}
                          onClick={() => handleMenuClick('tallas-inventario', () => navigate('/pages/tallas'))}
                          className={`rounded-lg transition-all duration-200 ${
                            vistaActual === 'tallas-inventario' 
                              ? 'bg-orange-600 text-white shadow-lg' 
                              : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          <ListItemPrefix>
                            <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                          </ListItemPrefix>
                          <span className="font-medium">Tallas</span>
                        </ListItem>
                        <ListItem 
                          selected={vistaActual === 'proveedores'}
                          onClick={() => handleMenuClick('proveedores', () => navigate('/pages/proveedores'))}
                          className={`rounded-lg transition-all duration-200 ${
                            vistaActual === 'proveedores' 
                              ? 'bg-orange-600 text-white shadow-lg' 
                              : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          <ListItemPrefix>
                            <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                          </ListItemPrefix>
                          <span className="font-medium">Proveedores</span>
                        </ListItem>
                        <ListItem 
                          selected={vistaActual === 'categorias'}
                          onClick={() => handleMenuClick('categorias', () => navigate('/pages/categorias'))}
                          className={`rounded-lg transition-all duration-200 ${
                            vistaActual === 'categorias' 
                              ? 'bg-orange-600 text-white shadow-lg' 
                              : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          <ListItemPrefix>
                            <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                          </ListItemPrefix>
                          <span className="font-medium">Categorías</span>
                        </ListItem>
                      </List>
                    </AccordionBody>
                  </Accordion>
                </div>
              )}

              {/* Reportes para Admin */}
              {tieneRol('ROLE_ADMIN') && (
                <ListItem 
                  selected={vistaActual === 'reportes-admin'}
                  onClick={() => handleMenuClick('reportes-admin', () => navigate('/pages/reportes'))}
                  className={`rounded-lg transition-all duration-200 ${
                    vistaActual === 'reportes-admin' 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'hover:bg-gray-800 text-gray-300 hover:text-white'
                  }`}
                >
                  <ListItemPrefix>
                    <PresentationChartBarIcon className="h-5 w-5" />
                  </ListItemPrefix>
                  <span className="font-medium">Reportes</span>
                </ListItem>
              )}
            </List>
          </div>

          {/* Footer con Cerrar Sesión */}
          <div className="border-t border-gray-700 p-4">
            <ListItem 
              onClick={handleLogout}
              className="rounded-lg transition-all duration-200 hover:bg-red-600 text-red-400 hover:text-white"
            >
              <ListItemPrefix>
                <PowerIcon className="h-5 w-5" />
              </ListItemPrefix>
              <span className="font-medium">Cerrar Sesión</span>
            </ListItem>
          </div>
        </Card>
      </Drawer>
    </>
  );
};

export default SidebarMenu;