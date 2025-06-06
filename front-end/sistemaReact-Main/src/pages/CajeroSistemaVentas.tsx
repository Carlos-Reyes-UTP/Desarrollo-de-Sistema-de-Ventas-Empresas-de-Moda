import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AperturaCaja from '../components/cajero/AperturaCaja';
import CierreCaja from '../components/cajero/CierreCaja';
import VentasPanel from '../components/cajero/VentasPanel';

const CajeroSistemaVentas = () => {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [vistaActual, setVistaActual] = useState('ventas');

  useEffect(() => {
    if (location.state && location.state.view) {
      setVistaActual(location.state.view);
    }
  }, [location.state]);

  const handleCerrarSesion = () => {
    cerrarSesion();
    navigate('/login');
  };

  const renderContenido = () => {
    switch (vistaActual) {
      case 'apertura':
        return <AperturaCaja onAperturaCompleta={() => setVistaActual('ventas')} />;
      case 'cierre':
        return <CierreCaja onCierreCompleto={() => setVistaActual('apertura')} />;
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