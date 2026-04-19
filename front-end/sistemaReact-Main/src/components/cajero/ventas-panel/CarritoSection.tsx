import { CreditCard, Smartphone, DollarSign, X, Loader2 } from 'lucide-react';
import type { ProductoVenta } from '../../../interfaces/Producto';
import type { ProductoVariante } from '../../../interfaces/ProductoVariante';
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
        <CreditCard size={18} className={isSelected ? "text-white" : "text-gray-600"} />
      )
    },
    { 
      id: 'yape', 
      name: 'Yape', 
      icon: (isSelected: boolean) => (
        <Smartphone size={18} className={isSelected ? "text-white" : "text-gray-600"} />
      )
    },
    { 
      id: 'plin', 
      name: 'Plin', 
      icon: (isSelected: boolean) => (
        <Smartphone size={18} className={isSelected ? "text-white" : "text-gray-600"} />
      )
    },
  ];

  return (
    <div className="lg:col-span-5 bg-white rounded-[2rem] shadow-2xl border border-gray-100 flex flex-col h-[900px] overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-white">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center shadow-lg">
            <CreditCard className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-[12px] font-bold tracking-[0.3em] text-black uppercase">Lista de compras</h2>
        </div>
        <button 
          onClick={resetearFormulario}
          className="text-[10px] font-bold text-gray-300 hover:text-red-500 uppercase tracking-[0.2em] transition-colors bg-[#fafafa] px-4 py-2 rounded-xl border border-gray-100"
        >
          Limpiar lista
        </button>
      </div>
      
      {/* Lista Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar bg-[#fcfcfc]/50">
        {productosSeleccionadosVenta.length > 0 ? (
          <div className="space-y-2">
            {productosSeleccionadosVenta.map((item, index) => (
              <div key={`${item.idProductoVariante}-${index}`} className="group bg-white border border-gray-100 rounded-xl p-2 transition-all duration-300 hover:shadow-sm hover:border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[10px] font-bold text-black uppercase tracking-tight leading-tight truncate">{item.descripcion}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                       <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                          {item.color}
                       </span>
                       <span className="text-[8px] font-bold text-black uppercase tracking-wider bg-gray-100 px-1.5 py-0.5 rounded">
                          T {item.talla}
                       </span>
                    </div>
                  </div>

                  <div className="flex items-center bg-[#f8f8f8] border border-gray-100 rounded-lg p-0.5 shadow-inner scale-90">
                    <button 
                      onClick={() => handleActualizarCantidadEnVenta(item.idProductoVariante, item.cantidad - 1)}
                      className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-black hover:bg-white hover:shadow-sm rounded transition-all font-bold"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-[10px] font-extrabold text-black">{item.cantidad}</span>
                    <button 
                      onClick={() => handleActualizarCantidadEnVenta(item.idProductoVariante, item.cantidad + 1)}
                      className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-black hover:bg-white hover:shadow-sm rounded transition-all font-bold"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right min-w-[70px]">
                     <span className="text-[12px] font-extrabold text-black tracking-tight">
                       S/{(item.precio * item.cantidad).toFixed(2)}
                     </span>
                     <span className="block text-[8px] font-bold text-gray-300 uppercase tracking-widest leading-none">
                       S/{item.precio.toFixed(2)}
                     </span>
                  </div>

                  <button 
                    onClick={() => handleEliminarProductoDeVenta(item.idProductoVariante)}
                    className="p-1 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                  >
                    <X size={14} />
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
              <DollarSign className="h-10 w-10 text-gray-100" />
            </div>
            <h3 className="text-[13px] font-bold text-black uppercase tracking-[0.3em] mb-3">Lista vacía</h3>
            <p className="text-gray-300 text-xs font-medium max-w-[200px] leading-relaxed">Selecciona productos del catálogo para empezar a vender.</p>
          </div>
        )}
      </div>
      
      {/* Totals & Checkout */}
      <div className="px-6 py-6 bg-white border-t border-gray-100 space-y-4 relative z-20">
        <div className="space-y-6">
          <label className="block text-[10px] font-bold tracking-[0.35em] text-gray-300 uppercase pl-1">Método de pago</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {paymentMethods.map(method => (
              <button 
                key={method.id}
                onClick={() => setMetodoPago(method.id)}
                className={`flex flex-col items-center justify-center py-5 rounded-[1.5rem] border transition-all relative overflow-hidden group ${metodoPago === method.id ? 'bg-black border-black text-white shadow-[0_20px_40px_rgba(0,0,0,0.15)] scale-[1.05]' : 'bg-[#f8f8f8] border-transparent text-gray-400 hover:bg-gray-100'}`}
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
               <span className="text-[12px] font-bold text-black uppercase tracking-[0.4em] mb-1">TOTAL A COBRAR</span>
               <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Monto total con IGV</span>
            </div>
            <span className="text-[42px] font-extrabold text-black tracking-tighter leading-none">S/{totalGeneralVenta.toFixed(2)}</span>
          </div>
        </div>
        
        <button 
          onClick={handleProcesarVentaFinal}
          disabled={productosSeleccionadosVenta.length === 0 || cargandoProcesoVenta || !metodoPago}
          className="w-full py-6 bg-black text-white rounded-[2rem] text-[12px] font-bold uppercase tracking-[0.4em] shadow-[0_30px_60px_rgba(0,0,0,0.2)] hover:bg-gray-800 transition-all active:scale-[0.97] disabled:opacity-20 disabled:cursor-not-allowed group flex items-center justify-center gap-4 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          {cargandoProcesoVenta ? <Loader2 className="animate-spin h-5 w-5" /> : <CreditCard className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
          <span className="relative z-10">{cargandoProcesoVenta ? 'PROCESANDO PAGO...' : 'COBRAR AHORA'}</span>
        </button>
      </div>
    </div>
  );
};
