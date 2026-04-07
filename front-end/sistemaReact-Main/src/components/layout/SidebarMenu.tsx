// @ts-nocheck - Supresión temporal para compatibilidad Material Tailwind v2.1.10 con React 19
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { Usuario } from '../../interfaces/Usuario';
import {
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
  LayoutDashboard,
  Box,
  Truck,
  Layers,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  User,
  LogOut,
  Users,
  Palette,
  Maximize2,
  PieChart,
  ShoppingBag,
  PanelLeftClose,
  ChevronLast
} from "lucide-react";

interface SidebarMenuProps {
  vistaActual: string;
  cambiarVista: (vista: string) => void;
  usuario: Usuario | null;
  cerrarSesion: () => void;
  onDrawerStateChange?: (isOpen: boolean) => void;
}

const SidebarMenu = ({ vistaActual, cambiarVista, usuario, cerrarSesion, onDrawerStateChange }: SidebarMenuProps) => {
  const [openAccordion, setOpenAccordion] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { tieneRol } = useAuth();

  const handleAccordionOpen = (value: number) => {
    setOpenAccordion(openAccordion === value ? 0 : value);
  };

  const openDrawer = () => {
    setIsDrawerOpen(true);
    onDrawerStateChange?.(true);
  };
  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => {
      onDrawerStateChange?.(false);
    }, 100);
  };

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
    closeDrawer();
  };

  const getRoleLabel = () => {
    if (tieneRol('ROLE_ADMIN')) return 'ADMINISTRADOR';
    if (tieneRol('ROLE_ALMACENERO')) return 'GESTOR DE ALMACÉN';
    if (tieneRol('ROLE_CAJERO')) return 'CAJERO';
    return 'USUARIO';
  };

  // Componente interno para items
  const NavItem = ({ icon: Icon, label, selected, onClick, activeColor = "bg-white" }) => (
    <ListItem
      selected={selected}
      onClick={onClick}
      className={`relative group rounded-xl py-3 px-4 transition-all duration-300 border border-transparent ${
        selected 
          ? `${activeColor} border-gray-100 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06)] scale-[1.02] text-black` 
          : "hover:bg-gray-200/50 text-[#9ca3af] hover:text-gray-900"
      }`}
    >
      <ListItemPrefix>
        <Icon className={`h-[18px] w-[18px] transition-colors ${selected ? "text-black" : "text-[#9ca3af] group-hover:text-gray-900"}`} strokeWidth={2.5} />
      </ListItemPrefix>
      <span className={`text-[13.5px] font-bold tracking-tight ${selected ? "text-black" : ""}`}>{label}</span>
    </ListItem>
  );

  return (
    <>
      {/* Barra de navegación superior fija en móviles */}
      {!isDrawerOpen && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-white border-b border-gray-100 shadow-sm md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button 
              onClick={openDrawer} 
              className="w-10 h-10 bg-gray-50 hover:bg-gray-100 shadow-sm transition-all duration-200 border border-gray-200 rounded-xl flex items-center justify-center"
            >
              <Menu className="h-5 w-5 text-gray-800" />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">DK</span>
              </div>
              <h2 className="font-bold text-gray-900 text-sm tracking-widest">DK-SYSTEM</h2>
            </div>
          </div>
        </div>
      )}

      {/* Botón hamburguesa para pantallas grandes */}
      {!isDrawerOpen && (
        <div className="fixed top-4 left-4 z-[60] hidden md:block">
          <button 
            onClick={openDrawer} 
            className="w-12 h-12 bg-white hover:bg-gray-50 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] transition-all duration-200 border border-gray-100 rounded-xl flex items-center justify-center group"
          >
            <Menu className="h-6 w-6 text-gray-400 group-hover:text-black transition-colors" />
          </button>
        </div>
      )}
      
      <Drawer 
        open={isDrawerOpen} 
        onClose={closeDrawer} 
        className="z-[50] bg-[#fafafa] border-r border-gray-100 shadow-2xl"
        overlay={true}
        placement="left"
        size={320}
        overlayProps={{
          className: "fixed inset-0 bg-black/10 backdrop-blur-[2px] md:!bg-transparent md:!backdrop-blur-none transition-all"
        }}
      >
        <Card
          color="transparent"
          shadow={false}
          className="h-full w-full flex flex-col pt-4 overflow-hidden"
        >
          {/* Header con Perfil */}
          <div className="px-6 py-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-black flex items-center justify-center shadow-md">
                <span className="text-sm font-bold text-white tracking-widest">DK</span>
              </div>
              <div className="flex flex-col min-w-0">
                <Typography className="text-[15px] font-bold text-black truncate leading-tight">
                  {usuario?.usuario ?? 'Usuario'}
                </Typography>
                <Typography className="text-[10px] font-bold text-[#9ca3af] tracking-widest uppercase mt-0.5">
                  {getRoleLabel()}
                </Typography>
              </div>
            </div>
            <button 
                onClick={closeDrawer}
                className="p-1.5 hover:bg-gray-200 transition-colors rounded-lg group"
            >
                <PanelLeftClose className="h-5 w-5 text-gray-400 group-hover:text-black" strokeWidth={2.5} />
            </button>
          </div>

          {/* Menú Scrolleable */}
          <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
            <List className="p-0 space-y-2">
              
              {/* Dashboards */}
              {tieneRol('ROLE_ADMIN') && (
                <NavItem 
                  icon={LayoutDashboard} 
                  label="Dashboard Admin" 
                  selected={vistaActual === 'dashboard-admin'} 
                  onClick={() => handleMenuClick('dashboard-admin', () => navigate('/dashboard/admin'))}
                />
              )}
              
              {tieneRol('ROLE_ALMACENERO') && (
                <NavItem 
                  icon={LayoutDashboard} 
                  label="Dashboard Almacén" 
                  selected={vistaActual === 'dashboard-almacenero'} 
                  onClick={() => handleMenuClick('dashboard-almacenero', () => navigate('/dashboard/almacenero'))}
                />
              )}

              {/* Sistema de Caja */}
              {(tieneRol('ROLE_CAJERO') || tieneRol('ROLE_ADMIN')) && (
                 <div className="py-2">
                    <p className="px-5 pb-3 text-[10px] font-bold text-[#9ca3af] tracking-[0.15em] uppercase">Módulo Comercial</p>
                    <Accordion
                      open={openAccordion === 1}
                      className="border-none"
                    >
                      <ListItem className="p-0" selected={openAccordion === 1}>
                        <AccordionHeader
                           onClick={() => handleAccordionOpen(1)}
                           className="border-none p-0"
                        >
                           <div className={`w-full flex items-center py-3 px-4 rounded-xl transition-all ${openAccordion === 1 ? "bg-gray-100/50 text-black font-bold" : "text-[#9ca3af] hover:bg-gray-200/30 hover:text-black"}`}>
                              <ShoppingBag className="h-[18px] w-[18px] mr-3" strokeWidth={2.5} />
                              <span className="text-[13.5px] items-center flex-1 text-left tracking-tight">Sistema de Caja</span>
                              <ChevronDown className={`h-3 w-3 transition-transform ${openAccordion === 1 ? "rotate-180" : ""}`} strokeWidth={3} />
                           </div>
                        </AccordionHeader>
                      </ListItem>
                      <AccordionBody className="py-2 pl-4 pr-1">
                        <List className="p-0 space-y-1.5">
                          <NavItem icon={ChevronRight} label="Apertura" selected={vistaActual === 'apertura'} onClick={() => handleMenuClick('apertura')} />
                          <NavItem icon={ChevronRight} label="Ventas" selected={vistaActual === 'ventas'} onClick={() => handleMenuClick('ventas')} />
                          <NavItem icon={ChevronRight} label="Cierre" selected={vistaActual === 'cierre'} onClick={() => handleMenuClick('cierre')} />
                        </List>
                      </AccordionBody>
                    </Accordion>
                 </div>
              )}

              {/* Administración / Inventario */}
              <div className="py-2">
                <p className="px-5 pb-3 text-[10px] font-bold text-[#9ca3af] tracking-[0.15em] uppercase">
                  {tieneRol('ROLE_ADMIN') ? 'Configuración' : 'Gestión'}
                </p>

                {/* Usuarios (Solo Admin) */}
                {tieneRol('ROLE_ADMIN') && (
                    <NavItem 
                      icon={Users} 
                      label="Usuarios" 
                      selected={vistaActual === 'usuarios'} 
                      onClick={() => handleMenuClick('usuarios', () => navigate('/pages/GestionUsuarios'))}
                    />
                )}

                {/* Inventario Acordeón */}
                <Accordion open={openAccordion === 2 || openAccordion === 3} className="border-none mt-2">
                    <ListItem className="p-0" selected={openAccordion === 2 || openAccordion === 3}>
                      <AccordionHeader onClick={() => handleAccordionOpen(tieneRol('ROLE_ADMIN') ? 2 : 3)} className="border-none p-0">
                        <div className={`w-full flex items-center py-3 px-4 rounded-xl transition-all ${openAccordion === 2 || openAccordion === 3 ? "bg-gray-100/50 text-black font-bold" : "text-[#9ca3af] hover:bg-gray-200/30 hover:text-black"}`}>
                           <Box className="h-[18px] w-[18px] mr-3" strokeWidth={2.5} />
                           <span className="text-[13.5px] items-center flex-1 text-left tracking-tight">Control Inventario</span>
                           <ChevronDown className={`h-3 w-3 transition-transform ${openAccordion === 2 || openAccordion === 3 ? "rotate-180" : ""}`} strokeWidth={3} />
                        </div>
                      </AccordionHeader>
                    </ListItem>
                    <AccordionBody className="py-2 pl-4 pr-1">
                      <List className="p-0 space-y-1.5">
                        <NavItem icon={Box} label="Productos" selected={vistaActual.includes('productos')} onClick={() => handleMenuClick(tieneRol('ROLE_ADMIN') ? 'productos-admin' : 'productos-inventario', () => navigate('/pages/productos'))} />
                        <NavItem icon={Palette} label="Colores" selected={vistaActual.includes('colores')} onClick={() => handleMenuClick(tieneRol('ROLE_ADMIN') ? 'colores-admin' : 'colores-inventario', () => navigate('/pages/colores'))} />
                        <NavItem icon={Maximize2} label="Tallas" selected={vistaActual.includes('tallas')} onClick={() => handleMenuClick(tieneRol('ROLE_ADMIN') ? 'tallas-admin' : 'tallas-inventario', () => navigate('/pages/tallas'))} />
                        <NavItem icon={Truck} label="Proveedores" selected={vistaActual.includes('proveedores')} onClick={() => handleMenuClick(tieneRol('ROLE_ADMIN') ? 'proveedores-admin' : 'proveedores', () => navigate('/pages/proveedores'))} />
                        <NavItem icon={Layers} label="Categorías" selected={vistaActual.includes('categorias')} onClick={() => handleMenuClick(tieneRol('ROLE_ADMIN') ? 'categorias-admin' : 'categorias', () => navigate('/pages/categorias'))} />
                      </List>
                    </AccordionBody>
                </Accordion>
              </div>

              {/* Reportes para Admin */}
              {tieneRol('ROLE_ADMIN') && (
                 <div className="py-2">
                    <p className="px-5 pb-3 text-[10px] font-bold text-[#9ca3af] tracking-[0.15em] uppercase">Análisis</p>
                    <NavItem 
                      icon={PieChart} 
                      label="Reportes" 
                      selected={vistaActual === 'reportes-admin'} 
                      onClick={() => handleMenuClick('reportes-admin', () => navigate('/pages/reportes'))}
                    />
                 </div>
              )}
            </List>
          </div>

          {/* Footer Navigation */}
          <div className="mt-auto px-4 py-6 border-t border-gray-100 flex flex-col space-y-1 bg-[#fcfcfc]">
              <div className="pt-2">
                <ListItem 
                    onClick={handleLogout}
                    className="group rounded-xl py-3 px-4 transition-all duration-200 text-red-400 hover:bg-red-50 hover:text-red-600"
                >
                    <ListItemPrefix>
                        <LogOut className="h-[18px] w-[18px] transform group-hover:-translate-x-1 transition-transform" strokeWidth={2.5} />
                    </ListItemPrefix>
                    <span className="text-[13.5px] font-bold tracking-tight">Cerrar Sesión</span>
                </ListItem>
              </div>
          </div>
        </Card>
      </Drawer>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </>
  );
};

export default SidebarMenu;