import { jwtDecode } from 'jwt-decode';
import type { Usuario } from '@/types/Usuario';
import type { RolNombre } from '@/types/enums';
import type { TokenDecodificado } from '@/types/TokenDecodificado';

function extraerRolesDelToken(decodificado: TokenDecodificado): RolNombre[] {
  if (!decodificado.authorities) return [];

  if (Array.isArray(decodificado.authorities)) {
    return decodificado.authorities as RolNombre[];
  }

  if (typeof decodificado.authorities === 'string') {
    return decodificado.authorities.split(',').map((rol) => {
      const cleanRole = rol.trim();
      return cleanRole.startsWith('ROLE_') ? cleanRole : `ROLE_${cleanRole}`;
    }) as RolNombre[];
  }

  return [];
}

export function leerSesionDesdeStorage(): {
  token: string | null;
  usuario: Usuario | null;
} {
  const tokenAlmacenado = localStorage.getItem('token');
  if (!tokenAlmacenado) {
    return { token: null, usuario: null };
  }

  try {
    const decodificado = jwtDecode<TokenDecodificado>(tokenAlmacenado);
    const tiempoActual = Date.now() / 1000;

    if (decodificado.exp && decodificado.exp < tiempoActual) {
      localStorage.removeItem('token');
      return { token: null, usuario: null };
    }

    const rolesUsuario = extraerRolesDelToken(decodificado);
    return {
      token: tokenAlmacenado,
      usuario: {
        usuario: decodificado.sub,
        roles: rolesUsuario.map((rol) => ({ nombreRol: rol })),
      },
    };
  } catch {
    localStorage.removeItem('token');
    return { token: null, usuario: null };
  }
}
