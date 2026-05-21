import { MaterialIcon } from '@/shared/ui';
import type { ProductoVenta } from '../../../types/Producto';
import type { ProductoVariante } from '../../../types/ProductoVariante';
import type { PrecioCalculado } from './types';

interface CarritoSectionProps {
  productosSeleccionadosVenta: ProductoVenta[];
  handleEliminarProductoDeVenta: (id: number) => void;
  handleActualizarCantidadEnVenta: (id: number, cantidad: number) => void;
  variantesConPreciosCompletos: Map<number, ProductoVariante>;
  esMayorista: boolean;
  calcularPrecioSegunCantidad: (variante: ProductoVariante | undefined, cantidad: number) => PrecioCalculado;
  resetearFormulario: () => void;
  metodoPago: string;
  setMetodoPago: (metodo: string) => void;
  subtotalVenta: number;
  igvVenta: number;
  totalGeneralVenta: number;
  handleProcesarVentaFinal: () => void;
  cargandoProcesoVenta: boolean;
}

export const CarritoSection = ({
  productosSeleccionadosVenta,
  handleEliminarProductoDeVenta,
  handleActualizarCantidadEnVenta,
  variantesConPreciosCompletos,
  esMayorista,
  calcularPrecioSegunCantidad,
  resetearFormulario,
  metodoPago,
  setMetodoPago,
  subtotalVenta,
  igvVenta,
  totalGeneralVenta,
  handleProcesarVentaFinal,
  cargandoProcesoVenta
}: CarritoSectionProps) => {
  const paymentMethods = [
    { 
      id: 'efectivo', 
      name: 'Efectivo', 
      icon: (isSelected: boolean) => (
        <span className={`font-bold text-lg mr-1 ${isSelected ? "text-white" : "text-gray-600"}`}>S/</span>
      )
    },
    { 
      id: 'tarjeta', 
      name: 'Tarjeta', 
      icon: (isSelected: boolean) => (
        <MaterialIcon icon="credit_card" className={`h-[18px] w-[18px] ${isSelected ? "text-white" : "text-gray-600"}`} />
      )
    },
    { 
      id: 'yape', 
      name: 'Yape', 
      icon: (isSelected: boolean) => (
        <MaterialIcon icon="smartphone" className={`h-[18px] w-[18px] ${isSelected ? "text-white" : "text-gray-600"}`} />
      )
    },
    { 
      id: 'plin', 
      name: 'Plin', 
      icon: (isSelected: boolean) => (
        <MaterialIcon icon="smartphone" className={`h-[18px] w-[18px] ${isSelected ? "text-white" : "text-gray-600"}`} />
      )
    },
  ];

  return (
    <div className="lg:col-span-5 caj-card rounded-[2rem] shadow-2xl border flex flex-col h-[900px] overflow-hidden carrito-scroll">
      <div className="px-6 py-4 border-b caj-border-subtle flex items-center justify-between caj-card">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center shadow-lg">
            <MaterialIcon icon="credit_card" className="h-5 w-5 text-white" />
          </div>
          <h2 className="caj-heading text-[12px] font-bold tracking-[0.3em] uppercase">Lista de compras</h2>
        </div>
        <button 
          onClick={resetearFormulario}
          className="caj-text-faint text-[10px] font-bold hover:text-red-500 uppercase tracking-[0.2em] transition-colors caj-page px-4 py-2 rounded-xl border caj-border"
        >
          Limpiar lista
        </button>
      </div>
      
      {/* Lista Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar carrito-scroll caj-surface-muted/50">
        {productosSeleccionadosVenta.length > 0 ? (
          <div className="space-y-2">
            {productosSeleccionadosVenta.map((item, index) => (
              <div key={`${item.idProductoVariante}-${index}`} className="group caj-card border rounded-xl p-2 transition-all duration-300 hover:shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="caj-heading text-[10px] font-bold uppercase tracking-tight leading-tight truncate">{item.descripcion}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                       <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                          {item.color}
                       </span>
                       <span className="text-[8px] font-bold text-black uppercase tracking-wider bg-gray-100 px-1.5 py-0.5 rounded">
                          T {item.talla}
                       </span>
                    </div>
                  </div>

                  <div className="caj-segment flex items-center border rounded-lg p-0.5 shadow-inner scale-90">
                    <button 
                      onClick={() => handleActualizarCantidadEnVenta(item.idProductoVariante, item.cantidad - 1)}
                      className="w-6 h-6 flex items-center justify-center caj-segment-inactive caj-pagination-btn rounded transition-all font-bold"
                    >
                      -
                    </button>
                    <span className="caj-heading w-6 text-center text-[10px] font-extrabold">{item.cantidad}</span>
                    <button 
                      onClick={() => handleActualizarCantidadEnVenta(item.idProductoVariante, item.cantidad + 1)}
                      className="w-6 h-6 flex items-center justify-center caj-segment-inactive caj-pagination-btn rounded transition-all font-bold"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right min-w-[70px]">
                     <span className="caj-heading text-[12px] font-extrabold tracking-tight">
                       S/{(item.precio * item.cantidad).toFixed(2)}
                     </span>
                     <span className="block text-[8px] font-bold text-gray-300 uppercase tracking-widest leading-none">
                       S/{item.precio.toFixed(2)}
                     </span>
                  </div>

                  <button 
                    onClick={() => handleEliminarProductoDeVenta(item.idProductoVariante)}
                    className="p-1 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded transition-all flex items-center justify-center"
                  >
                    <MaterialIcon icon="close" className="h-3.5 w-3.5" />
                  </button>
                </div>
                
                {/* Badge Descuento/Tarifa - Ultra compact */}
                {(() => {
                   const variante = variantesConPreciosCompletos.get(item.idProductoVariante);
                   const preciosInfo = variante ? calcularPrecioSegunCantidad(variante, item.cantidad) : null;
                   if (preciosInfo?.tipoDescuento || esMayorista) {
                      return (
                        <div className="mt-1 pt-1 border-t border-gray-50 flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-black"></div>
                          <span className="text-[7px] font-bold text-black uppercase tracking-[0.2em]">
                             APLICADA: {preciosInfo?.tipoDescuento === 'mayorista' || esMayorista ? 'MAYORISTA' : 'VOLUMEN'}
                          </span>
                        </div>
                      );
                   }
                   return null;
                })()}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col justify-center items-center h-full text-center py-20">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-8 border border-gray-100">
              <MaterialIcon icon="payments" className="h-10 w-10 text-gray-100" />
            </div>
            <h3 className="caj-heading text-[13px] font-bold uppercase tracking-[0.3em] mb-3">Lista vacía</h3>
            <p className="caj-text-faint text-xs font-medium max-w-[200px] leading-relaxed">Selecciona productos del catálogo para empezar a vender.</p>
          </div>
        )}
      </div>
      
      {/* Totals & Checkout */}
      <div className="px-6 py-6 caj-card border-t caj-border space-y-4 relative z-20">
        <div className="space-y-6">
          <label className="block text-[10px] font-bold tracking-[0.35em] text-gray-300 uppercase pl-1">Método de pago</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {paymentMethods.map(method => (
              <button 
                key={method.id}
                onClick={() => setMetodoPago(method.id)}
                className={`flex flex-col items-center justify-center py-5 rounded-[1.5rem] border transition-all relative overflow-hidden group ${metodoPago === method.id ? 'caj-segment-active shadow-[0_20px_40px_rgba(0,0,0,0.15)] scale-[1.05]' : 'caj-segment caj-segment-inactive border-transparent'}`}
              >
                <div className={`mb-2.5 transition-transform group-hover:scale-110 ${metodoPago === method.id ? 'text-white' : 'text-gray-300'}`}>
                  {method.icon(metodoPago === method.id)}
                </div>
                <span className="text-[9px] font-bold uppercase tracking-[0.25em]">{method.name}</span>
                {metodoPago === method.id && (
                   <div className="absolute top-0 right-0 p-1">
                      <div className="w-1 h-1 rounded-full bg-white animate-ping"></div>
                   </div>
                )}
              </button>
            ))}
          </div>
        </div>
        
        <div className="pt-4 space-y-2">
          <div className="flex justify-between items-center text-gray-300">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Subtotal</span>
            <span className="text-[16px] font-bold tracking-tighter">S/{subtotalVenta.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-gray-300">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Impuestos (IGV)</span>
            <span className="text-[16px] font-bold tracking-tighter">S/{igvVenta.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <div className="flex flex-col">
               <span className="caj-heading text-[12px] font-bold uppercase tracking-[0.4em] mb-1">TOTAL A COBRAR</span>
               <span className="caj-text-faint text-[10px] font-bold uppercase tracking-widest">Monto total con IGV</span>
            </div>
            <span className="caj-heading text-[42px] font-extrabold tracking-tighter leading-none">S/{totalGeneralVenta.toFixed(2)}</span>
          </div>
        </div>
        
        <button 
          onClick={handleProcesarVentaFinal}
          disabled={productosSeleccionadosVenta.length === 0 || cargandoProcesoVenta || !metodoPago}
          className="w-full py-6 caj-btn-primary rounded-[2rem] text-[12px] font-bold uppercase tracking-[0.4em] shadow-[0_30px_60px_rgba(0,0,0,0.2)] transition-all active:scale-[0.97] disabled:opacity-20 disabled:cursor-not-allowed group flex items-center justify-center gap-4 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          {cargandoProcesoVenta ? <MaterialIcon icon="progress_activity" className="animate-spin h-5 w-5" /> : <MaterialIcon icon="credit_card" className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
          <span className="relative z-10">{cargandoProcesoVenta ? 'PROCESANDO PAGO...' : 'COBRAR AHORA'}</span>
        </button>
      </div>
    </div>
  );
};
