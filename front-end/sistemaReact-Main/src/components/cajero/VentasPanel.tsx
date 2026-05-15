import { X } from 'lucide-react';
import { NotificationToast } from './ventas-panel/NotificationToast';
import { QrPaymentModal } from './ventas-panel/QrPaymentModal';
import { VentaCompletadaModal } from './ventas-panel/VentaCompletadaModal';
import { ClienteSection } from './ventas-panel/ClienteSection';
import { CatalogoSection } from './ventas-panel/CatalogoSection';
import { CarritoSection } from './ventas-panel/CarritoSection';
import { useVentas } from './ventas-panel/useVentas';
import { CajeroThemeToggle } from './CajeroThemeToggle';

const VentasPanel = () => {
  const ventas = useVentas();

  return (
    <div className="caj-page p-10 max-w-[1600px] mx-auto lg:bg-transparent min-h-screen animate-fadeIn text-left font-sans">
      {ventas.errorGlobal && <NotificationToast title="Error" message={ventas.errorGlobal} variant="error" topClassName="top-4" onClose={() => ventas.setErrorGlobal(null)} />}
      
      {ventas.mensajeInfoVista && (
        <div className="mb-8 p-4 bg-black text-white rounded-[1.5rem] shadow-xl animate-fadeIn flex items-center justify-between border border-gray-800">
          <div className="flex items-center gap-4 px-2">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{ventas.mensajeInfoVista}</span>
          </div>
          <button onClick={() => ventas.setMensajeInfoVista(null)} className="hover:opacity-60 transition-opacity p-1">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="caj-heading text-[2.25rem] font-bold tracking-tight leading-none mb-2">
            PUNTO DE VENTA
          </h1>
          <p className="caj-text-muted text-sm max-w-md font-medium uppercase tracking-[0.05em]">
            Aquí puedes realizar las ventas y cobrar a tus clientes fácilmente.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <CajeroThemeToggle />
          <div className="caj-card px-6 py-3 border rounded-2xl shadow-sm">
            <span className="caj-label text-[9px] font-bold uppercase tracking-widest block mb-1">Caja actual</span>
            <span className="caj-heading text-xs font-bold uppercase">Caja Principal 01</span>
          </div>
        </div>
      </div>

      <QrPaymentModal
        open={ventas.mostrarModalQR}
        tipo={ventas.qrDataModal.tipo}
        qrUrl={ventas.qrDataModal.url}
        total={ventas.totalGeneralVenta}
        loading={ventas.cargandoProcesoVenta}
        onCancel={() => ventas.setMostrarModalQR(false)}
        onConfirm={ventas.ejecutarFinalizacionVenta}
      />

      <VentaCompletadaModal
        open={ventas.mostrarModalBoleta}
        datos={ventas.datosVentaParaBoleta}
        onPrint={ventas.handleImprimirBoleta}
        onClose={() => ventas.setMostrarModalBoleta(false)}
      />

      <div className="max-w-full mx-auto">
        <ClienteSection
          tipoDocumento={ventas.tipoDocumento}
          setTipoDocumento={ventas.setTipoDocumento}
          documentoCliente={ventas.documentoCliente}
          setDocumentoCliente={ventas.setDocumentoCliente}
          cliente={ventas.cliente}
          setCliente={ventas.setCliente}
          clienteSeleccionado={ventas.clienteSeleccionado}
          esMayorista={ventas.esMayorista}
          cargandoBusquedaAccion={ventas.cargandoBusquedaAccion}
          handleBuscarCliente={ventas.handleBuscarCliente}
          limpiarCliente={ventas.limpiarCliente}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <CatalogoSection
            variantesFiltradas={ventas.variantesFiltradas}
            tipoBusqueda={ventas.tipoBusqueda}
            setTipoBusqueda={ventas.setTipoBusqueda}
            busqueda={ventas.busqueda}
            setBusqueda={ventas.setBusqueda}
            handleBuscarPorCodigoExacto={ventas.handleBuscarPorCodigoExacto}
            handleBuscarEnServicio={ventas.handleBuscarEnServicio}
            cargandoBusquedaAccion={ventas.cargandoBusquedaAccion}
            setMensajeInfoVista={ventas.setMensajeInfoVista}
            cargandoProductosIniciales={ventas.cargandoProductosIniciales}
            variantesPaginadas={ventas.variantesPaginadas}
            clienteValidoParaVenta={ventas.clienteValidoParaVenta}
            handleSeleccionarVarianteDeLista={ventas.handleSeleccionarVarianteDeLista}
            totalPaginas={ventas.totalPaginas}
            paginaActual={ventas.paginaActual}
            totalElementos={ventas.totalElementos}
            handleCambiarPagina={ventas.handleCambiarPagina}
          />

          <CarritoSection
            productosSeleccionadosVenta={ventas.productosSeleccionadosVenta}
            handleEliminarProductoDeVenta={ventas.handleEliminarProductoDeVenta}
            handleActualizarCantidadEnVenta={ventas.handleActualizarCantidadEnVenta}
            variantesConPreciosCompletos={ventas.variantesConPreciosCompletos}
            esMayorista={ventas.esMayorista}
            calcularPrecioSegunCantidad={ventas.calcularPrecioSegunCantidad}
            resetearFormulario={ventas.resetearFormulario}
            metodoPago={ventas.metodoPago}
            setMetodoPago={ventas.setMetodoPago}
            subtotalVenta={ventas.subtotalVenta}
            igvVenta={ventas.igvVenta}
            totalGeneralVenta={ventas.totalGeneralVenta}
            handleProcesarVentaFinal={ventas.handleProcesarVentaFinal}
            cargandoProcesoVenta={ventas.cargandoProcesoVenta}
          />
        </div>
      </div>
    </div>
  );
};

export default VentasPanel;
