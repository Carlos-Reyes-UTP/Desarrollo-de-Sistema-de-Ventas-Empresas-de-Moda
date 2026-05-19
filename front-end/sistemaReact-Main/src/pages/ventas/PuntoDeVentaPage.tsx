import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AperturaCaja from '@/components/cajero/AperturaCaja';
import CierreCaja from '@/components/cajero/CierreCaja';
import VentasPanel from '@/components/cajero/VentasPanel';
import { useAuth } from '@/context/AuthContext';
import { resolveCajeroView } from '@/shared/layout/navigationConfig';

const PuntoDeVentaPage = () => {
  const { state } = useLocation();
  const { tieneRol } = useAuth();

  const [vistaActual, setVistaActual] = useState(() =>
    resolveCajeroView(state?.view, tieneRol)
  );

  useEffect(() => {
    setVistaActual(resolveCajeroView(state?.view, tieneRol));
  }, [state, tieneRol]);

  const renderContenido = () => {
    switch (vistaActual) {
      case 'apertura':
        return <AperturaCaja onAperturaCompleta={() => {
          // La navegación se maneja dentro del componente AperturaCaja
          // Aquí solo actualizamos el estado local como respaldo
          setVistaActual('ventas');
        }} />;
      case 'cierre':
        return <CierreCaja />;
      case 'ventas':
      default:
        return <VentasPanel />;
    }
  };

  return (
    // Se elimina SidebarMenu aquí para que no se duplique
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto p-5">
        {renderContenido()}
      </main>
    </div>
  );
};

export default PuntoDeVentaPage;
