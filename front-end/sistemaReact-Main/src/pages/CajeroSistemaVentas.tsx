import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AperturaCaja from '../components/cajero/AperturaCaja';
import CierreCaja from '../components/cajero/CierreCaja';
import VentasPanel from '../components/cajero/VentasPanel';

const CajeroSistemaVentas = () => {
  const location = useLocation();
  const [vistaActual, setVistaActual] = useState('ventas');

  useEffect(() => {
    if (location.state?.view) {
      setVistaActual(location.state.view);
    }
  }, [location.state]);

  // Efecto adicional para sincronizar con el sidebar cuando cambia la URL
  useEffect(() => {
    // Si la URL cambió sin state, establecer vista por defecto
    if (!location.state?.view) {
      setVistaActual('ventas');
    }
  }, [location.pathname, location.state]);

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

export default CajeroSistemaVentas;