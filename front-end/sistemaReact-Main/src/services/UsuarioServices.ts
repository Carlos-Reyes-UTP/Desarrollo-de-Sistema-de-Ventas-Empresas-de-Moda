import apiClient from '../config/apiClient';
import type { Usuario } from '../interfaces/Usuario';
import { RUTAS_USUARIOS } from '../config/apiConfig';

export const ServicioUsuarios = {
  obtenerTodos: async (): Promise<Usuario[]> => {
    console.log('Obteniendo todos los usuarios...');
    const respuesta = await apiClient.get<Usuario[]>(RUTAS_USUARIOS.BASE);
    console.log('Respuesta obtenerTodos:', respuesta.data);
    return respuesta.data;
  },

  obtenerUsuariosConRoles: async (): Promise<Usuario[]> => {
    console.log('Obteniendo usuarios con roles...');
    try {
      const respuesta = await apiClient.get<Usuario[]>(`${RUTAS_USUARIOS.BASE}/with-roles`);
      console.log('Respuesta obtenerUsuariosConRoles:', respuesta.data);
      return respuesta.data;
    } catch (error) {
      console.error('Error en obtenerUsuariosConRoles:', error);
      // Si falla el endpoint con roles, usar el endpoint base como fallback
      console.log('Usando fallback al endpoint base...');
      return await ServicioUsuarios.obtenerTodos();
    }
  },
  
  crear: async (datosUsuario: { usuario: string, clave: string, rol: string }): Promise<Usuario> => {
    console.log('Creando usuario:', datosUsuario);
    const respuesta = await apiClient.post<Usuario>(RUTAS_USUARIOS.CREAR, datosUsuario);
    console.log('Respuesta crear:', respuesta.data);
    return respuesta.data;
  },
  
  actualizar: async (id: number, datosUsuario: Usuario): Promise<Usuario> => {
    console.log('Actualizando usuario:', id, datosUsuario);
    const respuesta = await apiClient.put<Usuario>(RUTAS_USUARIOS.POR_ID(id), datosUsuario);
    console.log('Respuesta actualizar:', respuesta.data);
    return respuesta.data;
  },
  
  deshabilitar: async (id: number): Promise<void> => {
    console.log('Deshabilitando usuario:', id);
    await apiClient.put(RUTAS_USUARIOS.DESHABILITAR(id));
    console.log('Usuario deshabilitado exitosamente');
  },
  
  habilitar: async (id: number): Promise<void> => {
    console.log('Habilitando usuario:', id);
    await apiClient.put(RUTAS_USUARIOS.HABILITAR(id));
    console.log('Usuario habilitado exitosamente');
  }
};