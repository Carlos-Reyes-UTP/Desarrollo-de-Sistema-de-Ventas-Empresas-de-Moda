import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CajaService } from '../../services/CajaService';
import { APP_PATHS } from '../../shared/layout/navigationConfig';
import { NotificationToast } from './ventas-panel/NotificationToast';
import { QrPaymentModal } from './ventas-panel/QrPaymentModal';
import { VentaCompletadaModal } from './ventas-panel/VentaCompletadaModal';
import { ClienteSection } from './ventas-panel/ClienteSection';
import { CatalogoSection } from './ventas-panel/CatalogoSection';
import { CarritoSection } from './ventas-panel/CarritoSection';
import { useVentas } from './ventas-panel/useVentas';
import { PageHeader, MaterialIcon, Skeleton } from '@/shared/ui';

const VentasPanel = () => {
  const ventas = useVentas();
  const navigate = useNavigate();
  const [cargandoVerificacion, setCargandoVerificacion] = useState(true);
  const [cajaAbierta, setCajaAbierta] = useState<boolean>(false);

  useEffect(() => {
    const verificarCaja = async () => {
      try {
        const caja = await CajaService.obtenerCajaAbierta();
        setCajaAbierta(!!caja);
      } catch {
        setCajaAbierta(false);
      } finally {
        setCargandoVerificacion(false);
      }
    };
    verificarCaja();
  }, []);

  if (cargandoVerificacion) {
    return (
      <div className="caj-page p-4 sm:p-6 max-w-[1600px] mx-auto lg:bg-transparent min-h-screen animate-fadeIn text-left font-sans">
        <Skeleton className="mb-2 h-10 w-72" />
        <Skeleton className="mb-10 h-4 w-96 max-w-full" variant="muted" />
        <div className="overflow-hidden rounded-[3rem] border caj-border caj-card shadow-sm">
          <div className="space-y-8 p-10">
            <Skeleton className="h-16 w-full rounded-[1.5rem]" variant="muted" />
            <Skeleton className="h-16 w-full rounded-[1.5rem]" variant="muted" />
            <Skeleton className="h-16 w-full rounded-[1.5rem]" variant="muted" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative caj-page p-4 sm:p-6 max-w-[1600px] mx-auto lg:bg-transparent min-h-screen animate-fadeIn text-left font-sans">
      {!cajaAbierta && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
          <div className="relative caj-card rounded-[3rem] border caj-border shadow-2xl p-10 max-w-md w-full mx-4 text-center animate-fadeIn">
            <div className="w-16 h-16 mx-auto mb-6 caj-icon-chip rounded-2xl flex items-center justify-center shadow-lg">
              <MaterialIcon icon="lock" className="h-8 w-8" />
            </div>
            <h2 className="text-[14px] font-bold tracking-[0.3em] caj-heading uppercase mb-3">
              Caja no habilitada
            </h2>
            <p className="text-[11px] caj-text-muted font-medium leading-relaxed mb-8">
              Para realizar ventas debe abrir una caja primero.
            </p>
            <button
              onClick={() => navigate(APP_PATHS.caja, { state: { view: 'apertura' }, replace: true })}
              className="caj-btn-primary w-full py-5 rounded-[2rem] text-[11px] font-bold uppercase tracking-[0.4em] shadow-lg transition-all active:scale-[0.97] flex items-center justify-center gap-3"
            >
              <MaterialIcon icon="point_of_sale" className="h-5 w-5" />
              Abrir caja
            </button>
          </div>
        </div>
      )}

      <div className={!cajaAbierta ? 'pointer-events-none select-none blur-[2px]' : ''}>
        {ventas.errorGlobal && (
          <NotificationToast
            title="Error"
            message={ventas.errorGlobal}
            variant="error"
            topClassName="top-4"
            onClose={() => ventas.setErrorGlobal(null)}
          />
        )}

        {ventas.mensajeInfoVista && (
          <div className="mb-8 p-4 caj-error-banner rounded-[1.5rem] shadow-xl animate-fadeIn flex items-center justify-between border caj-border">
            <div className="flex items-center gap-4 px-2">
              <div className="w-2 h-2 rounded-full caj-pulse-dot animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{ventas.mensajeInfoVista}</span>
            </div>
            <button
              onClick={() => ventas.setMensajeInfoVista(null)}
              className="hover:opacity-60 transition-opacity p-1 flex items-center justify-center"
            >
              <MaterialIcon icon="close" className="h-[18px] w-[18px]" />
            </button>
          </div>
        )}

        <PageHeader
          variant="cajero"
          title="Punto de venta"
          actions={
            <>
              <div className="caj-card px-4 py-2.5 border rounded-xl shadow-sm">
                <span className="caj-label text-[9px] font-bold uppercase tracking-widest block mb-0.5">
                  Caja actual
                </span>
                <span className="caj-heading text-xs font-bold uppercase">Caja Principal 01</span>
              </div>
            </>
          }
        />

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
            cargandoBusquedaCliente={ventas.cargandoBusquedaCliente}
            errorBusquedaCliente={ventas.errorBusquedaCliente}
            setErrorBusquedaCliente={ventas.setErrorBusquedaCliente}
            handleBuscarCliente={ventas.handleBuscarCliente}
            handleRegistrarClienteRapido={ventas.handleRegistrarClienteRapido}
            limpiarCliente={ventas.limpiarCliente}
            inputNombreDebeParpadear={ventas.inputNombreDebeParpadear}
            setInputNombreDebeParpadear={ventas.setInputNombreDebeParpadear}
            handleActualizarClienteNombre={ventas.handleActualizarClienteNombre}
            clienteCreadoManualmente={ventas.clienteCreadoManualmente}
            requiereDocumentoCliente={ventas.requiereDocumentoCliente}
            clienteValidoParaVenta={ventas.clienteValidoParaVenta}
            identificacionMensaje={ventas.identificacionMensaje}
            inputDocumentoDebeParpadear={ventas.inputDocumentoDebeParpadear}
            setInputDocumentoDebeParpadear={ventas.setInputDocumentoDebeParpadear}
            tieneProductosEnCarrito={ventas.productosSeleccionadosVenta.length > 0}
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
              clienteValidoParaVenta={ventas.clienteValidoParaVenta}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VentasPanel;
