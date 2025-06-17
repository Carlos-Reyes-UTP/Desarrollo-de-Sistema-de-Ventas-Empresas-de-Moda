import apiClient from '../config/apiClient';
import type { Usuario, UsuarioBackend, ActualizarUsuarioDTO } from '../interfaces/Usuario';
import { RUTAS_USUARIOS } from '../config/apiConfig';

export const ServicioUsuarios = {
  obtenerTodos: async (): Promise<Usuario[]> => {
    console.log('Obteniendo todos los usuarios...');
    const respuesta = await apiClient.get<Usuario[]>(RUTAS_USUARIOS.BASE);
    console.log('Respuesta obtenerTodos:', respuesta.data);
    return respuesta.data;
  },  obtenerUsuariosConRoles: async (): Promise<UsuarioBackend[]> => {
    console.log('Obteniendo usuarios con roles...');
    try {
      const respuesta = await apiClient.get<UsuarioBackend[]>(`${RUTAS_USUARIOS.BASE}/with-roles`);
      console.log('Respuesta obtenerUsuariosConRoles:', respuesta.data);
      return respuesta.data;
    } catch (error) {
      console.error('Error en obtenerUsuariosConRoles:', error);
      // Si falla el endpoint con roles, usar el endpoint base como fallback
      console.log('Usando fallback al endpoint base...');
      const usuariosBase = await ServicioUsuarios.obtenerTodos();
      // Transformar a UsuarioBackend (sin roles)
      return usuariosBase.map(usuario => ({
        ...usuario,
        roles: []
      }));
    }
  },
  
  crear: async (datosUsuario: { usuario: string, clave: string, rol: string }): Promise<Usuario> => {
    console.log('Creando usuario:', { ...datosUsuario, clave: '***' }); // Ocultar clave en logs
    
    // Asegurar que el rol tenga el prefijo ROLE_
    const rolNormalizado = datosUsuario.rol.startsWith('ROLE_') 
      ? datosUsuario.rol 
      : `ROLE_${datosUsuario.rol}`;
    
    try {
      const respuesta = await apiClient.post<Usuario>(RUTAS_USUARIOS.CREAR, {
        ...datosUsuario,
        rol: rolNormalizado
      });

      if (!respuesta.data) {
        throw new Error('No se recibió respuesta del servidor');
      }

      console.log('Usuario creado exitosamente:', respuesta.data);
      return respuesta.data;
    } catch (error: any) {
      // Si el error es por token expirado, propagarlo para manejarlo en el componente
      if (error.response?.status === 401) {
        throw error;
      }
      console.error('Error al crear usuario:', error.response?.data ?? error.message);
      throw error;
    }
  },
  actualizar: async (id: number, datosUsuario: ActualizarUsuarioDTO): Promise<UsuarioBackend> => {
    console.log('Actualizando usuario:', id, datosUsuario);
    try {
      const respuesta = await apiClient.put<UsuarioBackend>(RUTAS_USUARIOS.POR_ID(id), datosUsuario);
      console.log('Respuesta actualizar:', respuesta.data);
      return respuesta.data;
    } catch (error: any) {
      // Manejar específicamente los errores de validación del último administrador
      if (error.response?.status === 409) {
        // Error de conflicto - último administrador
        const mensaje = error.response?.data || 'No se puede quitar el rol de administrador al último usuario administrador del sistema';
        throw new Error(mensaje);
      }
      // Para otros errores, propagar tal como están
      throw error;
    }
  },
  
  deshabilitar: async (id: number): Promise<void> => {
    console.log('Deshabilitando usuario:', id);
    try {
      await apiClient.put(RUTAS_USUARIOS.DESHABILITAR(id));
      console.log('Usuario deshabilitado exitosamente');
    } catch (error: any) {
      // Manejar específicamente los errores de validación del último administrador
      if (error.response?.status === 409) {
        // Error de conflicto - último administrador
        const mensaje = error.response?.data || 'No se puede deshabilitar al último usuario administrador del sistema';
        throw new Error(mensaje);
      }
      // Para otros errores, propagar tal como están
      throw error;
    }
  },
  
  habilitar: async (id: number): Promise<void> => {
    console.log('Habilitando usuario:', id);
    await apiClient.put(RUTAS_USUARIOS.HABILITAR(id));
    console.log('Usuario habilitado exitosamente');
  }
};