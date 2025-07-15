import { useState, useEffect, useRef } from 'react';
import {
  Users,
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
  ArrowUpDown,
  Eye,
  EyeOff,
  Save,
  Shield,
  Info,
  Lock
} from 'lucide-react';
import { ServicioUsuarios } from '../services/UsuarioServices';
import { useAuth } from '../context/AuthContext';
import type { Usuario, UsuarioBackend, ActualizarUsuarioDTO } from '../interfaces/Usuario';
import type { RolNombre } from '../interfaces/enums';

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
  const [ordenarPor, setOrdenarPor] = useState<string>('usuario');
  const [ordenAscendente, setOrdenAscendente] = useState(true);
    // Estados para el modal de usuario
  const [mostrarModal, setMostrarModal] = useState(false);
  const [cerrandoModal, setCerrandoModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [cambiarPassword, setCambiarPassword] = useState(false); // Nuevo estado para controlar si se quiere cambiar la contraseña
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

  // Estado para notificación de cierre de sesión
  const [mostrarNotificacionCierre, setMostrarNotificacionCierre] = useState(false);
  const [contadorCierre, setContadorCierre] = useState(5);
  
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
  const [mostrarPasswordActual, setMostrarPasswordActual] = useState(false);
  
  // Ref para el campo de nombre de usuario (para poner el foco)
  const usuarioInputRef = useRef<HTMLInputElement>(null);
  
  // Cargar usuarios al montar el componente
  useEffect(() => {
    cargarUsuarios();
  }, []);
  
  // Aplicar filtros cuando cambian
  useEffect(() => {
    aplicarFiltros();
  }, [busqueda, filtroRol, filtroActivo, usuarios, ordenarPor, ordenAscendente]);

  // Poner foco en el campo de nombre de usuario cuando se abre el modal
  useEffect(() => {
    if (mostrarModal && usuarioInputRef.current) {
      // Pequeño timeout para asegurar que el modal esté completamente renderizado
      setTimeout(() => {
        usuarioInputRef.current?.focus();
      }, 100);
    }
  }, [mostrarModal]);
  
  // Función helper para determinar si un usuario es el último administrador activo
  const esUltimoAdministradorActivo = (usuario: Usuario): boolean => {
    // Verificar si el usuario actual es administrador activo
    const esAdminActivo = usuario.activo && 
      usuario.roles?.some(rol => rol.nombreRol === 'ROLE_ADMIN');
    
    if (!esAdminActivo) {
      return false; // Si no es admin activo, definitivamente no es el último
    }
    
    // Contar cuántos administradores activos hay en total
    const totalAdministradoresActivos = usuarios.filter(u => 
      u.activo && u.roles?.some(rol => rol.nombreRol === 'ROLE_ADMIN')
    ).length;
    
    // Es el último admin si es administrador activo y solo hay 1 administrador activo en total
    return totalAdministradoresActivos === 1;
  };

  // Función helper para determinar si un usuario es el usuario actual
  const esUsuarioActual = (usuario: Usuario): boolean => {
    return usuarioActual?.usuario === usuario.usuario;
  };
  // Función helper para verificar si se debe cerrar la sesión
  const verificarCierreSesion = (usuarioModificado: Usuario, datosOriginales: Usuario) => {
    if (!esUsuarioActual(datosOriginales)) {
      return; // No es el usuario actual, no hacer nada
    }

    // Verificar si cambió el nombre de usuario
    const cambiaNombreUsuario = datosOriginales.usuario !== usuarioModificado.usuario;
    
    // Verificar si cambiaron los roles
    const rolesOriginales = datosOriginales.roles?.map(r => r.nombreRol).sort() || [];
    const rolesNuevos = usuarioModificado.roles?.map(r => r.nombreRol).sort() || [];
    const cambianRoles = JSON.stringify(rolesOriginales) !== JSON.stringify(rolesNuevos);

    if (cambiaNombreUsuario || cambianRoles) {
      // Mostrar notificación personalizada
      setMostrarNotificacionCierre(true);
      setContadorCierre(5);
      
      // Iniciar contador regresivo
      const intervalo = setInterval(() => {
        setContadorCierre(prev => {
          if (prev <= 1) {
            clearInterval(intervalo);
            cerrarSesion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

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

  // Función para cerrar modal con animación
  const cerrarModalConAnimacion = () => {
    setCerrandoModal(true);
    setTimeout(() => {
      setMostrarModal(false);
      setCerrandoModal(false);
      // Limpiar el formulario
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
      setError(null);
    }, 300); // Duración de la animación
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
    setCambiarPassword(false); // Reset del estado de cambio de contraseña
    
    // Resetear el estado de verificación de disponibilidad de nombre de usuario
    setUsuarioDisponible(null); // Ningún nombre ingresado aún, por lo que es null
    setVerificandoUsuario(false);
    
    // Resetear estados de mostrar/ocultar contraseñas
    setMostrarPassword(false);
    setMostrarConfirmPassword(false);
    
    setMostrarModal(true);
  };    // Función para abrir modal de edición
  const abrirModalEdicion = (usuario: Usuario) => {
    console.log('Editando usuario:', usuario);
    setFormUsuario({
      id: usuario.id,
      usuario: usuario.usuario,
      password: '', // Vacío - no se permite cambiar contraseña por defecto
      confirmPassword: '', // Vacío - no se permite cambiar contraseña por defecto
      activo: usuario.activo ?? true, // Usar ?? para solo asignar true si activo es null/undefined
      // Si no tiene roles, usar un array vacío para evitar errores
      roles: usuario.roles && usuario.roles.length > 0 
        ? usuario.roles.map(rol => rol.nombreRol) 
        : [] 
    });
    
    // Resetear el estado de verificación de disponibilidad de nombre de usuario
    setUsuarioDisponible(true); // El nombre actual es siempre válido al principio (es el propio nombre del usuario)
    setVerificandoUsuario(false);
    
    // Resetear estados de mostrar/ocultar contraseñas
    setMostrarPassword(false);
    setMostrarConfirmPassword(false);
    
    setModoEdicion(true);
    setUsuarioEditando(usuario);
    setCambiarPassword(false); // Por defecto no cambiar contraseña
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
      
      // Para el campo de usuario, solo limpiar el estado de verificación
      // La verificación real se hará en onBlur
      if (name === 'usuario') {
        setUsuarioDisponible(null);
        setVerificandoUsuario(false);
      }
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
    }

    // Verificar disponibilidad del usuario antes de continuar
    if (usuarioDisponible === false) {
      setError('El nombre de usuario ya está en uso. Por favor, elija otro nombre de usuario');
      return;
    }

    // Validaciones de contraseña para nuevo usuario o cambio de contraseña en edición
    if (!modoEdicion || cambiarPassword) {
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
    }

    if (formUsuario.roles.length === 0) {
      setError('Debe seleccionar un rol');
      return;
    }

    try {      if (modoEdicion && usuarioEditando) {        // Lógica de edición
        const usuarioParaActualizar: ActualizarUsuarioDTO = {
          id: usuarioEditando.id,
          usuario: formUsuario.usuario,
          activo: formUsuario.activo,
          roles: formUsuario.roles // Array de strings (RolNombre)
        };
        
        // Solo incluir la contraseña si se desea cambiar
        if (cambiarPassword && formUsuario.password) {
          usuarioParaActualizar.clave = formUsuario.password;
        }
        
        console.log('Datos enviados para actualizar:', usuarioParaActualizar);        console.log('Roles enviados:', formUsuario.roles);
        console.log('Cambiar contraseña:', cambiarPassword);
        
        // Guardar los datos originales antes de la actualización
        const datosOriginales = usuarioEditando!;
        
        await ServicioUsuarios.actualizar(usuarioEditando.id!, usuarioParaActualizar);
        mostrarMensaje('Usuario actualizado exitosamente', 'success');
        
        // Crear un objeto Usuario con los datos actualizados para la verificación
        const usuarioActualizado: Usuario = {
          ...datosOriginales,
          usuario: formUsuario.usuario,
          activo: formUsuario.activo,
          roles: formUsuario.roles.map(rolNombre => ({
            id: 0, // ID temporal, no se usa en la verificación
            nombreRol: rolNombre
          }))
        };
        
        // Verificar si se debe cerrar la sesión después de una actualización exitosa
        verificarCierreSesion(usuarioActualizado, datosOriginales);
      } else {
        // Crear nuevo usuario
        const rolSeleccionado = formUsuario.roles[0];
        const datosCreacion = {
          usuario: formUsuario.usuario,
          clave: formUsuario.password,
          rol: rolSeleccionado,
          activo: formUsuario.activo  // Enviar el valor booleano directamente
        };
        
        console.log('Datos para crear usuario:', datosCreacion);
        console.log('Valor de formUsuario.activo:', formUsuario.activo);
        
        await ServicioUsuarios.crear(datosCreacion);
        mostrarMensaje('Usuario creado exitosamente', 'success');
      }
      
      cerrarModalConAnimacion();
      cargarUsuarios();    } catch (err: any) {
      console.error('Error al guardar usuario:', err);
      
      // Manejar específicamente los errores de validación del último administrador
      if (err.message && (
          err.message.includes('último usuario administrador') || 
          err.message.includes('último administrador')
        )) {
        setError(err.message);
      } else if (err.response?.status === 401) {
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
      
      // Actualizar lista de usuarios
      await cargarUsuarios();
        } catch (err: any) {
      console.error('Error al cambiar estado de usuario:', err);
      
      // Manejar específicamente los errores de validación del último administrador
      if (err.message && (
          err.message.includes('último usuario administrador') || 
          err.message.includes('último administrador')
        )) {
        mostrarMensaje(err.message, 'error');
      } else {
        // Para otros errores, usar mensaje genérico o el del servidor
        const mensaje = err.response?.data?.message || err.message || 'Error al cambiar estado de usuario';
        mostrarMensaje(mensaje, 'error');
      }
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

  // Función para verificar la disponibilidad del nombre de usuario
  const verificarDisponibilidadUsuario = async (nombreUsuario: string) => {
    console.log('--- INICIANDO VERIFICACIÓN ---');
    console.log('Nombre de usuario a verificar:', nombreUsuario);
    console.log('Modo edición:', modoEdicion);
    console.log('Usuario editando:', usuarioEditando);
    
    // Evitar verificaciones innecesarias si el nombre no ha cambiado
    if (modoEdicion && usuarioEditando && usuarioEditando.usuario === nombreUsuario) {
      console.log('El nombre no ha cambiado, marcando como disponible');
      setUsuarioDisponible(true);
      return;
    }

    if (!nombreUsuario.trim()) {
      console.log('Nombre vacío, marcando como null');
      setUsuarioDisponible(null);
      return;
    }

    console.log('Iniciando verificación en el servidor...');
    setVerificandoUsuario(true);
    try {
      const estaDisponible = await ServicioUsuarios.verificarDisponibilidadUsuario(
        nombreUsuario, 
        modoEdicion && usuarioEditando ? usuarioEditando.id : undefined
      );
      console.log('Resultado de la verificación:', estaDisponible);
      setUsuarioDisponible(estaDisponible);
    } catch (error) {
      console.error('Error al verificar disponibilidad:', error);
      setUsuarioDisponible(false);
    } finally {
      setVerificandoUsuario(false);
      console.log('--- FIN VERIFICACIÓN ---');
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

    if (!/\d/.test(password)) {
      return { esValida: false, mensaje: 'La contraseña debe contener al menos un número' };
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) {
      return { esValida: false, mensaje: 'La contraseña debe contener al menos un símbolo especial (!@#$%^&*()_+-=[]{};\'":\\|,.<>?)' };
    }

    return { esValida: true, mensaje: 'Contraseña válida' };
  };

  // Función para verificar la contraseña actual del usuario
  const verificarContrasenaActual = async () => {
    if (!passwordActual.trim()) {
      setErrorPasswordActual('Debe ingresar su contraseña actual');
      return;
    }

    try {
      const esCorrecta = await ServicioUsuarios.verificarContrasenaActual(
        usuarioActual?.usuario || '', 
        passwordActual
      );

      if (esCorrecta) {
        // Si la contraseña es correcta, cerrar el modal y habilitar el cambio de contraseña
        setMostrarModalPassword(false);
        setCambiarPassword(true);
        setFormUsuario(prev => ({
          ...prev,
          password: '',
          confirmPassword: ''
        }));
      } else {
        setErrorPasswordActual('La contraseña ingresada es incorrecta');
      }
    } catch (error) {
      console.error('Error al verificar contraseña:', error);
      setErrorPasswordActual('Ocurrió un error al verificar la contraseña');
    }
  };

  // Estados para la paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const usuariosPorPagina = 10;

  // Calcular usuarios a mostrar (ordenados alfabéticamente)
  const usuariosOrdenados = [...usuariosFiltrados].sort((a, b) => a.usuario.localeCompare(b.usuario));
  const totalPaginas = Math.ceil(usuariosOrdenados.length / usuariosPorPagina);
  const indiceInicio = (paginaActual - 1) * usuariosPorPagina;
  const indiceFin = indiceInicio + usuariosPorPagina;
  const usuariosPagina = usuariosOrdenados.slice(indiceInicio, indiceFin);

  // Resetear página cuando cambian los filtros o la lista
  useEffect(() => {
    setPaginaActual(1);
  }, [usuariosFiltrados]);

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex items-center gap-3 pl-4">
            <div className="bg-indigo-100 p-3 rounded-lg">
              <Users className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
              <p className="text-sm text-gray-600 mt-1">Administra los usuarios del sistema</p>
            </div>
          </div>
          
          <button
            onClick={abrirModalCreacion}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <UserPlus size={18} className="w-5 h-5" />
            Nuevo Usuario
          </button>
        </div>
        
        {/* Mensajes de acción */}
        {mensajeAccion.visible && (
          <div className={`mb-6 p-4 rounded-lg ${
            mensajeAccion.tipo === 'success' ? 'bg-green-100 border-l-4 border-green-500 text-green-700' : 
            'bg-red-100 border-l-4 border-red-500 text-red-700'
          }`} role="alert">
            <div className="flex items-center">
              {mensajeAccion.tipo === 'success' ? (
                <CheckCircle size={20} className="mr-2" />
              ) : (
                <AlertCircle size={20} className="mr-2" />
              )}
              <span className="font-medium">{mensajeAccion.texto}</span>
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
        <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
          <div className="p-4 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Búsqueda */}
              <div className="md:col-span-2">
                <label htmlFor="busqueda" className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar usuario
                </label>
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    id="busqueda"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ingrese nombre de usuario..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Filtro por rol */}
              <div>
                <label htmlFor="filtroRol" className="block text-sm font-medium text-gray-700 mb-1">
                  Filtrar por rol
                </label>
                <div className="relative">
                  <select
                    id="filtroRol"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
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
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
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
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
        </div>
        
        {/* Tabla de usuarios */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          {error ? (
            <div className="p-8 text-center">
              <AlertCircle size={40} className="mx-auto text-red-500 mb-4" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Error al cargar usuarios</h3>
              <p className="mt-1 text-sm text-gray-500 mb-4">{error}</p>
              <button
                onClick={cargarUsuarios}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 inline-flex items-center"
              >
                <RefreshCw size={16} className="mr-2" />
                Reintentar
              </button>
            </div>
          ) : cargando && usuarios.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="p-8 text-center">
              <Users size={40} className="mx-auto text-gray-400 mb-4" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron usuarios</h3>
              <p className="mt-1 text-sm text-gray-500">
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
                  {usuariosPagina.map((usuario) => (
                    <tr 
                      key={usuario.id || usuario.usuario} 
                      className={`hover:bg-gray-50 ${esUsuarioActual(usuario) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`bg-indigo-100 p-2 rounded-lg mr-3 ${!usuario.activo ? 'opacity-50' : ''}`}>
                            <Users className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <div className={`text-sm font-medium ${!usuario.activo ? 'text-gray-500' : 'text-gray-900'}`}>
                              {usuario.usuario}
                              {esUsuarioActual(usuario) && (
                                <span className="ml-2 text-xs text-blue-600 font-normal">(Usted)</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {usuario.id ? `ID: ${usuario.id}` : 'Nuevo usuario'}
                            </div>
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
                        <div className="flex items-center justify-end gap-2">
                          {/* Mostrar icono de advertencia para último admin */}
                          {esUltimoAdministradorActivo(usuario) && (
                            <div 
                              className="flex items-center text-yellow-600 mr-2"
                              title="Último administrador del sistema - operaciones restringidas"
                            >
                              <AlertCircle size={16} />
                            </div>
                          )}
                          
                          <button 
                            onClick={() => abrirModalEdicion(usuario)}
                            className="text-indigo-600 hover:text-indigo-900 p-2 rounded-full hover:bg-indigo-50 transition-colors"
                            title="Editar usuario"
                          >
                            <Edit size={18} />
                          </button>
                          
                          <button
                            onClick={() => cambiarEstadoUsuario(usuario.id!, usuario.activo || false)}
                            disabled={
                              (esUltimoAdministradorActivo(usuario) && usuario.activo) ||
                              (esUsuarioActual(usuario) && usuario.activo)
                            }
                            className={`p-2 rounded-full transition-colors ${
                              (esUltimoAdministradorActivo(usuario) && usuario.activo) ||
                              (esUsuarioActual(usuario) && usuario.activo)
                                ? 'text-gray-400 cursor-not-allowed opacity-50' 
                                : usuario.activo 
                                  ? 'text-red-600 hover:text-red-900 hover:bg-red-50' 
                                  // Botón de activar usuario siempre visible con buen contraste
                                  : 'text-green-600 hover:text-green-900 hover:bg-green-50 font-medium'
                            }`}
                            title={
                              esUltimoAdministradorActivo(usuario) && usuario.activo
                                ? 'No se puede desactivar al último administrador del sistema'
                                : esUsuarioActual(usuario) && usuario.activo
                                  ? 'No puede desactivar su propia cuenta'
                                  : usuario.activo 
                                    ? 'Desactivar usuario' 
                                    : 'Activar usuario'
                            }
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
        
        {/* Controles de paginación responsiva */}
        {totalPaginas > 1 && (
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
            {/* Versión móvil */}
            <div className="block sm:hidden px-3 py-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                  disabled={paginaActual === 1}
                  className={`flex items-center px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md ${
                    paginaActual === 1 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  ← Anterior
                </button>
                
                <div className="flex flex-col items-center">
                  <span className="text-sm text-gray-700 font-medium">
                    Página {paginaActual} de {totalPaginas}
                  </span>
                  <span className="text-xs text-gray-500">
                    {usuariosOrdenados.length} usuarios
                  </span>
                </div>
                
                <button
                  onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
                  disabled={paginaActual === totalPaginas}
                  className={`flex items-center px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md ${
                    paginaActual === totalPaginas 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Siguiente →
                </button>
              </div>
            </div>

            {/* Versión desktop */}
            <div className="hidden sm:flex items-center justify-between px-4 py-3">
              <div className="flex items-center">
                <p className="text-sm text-gray-600">
                  Mostrando{' '}
                  <span className="font-medium">{indiceInicio + 1}</span>{' '}
                  a{' '}
                  <span className="font-medium">{Math.min(indiceFin, usuariosOrdenados.length)}</span>{' '}
                  de{' '}
                  <span className="font-medium">{usuariosOrdenados.length}</span>{' '}
                  usuarios
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                  disabled={paginaActual === 1}
                  className={`flex items-center justify-center h-9 px-4 rounded-md border border-gray-300 text-gray-500 bg-white hover:bg-gray-100 transition-colors disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed`}
                >
                  Anterior
                </button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(num => (
                    <button
                      key={num}
                      onClick={() => setPaginaActual(num)}
                      className={`flex items-center justify-center h-9 w-9 rounded-md border text-sm font-medium transition-colors ${
                        num === paginaActual
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'text-gray-700 bg-white border-gray-300 hover:bg-indigo-50'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
                  disabled={paginaActual === totalPaginas}
                  className={`flex items-center justify-center h-9 px-4 rounded-md border border-gray-300 text-gray-500 bg-white hover:bg-gray-100 transition-colors disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed`}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal de Usuario */}
        {mostrarModal && (
          <div className={`fixed inset-0 bg-gray-900/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${cerrandoModal ? 'animate-fadeOut' : 'animate-fadeIn'}`}>
            <div className={`bg-white rounded-2xl shadow-3xl w-full max-w-lg border border-gray-200 ${cerrandoModal ? 'animate-scaleOut' : 'animate-scaleIn'}`}>
              {/* Header moderno con gradiente */}
              <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl p-6">
                <div className="absolute inset-0 bg-black/10 rounded-t-2xl"></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                      {modoEdicion ? (
                        <Edit className="w-6 h-6 text-white" />
                      ) : (
                        <UserPlus className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {modoEdicion ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                      </h2>
                      <p className="text-indigo-100 text-sm">
                        {modoEdicion ? 'Modifica la información del usuario' : 'Complete la información para crear el usuario'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => cerrarModalConAnimacion()}
                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <form onSubmit={guardarUsuario} className="p-8 space-y-6">
                {/* Mostrar error global si existe */}
                {error && (
                  <div className="p-4 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-400 rounded-lg shadow-sm">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-red-800">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Grid de campos */}
                <div className="grid grid-cols-1 gap-6">
                  {/* Campo Usuario con diseño mejorado */}
                  <div className="space-y-2">
                    <label htmlFor="usuario" className="block text-sm font-semibold text-gray-700">
                      <span className="flex items-center">
                        <User className="w-4 h-4 mr-2 text-indigo-500" />
                        Nombre de Usuario
                        <span className="text-red-500 ml-1">*</span>
                      </span>
                    </label>
                    <div className="relative group">
                      <input
                        type="text"
                        id="usuario"
                        name="usuario"
                        value={formUsuario.usuario}
                        onChange={manejarCambioForm}
                        ref={usuarioInputRef}
                        className={`w-full px-4 py-3 border-2 rounded-xl bg-gray-50 focus:bg-white transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/20
                        ${verificandoUsuario ? 'border-yellow-300 bg-yellow-50' : ''}
                        ${!verificandoUsuario && usuarioDisponible === false ? 'border-red-400 bg-red-50' : ''}
                        ${!verificandoUsuario && usuarioDisponible === true ? 'border-green-400 bg-green-50' : ''}
                        ${!verificandoUsuario && usuarioDisponible === null ? 'border-gray-300 hover:border-indigo-400' : ''}`}
                        placeholder="Ingrese el nombre de usuario..."
                        required
                        minLength={1}
                        onBlur={(e) => verificarDisponibilidadUsuario(e.target.value)}
                      />
                      {verificandoUsuario && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                          <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
                        </div>
                      )}
                      {!verificandoUsuario && usuarioDisponible === false && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                          <X className="h-5 w-5 text-red-500" />
                        </div>
                      )}
                      {!verificandoUsuario && usuarioDisponible === true && formUsuario.usuario && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                      )}
                    </div>
                    {!verificandoUsuario && usuarioDisponible === false && (
                      <p className="text-sm text-red-600 font-medium flex items-center">
                        <X className="w-4 h-4 mr-1" />
                        Este nombre de usuario ya está en uso. Por favor, elija otro.
                      </p>
                    )}
                    {!verificandoUsuario && usuarioDisponible === true && formUsuario.usuario && (
                      <p className="text-sm text-green-600 font-medium flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Nombre de usuario disponible.
                      </p>
                    )}
                  </div>

                  {/* Opción para cambiar contraseña (solo en modo edición) */}
                  {modoEdicion && (
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-700">
                        <span className="flex items-center">
                          <Lock className="w-4 h-4 mr-2 text-indigo-500" />
                          Configuración de Contraseña
                        </span>
                      </label>
                      <div className="flex items-center p-4 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-indigo-300 transition-all duration-200">
                        <input
                          type="checkbox"
                          id="cambiarPassword"
                          checked={cambiarPassword}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setCambiarPassword(checked);
                            if (!checked) {
                              setFormUsuario(prev => ({
                                ...prev,
                                password: '',
                                confirmPassword: ''
                              }));
                            }
                            if (checked && esUsuarioActual(usuarioEditando as Usuario)) {
                              setMostrarModalPassword(true);
                              setCambiarPassword(false);
                            }
                          }}
                          className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-2 border-gray-300 rounded transition-all duration-200"
                        />
                        <label htmlFor="cambiarPassword" className="ml-3 text-sm font-medium text-gray-700">
                          Cambiar contraseña del usuario
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Campos de Contraseña con diseño mejorado */}
                  {(!modoEdicion || cambiarPassword) && (
                    <>
                      <div className="space-y-2">
                        <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                          <span className="flex items-center">
                            <Lock className="w-4 h-4 mr-2 text-indigo-500" />
                            Contraseña
                            <span className="text-red-500 ml-1">*</span>
                          </span>
                        </label>
                        <div className="relative">
                          <input
                            type={mostrarPassword ? 'text' : 'password'}
                            id="password"
                            name="password"
                            value={formUsuario.password}
                            onChange={manejarCambioForm}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400 pr-12"
                            placeholder="Ingrese una contraseña segura..."
                            required
                            minLength={8}
                          />
                          <button
                            type="button"
                            onClick={() => setMostrarPassword(prev => !prev)}
                            className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-indigo-600 focus:outline-none transition-colors duration-200"
                            tabIndex={-1}
                          >
                            {mostrarPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                        {formUsuario.password && (
                          <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                            <p className="text-sm font-semibold text-gray-700 mb-2">Requisitos de contraseña:</p>
                            <div className="grid grid-cols-1 gap-1.5 text-xs">
                              <div className={`flex items-center transition-colors ${formUsuario.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                                <span className="mr-2 font-mono">{formUsuario.password.length >= 8 ? '✓' : '○'}</span>
                                Al menos 8 caracteres
                              </div>
                              <div className={`flex items-center transition-colors ${/[a-z]/.test(formUsuario.password) ? 'text-green-600' : 'text-gray-500'}`}>
                                <span className="mr-2 font-mono">{/[a-z]/.test(formUsuario.password) ? '✓' : '○'}</span>
                                Una letra minúscula
                              </div>
                              <div className={`flex items-center transition-colors ${/[A-Z]/.test(formUsuario.password) ? 'text-green-600' : 'text-gray-500'}`}>
                                <span className="mr-2 font-mono">{/[A-Z]/.test(formUsuario.password) ? '✓' : '○'}</span>
                                Una letra mayúscula
                              </div>
                              <div className={`flex items-center transition-colors ${/\d/.test(formUsuario.password) ? 'text-green-600' : 'text-gray-500'}`}>
                                <span className="mr-2 font-mono">{/\d/.test(formUsuario.password) ? '✓' : '○'}</span>
                                Un número
                              </div>
                              <div className={`flex items-center transition-colors ${/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?]/.test(formUsuario.password) ? 'text-green-600' : 'text-gray-500'}`}>
                                <span className="mr-2 font-mono">{/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?]/.test(formUsuario.password) ? '✓' : '○'}</span>
                                Un carácter especial
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700">
                          <span className="flex items-center">
                            <Lock className="w-4 h-4 mr-2 text-indigo-500" />
                            Confirmar Contraseña
                            <span className="text-red-500 ml-1">*</span>
                          </span>
                        </label>
                        <div className="relative">
                          <input
                            type={mostrarConfirmPassword ? 'text' : 'password'}
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formUsuario.confirmPassword}
                            onChange={manejarCambioForm}
                            className={`w-full px-4 py-3 border-2 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 pr-12
                            ${
                              formUsuario.password && formUsuario.confirmPassword
                                ? formUsuario.password === formUsuario.confirmPassword
                                  ? 'border-green-400 hover:border-green-500'
                                  : 'border-red-400 hover:border-red-500'
                                : 'border-gray-300 hover:border-indigo-400 focus:border-indigo-500'
                            }`}
                            placeholder="Confirme la contraseña..."
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setMostrarConfirmPassword(prev => !prev)}
                            className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-indigo-600 focus:outline-none transition-colors duration-200"
                            tabIndex={-1}
                          >
                            {mostrarConfirmPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                        {formUsuario.password && formUsuario.confirmPassword && (
                          <p className={`text-sm font-medium flex items-center mt-2 transition-colors ${
                            formUsuario.password === formUsuario.confirmPassword
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {formUsuario.password === formUsuario.confirmPassword ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Las contraseñas coinciden
                              </>
                            ) : (
                              <>
                                <X className="w-4 h-4 mr-1" />
                                Las contraseñas no coinciden
                              </>
                            )}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Campo Estado con switch mejorado */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">
                      <span className="flex items-center">
                        <UserCheck className="w-4 h-4 mr-2 text-indigo-500" />
                        Estado del Usuario
                      </span>
                    </label>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-indigo-300 transition-all duration-200">
                      <span className="text-sm font-medium text-gray-700">
                        Usuario {formUsuario.activo ? 'activo' : 'inactivo'} en el sistema
                      </span>
                      <div className="relative">
                        <input
                          type="checkbox"
                          id="activo"
                          name="activo"
                          checked={formUsuario.activo}
                          onChange={manejarCambioForm}
                          disabled={
                            modoEdicion &&
                            esUltimoAdministradorActivo(usuarioEditando as Usuario) &&
                            usuarioEditando?.activo
                          }
                          className="sr-only"
                        />
                        <label 
                          htmlFor="activo" 
                          className={`flex items-center cursor-pointer ${
                            modoEdicion &&
                            esUltimoAdministradorActivo(usuarioEditando as Usuario) &&
                            usuarioEditando?.activo ? 'cursor-not-allowed opacity-50' : ''
                          }`}
                        >
                          <div className={`relative w-14 h-7 transition-colors duration-200 ease-in-out rounded-full ${
                            formUsuario.activo ? 'bg-indigo-600' : 'bg-gray-300'
                          }`}>
                            <div className={`absolute top-0.5 left-0.5 bg-white w-6 h-6 rounded-full transition-transform duration-200 ease-in-out transform ${
                              formUsuario.activo ? 'translate-x-7' : 'translate-x-0'
                            }`}></div>
                          </div>
                          <span className={`ml-3 text-sm font-medium ${
                            formUsuario.activo ? 'text-indigo-600' : 'text-gray-500'
                          }`}>
                            {formUsuario.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Campo Roles con diseño mejorado */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">
                      <span className="flex items-center">
                        <Shield className="w-4 h-4 mr-2 text-indigo-500" />
                        Roles del Sistema
                        <span className="text-red-500 ml-1">*</span>
                      </span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'ROLE_ADMIN', label: 'ADMIN', color: 'bg-yellow-500 hover:bg-yellow-600 border-yellow-500' },
                        { value: 'ROLE_CAJERO', label: 'CAJERO', color: 'bg-green-500 hover:bg-green-600 border-green-500' },
                        { value: 'ROLE_ALMACENERO', label: 'ALMACENERO', color: 'bg-blue-500 hover:bg-blue-600 border-blue-500' }
                      ].map((rol) => (
                        <button
                          key={rol.value}
                          type="button"
                          onClick={() => {
                            setFormUsuario(prev => ({
                              ...prev,
                              roles: [rol.value as RolNombre]
                            }));
                          }}
                          className={`relative px-4 py-3 text-sm font-semibold rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 ${
                            formUsuario.roles.includes(rol.value as RolNombre)
                              ? `${rol.color} text-white shadow-lg transform scale-105 focus:ring-opacity-50`
                              : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200 hover:border-gray-400 focus:ring-gray-500/20'
                          }`}
                        >
                          {formUsuario.roles.includes(rol.value as RolNombre) && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </div>
                          )}
                          {rol.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 italic flex items-center">
                      <Info className="w-3 h-3 mr-1" />
                      Selecciona un rol para el usuario
                    </p>
                  </div>
                </div>

                {/* Botones del formulario con diseño mejorado */}
                <div className="flex justify-end space-x-4 pt-8 border-t-2 border-gray-100">
                  <button
                    type="button"
                    onClick={() => cerrarModalConAnimacion()}
                    className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl shadow-sm hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-500/20 transition-all duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={
                      (formUsuario.password !== formUsuario.confirmPassword && (cambiarPassword || !modoEdicion)) ||
                      usuarioDisponible === false ||
                      verificandoUsuario
                    }
                    className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 border-2 border-transparent rounded-xl shadow-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-indigo-600 disabled:hover:to-purple-600 inline-flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {modoEdicion ? 'Actualizar Usuario' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestionUsuarios;

