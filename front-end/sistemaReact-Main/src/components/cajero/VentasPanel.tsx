import { X } from 'lucide-react';
import { NotificationToast } from './ventas-panel/NotificationToast';
import { QrPaymentModal } from './ventas-panel/QrPaymentModal';
import { VentaCompletadaModal } from './ventas-panel/VentaCompletadaModal';
import { ClienteSection } from './ventas-panel/ClienteSection';
import { CatalogoSection } from './ventas-panel/CatalogoSection';
import { CarritoSection } from './ventas-panel/CarritoSection';
import { useVentas } from './ventas-panel/useVentas';

const VentasPanel = () => {
  const ventas = useVentas();

  return (
    <div className="p-10 max-w-[1600px] mx-auto bg-[#fafafa] lg:bg-transparent min-h-screen animate-fadeIn text-left font-sans">
      {/* SECCIÓN 0: NOTIFICACIONES */}
      {ventas.errorGlobal && <NotificationToast title="Error" message={ventas.errorGlobal} variant="error" topClassName="top-4" onClose={() => ventas.setErrorGlobal(null)} />}
      
      {ventas.mensajeInfoVista && (
        <div className="mb-8 p-4 bg-black text-white rounded-[1.5rem] shadow-xl animate-fadeIn flex items-center justify-between border border-gray-800">
          <div className="flex items-center gap-4 px-2">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{ventas.mensajeInfoVista}</span>
          </div>
          <button onClick={() => ventas.setMensajeInfoVista(null)} className="hover:opacity-60 transition-opacity p-1">
            <X size={18} />
          </button>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-[2.25rem] font-bold tracking-tight text-black leading-none mb-2">
            PUNTO DE VENTA
          </h1>
          <p className="text-gray-500 text-sm max-w-md font-medium uppercase tracking-[0.05em]">
            Aquí puedes realizar las ventas y cobrar a tus clientes fácilmente.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-6 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Caja actual</span>
            <span className="text-xs font-bold text-black uppercase">Caja Principal 01</span>
          </div>
        </div>
      </div>

      {/* MODALES DE PROCESO */}
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

      {/* CONTENIDO PRINCIPAL */}
      <div className="max-w-full mx-auto">
        {/* SECCIÓN A: IDENTIFICACIÓN DE CLIENTE */}
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

        {/* MAIN INTERACTOR: CATALOG & CART */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Panel de Búsqueda de Productos */}
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

          {/* Panel del Carrito (Transacción Sumario) */}
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
