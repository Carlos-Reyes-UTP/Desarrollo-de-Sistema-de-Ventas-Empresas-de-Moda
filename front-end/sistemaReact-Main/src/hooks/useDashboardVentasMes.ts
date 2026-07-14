import { useCallback, useEffect, useMemo, useState } from 'react';
import { VentaService } from '@/services/VentaService';
import type { Venta } from '@/types/Venta';
import { etiquetaMesUi } from '@/utils/reportesCompararMeses';
import {
  guardarModoCompararMes,
  kpisDashboardMes,
  leerModoCompararMes,
  mesActual,
  mesAnteriorA,
  rankVariantesDesdeVentas,
  rangoMesCalendario,
  serieRitmoDiario,
  ultimasNVentas,
  type DashboardModoMes,
} from '@/utils/dashboardMes';

function toLocalIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useDashboardVentasMes(authReady: boolean) {
  const [modo, setModoState] = useState<DashboardModoMes>(() => leerModoCompararMes());
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const hoy = useMemo(() => new Date(), [tick]);
  const mes = useMemo(() => mesActual(hoy), [hoy]);
  const mesAnt = useMemo(() => mesAnteriorA(mes), [mes]);
  const compareOn = modo === 'comparar';

  const setModo = useCallback((m: DashboardModoMes) => {
    setModoState(m);
    guardarModoCompararMes(m);
  }, []);

  const cargar = useCallback(async () => {
    if (!authReady) return;
    setCargando(true);
    setError(null);
    setTick((t) => t + 1);
    try {
      const ahora = new Date();
      const mesNow = mesActual(ahora);
      const ant = mesAnteriorA(mesNow);
      const rangoAct = rangoMesCalendario(mesNow, ahora);
      const rangoAnt = rangoMesCalendario(ant, ahora);
      const data = await VentaService.obtenerTodasVentas(
        toLocalIsoDate(rangoAnt.inicio),
        toLocalIsoDate(rangoAct.fin)
      );
      setVentas(Array.isArray(data) ? data : []);
    } catch {
      setError('No se pudieron cargar las ventas. Reintentar.');
      setVentas([]);
    } finally {
      setCargando(false);
    }
  }, [authReady]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const kpis = useMemo(
    () => kpisDashboardMes(ventas, mes, hoy, compareOn, mesAnt),
    [ventas, mes, hoy, compareOn, mesAnt]
  );

  const ritmo = useMemo(
    () =>
      serieRitmoDiario(
        ventas,
        mes,
        hoy,
        compareOn ? ventas : undefined,
        compareOn ? mesAnt : undefined
      ),
    [ventas, mes, hoy, compareOn, mesAnt]
  );

  const rankings = useMemo(() => {
    const rango = rangoMesCalendario(mes, hoy);
    const delMes = ventas.filter((v) => {
      const f = new Date(v.fechaVenta);
      return !Number.isNaN(f.getTime()) && f >= rango.inicio && f <= rango.fin;
    });
    return rankVariantesDesdeVentas(delMes, 5);
  }, [ventas, mes, hoy]);

  const recientes = useMemo(() => ultimasNVentas(ventas, 10), [ventas]);

  return {
    modo,
    setModo,
    compareOn,
    cargando,
    error,
    reintentar: cargar,
    ventas,
    kpis,
    ritmo,
    rankings,
    recientes,
    etiquetaMesActual: etiquetaMesUi(mes),
    etiquetaMesAnterior: etiquetaMesUi(mesAnt),
  };
}
