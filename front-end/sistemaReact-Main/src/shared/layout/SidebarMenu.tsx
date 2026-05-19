// @ts-nocheck Material Tailwind v2.1.10 has incompatible React 19 types (placeholder, onPointerEnterCapture, etc.)
// This is a known issue: https://github.com/creativetimofficial/material-tailwind/issues/573
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { Usuario } from '../../types/Usuario';
import { APP_PATHS, isCajeroView, resolveSidebarState } from './navigationConfig';
import { esRolModuloAlmacen } from '../constants/rolesAlmacen';
import {
  Typography,
  List,
  ListItem,
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
  LogOut,
  Users,
  PieChart,
  ShoppingBag,
  PanelLeftClose,
  Package,
  LayoutGrid,
} from "lucide-react";

interface NavItemProps {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  selected: boolean;
  onClick: () => void;
  activeColor?: string;
}

interface SidebarMenuProps {
  vistaActual: string;
  cambiarVista: (vista: string) => void;
  usuario: Usuario | null;
  cerrarSesion: () => void;
  cajeroDark?: boolean;
}

const NavItem = ({ icon: Icon, label, selected, onClick }: NavItemProps) => (
  <ListItem
    selected={selected}
    onClick={onClick}
    className={`relative overflow-hidden group rounded-xl py-3 px-4 transition-all duration-200 border border-transparent flex items-center active:scale-[0.98] ${selected
      ? "bg-white/10 text-white shadow-lg shadow-black/20"
      : "hover:bg-white/5 text-gray-400 hover:text-white"
      }`}
  >
    <div className="mr-3.5 flex-shrink-0">
      <Icon className={`h-[20px] w-[20px] transition-colors ${selected ? "text-white" : "text-gray-500 group-hover:text-white"}`} strokeWidth={selected ? 2.5 : 2} />
    </div>
    <span className={`text-[14px] font-medium tracking-tight truncate`}>{label}</span>
  </ListItem>
);

const SidebarMenu = ({ vistaActual, cambiarVista, usuario, cerrarSesion, cajeroDark = false }: SidebarMenuProps) => {
  const [openAccordion, setOpenAccordion] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { tieneRol } = useAuth();

  const navigationState = resolveSidebarState({
    pathname: location.pathname,
    stateView: location.state?.view,
    hasRole: tieneRol,
  });

  const handleAccordionOpen = (value: number) => {
    setOpenAccordion(openAccordion === value ? 0 : value);
  };

  const openDrawer = () => {
    setIsDrawerOpen(true);
  };
  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  useEffect(() => {
    if (navigationState.view !== vistaActual) {
      cambiarVista(navigationState.view);
    }

    if (navigationState.accordion > 0) {
      setOpenAccordion(navigationState.accordion);
    }
  }, [navigationState, cambiarVista, vistaActual]);

  const handleLogout = () => {
    cerrarSesion();
    navigate(APP_PATHS.login);
  };

  const handleMenuClick = (vista: string, onClick?: () => void) => {
    if (vista !== vistaActual) {
      cambiarVista(vista);
    }

    if (onClick) {
      onClick();
    } else {
      if (isCajeroView(vista)) {
        navigate(APP_PATHS.caja, { state: { view: vista } });
      }
    }
    closeDrawer();
  };

  const getRoleLabel = () => {
    if (tieneRol('ROLE_ADMIN')) return 'ADMINISTRADOR';
    if (tieneRol('ROLE_SUPERVISOR_ALMACEN')) return 'SUPERVISOR ALMACÉN';
    if (tieneRol('ROLE_ALMACENERO')) return 'GESTOR DE ALMACÉN';
    if (tieneRol('ROLE_VENDEDOR')) return 'VENDEDOR';
    if (tieneRol('ROLE_CAJERO')) return 'CAJERO';
    return 'USUARIO';
  };



  return (
    <>
      {/* Rail escritorio (fase 2): hueco real en el flex del Layout; mismo botón y mismo drawer */}
      <aside
        className={`relative z-[30] hidden h-screen w-16 shrink-0 flex-col items-center border-r py-4 shadow-sm backdrop-blur-sm transition-opacity duration-200 ease-out md:flex ${cajeroDark ? "border-[var(--caj-border-strong)] bg-[var(--caj-surface)]" : "border-gray-200/90 bg-white/95"} ${isDrawerOpen ? "pointer-events-none opacity-40" : "opacity-100"
          }`}
        aria-label="Navegación principal"
      >
        <button
          type="button"
          onClick={openDrawer}
          className={`group flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] transition-all duration-200 ${cajeroDark ? "border-[var(--caj-border-strong)] bg-[var(--caj-surface-elevated)] hover:bg-[var(--caj-input)]" : "border-gray-100 bg-white hover:bg-gray-50"}`}
        >
          <Menu className={`h-6 w-6 transition-colors ${cajeroDark ? "text-[var(--caj-text-muted)] group-hover:text-[var(--caj-text)]" : "text-gray-400 group-hover:text-black"}`} />
        </button>
      </aside>

      {/* Barra superior móvil: siempre montada; evita parpadeo al abrir/cerrar el drawer */}
      <div
        className={`fixed top-0 left-0 right-0 z-[40] border-b shadow-sm transition-opacity duration-200 ease-out md:hidden ${cajeroDark ? "border-[var(--caj-border-strong)] bg-[var(--caj-surface)]" : "border-gray-100 bg-white"} ${isDrawerOpen ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        aria-hidden={isDrawerOpen}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={openDrawer}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition-all duration-200 ${cajeroDark ? "border-[var(--caj-border-strong)] bg-[var(--caj-surface-elevated)] hover:bg-[var(--caj-input)]" : "border-gray-200 bg-gray-50 hover:bg-gray-100"}`}
          >
            <Menu className={`h-5 w-5 ${cajeroDark ? "text-[var(--caj-text)]" : "text-gray-800"}`} />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black">
              <span className="text-[10px] font-bold text-white">DK</span>
            </div>
            <h2 className={`text-sm font-bold tracking-widest ${cajeroDark ? "text-[var(--caj-text)]" : "text-gray-900"}`}>DK-SYSTEM</h2>
          </div>
        </div>
      </div>

      <Drawer
        open={isDrawerOpen}
        onClose={closeDrawer}
        transition={{ type: "tween", duration: 0.22 }}
        className="z-[50] border-r border-white/5 bg-[#0a0a0a] shadow-2xl"
        overlay={true}
        placement="left"
        size={300}
        overlayProps={{
          className:
            "fixed inset-0 z-[45] bg-black/40 backdrop-blur-sm will-change-[opacity] pointer-events-auto " +
            "[-webkit-tap-highlight-color:transparent]",
        }}
      >
        <Card
          color="transparent"
          shadow={false}
          className="h-full w-full flex flex-col pt-4 overflow-hidden"
        >
          {/* Header con Perfil */}
          <div className="px-6 py-8 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-white flex items-center justify-center shadow-xl shadow-white/5">
                <span className="text-sm font-black text-black tracking-widest">DK</span>
              </div>
              <div className="flex flex-col min-w-0">
                <Typography className="text-base font-bold text-white truncate leading-tight tracking-tight">
                  {usuario?.usuario ?? 'Usuario'}
                </Typography>
                <Typography className="text-[11px] font-medium text-gray-500 tracking-wider uppercase mt-1">
                  {getRoleLabel()}
                </Typography>
              </div>
            </div>
            <button
              onClick={closeDrawer}
              className="p-2 hover:bg-white/10 transition-colors rounded-xl group"
            >
              <PanelLeftClose className="h-5 w-5 text-gray-500 group-hover:text-white" strokeWidth={2} />
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
                  onClick={() => handleMenuClick('dashboard-admin', () => navigate(APP_PATHS.dashboardAdmin))}
                />
              )}

              {(tieneRol('ROLE_ALMACENERO') || tieneRol('ROLE_SUPERVISOR_ALMACEN')) && (
                <NavItem
                  icon={LayoutDashboard}
                  label="Dashboard Almacén"
                  selected={vistaActual === 'dashboard-almacenero'}
                  onClick={() => handleMenuClick('dashboard-almacenero', () => navigate(APP_PATHS.dashboardAlmacenero))}
                />
              )}

              {(tieneRol('ROLE_ALMACENERO') || tieneRol('ROLE_SUPERVISOR_ALMACEN')) && (
                <NavItem
                  icon={LayoutGrid}
                  label="Tablero pedidos"
                  selected={vistaActual === 'almacen-tablero'}
                  onClick={() =>
                    handleMenuClick('almacen-tablero', () =>
                      navigate(APP_PATHS.almacenTablero)
                    )
                  }
                />
              )}

              {tieneRol('ROLE_VENDEDOR') && (
                <NavItem
                  icon={Package}
                  label="Solicitud a almacén"
                  selected={vistaActual === 'vendedor-piso'}
                  onClick={() =>
                    handleMenuClick('vendedor-piso', () =>
                      navigate(APP_PATHS.vendedorPiso)
                    )
                  }
                />
              )}

              {/* Sistema de Caja */}
              {tieneRol('ROLE_CAJERO') && (
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
                        <div className={`w-full flex items-center py-3 px-4 rounded-xl transition-all duration-200 active:scale-[0.98] ${openAccordion === 1 ? "bg-white/5 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>
                          <div className="mr-3.5 flex-shrink-0">
                            <ShoppingBag className={`h-[20px] w-[20px] ${openAccordion === 1 ? "text-white" : "text-gray-500"}`} strokeWidth={2} />
                          </div>
                          <span className="text-[14px] font-medium flex-1 text-left tracking-tight">Sistema de Caja</span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${openAccordion === 1 ? "rotate-180" : ""}`} strokeWidth={2.5} />
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
              {(tieneRol('ROLE_ADMIN') || esRolModuloAlmacen(tieneRol)) && (
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
                      onClick={() => handleMenuClick('usuarios', () => navigate(APP_PATHS.gestionUsuarios))}
                    />
                  )}

                  {/* Inventario Acordeón (Solo Almacenero) */}
                  {esRolModuloAlmacen(tieneRol) && !tieneRol('ROLE_ADMIN') && (
                    <Accordion open={openAccordion === 3} className="border-none mt-2">
                      <ListItem className="p-0" selected={openAccordion === 3}>
                        <AccordionHeader onClick={() => handleAccordionOpen(3)} className="border-none p-0">
                          <div className={`w-full flex items-center py-2.5 px-4 rounded-xl transition-all duration-200 active:scale-[0.99] ${openAccordion === 3 ? "bg-gray-100/50 text-black font-semibold" : "text-[#9ca3af] hover:bg-gray-200/30 hover:text-black"}`}>
                            <div className="mr-3.5 flex-shrink-0">
                              <Box className="h-[18px] w-[18px]" strokeWidth={2.5} />
                            </div>
                            <span className="text-[13.5px] items-center flex-1 text-left tracking-tight">Control Inventario</span>
                            <ChevronDown className={`h-3 w-3 transition-transform ${openAccordion === 3 ? "rotate-180" : ""}`} strokeWidth={3} />
                          </div>
                        </AccordionHeader>
                      </ListItem>
                      <AccordionBody className="py-2 pl-4 pr-1">
                        <List className="p-0 space-y-1.5">
                          <NavItem icon={Box} label="Productos" selected={vistaActual.includes('productos')} onClick={() => handleMenuClick('productos-inventario', () => navigate(APP_PATHS.productos))} />
                          <NavItem icon={Truck} label="Proveedores" selected={vistaActual.includes('proveedores')} onClick={() => handleMenuClick('proveedores', () => navigate(APP_PATHS.proveedores))} />
                          <NavItem icon={Layers} label="Categorías" selected={vistaActual.includes('categorias')} onClick={() => handleMenuClick('categorias', () => navigate(APP_PATHS.categorias))} />
                        </List>
                      </AccordionBody>
                    </Accordion>
                  )}
                </div>
              )}

              {/* Reportes para Admin */}
              {tieneRol('ROLE_ADMIN') && (
                <div className="py-2">
                  <p className="px-5 pb-3 text-[10px] font-bold text-[#9ca3af] tracking-[0.15em] uppercase">Análisis</p>
                  <NavItem
                    icon={PieChart}
                    label="Reportes"
                    selected={vistaActual === 'reportes-admin'}
                    onClick={() => handleMenuClick('reportes-admin', () => navigate(APP_PATHS.reportes))}
                  />
                </div>
              )}
            </List>
          </div>

          {/* Footer */}
          <div className="mt-auto px-4 py-8 border-t border-white/5 flex flex-col space-y-1 bg-black/20">
            <div className="pt-2">
              <ListItem
                onClick={handleLogout}
                className="group rounded-xl py-4 px-4 transition-all duration-200 active:scale-[0.98] text-red-500/80 hover:bg-red-500/10 hover:text-red-400 flex items-center border border-transparent hover:border-red-500/20"
              >
                <div className="mr-3.5 flex-shrink-0">
                  <LogOut className="h-[20px] w-[20px] transform group-hover:-translate-x-1 transition-transform" strokeWidth={2} />
                </div>
                <span className="text-[14px] font-bold tracking-tight">Cerrar Sesión</span>
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
          background: #333;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
      `}</style>
    </>
  );
};

export default SidebarMenu;
