import type { RolNombre } from '@/types/enums';
import type { Usuario, UsuarioBackend } from '@/types/Usuario';

const ETIQUETAS_ROL: Record<RolNombre, string> = {
  ROLE_ADMIN: 'Administrador',
  ROLE_GERENTE: 'Gerente',
  ROLE_SUPERVISOR_ALMACEN: 'Supervisor almacén',
  ROLE_ALMACENERO: 'Almacenero',
  ROLE_CAJERO: 'Cajero',
  ROLE_VENDEDOR: 'Vendedor',
};

export function etiquetaRol(nombreRol: RolNombre): string {
  return ETIQUETAS_ROL[nombreRol] ?? nombreRol.replace('ROLE_', '').replace(/_/g, ' ');
}

export function contarPorRol(usuarios: Usuario[], rol: RolNombre): number {
  return usuarios.filter(
    (u) => u.roles?.some((r) => r.nombreRol === rol)
  ).length;
}

export function rolPrincipal(usuario: Usuario): RolNombre | null {
  if (!usuario.roles?.length) return null;
  const prioridad: RolNombre[] = [
    'ROLE_ADMIN',
    'ROLE_GERENTE',
    'ROLE_SUPERVISOR_ALMACEN',
    'ROLE_ALMACENERO',
    'ROLE_CAJERO',
    'ROLE_VENDEDOR',
  ];
  for (const rol of prioridad) {
    if (usuario.roles.some((r) => r.nombreRol === rol)) return rol;
  }
  return usuario.roles[0].nombreRol;
}

export function normalizarUsuario(usuarioBackend: UsuarioBackend): Usuario {
  const usuario: Usuario = {
    id: usuarioBackend.id,
    usuario: usuarioBackend.usuario,
    password: usuarioBackend.password,
    activo: usuarioBackend.activo,
    roles: [],
  };

  if (usuarioBackend.roles) {
    let rawRoles: unknown[] = [];
    if (usuarioBackend.roles instanceof Set) {
      rawRoles = Array.from(usuarioBackend.roles);
    } else if (Array.isArray(usuarioBackend.roles)) {
      rawRoles = usuarioBackend.roles;
    } else if (typeof usuarioBackend.roles === 'object' && usuarioBackend.roles !== null) {
      const rolesObj = usuarioBackend.roles as { forEach?: (fn: (val: unknown) => void) => void };
      if (typeof rolesObj.forEach === 'function') {
        rolesObj.forEach((val) => rawRoles.push(val));
      } else {
        rawRoles = Object.values(usuarioBackend.roles);
      }
    }

    usuario.roles = rawRoles
      .map((rol) => {
        let nombre = '';
        if (typeof rol === 'string') {
          nombre = rol;
        } else if (rol && typeof rol === 'object') {
          const o = rol as { nombreRol?: string; authority?: string };
          nombre = o.nombreRol || o.authority || '';
        }
        const nombreRol = (
          nombre.startsWith('ROLE_') ? nombre : `ROLE_${nombre}`
        ) as RolNombre;
        return { nombreRol };
      })
      .filter((r) => Boolean(r.nombreRol) && !String(r.nombreRol).endsWith('_'));
  }

  usuario.idUbicacionAreaAsignada = usuarioBackend.idUbicacionAreaAsignada ?? null;
  usuario.etiquetaAreaAsignada = usuarioBackend.etiquetaAreaAsignada ?? null;
  return usuario;
}
