import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Edit,
  Trash2,
  UserPlus,
  AlertCircle,
  Loader2,
  CheckCircle,
  X,
  RefreshCw,
  UserCheck,
  UserX,
  Filter,
  ChevronDown,
  ArrowUpDown,
  Eye,
  EyeOff
} from 'lucide-react';
import { ServicioUsuarios } from '../services/UsuarioServices';
import type { Usuario, Rol, UsuarioBackend, ActualizarUsuarioDTO } from '../interfaces/Usuario';
import type { RolNombre } from '../interfaces/enums';

const GestionUsuarios = () => {
  // Estados para la lista de usuarios
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<RolNombre | 'TODOS'>('TODOS');
  const [filtroActivo, setFiltroActivo] = useState<boolean | 'TODOS'>('TODOS');
  const [ordenarPor, setOrdenarPor] = useState<string>('usuario');
  const [ordenAscendente, setOrdenAscendente] = useState(true);
  
  // Estados para el modal de usuario
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [formUsuario, setFormUsuario] = useState<{
    id?: number;
    usuario: string;
    password: string;
    confirmPassword: string;
    activo: boolean;
    roles: RolNombre[];
  }>({
    usuario: '',
    password: '',
    confirmPassword: '',
    activo: true,
    roles: [] // Inicializar sin roles preseleccionados
  });
  
  // Estado para mensajes de acción
  const [mensajeAccion, setMensajeAccion] = useState<{
    texto: string;
    tipo: 'success' | 'error';
    visible: boolean;
  }>({
    texto: '',
    tipo: 'success',
    visible: false
  });
  
  // Cargar usuarios al montar el componente
  useEffect(() => {
    cargarUsuarios();
  }, []);
  
  // Aplicar filtros cuando cambian
  useEffect(() => {
    aplicarFiltros();
  }, [busqueda, filtroRol, filtroActivo, usuarios, ordenarPor, ordenAscendente]);
  // Función helper para normalizar usuarios del back-end
  const normalizarUsuario = (usuarioBackend: UsuarioBackend): Usuario => {
    const usuario: Usuario = {
      id: usuarioBackend.id,
      usuario: usuarioBackend.usuario,
      password: usuarioBackend.password,
      activo: usuarioBackend.activo,
      roles: []
    };

    // Normalizar roles
    if (usuarioBackend.roles) {
      if (Array.isArray(usuarioBackend.roles)) {
        // Si es array de strings, convertir a objetos Rol
        usuario.roles = (usuarioBackend.roles as string[]).map(rol => ({
          nombreRol: rol.startsWith('ROLE_') ? rol as RolNombre : `ROLE_${rol}` as RolNombre
        }));
      } else if (usuarioBackend.roles instanceof Set) {
        // Si es Set, convertir a array y luego a objetos Rol
        usuario.roles = Array.from(usuarioBackend.roles as Set<string>).map(rol => ({
          nombreRol: rol.startsWith('ROLE_') ? rol as RolNombre : `ROLE_${rol}` as RolNombre
        }));
      } else if (typeof usuarioBackend.roles === 'object') {
        // Si es un objeto, extraer los valores
        const rolesArray = Object.values(usuarioBackend.roles) as string[];
        usuario.roles = rolesArray.map(rol => ({
          nombreRol: rol.startsWith('ROLE_') ? rol as RolNombre : `ROLE_${rol}` as RolNombre
        }));
      }
    }

    return usuario;
  };

  // Función para cargar usuarios desde el servicio
  const cargarUsuarios = async () => {
    setCargando(true);
    setError(null);
    console.log('Cargando usuarios con roles...');
    
    try {
      // Usar el nuevo endpoint que incluye roles
      const data = await ServicioUsuarios.obtenerUsuariosConRoles();
        // Normalizar los usuarios del back-end al formato del front-end
      const usuariosNormalizados = data.map(normalizarUsuario);
      
      // Log para depuración
      usuariosNormalizados.forEach(user => {
        console.log(`Usuario: ${user.usuario}, Roles:`, user.roles);
      });
      
      setUsuarios(usuariosNormalizados);
      setUsuariosFiltrados(usuariosNormalizados);
    } catch (err: any) {
      console.error('Error al cargar usuarios:', err);
      setError('No se pudieron cargar los usuarios. ' + (err.message ?? ''));
    } finally {
      setCargando(false);
    }
  };
  
  // Función para aplicar filtros y ordenamiento
  const aplicarFiltros = () => {
    let resultado = [...usuarios];
    
    // Aplicar filtro de búsqueda
    if (busqueda) {
      const terminoBusqueda = busqueda.toLowerCase();
      resultado = resultado.filter(user => 
        user.usuario.toLowerCase().includes(terminoBusqueda)
      );
    }
    
    // Aplicar filtro de rol con logs de depuración
    if (filtroRol !== 'TODOS') {
      console.log('Filtrando por rol:', filtroRol);
      console.log('Usuarios antes de filtrar:', resultado);

      resultado = resultado.filter(user => {
        // Verificar si el usuario tiene roles y si alguno coincide con el filtro
        const tieneRol = user.roles &&
                        Array.isArray(user.roles) &&
                        user.roles.some(rol => {
                          console.log('Comparando rol de usuario:', rol, 'con filtro:', filtroRol);
                          return rol && rol.nombreRol === filtroRol;
                        });
        return tieneRol;
      });

      console.log('Usuarios después de filtrar por rol:', resultado);
    }
    
    // Aplicar filtro de estado (activo/inactivo)
    if (filtroActivo !== 'TODOS') {
      resultado = resultado.filter(user => user.activo === filtroActivo);
    }
    
    // Aplicar ordenamiento
    resultado.sort((a, b) => {
      let valorA: any;
      let valorB: any;
      
      switch (ordenarPor) {
        case 'usuario':
          valorA = a.usuario;
          valorB = b.usuario;
          break;
        case 'activo':
          valorA = a.activo ? 1 : 0;
          valorB = b.activo ? 1 : 0;
          break;
        case 'rol':
          valorA = a.roles && a.roles.length > 0 ? a.roles[0].nombreRol : '';
          valorB = b.roles && b.roles.length > 0 ? b.roles[0].nombreRol : '';
          break;
        default:
          valorA = a.usuario;
          valorB = b.usuario;
      }
      
      if (valorA < valorB) return ordenAscendente ? -1 : 1;
      if (valorA > valorB) return ordenAscendente ? 1 : -1;
      return 0;
    });
    
    setUsuariosFiltrados(resultado);
  };
  
  // Función para abrir modal de creación
  const abrirModalCreacion = () => {
    setFormUsuario({
      usuario: '',
      password: '',
      confirmPassword: '',
      activo: true,
      roles: [] // Inicializar sin roles preseleccionados
    });
    setModoEdicion(false);
    setUsuarioEditando(null);
    setMostrarModal(true);
  };
  
  // Función para abrir modal de edición
  const abrirModalEdicion = (usuario: Usuario) => {
    console.log('Editando usuario:', usuario);
    
    setFormUsuario({
      id: usuario.id,
      usuario: usuario.usuario,
      password: '',
      confirmPassword: '',
      activo: usuario.activo || true,
      // Si no tiene roles, usar un array vacío para evitar errores
      roles: usuario.roles && usuario.roles.length > 0 
        ? usuario.roles.map(rol => rol.nombreRol) 
        : [] 
    });
    
    setModoEdicion(true);
    setUsuarioEditando(usuario);
    setMostrarModal(true);
  };
  
  // Manejar cambios en el formulario
  const manejarCambioForm = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormUsuario(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'roles') {
      // Manejar cambio de select múltiple
      const select = e.target as HTMLSelectElement;
      const valores: RolNombre[] = Array.from(select.selectedOptions).map(
        option => option.value as RolNombre
      );
      setFormUsuario(prev => ({ ...prev, roles: valores }));
    } else {
      setFormUsuario(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // Función para guardar usuario (crear o actualizar)
  const guardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (!formUsuario.usuario.trim()) {
      setError('El nombre de usuario no puede estar vacío');
      return;
    }    if (!modoEdicion) {
      if (!formUsuario.password) {
        setError('La contraseña no puede estar vacía');
        return;
      }

      // Validar contraseña segura
      const validacionPassword = validarContrasenaSegura(formUsuario.password);
      if (!validacionPassword.esValida) {
        setError(validacionPassword.mensaje);
        return;
      }

      if (formUsuario.password !== formUsuario.confirmPassword) {
        setError('Las contraseñas no coinciden');
        return;
      }
    } else if (formUsuario.password) {
      // Si está editando y proporcionó una nueva contraseña, validarla
      const validacionPassword = validarContrasenaSegura(formUsuario.password);
      if (!validacionPassword.esValida) {
        setError(validacionPassword.mensaje);
        return;
      }

      if (formUsuario.password !== formUsuario.confirmPassword) {
        setError('Las contraseñas no coinciden');
        return;
      }
    }

    if (formUsuario.roles.length === 0) {
      setError('Debe seleccionar un rol');
      return;
    }

    try {      if (modoEdicion && usuarioEditando) {
        // Lógica de edición - enviar en formato UsuarioDTO
        const usuarioParaActualizar: ActualizarUsuarioDTO = {
          id: usuarioEditando.id,
          usuario: formUsuario.usuario,
          clave: formUsuario.password || undefined, // Solo incluir si hay una nueva contraseña
          activo: formUsuario.activo,
          roles: formUsuario.roles // Ya es un array de strings (RolNombre)
        };
        
        console.log('Datos enviados para actualizar:', usuarioParaActualizar);
        console.log('Roles enviados:', formUsuario.roles);
        
        await ServicioUsuarios.actualizar(usuarioEditando.id!, usuarioParaActualizar);
        mostrarMensaje('Usuario actualizado exitosamente', 'success');
      } else {
        // Crear nuevo usuario
        const rolSeleccionado = formUsuario.roles[0];
        await ServicioUsuarios.crear({
          usuario: formUsuario.usuario,
          clave: formUsuario.password,
          rol: rolSeleccionado
        });
        mostrarMensaje('Usuario creado exitosamente', 'success');
      }
      
      setMostrarModal(false);
      cargarUsuarios();
    } catch (err: any) {
      console.error('Error al guardar usuario:', err);
      if (err.response?.status === 401) {
        mostrarMensaje('Sesión expirada. Por favor, inicie sesión nuevamente.', 'error');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError(err.response?.data?.message || 'Error al guardar el usuario');
      }
    }
  };
  
  // Función para cambiar estado de usuario (activar/desactivar)
  const cambiarEstadoUsuario = async (id: number, activo: boolean) => {
    setCargando(true);
    
    try {
      if (activo) {
        await ServicioUsuarios.deshabilitar(id);
        mostrarMensaje('Usuario deshabilitado correctamente', 'success');
      } else {
        await ServicioUsuarios.habilitar(id);
        mostrarMensaje('Usuario habilitado correctamente', 'success');
      }
      
      // Actualizar lista de usuarios
      await cargarUsuarios();
      
    } catch (err: any) {
      console.error('Error al cambiar estado de usuario:', err);
      mostrarMensaje(
        err.response?.data?.message || 'Error al cambiar estado de usuario', 
        'error'
      );
    } finally {
      setCargando(false);
    }
  };
  
  // Función para mostrar mensajes de acción
  const mostrarMensaje = (texto: string, tipo: 'success' | 'error') => {
    setMensajeAccion({
      texto,
      tipo,
      visible: true
    });
    
    // Ocultar mensaje después de 5 segundos
    setTimeout(() => {
      setMensajeAccion(prev => ({ ...prev, visible: false }));
    }, 5000);
  };
  
  // Función para ordenar por una columna
  const ordenarPorColumna = (columna: string) => {
    if (ordenarPor === columna) {
      // Si ya estamos ordenando por esta columna, cambiar dirección
      setOrdenAscendente(!ordenAscendente);
    } else {
      // Si es una columna diferente, ordenar ascendente por defecto
      setOrdenarPor(columna);
      setOrdenAscendente(true);
    }
  };
    // Obtener color de badge para rol
  const getColorBadgeRol = (rol: RolNombre) => {
    // Normalizar el rol para manejar casos con o sin prefijo "ROLE_"
    const normalizedRole = rol.includes('ROLE_') ? rol : `ROLE_${rol}`;
    
    switch (normalizedRole) {
      case 'ROLE_ADMIN':
        return 'bg-yellow-100 text-yellow-800';
      case 'ROLE_CAJERO':
        return 'bg-green-100 text-green-800';
      case 'ROLE_ALMACENERO':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Función para validar contraseña segura
  const validarContrasenaSegura = (password: string): { esValida: boolean; mensaje: string } => {
    if (password.length < 8) {
      return { esValida: false, mensaje: 'La contraseña debe tener al menos 8 caracteres' };
    }

    if (!/[a-z]/.test(password)) {
      return { esValida: false, mensaje: 'La contraseña debe contener al menos una letra minúscula' };
    }

    if (!/[A-Z]/.test(password)) {
      return { esValida: false, mensaje: 'La contraseña debe contener al menos una letra mayúscula' };
    }

    if (!/[0-9]/.test(password)) {
      return { esValida: false, mensaje: 'La contraseña debe contener al menos un número' };
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { esValida: false, mensaje: 'La contraseña debe contener al menos un símbolo especial (!@#$%^&*()_+-=[]{};\'":\\|,.<>/?)' };
    }

    return { esValida: true, mensaje: 'Contraseña válida' };
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500 mt-1">Administra los usuarios del sistema</p>
        </div>
        
        <button
          onClick={abrirModalCreacion}
          className="flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <UserPlus size={18} className="mr-2" />
          Nuevo Usuario
        </button>
      </div>
      
      {/* Mensajes de acción */}
      {mensajeAccion.visible && (
        <div className={`mb-4 p-3 rounded-lg ${
          mensajeAccion.tipo === 'success' ? 'bg-green-100 border-l-4 border-green-500 text-green-700' : 
          'bg-red-100 border-l-4 border-red-500 text-red-700'
        }`}>
          <div className="flex items-center">
            {mensajeAccion.tipo === 'success' ? (
              <CheckCircle size={20} className="mr-2" />
            ) : (
              <AlertCircle size={20} className="mr-2" />
            )}
            <span>{mensajeAccion.texto}</span>
            <button 
              onClick={() => setMensajeAccion(prev => ({ ...prev, visible: false }))}
              className="ml-auto"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
      
      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Búsqueda */}
          <div className="md:col-span-2">
            <label htmlFor="busqueda" className="block text-sm font-medium text-gray-700 mb-1">
              Buscar usuario
            </label>
            <div className="relative">
              <input
                type="text"
                id="busqueda"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ingrese nombre de usuario..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          
          {/* Filtro por rol */}
          <div>
            <label htmlFor="filtroRol" className="block text-sm font-medium text-gray-700 mb-1">
              Filtrar por rol
            </label>
            <div className="relative">              <select
                id="filtroRol"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 appearance-none"
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value as RolNombre | 'TODOS')}
              >
                <option value="TODOS">Todos los roles</option>
                <option value="ROLE_ADMIN">Administrador</option>
                <option value="ROLE_CAJERO">Cajero</option>
                <option value="ROLE_ALMACENERO">Almacenero</option>
              </select>
              <Filter size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <ChevronDown size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          
          {/* Filtro por estado */}
          <div>
            <label htmlFor="filtroActivo" className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <div className="relative">
              <select
                id="filtroActivo"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 appearance-none"
                value={filtroActivo === 'TODOS' ? 'TODOS' : filtroActivo ? 'true' : 'false'}
                onChange={(e) => {
                  const val = e.target.value;
                  setFiltroActivo(val === 'TODOS' ? 'TODOS' : val === 'true');
                }}
              >
                <option value="TODOS">Todos los estados</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
              <UserCheck size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <ChevronDown size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          
          {/* Botón para recargar */}
          <div className="flex items-end">
            <button
              onClick={cargarUsuarios}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50"
              disabled={cargando}
            >
              {cargando ? (
                <Loader2 size={18} className="animate-spin mr-2" />
              ) : (
                <RefreshCw size={18} className="mr-2" />
              )}
              Recargar
            </button>
          </div>
        </div>
      </div>
      
      {/* Tabla de usuarios */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {error ? (
          <div className="p-8 text-center">
            <AlertCircle size={40} className="mx-auto text-red-500 mb-4" />
            <p className="text-gray-800 font-medium mb-2">Error al cargar usuarios</p>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={cargarUsuarios}
              className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 inline-flex items-center"
            >
              <RefreshCw size={16} className="mr-2" />
              Reintentar
            </button>
          </div>
        ) : cargando && usuarios.length === 0 ? (
          <div className="p-8 text-center">
            <Loader2 size={40} className="mx-auto text-gray-500 animate-spin mb-4" />
            <p className="text-gray-600">Cargando usuarios...</p>
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="p-8 text-center">
            <Users size={40} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-800 font-medium mb-2">No se encontraron usuarios</p>
            <p className="text-gray-600">
              {busqueda || filtroRol !== 'TODOS' || filtroActivo !== 'TODOS'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'No hay usuarios registrados en el sistema'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => ordenarPorColumna('usuario')}
                  >
                    <div className="flex items-center">
                      Usuario
                      {ordenarPor === 'usuario' && (
                        <ArrowUpDown size={14} className={`ml-1 ${ordenAscendente ? '' : 'transform rotate-180'}`} />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => ordenarPorColumna('rol')}
                  >
                    <div className="flex items-center">
                      Rol
                      {ordenarPor === 'rol' && (
                        <ArrowUpDown size={14} className={`ml-1 ${ordenAscendente ? '' : 'transform rotate-180'}`} />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => ordenarPorColumna('activo')}
                  >
                    <div className="flex items-center">
                      Estado
                      {ordenarPor === 'activo' && (
                        <ArrowUpDown size={14} className={`ml-1 ${ordenAscendente ? '' : 'transform rotate-180'}`} />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id || usuario.usuario} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                          {usuario.usuario.substring(0, 2).toUpperCase()}
                        </div>                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{usuario.usuario}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {usuario.roles && usuario.roles.length > 0 ? (
                          usuario.roles.map((rol, index) => (
                            <span 
                              key={index} 
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getColorBadgeRol(rol.nombreRol)}`}
                            >
                              {rol.nombreRol.replace('ROLE_', '')}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500 text-sm">Sin rol asignado</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          usuario.activo 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {usuario.activo ? (
                          <>
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                            Activo
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                            Inactivo
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => abrirModalEdicion(usuario)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded-full hover:bg-indigo-50"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => cambiarEstadoUsuario(usuario.id!, usuario.activo || false)}
                          className={`p-1 rounded-full ${
                            usuario.activo 
                              ? 'text-red-600 hover:text-red-900 hover:bg-red-50' 
                              : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                          }`}
                          title={usuario.activo ? 'Desactivar usuario' : 'Activar usuario'}
                        >
                          {usuario.activo ? <UserX size={18} /> : <UserCheck size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Modal de Usuario */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  {modoEdicion ? (
                    <Edit className="w-5 h-5 text-indigo-600" />
                  ) : (
                    <UserPlus className="w-5 h-5 text-indigo-600" />
                  )}
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {modoEdicion ? 'Editar Usuario' : 'Crear Usuario'}
                </h2>
              </div>
              <button
                onClick={() => setMostrarModal(false)}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={guardarUsuario} className="p-6 space-y-6">
              {/* Campo Usuario */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de Usuario
                </label>
                <input
                  type="text"
                  name="usuario"
                  value={formUsuario.usuario}
                  onChange={manejarCambioForm}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Ingrese el nombre de usuario"
                  required
                  minLength={1}
                />
              </div>              {/* Campos de Contraseña */}
              {(!modoEdicion || (modoEdicion && formUsuario.password)) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {modoEdicion ? 'Nueva Contraseña (opcional)' : 'Contraseña'}
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formUsuario.password}
                      onChange={manejarCambioForm}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder={modoEdicion ? "Dejar vacío para mantener la actual" : "Ingrese una contraseña segura"}
                      required={!modoEdicion}
                      minLength={8}
                    />
                    {formUsuario.password && (
                      <div className="mt-2 text-sm text-gray-600">
                        <p className="font-medium mb-1">La contraseña debe contener:</p>
                        <ul className="space-y-1">
                          <li className={`flex items-center ${formUsuario.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                            <span className="mr-2">{formUsuario.password.length >= 8 ? '✓' : '○'}</span>
                            Al menos 8 caracteres
                          </li>
                          <li className={`flex items-center ${/[a-z]/.test(formUsuario.password) ? 'text-green-600' : 'text-gray-500'}`}>
                            <span className="mr-2">{/[a-z]/.test(formUsuario.password) ? '✓' : '○'}</span>
                            Una letra minúscula
                          </li>
                          <li className={`flex items-center ${/[A-Z]/.test(formUsuario.password) ? 'text-green-600' : 'text-gray-500'}`}>
                            <span className="mr-2">{/[A-Z]/.test(formUsuario.password) ? '✓' : '○'}</span>
                            Una letra mayúscula
                          </li>
                          <li className={`flex items-center ${/[0-9]/.test(formUsuario.password) ? 'text-green-600' : 'text-gray-500'}`}>
                            <span className="mr-2">{/[0-9]/.test(formUsuario.password) ? '✓' : '○'}</span>
                            Un número
                          </li>
                          <li className={`flex items-center ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formUsuario.password) ? 'text-green-600' : 'text-gray-500'}`}>
                            <span className="mr-2">{/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formUsuario.password) ? '✓' : '○'}</span>
                            Un símbolo especial (!@#$%^&*...)
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {formUsuario.password && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirmar Contraseña
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formUsuario.confirmPassword}
                        onChange={manejarCambioForm}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="Confirme la contraseña"
                        required={!modoEdicion && formUsuario.password.length > 0}
                        minLength={8}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Botón para cambiar contraseña en modo edición */}
              {modoEdicion && !formUsuario.password && (
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => setFormUsuario(prev => ({ ...prev, password: '', confirmPassword: '' }))}
                    className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    Cambiar Contraseña
                  </button>
                </div>
              )}

              {/* Selección de Rol */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Rol de Usuario
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['ROLE_ADMIN', 'ROLE_ALMACENERO', 'ROLE_CAJERO'] as RolNombre[]).map((rol) => (
                    <label
                      key={rol}
                      className={`relative flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        formUsuario.roles.includes(rol)
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="roles"
                        value={rol}
                        checked={formUsuario.roles.includes(rol)}
                        onChange={() => setFormUsuario(prev => ({ ...prev, roles: [rol] }))}
                        className="sr-only"
                      />
                      <span className={`text-sm font-medium ${
                        formUsuario.roles.includes(rol) ? 'text-indigo-700' : 'text-gray-700'
                      }`}>
                        {rol.replace('ROLE_', '')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Estado Activo */}
              <div className="flex items-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="activo"
                    checked={formUsuario.activo}
                    onChange={manejarCambioForm}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    Usuario Activo
                  </span>
                </label>
              </div>

              {/* Mensaje de Error */}
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex items-center text-red-700">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <span className="text-sm">{error}</span>
                  </div>
                </div>
              )}

              {/* Botones de Acción */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setMostrarModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {modoEdicion ? 'Actualizar' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionUsuarios;

