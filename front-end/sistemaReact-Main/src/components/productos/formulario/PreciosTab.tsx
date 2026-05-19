import React from 'react';
import { Tag } from 'lucide-react';

interface PreciosTabProps {
  formData: {
    precioUnitario: string;
    precioCuarto: string;
    precioMediaDocena: string;
    precioDocena: string;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  errorPrecio: string | null;
}

export const PreciosTab: React.FC<PreciosTabProps> = ({
  formData,
  handleInputChange,
  errorPrecio
}) => {
  return (
    <div className="bg-gray-50 rounded-[1.5rem] p-8 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <h3 className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase mb-6 flex items-center gap-2">
        <Tag className="w-4 h-4" />
        Precios por volumen
      </h3>

      {errorPrecio && (
        <div className="mb-4 p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">
          {errorPrecio}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
              Precio unitario <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">S/</span>
              <input
                type="number"
                step="0.01"
                min="0"
                name="precioUnitario"
                value={formData.precioUnitario}
                onChange={handleInputChange}
                className="w-full pl-9 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-gray-200 focus:border-gray-200 shadow-sm"
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Precio por unidad individual
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
              Precio por media docena (6 u.)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">S/</span>
              <input
                type="number"
                step="0.01"
                min="0"
                name="precioMediaDocena"
                value={formData.precioMediaDocena}
                onChange={handleInputChange}
                className="w-full pl-9 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-gray-200 focus:border-gray-200 shadow-sm"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Precio por 6 unidades (1/2 docena)
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
              Precio por cuarto (3 u.)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">S/</span>
              <input
                type="number"
                step="0.01"
                min="0"
                name="precioCuarto"
                value={formData.precioCuarto}
                onChange={handleInputChange}
                className="w-full pl-9 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-gray-200 focus:border-gray-200 shadow-sm"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Precio por 3 unidades (1/4 docena)
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
              Precio por docena (12 u.)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">S/</span>
              <input
                type="number"
                step="0.01"
                min="0"
                name="precioDocena"
                value={formData.precioDocena}
                onChange={handleInputChange}
                className="w-full pl-9 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-gray-200 focus:border-gray-200 shadow-sm"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Precio por 12 unidades (docena completa)
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
        <h4 className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">Resumen de descuentos</h4>
        <div className="grid grid-cols-3 gap-4">
          {formData.precioCuarto && formData.precioUnitario && !isNaN(parseFloat(formData.precioUnitario)) && parseFloat(formData.precioUnitario) > 0 && (
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500">Descuento por 1/4 docena</p>
              <p className="text-lg font-black text-black">
                {(((parseFloat(formData.precioUnitario) * 3) - parseFloat(formData.precioCuarto)) / (parseFloat(formData.precioUnitario) * 3) * 100).toFixed(1)}%
              </p>
            </div>
          )}
          
          {formData.precioMediaDocena && formData.precioUnitario && !isNaN(parseFloat(formData.precioUnitario)) && parseFloat(formData.precioUnitario) > 0 && (
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500">Descuento por 1/2 docena</p>
              <p className="text-lg font-black text-black">
                {(((parseFloat(formData.precioUnitario) * 6) - parseFloat(formData.precioMediaDocena)) / (parseFloat(formData.precioUnitario) * 6) * 100).toFixed(1)}%
              </p>
            </div>
          )}
          
          {formData.precioDocena && formData.precioUnitario && !isNaN(parseFloat(formData.precioUnitario)) && parseFloat(formData.precioUnitario) > 0 && (
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500">Descuento por docena</p>
              <p className="text-lg font-black text-black">
                {(((parseFloat(formData.precioUnitario) * 12) - parseFloat(formData.precioDocena)) / (parseFloat(formData.precioUnitario) * 12) * 100).toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
