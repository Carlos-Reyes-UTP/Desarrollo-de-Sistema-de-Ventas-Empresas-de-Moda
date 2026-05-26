import { useCallback, useEffect, useState } from 'react';
import { AccesoAreaAlmacenService } from '@/services/AccesoAreaAlmacenService';
import type { AccesoAreaAlmacen } from '@/types/AccesoAreaAlmacen';
import { esRolModuloAlmacen } from '@/shared/constants/rolesAlmacen';
import { useAuth } from '@/context/AuthContext';

export function useAccesoAreaAlmacen(enabled = true) {
  const { tieneRol } = useAuth();
  const [acceso, setAcceso] = useState<AccesoAreaAlmacen | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!enabled || !esRolModuloAlmacen(tieneRol)) {
      setAcceso(null);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const data = await AccesoAreaAlmacenService.obtenerMiAcceso();
      setAcceso(data);
    } catch (e: any) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el acceso a áreas de almacén');
      setAcceso(null);
    } finally {
      setCargando(false);
    }
  }, [enabled, tieneRol]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const idUbicacionAreaEntrada =
    acceso?.puedeElegirAreaEntrada
      ? null
      : acceso?.idUbicacionAreaAsignada ?? null;

  return {
    acceso,
    cargando,
    error,
    recargar,
    idUbicacionAreaEntrada,
    etiquetaStock:
      acceso?.puedeElegirAreaEntrada
        ? null
        : acceso?.etiquetaAreaAsignada ?? null,
  };
}
