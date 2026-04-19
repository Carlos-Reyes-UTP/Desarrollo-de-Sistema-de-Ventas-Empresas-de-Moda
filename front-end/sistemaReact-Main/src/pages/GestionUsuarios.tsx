import { useState, useEffect, useRef } from 'react';
import {
  User,
  Search,
  Edit,
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
  Shield,
  Lock
} from 'lucide-react';
import { ServicioUsuarios } from '../services/UsuarioServices';
import { useAuth } from '../context/AuthContext';
import type { Usuario, UsuarioBackend, ActualizarUsuarioDTO } from '../interfaces/Usuario';
import type { RolNombre } from '../interfaces/enums';
import { getErrorMessage, getResponseMessage } from './gestion-usuarios/errorUtils';

const GestionUsuarios = () => {
  // Contexto de autenticación
  const { usuario: usuarioActual, cerrarSesion } = useAuth();
  
  // Estados para la lista de usuarios
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<RolNombre | 'TODOS'>('TODOS');
  const [filtroActivo, setFiltroActivo] = useState<boolean | 'TODOS'>('TODOS');
  const ordenarPor: string = 'usuario';
  const ordenAscendente = true;
  
  // Estados para el modal de usuario
  const [mostrarModal, setMostrarModal] = useState(false);
  const [cerrandoModal, setCerrandoModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [cambiarPassword, setCambiarPassword] = useState(false);
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
    roles: []
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

  // Estado para verificar disponibilidad de nombre de usuario
  const [usuarioDisponible, setUsuarioDisponible] = useState<boolean | null>(null);
  const [verificandoUsuario, setVerificandoUsuario] = useState(false);
  
  // Estado para la contraseña actual (cuando el usuario edita su propio perfil)
  const [passwordActual, setPasswordActual] = useState<string>('');
  const [mostrarModalPassword, setMostrarModalPassword] = useState<boolean>(false);
  const [errorPasswordActual, setErrorPasswordActual] = useState<string | null>(null);
  
  // Estados para mostrar/ocultar contraseñas
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmPassword, setMostrarConfirmPassword] = useState(false);
  
  // Ref para el campo de nombre de usuario
  const usuarioInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    cargarUsuarios();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [busqueda, filtroRol, filtroActivo, usuarios, ordenarPor, ordenAscendente]);

  useEffect(() => {
    if (mostrarModal && usuarioInputRef.current) {
      setTimeout(() => {
        usuarioInputRef.current?.focus();
      }, 100);
    }
  }, [mostrarModal]);
  
  const esUltimoAdministradorActivo = (usuario: Usuario): boolean => {
    const esAdminActivo = usuario.activo && 
      usuario.roles?.some(rol => rol.nombreRol === 'ROLE_ADMIN');
    
    if (!esAdminActivo) return false;
    
    const totalAdministradoresActivos = usuarios.filter(u => 
      u.activo && u.roles?.some(rol => rol.nombreRol === 'ROLE_ADMIN')
    ).length;
    
    return totalAdministradoresActivos === 1;
  };

  const esUsuarioActual = (usuario: Usuario): boolean => {
    return usuarioActual?.usuario === usuario.usuario;
  };

  const verificarCierreSesion = (usuarioModificado: Usuario, datosOriginales: Usuario) => {
    if (!esUsuarioActual(datosOriginales)) return;

    const cambiaNombreUsuario = datosOriginales.usuario !== usuarioModificado.usuario;
    const rolesOriginales = datosOriginales.roles?.map(r => r.nombreRol).sort() || [];
    const rolesNuevos = usuarioModificado.roles?.map(r => r.nombreRol).sort() || [];
    const cambianRoles = JSON.stringify(rolesOriginales) !== JSON.stringify(rolesNuevos);

    if (cambiaNombreUsuario || cambianRoles) {
      cerrarSesion();
    }
  };

  const normalizarUsuario = (usuarioBackend: UsuarioBackend): Usuario => {
    const usuario: Usuario = {
      id: usuarioBackend.id,
      usuario: usuarioBackend.usuario,
      password: usuarioBackend.password,
      activo: usuarioBackend.activo,
      roles: []
    };

    if (usuarioBackend.roles) {
      if (Array.isArray(usuarioBackend.roles)) {
        usuario.roles = (usuarioBackend.roles as string[]).map(rol => ({
          nombreRol: rol.startsWith('ROLE_') ? rol as RolNombre : `ROLE_${rol}` as RolNombre
        }));
      } else if (typeof usuarioBackend.roles === 'object') {
        const rolesArray = Object.values(usuarioBackend.roles) as string[];
        usuario.roles = rolesArray.map(rol => ({
          nombreRol: rol.startsWith('ROLE_') ? rol as RolNombre : `ROLE_${rol}` as RolNombre
        }));
      }
    }
    return usuario;
  };

  const cerrarModalConAnimacion = () => {
    setCerrandoModal(true);
    setTimeout(() => {
      setMostrarModal(false);
      setCerrandoModal(false);
      setFormUsuario({
        usuario: '',
        password: '',
        confirmPassword: '',
        activo: true,
        roles: []
      });
      setModoEdicion(false);
      setUsuarioEditando(null);
      setCambiarPassword(false);
      setUsuarioDisponible(null);
      setVerificandoUsuario(false);
      setMostrarPassword(false);
      setMostrarConfirmPassword(false);
      setMostrarModalPassword(false);
      setPasswordActual('');
      setErrorPasswordActual(null);
      setError(null);
    }, 300);
  };

  const cargarUsuarios = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await ServicioUsuarios.obtenerUsuariosConRoles();
      const usuariosNormalizados = data.map(normalizarUsuario);
      setUsuarios(usuariosNormalizados);
      setUsuariosFiltrados(usuariosNormalizados);
    } catch (err: unknown) {
      setError('No se pudieron cargar los usuarios. ' + getErrorMessage(err, ''));
    } finally {
      setCargando(false);
    }
  };
  
  const aplicarFiltros = () => {
    let resultado = [...usuarios];
    
    if (busqueda) {
      const terminoBusqueda = busqueda.toLowerCase();
      resultado = resultado.filter(user => 
        user.usuario.toLowerCase().includes(terminoBusqueda)
      );
    }
    
    if (filtroRol !== 'TODOS') {
      resultado = resultado.filter(user => 
        user.roles?.some(rol => rol.nombreRol === filtroRol)
      );
    }
    
    if (filtroActivo !== 'TODOS') {
      resultado = resultado.filter(user => user.activo === filtroActivo);
    }
    
    resultado.sort((a, b) => {
      let valorA: string | number;
      let valorB: string | number;
      
      switch (ordenarPor) {
        case 'usuario': valorA = a.usuario; valorB = b.usuario; break;
        case 'activo': valorA = a.activo ? 1 : 0; valorB = b.activo ? 1 : 0; break;
        case 'rol': 
          valorA = a.roles && a.roles.length > 0 ? a.roles[0].nombreRol : '';
          valorB = b.roles && b.roles.length > 0 ? b.roles[0].nombreRol : '';
          break;
        default: valorA = a.usuario; valorB = b.usuario;
      }
      
      if (valorA < valorB) return ordenAscendente ? -1 : 1;
      if (valorA > valorB) return ordenAscendente ? 1 : -1;
      return 0;
    });
    
    setUsuariosFiltrados(resultado);
  };

  const abrirModalCreacion = () => {
    setFormUsuario({
      usuario: '',
      password: '',
      confirmPassword: '',
      activo: true,
      roles: []
    });
    setModoEdicion(false);
    setUsuarioEditando(null);
    setCambiarPassword(false);
    setUsuarioDisponible(null);
    setVerificandoUsuario(false);
    setMostrarPassword(false);
    setMostrarConfirmPassword(false);
    setMostrarModal(true);
  };

  const abrirModalEdicion = (usuario: Usuario) => {
    setFormUsuario({
      id: usuario.id,
      usuario: usuario.usuario,
      password: '',
      confirmPassword: '',
      activo: usuario.activo ?? true,
      roles: usuario.roles && usuario.roles.length > 0 
        ? usuario.roles.map(rol => rol.nombreRol) 
        : [] 
    });
    setUsuarioDisponible(true);
    setVerificandoUsuario(false);
    setMostrarPassword(false);
    setMostrarConfirmPassword(false);
    setModoEdicion(true);
    setUsuarioEditando(usuario);
    setCambiarPassword(false);
    setMostrarModal(true);
  };
  
  const manejarCambioForm = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormUsuario(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormUsuario(prev => ({ ...prev, [name]: value }));
      if (name === 'usuario') {
        setUsuarioDisponible(null);
        setVerificandoUsuario(false);
      }
    }
  };
  
  const guardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formUsuario.usuario.trim()) { setError('El nombre de usuario no puede estar vacío'); return; }
    if (usuarioDisponible === false) { setError('El nombre de usuario ya está en uso'); return; }

    if (!modoEdicion || cambiarPassword) {
      if (!formUsuario.password) { setError('La contraseña no puede estar vacía'); return; }
      const validacionPassword = validarContrasenaSegura(formUsuario.password);
      if (!validacionPassword.esValida) { setError(validacionPassword.mensaje); return; }
      if (formUsuario.password !== formUsuario.confirmPassword) { setError('Las contraseñas no coinciden'); return; }
    }

    if (formUsuario.roles.length === 0) { setError('Debe seleccionar un rol'); return; }

    try {
      if (modoEdicion && usuarioEditando) {
        const usuarioParaActualizar: ActualizarUsuarioDTO = {
          id: usuarioEditando.id,
          usuario: formUsuario.usuario,
          activo: formUsuario.activo,
          roles: formUsuario.roles
        };
        
        if (cambiarPassword && formUsuario.password) {
          usuarioParaActualizar.clave = formUsuario.password;
        }
        
        const datosOriginales = usuarioEditando!;
        const esCambioPasswordPropio = cambiarPassword && esUsuarioActual(datosOriginales);
        
        await ServicioUsuarios.actualizar(usuarioEditando.id!, usuarioParaActualizar);
        mostrarMensaje('Usuario actualizado exitosamente', 'success');
        
        const usuarioActualizado: Usuario = {
          ...datosOriginales,
          usuario: formUsuario.usuario,
          activo: formUsuario.activo,
          roles: formUsuario.roles.map(rolNombre => ({ id: 0, nombreRol: rolNombre }))
        };
        
        if (esCambioPasswordPropio) {
          mostrarMensaje('Contraseña actualizada. Cerrando sesión...', 'success');
          setTimeout(() => cerrarSesion(), 2000);
        } else {
          verificarCierreSesion(usuarioActualizado, datosOriginales);
        }
      } else {
        const rolSeleccionado = formUsuario.roles[0];
        await ServicioUsuarios.crear({
          usuario: formUsuario.usuario,
          clave: formUsuario.password,
          rol: rolSeleccionado,
          activo: formUsuario.activo
        });
        mostrarMensaje('Usuario creado exitosamente', 'success');
      }
      cerrarModalConAnimacion();
      cargarUsuarios();
    } catch (err: unknown) {
      setError(getResponseMessage(err) || 'Error al guardar el usuario');
    }
  };
  
  const cambiarEstadoUsuario = async (id: number, activo: boolean) => {
    setCargando(true);
    try {
      const usuarioAModificar = usuarios.find(u => u.id === id);
      if (usuarioAModificar && esUsuarioActual(usuarioAModificar) && activo) {
        mostrarMensaje('No puede desactivar su propia cuenta', 'error');
        return;
      }
      if (activo) {
        await ServicioUsuarios.deshabilitar(id);
        mostrarMensaje('Usuario deshabilitado correctamente', 'success');
      } else {
        await ServicioUsuarios.habilitar(id);
        mostrarMensaje('Usuario habilitado correctamente', 'success');
      }
      await cargarUsuarios();
    } catch (err: unknown) {
      mostrarMensaje(getResponseMessage(err) || 'Error al cambiar estado', 'error');
    } finally {
      setCargando(false);
    }
  };
  
  const mostrarMensaje = (texto: string, tipo: 'success' | 'error') => {
    setMensajeAccion({ texto, tipo, visible: true });
    setTimeout(() => setMensajeAccion(prev => ({ ...prev, visible: false })), 5000);
  };
  
  const verificarDisponibilidadUsuario = async (nombreUsuario: string) => {
    if (modoEdicion && usuarioEditando?.usuario === nombreUsuario) {
      setUsuarioDisponible(true); return;
    }
    if (!nombreUsuario.trim()) { setUsuarioDisponible(null); return; }

    setVerificandoUsuario(true);
    try {
      const estaDisponible = await ServicioUsuarios.verificarDisponibilidadUsuario(
        nombreUsuario, 
        modoEdicion && usuarioEditando ? usuarioEditando.id : undefined
      );
      setUsuarioDisponible(estaDisponible);
    } catch {
      setUsuarioDisponible(false);
    } finally {
      setVerificandoUsuario(false);
    }
  };
  
  const validarContrasenaSegura = (password: string) => {
    if (password.length < 8) return { esValida: false, mensaje: 'Mínimo 8 caracteres' };
    if (!/[a-z]/.test(password)) return { esValida: false, mensaje: 'Falta minúscula' };
    if (!/[A-Z]/.test(password)) return { esValida: false, mensaje: 'Falta mayúscula' };
    if (!/\d/.test(password)) return { esValida: false, mensaje: 'Falta número' };
    if (!/[!@#$%^&*()]/.test(password)) return { esValida: false, mensaje: 'Falta símbolo' };
    return { esValida: true, mensaje: 'Válida' };
  };

  const verificarContrasenaActual = async () => {
    if (!passwordActual.trim()) { setErrorPasswordActual('Requerido'); return; }
    try {
      const esCorrecta = await ServicioUsuarios.verificarContrasenaActual(usuarioActual?.usuario || '', passwordActual);
      if (esCorrecta) {
        setMostrarModalPassword(false); setPasswordActual(''); setCambiarPassword(true);
      } else { setErrorPasswordActual('Incorrecta'); }
    } catch { setErrorPasswordActual('Error'); }
  };

  const [paginaActual, setPaginaActual] = useState(1);
  const usuariosPorPagina = 10;
  const usuariosOrdenados = [...usuariosFiltrados].sort((a, b) => a.usuario.localeCompare(b.usuario));
  const totalPaginas = Math.ceil(usuariosOrdenados.length / usuariosPorPagina);
  const usuariosPagina = usuariosOrdenados.slice((paginaActual - 1) * usuariosPorPagina, paginaActual * usuariosPorPagina);

  useEffect(() => { setPaginaActual(1); }, [usuariosFiltrados]);

  return (
    <div className="p-10 max-w-[1600px] mx-auto bg-[#fafafa] min-h-screen animate-fadeIn text-left">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-[2.5rem] font-bold tracking-tight text-black leading-none mb-2">
            Gestión de usuarios
          </h1>
          <p className="text-gray-500 text-sm max-w-md font-medium">
            Administración de accesos, roles y seguridad perimetral para DK-SYSTEM.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={abrirModalCreacion}
            className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all font-bold text-xs uppercase tracking-wider"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Action Messages */}
      {mensajeAccion.visible && (
        <div className={`mb-8 p-5 rounded-[1.5rem] border flex items-center justify-between shadow-sm animate-fadeIn ${
          mensajeAccion.tipo === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'
        }`}>
          <div className="flex items-center gap-3">
            {mensajeAccion.tipo === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-[10px] font-bold uppercase tracking-widest">{mensajeAccion.texto}</span>
          </div>
          <button onClick={() => setMensajeAccion(prev => ({ ...prev, visible: false }))}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white rounded-[2rem] p-8 mb-8 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-12 xl:col-span-5">
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3 text-left">Búsqueda de Operador</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Nombre de usuario..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#f8f8f8] rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all font-medium"
              />
            </div>
          </div>
          <div className="lg:col-span-4 xl:col-span-3">
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3 text-left">Filtrado por Rol</label>
            <div className="relative">
               <Filter className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <select
                className="w-full pl-11 pr-4 py-3 bg-[#f8f8f8] rounded-xl text-sm font-bold appearance-none cursor-pointer"
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value as RolNombre | 'TODOS')}
              >
                <option value="TODOS">Todos los roles</option>
                <option value="ROLE_ADMIN">Administrador</option>
                <option value="ROLE_CAJERO">Cajero</option>
                <option value="ROLE_ALMACENERO">Almacenero</option>
              </select>
               <ChevronDown className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>
          <div className="lg:col-span-4 xl:col-span-2">
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3 text-left">Estado</label>
            <div className="relative">
               <UserCheck className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <select
                className="w-full pl-11 pr-4 py-3 bg-[#f8f8f8] rounded-xl text-sm font-bold appearance-none cursor-pointer"
                value={filtroActivo === 'TODOS' ? 'TODOS' : filtroActivo ? 'true' : 'false'}
                onChange={(e) => setFiltroActivo(e.target.value === 'TODOS' ? 'TODOS' : e.target.value === 'true')}
              >
                <option value="TODOS">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
               <ChevronDown className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>
          <div className="lg:col-span-4 xl:col-span-2">
            <button
              onClick={cargarUsuarios}
              className="w-full h-[46px] bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-black rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
            >
              {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {cargando ? 'Sincronizando' : 'Recargar'}
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-white border-b border-gray-50">
              <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Identidad</th>
              <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Privilegios</th>
              <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Estado</th>
              <th className="px-8 py-6 text-right text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {usuariosPagina.map((usuario, index) => (
              <tr key={usuario.id ?? `user-${usuario.usuario}-${index}`} className="hover:bg-[#fafafa] transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4 text-left">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${usuario.activo ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold ${!usuario.activo ? 'text-gray-400' : 'text-black'}`}>
                        {usuario.usuario}
                        {esUsuarioActual(usuario) && <span className="ml-2 text-[10px] bg-black text-white px-2 py-0.5 rounded-full uppercase">Tú</span>}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID {usuario.id} • Operador</span>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6 text-left">
                  <div className="flex flex-wrap gap-2">
                    {usuario.roles?.map((rol, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        {rol.nombreRol.replace('ROLE_', '')}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-8 py-6 text-left">
                   <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${usuario.activo ? 'bg-[#10b981]' : 'bg-red-400'}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${usuario.activo ? 'text-[#10b981]' : 'text-red-400'}`}>
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-2 text-gray-400 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => abrirModalEdicion(usuario)} className="p-2.5 hover:bg-black hover:text-white rounded-xl transition-all border border-transparent shadow-sm">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => cambiarEstadoUsuario(usuario.id!, usuario.activo || false)} disabled={(esUltimoAdministradorActivo(usuario) && usuario.activo) || (esUsuarioActual(usuario) && usuario.activo)} className={`p-2.5 rounded-xl transition-all border border-transparent shadow-sm disabled:opacity-20 ${usuario.activo ? 'hover:bg-red-500 hover:text-white' : 'hover:bg-[#10b981] hover:text-white'}`}>
                      {usuario.activo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-10 flex flex-col md:flex-row justify-between items-center gap-6 px-8">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Sincronización: {usuariosOrdenados.length} Registros Activos</span>
        <div className="flex gap-2 p-1 bg-white rounded-2xl shadow-sm border border-gray-100">
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => setPaginaActual(n)}
              className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${paginaActual === n ? 'bg-black text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Modal: Creation/Edit */}
      {mostrarModal && (
        <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 ${cerrandoModal ? 'animate-fadeOut' : 'animate-fadeIn'}`}>
          <div className={`bg-white rounded-[2rem] shadow-2xl w-full max-w-lg relative overflow-hidden ${cerrandoModal ? 'animate-scaleOut' : 'animate-scaleIn'}`}>
            <div className="p-10 text-left">
              <div className="mb-6 w-12 h-1 bg-black"></div>
              <h2 className="text-2xl font-bold tracking-tight text-black mb-2 uppercase">
                {modoEdicion ? 'Actualización de Perfil' : 'Registro de Operador'}
              </h2>
              <p className="text-gray-500 text-sm mb-10 font-medium">Configure los parámetros de autenticación y privilegios.</p>

              <form onSubmit={guardarUsuario} className="space-y-8">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-3">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nombre de Usuario</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      ref={usuarioInputRef}
                      type="text"
                      name="usuario"
                      value={formUsuario.usuario}
                      onChange={manejarCambioForm}
                      onBlur={(e) => verificarDisponibilidadUsuario(e.target.value)}
                      className="w-full pl-11 pr-4 py-4 bg-[#f8f8f8] rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all border-transparent"
                      placeholder="Identificador del sistema..."
                      required
                    />
                  </div>
                  {verificandoUsuario && <span className="text-[10px] font-bold text-amber-500 uppercase tracking-tighter">Verificando en red...</span>}
                  {usuarioDisponible === false && <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">Identificador no disponible</span>}
                  {usuarioDisponible === true && <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-tighter">Identificador validado</span>}
                </div>

                {(!modoEdicion || cambiarPassword) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contraseña</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type={mostrarPassword ? 'text' : 'password'}
                          name="password"
                          value={formUsuario.password}
                          onChange={manejarCambioForm}
                          className="w-full pl-11 pr-4 py-4 bg-[#f8f8f8] rounded-xl text-sm font-bold border-transparent"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Confirmación</label>
                       <div className="relative">
                        <Shield className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type={mostrarConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formUsuario.confirmPassword}
                          onChange={manejarCambioForm}
                          className="w-full pl-11 pr-4 py-4 bg-[#f8f8f8] rounded-xl text-sm font-bold border-transparent"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {modoEdicion && !cambiarPassword && (
                    <button type="button" onClick={() => {
                        if (esUsuarioActual(usuarioEditando as Usuario)) setMostrarModalPassword(true);
                        else setCambiarPassword(true);
                    }} className="text-[10px] font-bold text-black uppercase tracking-widest flex items-center gap-2 hover:opacity-50 transition-opacity">
                      <RefreshCw className="w-4 h-4" /> Resetear Credenciales de Seguridad
                    </button>
                )}

                <div className="space-y-4">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Niveles de Autorización</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['ROLE_ADMIN', 'ROLE_CAJERO', 'ROLE_ALMACENERO'].map(rol => (
                      <button
                        key={rol}
                        type="button"
                        onClick={() => {
                            if (modoEdicion && esUltimoAdministradorActivo(usuarioEditando as Usuario) && rol !== 'ROLE_ADMIN') return;
                            setFormUsuario({...formUsuario, roles: [rol as RolNombre]});
                        }}
                        className={`py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${formUsuario.roles.includes(rol as RolNombre) ? 'bg-black text-white shadow-xl scale-105' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                      >
                        {rol.replace('ROLE_', '')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-6 border-t border-gray-50">
                  <button type="button" onClick={cerrarModalConAnimacion} className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-100">Cerrar</button>
                  <button type="submit" className="flex-1 py-4 bg-black text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-xl hover:bg-gray-800">Sincronizar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Password Verification */}
      {mostrarModalPassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm w-full max-w-md overflow-hidden animate-scaleIn">
            {/* Header */}
            <div className="bg-black px-8 py-6 flex items-center gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-[11px] font-bold tracking-[0.3em] text-white uppercase">Verificar Identidad</h3>
                <p className="text-gray-400 text-[10px] font-medium uppercase tracking-widest mt-0.5">Confirme su contraseña para continuar</p>
              </div>
            </div>
            {/* Body */}
            <div className="px-8 py-7 space-y-6">
              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">Contraseña Actual</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-300 absolute left-5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={passwordActual}
                    onChange={(e) => setPasswordActual(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 bg-[#f8f8f8] border-none rounded-[1.5rem] text-sm font-bold text-black focus:outline-none focus:bg-white focus:ring-[4px] focus:ring-gray-100 transition-all shadow-inner"
                    placeholder="Ingrese su contraseña..."
                  />
                </div>
                {errorPasswordActual && (
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block">{errorPasswordActual}</span>
                )}
              </div>
            </div>
            {/* Actions */}
            <div className="px-8 pb-8 flex gap-3">
              <button
                type="button"
                onClick={() => setMostrarModalPassword(false)}
                className="flex-1 py-4 bg-[#f8f8f8] border border-gray-100 rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:bg-gray-100 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={verificarContrasenaActual}
                className="flex-1 py-4 bg-black text-white rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-gray-800 transition-all shadow-[0_8px_24px_rgba(0,0,0,0.15)] active:scale-[0.97]"
              >
                Verificar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionUsuarios;
