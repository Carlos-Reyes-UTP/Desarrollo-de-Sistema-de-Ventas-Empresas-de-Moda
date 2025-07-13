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
      {/* Botón de menú hamburguesa - Solo visible cuando el drawer está cerrado */}
      {!isDrawerOpen && (
        <div className="absolute top-4 left-4 z-[60]">
          <IconButton 
            variant="text" 
            size="lg" 
            onClick={openDrawer} 
            className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-200"
            placeholder={undefined}
            onPointerEnterCapture={undefined}
            onPointerLeaveCapture={undefined}
          >
            <Bars3Icon className="h-6 w-6 stroke-2 text-gray-700" />
          </IconButton>
        </div>
      )}
      
      {/* Drawer sin overlay para evitar oscurecimiento del fondo */}
      <Drawer 
        open={isDrawerOpen} 
        onClose={closeDrawer} 
        className="z-[50]"
        overlay={false}
        placement="left"
        size={320}
      >
        {/* Botón de cerrar dentro del drawer */}
        <div className="absolute top-4 right-4 z-[70]">
          <IconButton 
            variant="text" 
            size="sm" 
            onClick={closeDrawer}
            className="hover:bg-gray-100 transition-colors duration-200"
          >
            <XMarkIcon className="h-5 w-5 stroke-2 text-gray-700" />
          </IconButton>
        </div>

        <Card
          color="transparent"
          shadow={false}
          className="h-full w-full p-4 bg-white"
        >
          {/* Header */}
          <div className="mb-6 flex items-center gap-4 p-4 pt-12">
            <img
              src="https://docs.material-tailwind.com/img/logo-ct-dark.png"
              alt="brand"
              className="h-8 w-8"
            />
            <Typography variant="h5" color="blue-gray">
              VENTASPRO
            </Typography>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-blue-gray-50 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-gray-100 flex items-center justify-center">
                <UserCircleIcon className="h-6 w-6 text-blue-gray-600" />
              </div>
              <div>
                <Typography variant="small" className="font-semibold text-blue-gray-900">
                  {usuario?.usuario ?? 'Usuario'}
                </Typography>
                <Typography variant="small" className="text-blue-gray-500">
                  {tieneRol('ROLE_CAJERO') && 'Cajero'}
                  {tieneRol('ROLE_ADMIN') && 'Administrador'}
                  {tieneRol('ROLE_ALMACENERO') && 'Almacenero'}
                </Typography>
              </div>
            </div>
          </div>

          {/* Contenedor con scroll para el menú */}
          <div className="flex-1 overflow-y-auto">
            <List className="p-0">
              {/* Dashboard para Admin */}
              {tieneRol('ROLE_ADMIN') && (
                <ListItem 
                  selected={vistaActual === 'dashboard-admin'}
                  onClick={() => handleMenuClick('dashboard-admin', () => navigate('/dashboard/admin'))}
                  className="hover:bg-blue-50 focus:bg-blue-50"
                >
                  <ListItemPrefix>
                    <PresentationChartBarIcon className="h-5 w-5" />
                  </ListItemPrefix>
                  Dashboard Admin
                </ListItem>
              )}
              
              {/* Dashboard para Almacenero */}
              {tieneRol('ROLE_ALMACENERO') && (
                <ListItem 
                  selected={vistaActual === 'dashboard-almacenero'}
                  onClick={() => handleMenuClick('dashboard-almacenero', () => navigate('/dashboard/almacenero'))}
                  className="hover:bg-blue-50 focus:bg-blue-50"
                >
                  <ListItemPrefix>
                    <Squares2X2Icon className="h-5 w-5" />
                  </ListItemPrefix>
                  Dashboard Almacén
                </ListItem>
              )}

              {/* Sistema de Caja */}
              {(tieneRol('ROLE_CAJERO') || tieneRol('ROLE_ADMIN')) && (
                <Accordion
                  open={openAccordion === 1}
                  icon={
                    <ChevronDownIcon
                      strokeWidth={2.5}
                      className={`mx-auto h-4 w-4 transition-transform ${
                        openAccordion === 1 ? "rotate-180" : ""
                      }`}
                    />
                  }
                >
                  <ListItem className="p-0" selected={openAccordion === 1}>
                    <AccordionHeader
                      onClick={() => handleAccordionOpen(1)}
                      className="border-b-0 p-3 hover:bg-blue-50"
                    >
                      <ListItemPrefix>
                        <ShoppingBagIcon className="h-5 w-5" />
                      </ListItemPrefix>
                      <Typography color="blue-gray" className="mr-auto font-normal">
                        Sistema de Caja
                      </Typography>
                    </AccordionHeader>
                  </ListItem>
                  <AccordionBody className="py-1">
                    <List className="p-0">
                      <ListItem 
                        selected={vistaActual === 'apertura'}
                        onClick={() => handleMenuClick('apertura')}
                        className="hover:bg-blue-50 focus:bg-blue-50"
                      >
                        <ListItemPrefix>
                          <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                        </ListItemPrefix>
                        Apertura de Caja
                      </ListItem>
                      <ListItem 
                        selected={vistaActual === 'ventas'}
                        onClick={() => handleMenuClick('ventas')}
                        className="hover:bg-blue-50 focus:bg-blue-50"
                      >
                        <ListItemPrefix>
                          <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                        </ListItemPrefix>
                        Ventas
                      </ListItem>
                      <ListItem 
                        selected={vistaActual === 'cierre'}
                        onClick={() => handleMenuClick('cierre')}
                        className="hover:bg-blue-50 focus:bg-blue-50"
                      >
                        <ListItemPrefix>
                          <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                        </ListItemPrefix>
                        Cierre de Caja
                      </ListItem>
                    </List>
                  </AccordionBody>
                </Accordion>
              )}

              {/* Administración */}
              {tieneRol('ROLE_ADMIN') && (
                <Accordion
                  open={openAccordion === 2}
                  icon={
                    <ChevronDownIcon
                      strokeWidth={2.5}
                      className={`mx-auto h-4 w-4 transition-transform ${
                        openAccordion === 2 ? "rotate-180" : ""
                      }`}
                    />
                  }
                >
                  <ListItem className="p-0" selected={openAccordion === 2}>
                    <AccordionHeader
                      onClick={() => handleAccordionOpen(2)}
                      className="border-b-0 p-3 hover:bg-blue-50"
                    >
                      <ListItemPrefix>
                        <Cog6ToothIcon className="h-5 w-5" />
                      </ListItemPrefix>
                      <Typography color="blue-gray" className="mr-auto font-normal">
                        Administración
                      </Typography>
                    </AccordionHeader>
                  </ListItem>
                  <AccordionBody className="py-1">
                    <List className="p-0">
                      <ListItem 
                        selected={vistaActual === 'usuarios'}
                        onClick={() => handleMenuClick('usuarios', () => navigate('/pages/GestionUsuarios'))}
                        className="hover:bg-blue-50 focus:bg-blue-50"
                      >
                        <ListItemPrefix>
                          <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                        </ListItemPrefix>
                        Usuarios
                      </ListItem>
                      <ListItem 
                        selected={vistaActual === 'productos-admin'}
                        onClick={() => handleMenuClick('productos-admin', () => navigate('/pages/productos'))}
                        className="hover:bg-blue-50 focus:bg-blue-50"
                      >
                        <ListItemPrefix>
                          <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                        </ListItemPrefix>
                        Productos
                      </ListItem>
                      <ListItem 
                        selected={vistaActual === 'colores-admin'}
                        onClick={() => handleMenuClick('colores-admin', () => navigate('/pages/colores'))}
                        className="hover:bg-blue-50 focus:bg-blue-50"
                      >
                        <ListItemPrefix>
                          <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                        </ListItemPrefix>
                        Colores
                      </ListItem>
                      <ListItem 
                        selected={vistaActual === 'tallas-admin'}
                        onClick={() => handleMenuClick('tallas-admin', () => navigate('/pages/tallas'))}
                        className="hover:bg-blue-50 focus:bg-blue-50"
                      >
                        <ListItemPrefix>
                          <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                        </ListItemPrefix>
                        Tallas
                      </ListItem>
                      <ListItem 
                        selected={vistaActual === 'proveedores-admin'}
                        onClick={() => handleMenuClick('proveedores-admin', () => navigate('/pages/proveedores'))}
                        className="hover:bg-blue-50 focus:bg-blue-50"
                      >
                        <ListItemPrefix>
                          <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                        </ListItemPrefix>
                        Proveedores
                      </ListItem>
                      <ListItem 
                        selected={vistaActual === 'categorias-admin'}
                        onClick={() => handleMenuClick('categorias-admin', () => navigate('/pages/categorias'))}
                        className="hover:bg-blue-50 focus:bg-blue-50"
                      >
                        <ListItemPrefix>
                          <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                        </ListItemPrefix>
                        Categorías
                      </ListItem>
                    </List>
                  </AccordionBody>
                </Accordion>
              )}

              {/* Inventario para Almacenero */}
              {tieneRol('ROLE_ALMACENERO') && (
                <Accordion
                  open={openAccordion === 3}
                  icon={
                    <ChevronDownIcon
                      strokeWidth={2.5}
                      className={`mx-auto h-4 w-4 transition-transform ${
                        openAccordion === 3 ? "rotate-180" : ""
                      }`}
                    />
                  }
                >
                  <ListItem className="p-0" selected={openAccordion === 3}>
                    <AccordionHeader
                      onClick={() => handleAccordionOpen(3)}
                      className="border-b-0 p-3 hover:bg-blue-50"
                    >
                      <ListItemPrefix>
                        <Squares2X2Icon className="h-5 w-5" />
                      </ListItemPrefix>
                      <Typography color="blue-gray" className="mr-auto font-normal">
                        Inventario
                      </Typography>
                    </AccordionHeader>
                  </ListItem>
                  <AccordionBody className="py-1">
                    <List className="p-0">
                      <ListItem 
                        selected={vistaActual === 'productos-inventario'}
                        onClick={() => handleMenuClick('productos-inventario', () => navigate('/pages/productos'))}
                        className="hover:bg-blue-50 focus:bg-blue-50"
                      >
                        <ListItemPrefix>
                          <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                        </ListItemPrefix>
                        Productos
                      </ListItem>
                      <ListItem 
                        selected={vistaActual === 'colores-inventario'}
                        onClick={() => handleMenuClick('colores-inventario', () => navigate('/pages/colores'))}
                        className="hover:bg-blue-50 focus:bg-blue-50"
                      >
                        <ListItemPrefix>
                          <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                        </ListItemPrefix>
                        Colores
                      </ListItem>
                      <ListItem 
                        selected={vistaActual === 'tallas-inventario'}
                        onClick={() => handleMenuClick('tallas-inventario', () => navigate('/pages/tallas'))}
                        className="hover:bg-blue-50 focus:bg-blue-50"
                      >
                        <ListItemPrefix>
                          <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                        </ListItemPrefix>
                        Tallas
                      </ListItem>
                      <ListItem 
                        selected={vistaActual === 'proveedores'}
                        onClick={() => handleMenuClick('proveedores', () => navigate('/pages/proveedores'))}
                        className="hover:bg-blue-50 focus:bg-blue-50"
                      >
                        <ListItemPrefix>
                          <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                        </ListItemPrefix>
                        Proveedores
                      </ListItem>
                      <ListItem 
                        selected={vistaActual === 'categorias'}
                        onClick={() => handleMenuClick('categorias', () => navigate('/pages/categorias'))}
                        className="hover:bg-blue-50 focus:bg-blue-50"
                      >
                        <ListItemPrefix>
                          <ChevronRightIcon strokeWidth={3} className="h-3 w-5" />
                        </ListItemPrefix>
                        Categorías
                      </ListItem>
                    </List>
                  </AccordionBody>
                </Accordion>
              )}

              <hr className="my-2 border-blue-gray-50" />
              
              {/* Reportes para Admin */}
              {tieneRol('ROLE_ADMIN') && (
                <ListItem 
                  selected={vistaActual === 'reportes-admin'}
                  onClick={() => handleMenuClick('reportes-admin', () => navigate('/pages/reportes'))}
                  className="hover:bg-blue-50 focus:bg-blue-50"
                >
                  <ListItemPrefix>
                    <PresentationChartBarIcon className="h-5 w-5" />
                  </ListItemPrefix>
                  Reportes
                </ListItem>
              )}
              
              {/* Logout */}
              <ListItem 
                onClick={handleLogout}
                className="hover:bg-red-50 focus:bg-red-50 text-red-600 hover:text-red-700"
              >
                <ListItemPrefix>
                  <PowerIcon className="h-5 w-5" />
                </ListItemPrefix>
                Cerrar Sesión
              </ListItem>
            </List>
          </div>
        </Card>
      </Drawer>
    </>
  );
};

export default SidebarMenu;