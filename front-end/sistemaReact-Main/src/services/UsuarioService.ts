import apiClient from '../config/apiClient';
import type { Usuario, UsuarioBackend, ActualizarUsuarioDTO } from '../types/Usuario';
import { RUTAS_USUARIOS, RUTAS_GERENTE_USUARIOS, RUTAS_AUTENTICACION } from '../config/apiConfig';
import type { RolNombre } from '../types/enums';
import { logger } from '../utils/logger';

export type RutasUsuariosApi = typeof RUTAS_USUARIOS;

export function resolveRutasUsuarios(tieneRol: (r: RolNombre) => boolean): RutasUsuariosApi {
  return tieneRol('ROLE_ADMIN') ? RUTAS_USUARIOS : RUTAS_GERENTE_USUARIOS;
}

export const UsuarioService = {
  verificarDisponibilidadUsuario: async (
    nombreUsuario: string,
    idUsuarioActual?: number,
    rutas: RutasUsuariosApi = RUTAS_GERENTE_USUARIOS
  ): Promise<boolean> => {
    logger.debug('Verificando disponibilidad de nombre de usuario:', nombreUsuario);
    try {
      const usuarios = await UsuarioService.obtenerUsuariosConRoles(rutas);
      const usuarioExistente = usuarios.find((u) => {
        const mismoNombre = u.usuario?.toLowerCase() === nombreUsuario.toLowerCase();
        const esElMismo = u.id === idUsuarioActual;
        return mismoNombre && !esElMismo;
      });
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
        clave: contrasena,
      });
      return respuesta.status === 200 && respuesta.data?.status === true;
    } catch (error) {
      logger.error('Error al verificar contrasena:', error);
      return false;
    }
  },

  obtenerTodos: async (rutas: RutasUsuariosApi = RUTAS_GERENTE_USUARIOS): Promise<Usuario[]> => {
    const respuesta = await apiClient.get<Usuario[]>(rutas.BASE);
    return respuesta.data;
  },

  obtenerUsuariosConRoles: async (
    rutas: RutasUsuariosApi = RUTAS_GERENTE_USUARIOS
  ): Promise<UsuarioBackend[]> => {
    try {
      const respuesta = await apiClient.get<UsuarioBackend[]>(`${rutas.BASE}/with-roles`);
      return respuesta.data;
    } catch (error) {
      logger.error('Error en obtenerUsuariosConRoles:', error);
      const usuariosBase = await UsuarioService.obtenerTodos(rutas);
      return usuariosBase.map((usuario) => ({
        ...usuario,
        roles: [],
      })) as unknown as UsuarioBackend[];
    }
  },

  crear: async (
    datosUsuario: {
      usuario: string;
      clave: string;
      rol: string;
      activo?: boolean;
      idUbicacionAreaAsignada?: number | null;
    },
    rutas: RutasUsuariosApi = RUTAS_GERENTE_USUARIOS
  ): Promise<Usuario> => {
    const rolNormalizado = datosUsuario.rol.startsWith('ROLE_')
      ? datosUsuario.rol
      : `ROLE_${datosUsuario.rol}`;

    const respuesta = await apiClient.post<Usuario>(rutas.CREAR, {
      ...datosUsuario,
      rol: rolNormalizado,
      activo: datosUsuario.activo,
    });

    if (!respuesta.data) {
      throw new Error('No se recibio respuesta del servidor');
    }
    return respuesta.data;
  },

  actualizar: async (
    id: number,
    datosUsuario: ActualizarUsuarioDTO,
    rutas: RutasUsuariosApi = RUTAS_GERENTE_USUARIOS
  ): Promise<UsuarioBackend> => {
    try {
      const respuesta = await apiClient.put<UsuarioBackend>(rutas.POR_ID(id), datosUsuario);
      return respuesta.data;
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: string } };
      if (err.response?.status === 409 || err.response?.status === 403) {
        const mensaje =
          typeof err.response?.data === 'string'
            ? err.response.data
            : 'No se puede modificar al usuario por restricciones del sistema';
        throw new Error(mensaje);
      }
      throw error;
    }
  },

  deshabilitar: async (id: number, rutas: RutasUsuariosApi = RUTAS_GERENTE_USUARIOS): Promise<void> => {
    try {
      await apiClient.put(rutas.DESHABILITAR(id));
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: string } };
      if (err.response?.status === 409 || err.response?.status === 403) {
        const mensaje =
          typeof err.response?.data === 'string'
            ? err.response.data
            : 'No se puede deshabilitar al usuario por restricciones del sistema';
        throw new Error(mensaje);
      }
      throw error;
    }
  },

  habilitar: async (id: number, rutas: RutasUsuariosApi = RUTAS_GERENTE_USUARIOS): Promise<void> => {
    try {
      await apiClient.put(rutas.HABILITAR(id));
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: string } };
      if (err.response?.status === 403) {
        const mensaje =
          typeof err.response?.data === 'string'
            ? err.response.data
            : 'No se puede modificar a este usuario';
        throw new Error(mensaje);
      }
      throw error;
    }
  },
};
