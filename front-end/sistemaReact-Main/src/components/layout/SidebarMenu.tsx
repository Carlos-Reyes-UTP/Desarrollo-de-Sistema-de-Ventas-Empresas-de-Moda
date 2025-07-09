import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { Usuario } from '../../interfaces/Usuario';
import {
  Menu,
  X, 
  BarChart3,
  Users,
  Package,
  ShoppingCart,
  Settings,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  DollarSign,
  Clock,
  ArrowUpDown,
  Palette,
  Ruler,
  Building2,
  TreePine
} from 'lucide-react';

interface SidebarMenuProps {
  vistaActual: string;
  cambiarVista: (vista: string) => void;
  usuario: Usuario | null;
  cerrarSesion: () => void;
}

const SidebarMenu = ({ vistaActual, cambiarVista, usuario, cerrarSesion }: SidebarMenuProps) => {
  const [sidebarAbierto, setSidebarAbierto] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mostrarSubmenuCaja, setMostrarSubmenuCaja] = useState(false);
  const [mostrarSubmenuAdmin, setMostrarSubmenuAdmin] = useState(false);
  const [mostrarSubmenuInventario, setMostrarSubmenuInventario] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { tieneRol } = useAuth();

  // Detectar cambios en el tamaño de la ventana
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        // En dispositivos pequeños, cerrar el sidebar inicialmente y colapsarlo
        setSidebarAbierto(false);
        setSidebarCollapsed(true);
      } else if (window.innerWidth < 1024) {
        // En tablets, mantener el sidebar abierto pero colapsado
        setSidebarAbierto(true);
        setSidebarCollapsed(true);
      } else {
        // En pantallas grandes, mantener el sidebar abierto y expandido
        setSidebarAbierto(true);
        setSidebarCollapsed(false);
      }
    };

    // Establecer estado inicial basado en el tamaño actual
    handleResize();

    // Añadir listener para cambios de tamaño
    window.addEventListener('resize', handleResize);

    // Limpiar listener al desmontar
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Función helper para determinar la vista y submenús según la ruta
  const determinarVistaYSubmenu = (path: string) => {
    const estado = location.state;
    
    if (path.includes('/dashboard/admin')) {
      return { vista: 'dashboard-admin', submenu: { caja: false, admin: false, inventario: false } };
    }
    
    if (path.includes('/dashboard/almacenero')) {
      return { vista: 'dashboard-almacenero', submenu: { caja: false, admin: false, inventario: false } };
    }
    
    if (path.includes('CajeroSistemaVentas')) {
      // Si hay un estado específico, usarlo; si no, para cajeros usar 'apertura' como defecto
      const vista = estado?.view ?? (tieneRol('ROLE_CAJERO') ? 'apertura' : 'ventas');
      return { vista, submenu: { caja: true, admin: false, inventario: false } };
    }
    
    if (path.includes('/pages/GestionUsuarios')) {
      return { vista: 'usuarios', submenu: { caja: false, admin: true, inventario: false } };
    }
    
    if (path.includes('/pages/reportes')) {
      if (tieneRol('ROLE_ADMIN')) {
        return { vista: 'reportes-admin', submenu: { caja: false, admin: true, inventario: false } };
      } else if (tieneRol('ROLE_ALMACENERO')) {
        return { vista: 'reportes-inventario', submenu: { caja: false, admin: false, inventario: true } };
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
        if (tieneRol('ROLE_ADMIN')) {
          return { vista: config.admin, submenu: { caja: false, admin: true, inventario: false } };
        } else if (tieneRol('ROLE_ALMACENERO')) {
          return { vista: config.almacenero, submenu: { caja: false, admin: false, inventario: true } };
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
      const { vista, submenu } = resultado;
      
      // Solo actualizar si es realmente necesario para evitar re-renders
      if (vista !== vistaActual) {
        cambiarVista(vista);
      }
      
      // Solo actualizar submenús si han cambiado
      if (submenu.caja !== mostrarSubmenuCaja) {
        setMostrarSubmenuCaja(submenu.caja);
      }
      if (submenu.admin !== mostrarSubmenuAdmin) {
        setMostrarSubmenuAdmin(submenu.admin);
      }
      if (submenu.inventario !== mostrarSubmenuInventario) {
        setMostrarSubmenuInventario(submenu.inventario);
      }
    }
  }, [location.pathname, location.state, tieneRol, cambiarVista]);

  const toggleSidebar = () => {
    setSidebarAbierto(!sidebarAbierto);
  };

  const toggleCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const MenuItem = ({ 
    texto, 
    vista, 
    icono, 
    onClick 
  }: { 
    texto: string; 
    vista: string; 
    icono: React.ReactNode;
    onClick?: () => void;
  }) => {
    const esActiva = vistaActual === vista;
    
    return (
      <button
        className={`w-full flex items-center px-4 py-3 text-sm rounded-lg transition-all duration-200 ${
          esActiva
            ? 'bg-gray-800 text-white shadow-md'
            : 'text-gray-400 hover:bg-gray-800/40 hover:text-white'
        }`}
        onClick={() => {
          // Solo llamar cambiarVista si no es la vista actual para evitar re-renders
          if (vista !== vistaActual) {
            cambiarVista(vista);
          }
          
          if (onClick) {
            onClick();
          } else {
            // Solo redirigir a CajeroSistemaVentas para vistas de cajero
            const vistasDeCarjero = ['apertura', 'ventas', 'cierre'];
            if (vistasDeCarjero.includes(vista)) {
              navigate('/pages/CajeroSistemaVentas', { state: { view: vista } });
            }
          }
          
          // En dispositivos móviles, cerrar el sidebar después de la selección
          if (window.innerWidth < 768) {
            setSidebarAbierto(false);
          }
        }}
      >
        {icono}
        {!sidebarCollapsed && <span className="ml-3 transition-opacity duration-200">{texto}</span>}
      </button>
    );
  };

  // Componente para secciones colapsables
  const SectionTitle = ({ 
    title, 
    isOpen, 
    toggle,
    icon
  }: { 
    title: string; 
    isOpen: boolean; 
    toggle: () => void;
    icon: React.ReactNode;
  }) => (
    <button
      onClick={toggle}
      className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-400 hover:bg-gray-800/20 hover:text-white rounded-lg mb-1"
    >
      <div className="flex items-center">
        {icon}
        {!sidebarCollapsed && <span className="ml-3">{title}</span>}
      </div>
      {!sidebarCollapsed && (
        <ArrowUpDown 
          size={16} 
          className={`transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} 
        />
      )}
    </button>
  );
  const handleLogout = () => {
    cerrarSesion();
    navigate('/login');
  };

  // Determinar ancho del sidebar según estado
  const sidebarWidth = sidebarCollapsed ? 'w-20' : 'w-64';

  return (
    <>
      {/* Overlay para cerrar el sidebar en pantallas pequeñas */}
      {sidebarAbierto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" 
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div 
        className={`
          fixed inset-y-0 left-0 bg-black border-r border-gray-900 text-white shadow-lg transform transition-all duration-300 ease-in-out z-30
          ${sidebarAbierto ? 'translate-x-0' : '-translate-x-full'}
          ${sidebarWidth}
          lg:relative lg:translate-x-0
        `}
      >
        {/* Header del sidebar */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
          <div className="flex items-center">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-gray-800">
              <ShoppingCart size={20} className="text-white" />
            </div>
            {!sidebarCollapsed && (
              <h1 className="ml-3 text-xl font-bold transition-opacity duration-200">VENTASPRO</h1>
            )}
          </div>
          <div className="flex">
            <button
              onClick={toggleCollapse}
              className="p-1 rounded-md focus:outline-none hover:bg-gray-800"
              aria-label={sidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
            >
              {sidebarCollapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
            </button>
            <button
              onClick={toggleSidebar}
              className="p-1 rounded-md focus:outline-none hover:bg-gray-800 lg:hidden ml-1"
              aria-label="Cerrar menú"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Información del usuario */}
        <div className="px-4 py-5 border-b border-gray-800">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center">
              <Users size={18} />
            </div>
            {!sidebarCollapsed && (
              <div className="ml-3 transition-opacity duration-200">
                <p className="text-sm font-medium text-white">{usuario?.usuario ?? 'Usuario'}</p>
                <p className="text-xs text-gray-400">
                  {tieneRol('ROLE_CAJERO') && 'Cajero'}
                  {tieneRol('ROLE_ADMIN') && 'Administrador'}
                  {tieneRol('ROLE_ALMACENERO') && 'Almacenero'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Menú principal con scroll */}
        <nav className="px-4 py-5 space-y-2 overflow-y-auto h-[calc(100vh-200px)]">
          {/* Dashboard para Admin */}
          {tieneRol('ROLE_ADMIN') && (
            <MenuItem 
              texto="Dashboard Admin" 
              vista="dashboard-admin" 
              icono={<BarChart3 size={20} />}
              onClick={() => navigate('/dashboard/admin')}
            />
          )}
          
          {/* Dashboard para Almacenero */}
          {tieneRol('ROLE_ALMACENERO') && (
            <MenuItem 
              texto="Dashboard Almacén" 
              vista="dashboard-almacenero" 
              icono={<Package size={20} />}
              onClick={() => navigate('/dashboard/almacenero')}
            />
          )}
          
          {/* Sección de Sistema de Caja */}
          {(tieneRol('ROLE_CAJERO') || tieneRol('ROLE_ADMIN')) && (
            <div className="mb-2">
              <SectionTitle 
                title="Sistema de Caja" 
                isOpen={mostrarSubmenuCaja} 
                toggle={() => setMostrarSubmenuCaja(!mostrarSubmenuCaja)}
                icon={<ShoppingCart size={20} />}
              />
              
              {/* Submenu de Caja */}
              {(mostrarSubmenuCaja || sidebarCollapsed) && (
                <div className={`space-y-1 mt-1 ${sidebarCollapsed ? '' : 'ml-2'}`}>
                  <MenuItem 
                    texto="Apertura de Caja" 
                    vista="apertura" 
                    icono={<Clock size={20} />}
                  />
                  <MenuItem 
                    texto="Ventas" 
                    vista="ventas" 
                    icono={<ShoppingCart size={20} />}
                  />
                  <MenuItem 
                    texto="Cierre de Caja" 
                    vista="cierre" 
                    icono={<DollarSign size={20} />}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Administración (solo para Admin) */}
          {tieneRol('ROLE_ADMIN') && (
            <div className="mb-2">
              <SectionTitle 
                title="Administración" 
                isOpen={mostrarSubmenuAdmin} 
                toggle={() => setMostrarSubmenuAdmin(!mostrarSubmenuAdmin)}
                icon={<Settings size={20} />}
              />
              
              {/* Submenu de Administración */}
              {(mostrarSubmenuAdmin || sidebarCollapsed) && (
                <div className={`space-y-1 mt-1 ${sidebarCollapsed ? '' : 'ml-2'}`}>
                  <MenuItem 
                    texto="Usuarios" 
                    vista="usuarios" 
                    icono={<Users size={20} />}
                    onClick={() => navigate('/pages/GestionUsuarios')}
                  />                  <MenuItem 
                    texto="Productos" 
                    vista="productos-admin" 
                    icono={<Package size={20} />}
                    onClick={() => navigate('/pages/productos')}
                  />
                  <MenuItem 
                    texto="Colores" 
                    vista="colores-admin" 
                    icono={<Palette size={20} />}
                    onClick={() => navigate('/pages/colores')}
                  />
                  <MenuItem 
                    texto="Tallas" 
                    vista="tallas-admin" 
                    icono={<Ruler size={20} />}
                    onClick={() => navigate('/pages/tallas')}
                  />
                  <MenuItem 
                    texto="Proveedores" 
                    vista="proveedores-admin" 
                    icono={<Building2 size={20} />}
                    onClick={() => navigate('/pages/proveedores')}
                  />
                  <MenuItem 
                    texto="Categorías" 
                    vista="categorias-admin" 
                    icono={<TreePine size={20} />}
                    onClick={() => navigate('/pages/categorias')}
                  />
                  <MenuItem 
                    texto="Reportes" 
                    vista="reportes-admin" 
                    icono={<BarChart3 size={20} />}
                    onClick={() => navigate('/pages/reportes')}
                  />

              
                </div>
              )}
            </div>
          )}
          
          {/* Inventario (solo para Almacenero) */}
          {tieneRol('ROLE_ALMACENERO') && (
            <div className="mb-2">
              <SectionTitle 
                title="Inventario" 
                isOpen={mostrarSubmenuInventario} 
                toggle={() => setMostrarSubmenuInventario(!mostrarSubmenuInventario)}
                icon={<Package size={20} />}
              />
              
              {/* Submenu de Inventario */}
              {(mostrarSubmenuInventario || sidebarCollapsed) && (
                <div className={`space-y-1 mt-1 ${sidebarCollapsed ? '' : 'ml-2'}`}>                  <MenuItem 
                    texto="Productos" 
                    vista="productos-inventario" 
                    icono={<Package size={20} />}
                    onClick={() => navigate('/pages/productos')}
                  />
                  <MenuItem 
                    texto="Colores" 
                    vista="colores-inventario" 
                    icono={<Palette size={20} />}
                    onClick={() => navigate('/pages/colores')}
                  />
                  <MenuItem 
                    texto="Tallas" 
                    vista="tallas-inventario" 
                    icono={<Ruler size={20} />}
                    onClick={() => navigate('/pages/tallas')}
                  />
                  <MenuItem 
                    texto="Proveedores" 
                    vista="proveedores" 
                    icono={<Building2 size={20} />}
                    onClick={() => navigate('/pages/proveedores')}
                  />
                  <MenuItem 
                    texto="Categorías" 
                    vista="categorias" 
                    icono={<TreePine size={20} />}
                    onClick={() => navigate('/pages/categorias')}
                  />
                  <MenuItem 
                    texto="Reportes" 
                    vista="reportes-inventario" 
                    icono={<BarChart3 size={20} />}
                    onClick={() => navigate('/pages/reportes')}
                  />
                </div>
              )}
            </div>
          )}
        </nav>
        
        {/* Footer con botón de cerrar sesión */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center justify-${sidebarCollapsed ? 'center' : 'start'} px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors`}
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} />
            {!sidebarCollapsed && <span className="ml-2">Cerrar Sesión</span>}
          </button>
        </div>
      </div>

      {/* Botón flotante para abrir sidebar en pantallas pequeñas */}
      <button
        onClick={toggleSidebar}
        className={`fixed bottom-4 left-4 p-3 rounded-full bg-gray-800 text-white shadow-lg z-10 lg:hidden ${sidebarAbierto ? 'hidden' : 'block'}`}
        aria-label="Abrir menú"
      >
        <Menu size={24} />
      </button>
    </>
  );
};

export default SidebarMenu;