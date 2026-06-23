import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PageHeader, PageActionButton, PageActionGroup, Skeleton, MaterialIcon, ConfirmModal, ModalPortal, ModalMotionOverlay, useModalBodyScrollLock, useModalMotion, AppSelect } from '@/shared/ui';
import { useAuth } from '@/context/AuthContext';
import { UsuarioService, resolveRutasUsuarios } from '@/services/UsuarioService';
import { AccesoAreaAlmacenService } from '@/services/AccesoAreaAlmacenService';
import type { UbicacionArea } from '@/types/Almacen';
import type { RolNombre } from '@/types/enums';
import type { ActualizarUsuarioDTO, Usuario } from '@/types/Usuario';
import { getErrorMessage, getResponseMessage } from '@/utils/errorUtils';
import { normalizarUsuario } from '@/utils/normalizarUsuario';
import { SECTORES_ALMACEN_TEXTO } from '@/shared/constants/sectoresAlmacen';

const TODOS_LOS_ROLES: RolNombre[] = [
  'ROLE_ADMIN',
  'ROLE_GERENTE',
  'ROLE_CAJERO',
  'ROLE_ALMACENERO',
  'ROLE_VENDEDOR',
  'ROLE_SUPERVISOR_ALMACEN',
];

const GestionUsuariosPage = () => {
  const { usuario: usuarioActual, cerrarSesion, tieneRol } = useAuth();
  const esAdmin = tieneRol('ROLE_ADMIN');
  const esGerente = tieneRol('ROLE_GERENTE');
  const rutasApi = useMemo(() => resolveRutasUsuarios(tieneRol), [tieneRol]);
  const rolesAsignables = useMemo(() => {
    let roles = esAdmin ? TODOS_LOS_ROLES : TODOS_LOS_ROLES.filter((r) => r !== 'ROLE_ADMIN');
    return roles;
  }, [esAdmin, esGerente]);

  const esUsuarioAdministrador = useCallback(
    (u: Usuario) => u.roles?.some((rol) => rol.nombreRol === 'ROLE_ADMIN') ?? false,
    []
  );
  
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
    idUbicacionAreaAsignada: number | '';
  }>({
    usuario: '',
    password: '',
    confirmPassword: '',
    activo: true,
    roles: [],
    idUbicacionAreaAsignada: '',
  });

  const [areasAlmacenDisponibles, setAreasAlmacenDisponibles] = useState<UbicacionArea[]>([]);
  const [cargandoAreasAlmacen, setCargandoAreasAlmacen] = useState(false);

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
  const [mostrarConfirmGuardarEdicion, setMostrarConfirmGuardarEdicion] = useState(false);
  const [avisoReinicioSesion, setAvisoReinicioSesion] = useState<{
    open: boolean;
    mensaje: string;
  }>({
    open: false,
    mensaje: '',
  });
  const { overlayClass, panelClass, shouldRender: shouldRenderModal, requestClose: requestCloseModal } = useModalMotion({ open: mostrarModal });
  const { overlayClass: passwordOverlayClass, panelClass: passwordPanelClass, shouldRender: shouldRenderPasswordModal, requestClose: requestClosePasswordModal } = useModalMotion({ open: mostrarModalPassword });
  const { overlayClass: avisoOverlayClass, panelClass: avisoPanelClass, shouldRender: shouldRenderAviso } = useModalMotion({ open: avisoReinicioSesion.open });
  const cierreSesionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmarEstadoUsuario, setConfirmarEstadoUsuario] = useState<{
    open: boolean;
    id: number | null;
    activo: boolean;
    nombreUsuario: string;
  }>({
    open: false,
    id: null,
    activo: false,
    nombreUsuario: '',
  });
  
  // Estados para mostrar/ocultar contraseñas
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmPassword, setMostrarConfirmPassword] = useState(false);
  
  // Ref para el campo de nombre de usuario
  const usuarioInputRef = useRef<HTMLInputElement>(null);

  useModalBodyScrollLock(mostrarModal || mostrarModalPassword || avisoReinicioSesion.open);

  useEffect(() => {
    return () => {
      if (cierreSesionTimeoutRef.current) {
        clearTimeout(cierreSesionTimeoutRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    cargarUsuarios();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [busqueda, filtroRol, filtroActivo, usuarios, ordenarPor, ordenAscendente]);

  useEffect(() => {
    if (mostrarModal && usuarioInputRef.current) {
      const timer = setTimeout(() => {
        usuarioInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
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

  const esUltimoGerenteActivo = (usuario: Usuario): boolean => {
    const esGerenteActivo =
      usuario.activo && usuario.roles?.some((rol) => rol.nombreRol === 'ROLE_GERENTE');

    if (!esGerenteActivo) return false;

    const totalGerentesActivos = usuarios.filter(
      (u) => u.activo && u.roles?.some((rol) => rol.nombreRol === 'ROLE_GERENTE')
    ).length;

    return totalGerentesActivos === 1;
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
      mostrarAvisoReinicioSesion('Cambió su usuario o rol. Debe iniciar sesión nuevamente.');
    }
  };

  const cargarAreasAlmacen = async () => {
    setCargandoAreasAlmacen(true);
    try {
      const areas = await AccesoAreaAlmacenService.listarAreasAlmacen();
      setAreasAlmacenDisponibles(areas);
    } catch {
      setAreasAlmacenDisponibles([]);
    } finally {
      setCargandoAreasAlmacen(false);
    }
  };

  useEffect(() => {
    if (mostrarModal && formUsuario.roles.includes('ROLE_ALMACENERO')) {
      void cargarAreasAlmacen();
    }
  }, [mostrarModal, formUsuario.roles]);

  const cerrarModalConAnimacion = () => {
    requestCloseModal(() => {
      setMostrarModal(false);
      setFormUsuario({
        usuario: '',
        password: '',
        confirmPassword: '',
        activo: true,
        roles: [],
        idUbicacionAreaAsignada: '',
      });
      setAreasAlmacenDisponibles([]);
      setModoEdicion(false);
      setUsuarioEditando(null);
      setCambiarPassword(false);
      setUsuarioDisponible(null);
      setVerificandoUsuario(false);
      setMostrarPassword(false);
      setMostrarConfirmPassword(false);
      setMostrarModalPassword(false);
      setMostrarConfirmGuardarEdicion(false);
      setPasswordActual('');
      setErrorPasswordActual(null);
      setError(null);
    });
  };

  const cargarUsuarios = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await UsuarioService.obtenerUsuariosConRoles(rutasApi);
      const usuariosNormalizados = data.map(normalizarUsuario).filter(u => u.usuario !== 'SISTEMA');
      setUsuarios(usuariosNormalizados);
      setUsuariosFiltrados(usuariosNormalizados);
    } catch (err: any) {
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
      roles: [],
      idUbicacionAreaAsignada: '',
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
        : [],
      idUbicacionAreaAsignada: usuario.idUbicacionAreaAsignada ?? '',
    });
    setUsuarioDisponible(true);
    setVerificandoUsuario(false);
    setMostrarPassword(false);
    setMostrarConfirmPassword(false);
    setMostrarModalPassword(false);
    setMostrarConfirmGuardarEdicion(false);
    setPasswordActual('');
    setErrorPasswordActual(null);
    setModoEdicion(true);
    setUsuarioEditando(usuario);
    setCambiarPassword(false);
    setMostrarModal(true);
  };
  
  const manejarCambioForm = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Actualizar el estado del formulario primero
    setFormUsuario(prev => {
      const nuevoForm = { ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value };
      
      // Validación instantánea de contraseñas
      if (name === 'password' || name === 'confirmPassword') {
        if (nuevoForm.password === nuevoForm.confirmPassword && nuevoForm.confirmPassword !== '') {
          setError(null);
        } else if (nuevoForm.confirmPassword !== '' && nuevoForm.password.startsWith(nuevoForm.confirmPassword) === false && nuevoForm.password !== nuevoForm.confirmPassword) {
          // Si ya no coinciden en absoluto (no es solo que esté incompleta), mostrar error
          setError('Las contraseñas no coinciden');
        } else if (nuevoForm.confirmPassword !== '' && nuevoForm.confirmPassword.length >= nuevoForm.password.length && nuevoForm.password !== nuevoForm.confirmPassword) {
          // Si tiene la misma longitud o más y no coinciden
          setError('Las contraseñas no coinciden');
        }
      }
      
      return nuevoForm;
    });

    if (name === 'usuario') {
      setUsuarioDisponible(null);
      setVerificandoUsuario(false);
    }
  };
  
  const ejecutarGuardadoUsuario = async () => {
    setError(null);
    
    if (!formUsuario.usuario.trim()) { setError('El nombre de usuario no puede estar vacío'); return; }
    
    const nombreUsuario = formUsuario.usuario.trim();
    if (nombreUsuario.length < 4) { setError('El nombre de usuario debe tener al menos 4 caracteres'); return; }
    if (/\s/.test(nombreUsuario)) { setError('El nombre de usuario no puede contener espacios'); return; }
    if (!/^[a-zA-Z0-9_.-]+$/.test(nombreUsuario)) { setError('El usuario solo puede contener letras, números, puntos y guiones'); return; }

    if (verificandoUsuario) { setError('Verificando disponibilidad del nombre de usuario. Por favor espere.'); return; }
    if (usuarioDisponible === false) { setError('El nombre de usuario ya está en uso'); return; }

    if (!modoEdicion || cambiarPassword) {
      if (!formUsuario.password) { setError('La contraseña no puede estar vacía'); return; }
      const validacionPassword = validarContrasenaSegura(formUsuario.password);
      if (!validacionPassword.esValida) { setError(validacionPassword.mensaje); return; }
      if (formUsuario.password !== formUsuario.confirmPassword) { setError('Las contraseñas no coinciden'); return; }
    }

    if (formUsuario.roles.length === 0) { setError('Debe seleccionar un rol'); return; }

    const esAlmacenero = formUsuario.roles.includes('ROLE_ALMACENERO');
    if (esAlmacenero && !formUsuario.idUbicacionAreaAsignada) {
      setError(`Debe asignar el sector de almacén (${SECTORES_ALMACEN_TEXTO}) al almacenero`);
      return;
    }

    try {
      if (modoEdicion && usuarioEditando) {
        const usuarioParaActualizar: ActualizarUsuarioDTO = {
          id: usuarioEditando.id,
          usuario: formUsuario.usuario,
          activo: formUsuario.activo,
          roles: formUsuario.roles,
          idUbicacionAreaAsignada: esAlmacenero
            ? Number(formUsuario.idUbicacionAreaAsignada)
            : null,
        };
        
        if (cambiarPassword && formUsuario.password) {
          usuarioParaActualizar.clave = formUsuario.password;
        }
        
        const datosOriginales = usuarioEditando!;
        const esCambioPasswordPropio = cambiarPassword && esUsuarioActual(datosOriginales);
        
        await UsuarioService.actualizar(usuarioEditando.id!, usuarioParaActualizar, rutasApi);
        mostrarMensaje('Usuario actualizado exitosamente', 'success');
        
        const usuarioActualizado: Usuario = {
          ...datosOriginales,
          usuario: formUsuario.usuario,
          activo: formUsuario.activo,
          roles: formUsuario.roles.map(rolNombre => ({ id: 0, nombreRol: rolNombre }))
        };
        
        if (esCambioPasswordPropio) {
          mostrarAvisoReinicioSesion('Su contraseña fue actualizada. Debe iniciar sesión nuevamente.');
        } else {
          verificarCierreSesion(usuarioActualizado, datosOriginales);
        }
      } else {
        const rolSeleccionado = formUsuario.roles[0];
        await UsuarioService.crear(
          {
            usuario: formUsuario.usuario,
            clave: formUsuario.password,
            rol: rolSeleccionado,
            activo: formUsuario.activo,
            idUbicacionAreaAsignada: esAlmacenero
              ? Number(formUsuario.idUbicacionAreaAsignada)
              : undefined,
          },
          rutasApi
        );
        mostrarMensaje('Usuario creado exitosamente', 'success');
      }
      cerrarModalConAnimacion();
      cargarUsuarios();
    } catch (err: any) {
      setError(getResponseMessage(err) || 'Error al guardar el usuario');
    }
  };

  const guardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);

    if (!formUsuario.usuario.trim()) { setError('El nombre de usuario no puede estar vacío'); return; }

    const nombreUsuario = formUsuario.usuario.trim();
    if (nombreUsuario.length < 4) { setError('El nombre de usuario debe tener al menos 4 caracteres'); return; }
    if (/\s/.test(nombreUsuario)) { setError('El nombre de usuario no puede contener espacios'); return; }
    if (!/^[a-zA-Z0-9_.-]+$/.test(nombreUsuario)) { setError('El usuario solo puede contener letras, números, puntos y guiones'); return; }

    if (verificandoUsuario) { setError('Verificando disponibilidad del nombre de usuario. Por favor espere.'); return; }
    if (usuarioDisponible === false) { setError('El nombre de usuario ya está en uso'); return; }

    if (!modoEdicion || cambiarPassword) {
      if (!formUsuario.password) { setError('La contraseña no puede estar vacía'); return; }
      const validacionPassword = validarContrasenaSegura(formUsuario.password);
      if (!validacionPassword.esValida) { setError(validacionPassword.mensaje); return; }
      if (formUsuario.password !== formUsuario.confirmPassword) { setError('Las contraseñas no coinciden'); return; }
    }

    if (formUsuario.roles.length === 0) { setError('Debe seleccionar un rol'); return; }

    const esAlmacenero = formUsuario.roles.includes('ROLE_ALMACENERO');
    if (esAlmacenero && !formUsuario.idUbicacionAreaAsignada) {
      setError(`Debe asignar el sector de almacén (${SECTORES_ALMACEN_TEXTO}) al almacenero`);
      return;
    }

    if (modoEdicion) {
      setMostrarConfirmGuardarEdicion(true);
      return;
    }

    await ejecutarGuardadoUsuario();
  };
  
  const abrirConfirmacionCambioEstadoUsuario = (usuario: Usuario) => {
    setConfirmarEstadoUsuario({
      open: true,
      id: usuario.id ?? null,
      activo: usuario.activo || false,
      nombreUsuario: usuario.usuario,
    });
  };

  const cerrarConfirmacionCambioEstadoUsuario = () => {
    setConfirmarEstadoUsuario({
      open: false,
      id: null,
      activo: false,
      nombreUsuario: '',
    });
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
        await UsuarioService.deshabilitar(id, rutasApi);
        mostrarMensaje('Usuario deshabilitado correctamente', 'success');
      } else {
        await UsuarioService.habilitar(id, rutasApi);
        mostrarMensaje('Usuario habilitado correctamente', 'success');
      }
      await cargarUsuarios();
    } catch (err: any) {
      mostrarMensaje(getResponseMessage(err) || 'Error al cambiar estado', 'error');
    } finally {
      setCargando(false);
    }
  };

  const confirmarCambioEstadoUsuario = async () => {
    if (confirmarEstadoUsuario.id == null) return;

    const id = confirmarEstadoUsuario.id;
    const activo = confirmarEstadoUsuario.activo;
    cerrarConfirmacionCambioEstadoUsuario();
    await cambiarEstadoUsuario(id, activo);
  };

  const confirmarGuardadoEdicion = async () => {
    setMostrarConfirmGuardarEdicion(false);
    await ejecutarGuardadoUsuario();
  };
  
  const mostrarMensaje = (texto: string, tipo: 'success' | 'error') => {
    setMensajeAccion({ texto, tipo, visible: true });
    setTimeout(() => setMensajeAccion(prev => ({ ...prev, visible: false })), 5000);
  };

  const mostrarAvisoReinicioSesion = (mensaje: string) => {
    if (cierreSesionTimeoutRef.current) {
      clearTimeout(cierreSesionTimeoutRef.current);
    }

    setAvisoReinicioSesion({ open: true, mensaje });
    cierreSesionTimeoutRef.current = setTimeout(() => {
      setAvisoReinicioSesion({ open: false, mensaje: '' });
      cerrarSesion();
    }, 3000);
  };
  
  const verificarDisponibilidadUsuario = async (nombreUsuario: string) => {
    if (modoEdicion && usuarioEditando?.usuario === nombreUsuario) {
      setUsuarioDisponible(true); return;
    }
    if (!nombreUsuario.trim()) { setUsuarioDisponible(null); return; }

    setVerificandoUsuario(true);
    try {
      const estaDisponible = await UsuarioService.verificarDisponibilidadUsuario(
        nombreUsuario,
        modoEdicion && usuarioEditando ? usuarioEditando.id : undefined,
        rutasApi
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
      const esCorrecta = await UsuarioService.verificarContrasenaActual(usuarioActual?.usuario || '', passwordActual);
      if (esCorrecta) {
        setMostrarModalPassword(false); setPasswordActual(''); setCambiarPassword(true);
      } else { setErrorPasswordActual('Incorrecta'); }
    } catch { setErrorPasswordActual('Error'); }
  };

  const [paginaActual, setPaginaActual] = useState(1);
  const usuariosPorPagina = 10;
  const usuariosOrdenados = usuariosFiltrados.toSorted((a, b) => a.usuario.localeCompare(b.usuario));
  const totalPaginas = Math.ceil(usuariosOrdenados.length / usuariosPorPagina);
  const usuariosPagina = usuariosOrdenados.slice((paginaActual - 1) * usuariosPorPagina, paginaActual * usuariosPorPagina);

  useEffect(() => { setPaginaActual(1); }, [usuariosFiltrados]);

  return (
    <div className="app-page p-4 sm:p-6 max-w-[1600px] mx-auto min-h-screen text-left">
      <PageHeader
        surface="elevated"
        eyebrow="Administración"
        title="Gestión de usuarios"
        actions={
          <PageActionGroup>
            <PageActionButton grouped onClick={abrirModalCreacion}>
              <MaterialIcon icon="person_add" className="w-4 h-4" />
              Nuevo Usuario
            </PageActionButton>
          </PageActionGroup>
        }
      />

      {/* Action Messages */}
      {mensajeAccion.visible && (
        <div className={`mb-8 p-5 rounded-[1.5rem] border flex items-center justify-between shadow-sm animate-fadeIn ${
          mensajeAccion.tipo === 'success' 
            ? 'bg-green-50 dark:bg-green-955/20 border-green-100 dark:border-green-900/30 text-green-700 dark:text-green-400' 
            : 'bg-red-50 dark:bg-red-955/20 border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400'
        }`}>
          <div className="flex items-center gap-3">
            {mensajeAccion.tipo === 'success' ? (
              <MaterialIcon icon="check_circle" className="w-5 h-5" />
            ) : (
              <MaterialIcon icon="error" className="w-5 h-5" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-widest">{mensajeAccion.texto}</span>
          </div>
          <button onClick={() => setMensajeAccion(prev => ({ ...prev, visible: false }))}>
            <MaterialIcon icon="close" className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="app-panel rounded-[2rem] p-8 mb-8 shadow-sm border relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-12 xl:col-span-5">
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 dark:text-gray-550 uppercase mb-3 text-left transition-colors">Búsqueda de Operador</label>
            <div className="relative">
              <MaterialIcon icon="search" className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Nombre de usuario..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[var(--app-input)] rounded-xl text-sm text-black placeholder-gray-400 dark:placeholder-gray-600 focus:bg-white dark:focus:bg-gray-950 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 transition-all font-medium border border-[var(--app-border)]"
              />
            </div>
          </div>
          <div className="lg:col-span-4 xl:col-span-3">
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 dark:text-gray-500 uppercase mb-3 text-left transition-colors">Filtrado por Rol</label>
            <AppSelect
              value={filtroRol}
              onChange={(value) => setFiltroRol(value as RolNombre | 'TODOS')}
              options={[
                { value: 'TODOS', label: 'Todos los roles' },
                ...TODOS_LOS_ROLES.map((rol) => ({
                  value: rol,
                  label:
                    rol === 'ROLE_ADMIN'
                      ? 'Administrador'
                      : rol === 'ROLE_GERENTE'
                        ? 'Gerente'
                        : rol === 'ROLE_CAJERO'
                          ? 'Cajero'
                          : rol === 'ROLE_ALMACENERO'
                            ? 'Almacenero'
                            : rol === 'ROLE_VENDEDOR'
                              ? 'Vendedor'
                              : 'Supervisor almacén',
                })),
              ]}
              placeholder="Seleccionar rol"
            />
          </div>
          <div className="lg:col-span-4 xl:col-span-2">
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 dark:text-gray-500 uppercase mb-3 text-left transition-colors">Estado</label>
            <AppSelect
              value={filtroActivo === 'TODOS' ? 'TODOS' : filtroActivo ? 'true' : 'false'}
              onChange={(value) => setFiltroActivo(value === 'TODOS' ? 'TODOS' : value === 'true')}
              options={[
                { value: 'TODOS', label: 'Todos' },
                { value: 'true', label: 'Activos' },
                { value: 'false', label: 'Inactivos' },
              ]}
              placeholder="Seleccionar estado"
            />
          </div>
          <div className="lg:col-span-4 xl:col-span-2">
            <button
              onClick={cargarUsuarios}
              className="w-full h-[46px] bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-[var(--app-border)] shadow-sm"
            >
              {cargando ? (
                <MaterialIcon icon="sync" className="w-4 h-4 animate-spin" />
              ) : (
                <MaterialIcon icon="refresh" className="w-4 h-4" />
              )}
              {cargando ? 'Sincronizando' : 'Recargar'}
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="app-panel rounded-[2.5rem] shadow-sm border overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-white dark:bg-gray-950/40 border-b border-gray-100 dark:border-gray-800/50">
              <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-gray-400 dark:text-gray-500 uppercase">Identidad</th>
              <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-gray-400 dark:text-gray-500 uppercase">Privilegios</th>
              <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-gray-400 dark:text-gray-500 uppercase">Estado</th>
              <th className="px-8 py-6 text-right text-[10px] font-bold tracking-[0.2em] text-gray-400 dark:text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
            {cargando ? (
              Array.from({ length: 8 }, (_, row) => (
                <tr key={`sk-user-${row}`}>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-28" variant="muted" />
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6"><Skeleton className="h-6 w-20 rounded-lg" /></td>
                  <td className="px-8 py-6"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-8 py-6 text-right"><Skeleton className="ml-auto h-8 w-20 rounded-xl" /></td>
                </tr>
              ))
            ) : usuariosPagina.map((usuario, index) => (
              <tr key={usuario.id ?? `user-${usuario.usuario}-${index}`} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4 text-left">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-colors ${
                      usuario.activo 
                        ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)]' 
                        : 'bg-gray-100 text-gray-400 dark:bg-gray-900 dark:text-gray-600'
                    }`}>
                      <MaterialIcon icon="person" className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold transition-colors ${
                        !usuario.activo 
                          ? 'text-gray-400 dark:text-gray-600' 
                          : 'text-black dark:text-white'
                      }`}>
                        {usuario.usuario}
                        {esUsuarioActual(usuario) && (
                          <span className="ml-2 text-[9px] bg-[var(--app-accent)] text-[var(--app-accent-fg)] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wide">
                            Tú
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6 text-left">
                  <div className="flex flex-wrap gap-2">
                    {usuario.roles?.map((rol, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/80 rounded-lg text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">
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
                  <div className="flex justify-end gap-2 text-gray-400 dark:text-gray-500 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => abrirModalEdicion(usuario)}
                      disabled={esGerente && !esAdmin && esUsuarioAdministrador(usuario)}
                      title={esGerente && esUsuarioAdministrador(usuario) ? 'No puede editar administradores' : undefined}
                      className="p-2.5 bg-[var(--app-bg-muted)] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:bg-[var(--app-accent)] hover:text-[var(--app-accent-fg)] hover:border-transparent hover:shadow-lg hover:scale-105 rounded-xl transition-all shadow-sm hover-scale-google active:scale-[0.95] disabled:opacity-20"
                    >
                      <MaterialIcon icon="edit" className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => abrirConfirmacionCambioEstadoUsuario(usuario)} 
                      disabled={
                        ((esUltimoAdministradorActivo(usuario) || esUltimoGerenteActivo(usuario)) && usuario.activo) ||
                        (esUsuarioActual(usuario) && usuario.activo) ||
                        (esGerente && !esAdmin && esUsuarioAdministrador(usuario))
                      } 
                      className={`p-2.5 rounded-xl transition-all border shadow-sm disabled:opacity-20 hover-scale-google active:scale-[0.95] ${
                        usuario.activo 
                          ? 'bg-[var(--app-bg-muted)] border-[var(--app-border)] text-[var(--app-text-muted)] hover:bg-red-500 hover:text-white hover:border-transparent' 
                          : 'bg-[var(--app-bg-muted)] border-[var(--app-border)] text-[var(--app-text-muted)] hover:bg-[#10b981] hover:text-white hover:border-transparent'
                      }`}
                    >
                      {usuario.activo ? (
                        <MaterialIcon icon="person_remove" className="w-4 h-4" />
                      ) : (
                        <MaterialIcon icon="how_to_reg" className="w-4 h-4" />
                      )}
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
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Sincronización: {usuariosOrdenados.length} Registros Activos</span>
        <div className="flex gap-2 p-1 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/80 transition-colors">
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => setPaginaActual(n)}
              className={`w-10 h-10 rounded-xl text-xs font-bold transition-all hover-scale-google active:scale-[0.9] ${
                paginaActual === n 
                  ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] shadow-xl' 
                  : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/60'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Modal: Creation/Edit */}
      {shouldRenderModal && (
        <ModalPortal>
        <ModalMotionOverlay
          overlayClass={overlayClass}
          onClick={cerrarModalConAnimacion}
          className="app-modal-overlay"
          scrimClassName="bg-black/60 dark:bg-black/80"
        >
          <div
            className={`relative z-10 bg-white dark:bg-gray-950 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-transparent dark:border-gray-800/80 transition-colors ${panelClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-10 text-left">
              <div className="mb-6 w-12 h-1 bg-[var(--app-accent)] rounded-full"></div>
              <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white mb-2 uppercase transition-colors">
                {modoEdicion ? 'Actualización de Usuario' : 'Registro de Usuario'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-10 font-medium transition-colors">Configure los parámetros de autenticación y privilegios.</p>

              <form onSubmit={guardarUsuario} className="space-y-8">
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-955/20 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-3">
                    <MaterialIcon icon="error" className="w-4 h-4" /> {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors">Nombre de Usuario</label>
                  <div className="relative">
                    <MaterialIcon icon="person" className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      ref={usuarioInputRef}
                      type="text"
                      name="usuario"
                      value={formUsuario.usuario}
                      onChange={manejarCambioForm}
                      onBlur={(e) => verificarDisponibilidadUsuario(e.target.value)}
                      className="w-full pl-11 pr-4 py-4 bg-[var(--app-input)] rounded-xl text-sm text-black dark:text-white font-bold placeholder-gray-400 dark:placeholder-gray-600 focus:bg-white dark:focus:bg-gray-950 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 transition-all border border-[var(--app-border)]"
                      placeholder="Identificador del sistema..."
                      required
                    />
                  </div>
                  {verificandoUsuario && <span className="text-[10px] font-bold text-amber-500 uppercase tracking-tighter">Verificando en red...</span>}
                  {usuarioDisponible === false && <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">Identificador no disponible</span>}
                  {usuarioDisponible === true && <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-tighter">Identificador validado</span>}
                </div>

                {(!modoEdicion || cambiarPassword) && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Campo Contraseña */}
                      <div className="space-y-4">
                        <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors">Contraseña</label>
                        <div className="relative">
                          <MaterialIcon icon="lock" className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                          <input
                            type={mostrarPassword ? 'text' : 'password'}
                            name="password"
                            value={formUsuario.password}
                            onChange={manejarCambioForm}
                            className="w-full pl-11 pr-12 py-4 bg-[var(--app-input)] rounded-xl text-sm text-black dark:text-white font-bold border border-[var(--app-border)] focus:bg-white dark:focus:bg-gray-950 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 transition-all placeholder-gray-400 dark:placeholder-gray-600"
                            placeholder="••••••••"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setMostrarPassword(!mostrarPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white transition-colors flex items-center justify-center"
                          >
                            {mostrarPassword ? (
                              <MaterialIcon icon="visibility_off" className="w-[18px] h-[18px]" />
                            ) : (
                              <MaterialIcon icon="visibility" className="w-[18px] h-[18px]" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Campo Confirmación */}
                      <div className="space-y-4">
                        <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors">Confirmación</label>
                        <div className="relative">
                          <MaterialIcon icon="shield" className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                          <input
                            type={mostrarConfirmPassword ? 'text' : 'password'}
                            name="confirmPassword"
                            value={formUsuario.confirmPassword}
                            onChange={manejarCambioForm}
                            className={`w-full pl-11 pr-12 py-4 bg-[var(--app-input)] rounded-xl text-sm text-black dark:text-white font-bold border border-[var(--app-border)] focus:bg-white dark:focus:bg-gray-950 focus:ring-2 transition-all ${
                              formUsuario.confirmPassword 
                                ? formUsuario.password === formUsuario.confirmPassword 
                                  ? 'focus:ring-[#10b981]/20 dark:focus:ring-[#10b981]/20 border-[#10b981]/30 dark:border-[#10b981]/30' 
                                  : 'focus:ring-red-100 dark:focus:ring-red-950/20 border-red-200 dark:border-red-900/30'
                                : 'focus:ring-black/5 dark:focus:ring-white/10'
                            }`}
                            placeholder="••••••••"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setMostrarConfirmPassword(!mostrarConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white transition-colors flex items-center justify-center"
                          >
                            {mostrarConfirmPassword ? (
                              <MaterialIcon icon="visibility_off" className="w-[18px] h-[18px]" />
                            ) : (
                              <MaterialIcon icon="visibility" className="w-[18px] h-[18px]" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Validaciones UX de Contraseña */}
                    {formUsuario.password && (
                      <div className="bg-[#fcfcfc] dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-6 space-y-4 animate-fadeIn transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Requisitos de Seguridad</h4>
                          {formUsuario.password === formUsuario.confirmPassword && formUsuario.confirmPassword && (
                            <div className="flex items-center gap-1.5 text-emerald-500 animate-pulse">
                              <MaterialIcon icon="check_circle" className="w-3 h-3" />
                              <span className="text-[9px] font-bold uppercase tracking-wider">Las contraseñas coinciden</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                          {[
                            { label: 'Mínimo 8 caracteres', check: formUsuario.password.length >= 8 },
                            { label: 'Mayúsculas y Minúsculas', check: /[a-z]/.test(formUsuario.password) && /[A-Z]/.test(formUsuario.password) },
                            { label: 'Al menos un número', check: /\d/.test(formUsuario.password) },
                            { label: 'Símbolo (!@#$%^&*)', check: /[!@#$%^&*()]/.test(formUsuario.password) }
                          ].map((req, i) => (
                            <div key={i} className="flex items-center gap-2.5">
                              <div className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-500 ${req.check ? 'bg-[#10b981] scale-110 shadow-sm' : 'bg-gray-100 dark:bg-gray-850'}`}>
                                <MaterialIcon icon="check" className={`text-[10px] leading-none ${req.check ? 'text-white' : 'text-gray-300 dark:text-gray-600'}`} />
                              </div>
                              <span className={`text-[10px] font-bold uppercase tracking-tight transition-colors ${req.check ? 'text-black dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
                                {req.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {modoEdicion && !cambiarPassword && (
                  <button type="button" onClick={() => {
                    setErrorPasswordActual(null);
                    setPasswordActual('');
                    setMostrarModalPassword(true);
                  }} className="text-[10px] font-bold text-gray-700 dark:text-gray-300 hover:text-[var(--app-accent)] uppercase tracking-widest flex items-center gap-2 transition-colors">
                      <MaterialIcon icon="refresh" className="w-4 h-4" /> Resetear Credenciales de Seguridad
                    </button>
                )}

                <div className="space-y-4">
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors">Niveles de Autorización</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {rolesAsignables.map(rol => (
                      <button
                        key={rol}
                        type="button"
                        onClick={() => {
                            if (
                              modoEdicion &&
                              esUltimoAdministradorActivo(usuarioEditando as Usuario) &&
                              rol !== 'ROLE_ADMIN'
                            ) {
                              return;
                            }
                            if (
                              modoEdicion &&
                              esUltimoGerenteActivo(usuarioEditando as Usuario) &&
                              rol !== 'ROLE_GERENTE'
                            ) {
                              return;
                            }
                            setFormUsuario({
                              ...formUsuario,
                              roles: [rol as RolNombre],
                              idUbicacionAreaAsignada:
                                rol === 'ROLE_ALMACENERO'
                                  ? formUsuario.idUbicacionAreaAsignada
                                  : '',
                            });
                        }}
                        className={`py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all hover-scale-google ${
                          formUsuario.roles.includes(rol as RolNombre) 
                            ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] shadow-xl scale-105' 
                            : 'bg-gray-100 text-gray-400 dark:bg-gray-900 dark:text-gray-450 hover:bg-gray-200 dark:hover:bg-gray-800'
                        }`}
                      >
                        {rol === 'ROLE_SUPERVISOR_ALMACEN'
                          ? 'Supervisor almacén'
                          : rol.replace('ROLE_', '')}
                      </button>
                    ))}
                  </div>
                </div>

                {formUsuario.roles.includes('ROLE_ALMACENERO') && (
                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors">
                      Área de almacén asignada
                    </label>
                    <AppSelect
                      value={formUsuario.idUbicacionAreaAsignada}
                      onChange={(value) => setFormUsuario({...formUsuario, idUbicacionAreaAsignada: String(value)})}
                      options={areasAlmacenDisponibles.map((ua) => ({
                        value: ua.idUbicacionArea,
                        label: ua.area ?? ua.nombre,
                      }))}
                      placeholder={cargandoAreasAlmacen ? 'Cargando áreas…' : 'Seleccione sector'}
                      disabled={cargandoAreasAlmacen}
                    />
                  </div>
                )}

                <div className="flex gap-4 pt-6 transition-colors">
                  <button 
                    type="button" 
                    onClick={cerrarModalConAnimacion} 
                    className="flex-1 py-4 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-[var(--app-border)]"
                  >
                    Cerrar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-4 bg-[var(--app-accent)] text-[var(--app-accent-fg)] rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-xl hover:opacity-90 transition-all hover-scale-google active:scale-[0.98]"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalMotionOverlay>
        </ModalPortal>
      )}

      {/* Modal: Password Verification */}
      {shouldRenderPasswordModal && (
        <ModalPortal>
        <ModalMotionOverlay
          overlayClass={passwordOverlayClass}
          onClick={() => requestClosePasswordModal(() => setMostrarModalPassword(false))}
          className="app-modal-overlay"
          scrimClassName="bg-black/60 dark:bg-black/80"
          style={{ zIndex: 'calc(var(--app-z-modal) + 10)' }}
        >
          <div
            className={`relative z-10 bg-white dark:bg-gray-955 rounded-[2.5rem] border border-transparent dark:border-gray-800/40 shadow-2xl w-full max-w-md overflow-hidden transition-colors ${passwordPanelClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[var(--app-surface)] px-8 pt-8 pb-2 flex items-center gap-4 transition-colors">
              <div className="w-10 h-10 bg-[var(--app-bg-muted)] text-[var(--app-accent)] rounded-2xl flex items-center justify-center flex-shrink-0">
                <MaterialIcon icon="lock" className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--app-text)] uppercase tracking-tight leading-tight">Verificar Identidad</h3>
                <p className="text-[var(--app-text-muted)] text-[10px] font-bold uppercase tracking-widest mt-1 transition-colors">Confirme la contraseña de su sesión para continuar</p>
              </div>
            </div>
            {/* Body */}
            <div className="px-8 py-7 space-y-6">
              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] transition-colors">Contraseña Actual</label>
                <div className="relative">
                  <MaterialIcon icon="lock" className="w-4 h-4 text-gray-300 dark:text-gray-600 absolute left-5 top-1/2 -translate-y-1/2" />
                  <input
                    type={mostrarPassword ? 'text' : 'password'}
                    value={passwordActual}
                    onChange={(e) => setPasswordActual(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-[var(--app-input)] border border-[var(--app-border)] rounded-[1.5rem] text-sm font-bold text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:bg-white dark:focus:bg-gray-950 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 transition-all shadow-inner"
                    placeholder="Ingrese su contraseña..."
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white transition-colors flex items-center justify-center"
                  >
                    {mostrarPassword ? (
                      <MaterialIcon icon="visibility_off" className="w-[18px] h-[18px]" />
                    ) : (
                      <MaterialIcon icon="visibility" className="w-[18px] h-[18px]" />
                    )}
                  </button>
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
                onClick={() => requestClosePasswordModal(() => setMostrarModalPassword(false))}
                className="flex-1 py-4 bg-[#f8f8f8] dark:bg-gray-900 border border-transparent rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-855 transition-all hover-scale-google"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={verificarContrasenaActual}
                className="flex-1 py-4 bg-[var(--app-accent)] text-[var(--app-accent-fg)] border border-transparent rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-all shadow-[0_8px_24px_rgba(0,0,0,0.1)] active:scale-[0.97] hover-scale-google"
              >
                Verificar
              </button>
            </div>
          </div>
        </ModalMotionOverlay>
        </ModalPortal>
      )}

      <ConfirmModal
        open={mostrarConfirmGuardarEdicion}
        title="Confirmar guardado"
        message="¿Desea guardar los cambios realizados en este usuario?"
        onConfirm={confirmarGuardadoEdicion}
        onCancel={() => setMostrarConfirmGuardarEdicion(false)}
        confirmText="Guardar cambios"
        cancelText="Cancelar"
        variant="info"
      />

      <ConfirmModal
        open={confirmarEstadoUsuario.open}
        title={confirmarEstadoUsuario.activo ? 'Confirmar deshabilitación' : 'Confirmar habilitación'}
        message={confirmarEstadoUsuario.activo
          ? `¿Desea deshabilitar al usuario ${confirmarEstadoUsuario.nombreUsuario}?`
          : `¿Desea habilitar al usuario ${confirmarEstadoUsuario.nombreUsuario}?`}
        onConfirm={confirmarCambioEstadoUsuario}
        onCancel={cerrarConfirmacionCambioEstadoUsuario}
        confirmText={confirmarEstadoUsuario.activo ? 'Deshabilitar' : 'Habilitar'}
        cancelText="Cancelar"
        variant={confirmarEstadoUsuario.activo ? 'danger' : 'warning'}
      />

      {shouldRenderAviso && (
        <ModalPortal>
          <div className={`fixed inset-0 z-[9999] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 ${avisoOverlayClass}`}>
            <div className={`w-full max-w-md rounded-[2rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-955 shadow-2xl overflow-hidden ${avisoPanelClass}`}>
              <div className="px-8 pt-8 pb-4 flex items-center gap-4 bg-[var(--app-surface)]">
                <div className="w-11 h-11 rounded-2xl bg-[var(--app-bg-muted)] flex items-center justify-center text-[var(--app-accent)]">
                  <MaterialIcon icon="info" className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--app-text)] uppercase tracking-tight leading-tight">
                    Sesión actualizada
                  </h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-1 text-[var(--app-text-muted)]">
                    {avisoReinicioSesion.mensaje}
                  </p>
                </div>
              </div>
              <div className="px-8 pb-8 pt-4">
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-850 overflow-hidden">
                  <div className="h-full w-full origin-left animate-[shrink_3s_linear_forwards] bg-[var(--app-accent)]" />
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default GestionUsuariosPage;
