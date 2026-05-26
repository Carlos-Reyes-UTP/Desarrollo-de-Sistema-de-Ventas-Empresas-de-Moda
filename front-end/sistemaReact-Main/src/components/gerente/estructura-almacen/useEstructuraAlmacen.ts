import { useCallback, useEffect, useState } from 'react';
import { GerenteEstructuraAlmacenService } from '@/services/GerenteEstructuraAlmacenService';
import type {
  AreaCatalogo,
  CoberturaUbicaciones,
  Piso,
  ResumenGlobalUbicaciones,
  UbicacionOperativa,
  UbicacionPisoGrupo,
} from '@/types/EstructuraAlmacen';
import { useAutoSync } from '@/hooks/useAutoSync';
import type {
  CatalogoTab,
  ConfirmDesactivar,
  FormPisoSector,
  FormUbicacion,
  MensajeAccion,
} from './types';
import { mensajeErrorApi, parEsCreable, primerParFaltante } from './utils';

export function useEstructuraAlmacen() {
  const [vista, setVista] = useState<'catalogo' | 'inventario'>('catalogo');
  const [tab, setTab] = useState<CatalogoTab>('pisos');
  const [incluirInactivos, setIncluirInactivos] = useState(false);
  const [pisos, setPisos] = useState<Piso[]>([]);
  const [sectores, setSectores] = useState<AreaCatalogo[]>([]);
  const [ubicaciones, setUbicaciones] = useState<UbicacionOperativa[]>([]);
  const [ubicacionesGrupos, setUbicacionesGrupos] = useState<UbicacionPisoGrupo[]>([]);
  const [ubicacionesCobertura, setUbicacionesCobertura] = useState<CoberturaUbicaciones | null>(null);
  const [ubicacionesGlobal, setUbicacionesGlobal] = useState<ResumenGlobalUbicaciones | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<MensajeAccion>({ visible: false, tipo: 'success', texto: '' });
  const [stockRefreshKey, setStockRefreshKey] = useState(0);
  const [formPisoSector, setFormPisoSector] = useState<FormPisoSector | null>(null);
  const [formUbicacion, setFormUbicacion] = useState<FormUbicacion | null>(null);
  const [confirmDesactivar, setConfirmDesactivar] = useState<ConfirmDesactivar | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [selectPisos, setSelectPisos] = useState<Piso[]>([]);
  const [selectSectores, setSelectSectores] = useState<AreaCatalogo[]>([]);

  const mostrarExito = useCallback((texto: string) => {
    setMensaje({ visible: true, tipo: 'success', texto });
    setError(null);
  }, []);

  const cargarTab = useCallback(
    async (tabActivo: CatalogoTab, inactivos: boolean) => {
      setCargando(true);
      setError(null);
      try {
        if (tabActivo === 'pisos') {
          const data = await GerenteEstructuraAlmacenService.listarPisos(inactivos, true);
          setPisos(data);
        } else if (tabActivo === 'sectores') {
          const data = await GerenteEstructuraAlmacenService.listarAreas(inactivos);
          setSectores(data);
        } else {
          const resumen = await GerenteEstructuraAlmacenService.listarUbicacionesResumen(inactivos);
          setUbicacionesGrupos(resumen.grupos);
          setUbicacionesCobertura(resumen.cobertura);
          setUbicacionesGlobal(resumen.global);
          setUbicaciones(resumen.grupos.flatMap((g) => g.ubicaciones));
        }
      } catch (e: unknown) {
        setError(mensajeErrorApi(e, 'No se pudo cargar la información.'));
      } finally {
        setCargando(false);
      }
    },
    []
  );

  useEffect(() => {
    if (vista === 'catalogo') {
      void cargarTab(tab, incluirInactivos);
    }
  }, [vista, tab, incluirInactivos, cargarTab]);

  const refrescarStock = useCallback(() => {
    setStockRefreshKey((k) => k + 1);
  }, []);

  useAutoSync(
    () => {
      if (vista === 'catalogo') {
        void cargarTab(tab, incluirInactivos);
      } else {
        refrescarStock();
      }
    },
    ['ESTRUCTURA_ALMACEN_ACTUALIZADA']
  );

  useAutoSync(
    () => {
      if (vista === 'inventario') refrescarStock();
    },
    ['INVENTARIO_TRASLADO']
  );

  const guardarPisoSector = async () => {
    if (!formPisoSector) return;
    const nombre = formPisoSector.nombre.trim();
    if (!nombre) {
      setError('El nombre es obligatorio.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      if (formPisoSector.tipo === 'piso') {
        if (formPisoSector.modo === 'crear') {
          await GerenteEstructuraAlmacenService.crearPiso(nombre);
          mostrarExito('Piso creado correctamente.');
        } else if (formPisoSector.id != null) {
          await GerenteEstructuraAlmacenService.actualizarPiso(formPisoSector.id, nombre);
          mostrarExito('Piso actualizado.');
        }
      } else if (formPisoSector.modo === 'crear') {
        await GerenteEstructuraAlmacenService.crearArea(nombre);
        mostrarExito('Sector creado correctamente.');
      } else if (formPisoSector.id != null) {
        await GerenteEstructuraAlmacenService.actualizarArea(formPisoSector.id, nombre);
        mostrarExito('Sector actualizado.');
      }
      setFormPisoSector(null);
      await cargarTab(tab, incluirInactivos);
    } catch (e: unknown) {
      setError(mensajeErrorApi(e, 'No se pudo guardar.'));
    } finally {
      setGuardando(false);
    }
  };

  const guardarUbicacion = async () => {
    if (!formUbicacion?.idUbicacion || !formUbicacion?.idArea) {
      setError('Seleccione piso y sector.');
      return;
    }
    const faltantes = ubicacionesCobertura?.faltantes ?? [];
    if (faltantes.length > 0 && !parEsCreable(faltantes, formUbicacion.idUbicacion, formUbicacion.idArea)) {
      setError('Esa ubicación ya existe. Elija otro piso o sector.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await GerenteEstructuraAlmacenService.crearUbicacion(
        formUbicacion.idUbicacion,
        formUbicacion.idArea
      );
      setFormUbicacion(null);
      mostrarExito('Ubicación creada correctamente.');
      setTab('ubicaciones');
      await cargarTab('ubicaciones', incluirInactivos);
    } catch (e: unknown) {
      setError(mensajeErrorApi(e, 'No se pudo crear la ubicación.'));
    } finally {
      setGuardando(false);
    }
  };

  const ejecutarDesactivar = async () => {
    if (!confirmDesactivar) return;
    const { entidad, id } = confirmDesactivar;
    setGuardando(true);
    setError(null);
    try {
      if (entidad === 'piso') {
        await GerenteEstructuraAlmacenService.cambiarActivoPiso(id, false);
      } else if (entidad === 'sector') {
        await GerenteEstructuraAlmacenService.cambiarActivoArea(id, false);
      } else {
        await GerenteEstructuraAlmacenService.cambiarActivoUbicacion(id, false);
      }
      setConfirmDesactivar(null);
      mostrarExito('Registro desactivado.');
      await cargarTab(tab, incluirInactivos);
    } catch (e: unknown) {
      setError(mensajeErrorApi(e, 'No se pudo desactivar.'));
      setConfirmDesactivar(null);
    } finally {
      setGuardando(false);
    }
  };

  const reactivar = async (entidad: ConfirmDesactivar['entidad'], id: number) => {
    setGuardando(true);
    setError(null);
    try {
      if (entidad === 'piso') {
        await GerenteEstructuraAlmacenService.cambiarActivoPiso(id, true);
      } else if (entidad === 'sector') {
        await GerenteEstructuraAlmacenService.cambiarActivoArea(id, true);
      } else {
        await GerenteEstructuraAlmacenService.cambiarActivoUbicacion(id, true);
      }
      mostrarExito('Registro reactivado.');
      await cargarTab(tab, incluirInactivos);
    } catch (e: unknown) {
      setError(mensajeErrorApi(e, 'No se pudo reactivar.'));
    } finally {
      setGuardando(false);
    }
  };

  const abrirModalUbicacion = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        GerenteEstructuraAlmacenService.listarPisos(false, true),
        GerenteEstructuraAlmacenService.listarAreas(false),
      ]);
      const activosP = p.filter((x) => x.activo);
      const activosS = s.filter((x) => x.activo);
      setSelectPisos(activosP);
      setSelectSectores(activosS);
      const faltantes = ubicacionesCobertura?.faltantes ?? [];
      const inicial = primerParFaltante(faltantes);
      if (!inicial && (ubicacionesCobertura?.combinacionesFaltantes ?? 0) === 0) {
        setError('No hay ubicaciones pendientes por crear.');
        return;
      }
      setFormUbicacion({
        idUbicacion: inicial?.idUbicacion ?? 0,
        idArea: inicial?.idArea ?? 0,
      });
    } catch (e: unknown) {
      setError(mensajeErrorApi(e, 'No se pudieron cargar pisos y sectores.'));
    }
  }, [ubicacionesCobertura]);

  return {
    vista,
    setVista,
    tab,
    setTab,
    incluirInactivos,
    setIncluirInactivos,
    pisos,
    sectores,
    ubicaciones,
    ubicacionesGrupos,
    ubicacionesCobertura,
    ubicacionesGlobal,
    cargando,
    error,
    setError,
    mensaje,
    setMensaje,
    stockRefreshKey,
    formPisoSector,
    setFormPisoSector,
    formUbicacion,
    setFormUbicacion,
    confirmDesactivar,
    setConfirmDesactivar,
    guardando,
    guardarPisoSector,
    guardarUbicacion,
    ejecutarDesactivar,
    reactivar,
    abrirModalUbicacion,
    selectPisos,
    selectSectores,
    cargarTab,
  };
}
