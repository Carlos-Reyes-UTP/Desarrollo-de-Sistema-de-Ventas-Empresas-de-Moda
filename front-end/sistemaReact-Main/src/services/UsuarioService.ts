import apiClient from '../config/apiClient';
import type { Usuario, UsuarioBackend, ActualizarUsuarioDTO } from '../types/Usuario';
import { RUTAS_USUARIOS, RUTAS_AUTENTICACION } from '../config/apiConfig';
import { logger } from '../utils/logger';

export const UsuarioService = {
  verificarDisponibilidadUsuario: async (nombreUsuario: string, idUsuarioActual?: number): Promise<boolean> => {
    logger.debug('Verificando disponibilidad de nombre de usuario:', nombreUsuario);
    try {
      const usuarios = await UsuarioService.obtenerUsuariosConRoles();
      logger.debug('Total de usuarios obtenidos:', usuarios.length);
      
      const usuarioExistente = usuarios.find(u => {
        const mismoNombre = u.usuario?.toLowerCase() === nombreUsuario.toLowerCase();
        const esElMismo = u.id === idUsuarioActual;
        logger.debug(`Comparando: "${u.usuario}" (ID: ${u.id}) vs "${nombreUsuario}" (ID actual: ${idUsuarioActual})`, { mismoNombre, esElMismo });
        return mismoNombre && !esElMismo;
      });
      
      logger.debug('Usuario existente encontrado:', usuarioExistente);
      return !usuarioExistente;
    } catch (error) {
      logger.error('Error al verificar disponibilidad de usuario:', error);
      return false;
    }
  },

  verificarContrasenaActual: async (usuario: string, contrasena: string): Promise<boolean> => {
    logger.debug('Verificando contrasena actual para:', usuario);
    try {
      const respuesta = await apiClient.post(RUTAS_AUTENTICACION.INICIAR_SESION, {
        usuario,
        clave: contrasena
      });
      return respuesta.status === 200 && respuesta.data?.status === true;
    } catch (error) {
      logger.error('Error al verificar contrasena:', error);
      return false;
    }
  },
  
  obtenerTodos: async (): Promise<Usuario[]> => {
    logger.debug('Obteniendo todos los usuarios...');
    const respuesta = await apiClient.get<Usuario[]>(RUTAS_USUARIOS.BASE);
    logger.debug('Respuesta obtenerTodos:', respuesta.data);
    return respuesta.data;
  },  obtenerUsuariosConRoles: async (): Promise<UsuarioBackend[]> => {
    logger.debug('Obteniendo usuarios con roles...');
    try {
      const respuesta = await apiClient.get<UsuarioBackend[]>(`${RUTAS_USUARIOS.BASE}/with-roles`);
      logger.debug('Respuesta obtenerUsuariosConRoles:', respuesta.data);
      return respuesta.data;
    } catch (error) {
      logger.error('Error en obtenerUsuariosConRoles:', error);
      logger.debug('Usando fallback al endpoint base...');
      const usuariosBase = await UsuarioService.obtenerTodos();
      return usuariosBase.map(usuario => ({
        ...usuario,
        roles: []
      }));
    }
  },
  
  crear: async (datosUsuario: { usuario: string, clave: string, rol: string, activo?: boolean }): Promise<Usuario> => {
    const rolNormalizado = datosUsuario.rol.startsWith('ROLE_') 
      ? datosUsuario.rol 
      : `ROLE_${datosUsuario.rol}`;
    
    try {
      logger.debug('Datos que se enviaran al backend:', {
        ...datosUsuario,
        rol: rolNormalizado,
        activo: datosUsuario.activo
      });
      
      const respuesta = await apiClient.post<Usuario>(RUTAS_USUARIOS.CREAR, {
        ...datosUsuario,
        rol: rolNormalizado,
        activo: datosUsuario.activo
      });

      if (!respuesta.data) {
        throw new Error('No se recibio respuesta del servidor');
      }

      logger.debug('Usuario creado exitosamente:', respuesta.data);
      return respuesta.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw error;
      }
      logger.error('Error al crear usuario:', error.response?.data ?? error.message);
      throw error;
    }
  },
  actualizar: async (id: number, datosUsuario: ActualizarUsuarioDTO): Promise<UsuarioBackend> => {
    logger.debug('Actualizando usuario:', id, datosUsuario);
    try {
      const respuesta = await apiClient.put<UsuarioBackend>(RUTAS_USUARIOS.POR_ID(id), datosUsuario);
      logger.debug('Respuesta actualizar:', respuesta.data);
      return respuesta.data;
    } catch (error: any) {
      if (error.response?.status === 409) {
        const mensaje = error.response?.data || 'No se puede quitar el rol de administrador al ultimo usuario administrador del sistema';
        throw new Error(mensaje);
      }
      throw error;
    }
  },
  
  deshabilitar: async (id: number): Promise<void> => {
    logger.debug('Deshabilitando usuario:', id);
    try {
      await apiClient.put(RUTAS_USUARIOS.DESHABILITAR(id));
      logger.debug('Usuario deshabilitado exitosamente');
    } catch (error: any) {
      if (error.response?.status === 409) {
        const mensaje = error.response?.data || 'No se puede deshabilitar al ultimo usuario administrador del sistema';
        throw new Error(mensaje);
      }
      throw error;
    }
  },
  
  habilitar: async (id: number): Promise<void> => {
    logger.debug('Habilitando usuario:', id);
    await apiClient.put(RUTAS_USUARIOS.HABILITAR(id));
    logger.debug('Usuario habilitado exitosamente');
  }
};