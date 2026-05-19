import React from 'react';
import { Barcode, Tag, Download, X, Plus } from 'lucide-react';

interface VarianteFormData {
  id?: number;
  nombreTalla: string;
  nombreColor: string;
  cantidad: number;
  stockAlmacen?: number;
  codigoIdentificacion: string;
}

interface CodigosBarrasTabProps {
  formData: {
    nombre: string;
    codigoIdentificacion: string;
  };
  variantes: VarianteFormData[];
  codigoBarrasPreview: string | null;
  setCodigoBarrasPreview: React.Dispatch<React.SetStateAction<string | null>>;
  varianteSeleccionada: number | null;
  setVarianteSeleccionada: React.Dispatch<React.SetStateAction<number | null>>;
  generarCodigoBarrasVariante: (varianteId: number | undefined) => void;
  descargarCodigoBarrasVariante: () => void;
  setTabActiva: (tab: 'informacion' | 'variantes' | 'precios' | 'codigosBarras') => void;
  setShowFormularioVariante: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
}

export const CodigosBarrasTab: React.FC<CodigosBarrasTabProps> = ({
  formData,
  variantes,
  codigoBarrasPreview,
  setCodigoBarrasPreview,
  varianteSeleccionada,
  setVarianteSeleccionada,
  generarCodigoBarrasVariante,
  descargarCodigoBarrasVariante,
  setTabActiva,
  setShowFormularioVariante,
  loading
}) => {
  return (
    <div className="bg-gray-50 rounded-xl p-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900 flex items-center gap-2">
          <Barcode className="w-5 h-5" />
          Códigos de Barras
        </h3>

        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-start gap-3">
          <Tag className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-gray-900 mb-1">Sobre las etiquetas de código de barras</h4>
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>Etiquetas de Variantes:</strong> Cada etiqueta incluye automáticamente toda la información necesaria</p>
              <p className="text-xs italic">Formato: "Nombre del Producto [Código] - T/Talla - Color"</p>
              <p className="text-xs italic">Ejemplo: "Boxer Americano [BA001] - T/M - Azul"</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <div className="bg-white p-5 rounded-xl border border-gray-100 h-full">
              <h4 className="font-medium text-black mb-3">
                {varianteSeleccionada 
                  ? 'Etiqueta con Información Completa'
                  : 'Etiquetas de Variantes (con nombre del producto)'}
              </h4>
              
              {varianteSeleccionada && codigoBarrasPreview ? (
                <div className="flex flex-col gap-4">
                  <div className="text-sm text-gray-600">
                    {variantes.map(v => {
                      if (v.id === varianteSeleccionada) {
                        return (
                          <div key={v.id} className="bg-gray-50 p-3 rounded-lg">
                            <p className="font-medium text-gray-800">Esta etiqueta contiene:</p>
                            <p className="text-black font-semibold">"{formData.nombre} [{formData.codigoIdentificacion}] - T/{v.nombreTalla} - {v.nombreColor}"</p>
                            <p className="text-xs text-gray-500 mt-1">Código: {v.codigoIdentificacion}</p>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                  
                  <div className="flex flex-col items-center justify-center bg-white p-4 rounded-xl border border-gray-200">
                    <img 
                      src={codigoBarrasPreview} 
                      alt="Código de barras de variante" 
                      className="max-w-full h-auto max-h-48 mb-3"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={descargarCodigoBarrasVariante}
                        className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Descargar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVarianteSeleccionada(null);
                          setCodigoBarrasPreview(null);
                        }}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                variantes.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-500 mb-3">
                      <p className="font-medium">Cada etiqueta contendrá:</p>
                      <p className="text-xs italic">"{formData.nombre} [{formData.codigoIdentificacion}] - T/X - Color Y"</p>
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto pr-2">
                      {variantes.map((variante, index) => {
                        if (!variante.id) return null;
                        
                        const tallaNombre = variante.nombreTalla;
                        const colorNombre = variante.nombreColor;
                        
                        return (
                          <button
                            key={variante.id || index}
                            type="button"
                            onClick={() => generarCodigoBarrasVariante(variante.id)}
                            className="flex flex-col items-start gap-1 w-full p-3 mb-2 rounded-xl border border-gray-100 hover:bg-[#f8f8f8] transition-colors text-left"
                            disabled={loading}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <div className="w-3 h-3 rounded-full" style={{
                                backgroundColor: '#CCCCCC'
                              }} />
                              <span className="font-medium flex-1">T/{tallaNombre} - {colorNombre}</span>
                              <Barcode className="w-4 h-4 text-gray-400" />
                            </div>
                            <span className="text-xs text-gray-500 font-medium">
                              "{formData.nombre} [{formData.codigoIdentificacion}] - T/{tallaNombre} - {colorNombre}"
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500 mb-2">
                      No hay variantes agregadas.
                    </p>
                    <p className="text-xs text-gray-500 italic mb-4">
                      Las etiquetas de variantes incluirán automáticamente:<br/>
                      "Nombre del Producto [Código] - T/X - Color Y"
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setTabActiva('variantes');
                        setShowFormularioVariante(true);
                      }}
                      className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar Variantes
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
