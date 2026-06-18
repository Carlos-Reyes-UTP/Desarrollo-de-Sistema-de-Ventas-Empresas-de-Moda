import React from 'react';
import { MaterialIcon } from '@/shared/ui';

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
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTouched(prev => ({ ...prev, [e.target.name]: true }));
  };

  const getFieldError = (name: string, value: string, isRequired: boolean) => {
    if (!touched[name]) return null;
    if (isRequired && (!value || value.trim() === '')) return 'Este campo es requerido';
    if (value && parseFloat(value) < 0) return 'No puede ser negativo';
    return null;
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-app-surface p-8 shadow-sm">
      <h3 className="text-xs font-bold tracking-[0.2em] text-gray-500 uppercase mb-6 flex items-center gap-2">
        <MaterialIcon icon="sell" className="w-4 h-4 text-app-text" />
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
                onBlur={handleBlur}
                className={`w-full pl-9 pr-4 py-3 bg-app-surface border ${getFieldError('precioUnitario', formData.precioUnitario, true) ? 'border-red-500' : 'border-gray-100'} rounded-xl focus:ring-2 focus:border-gray-200 shadow-sm`}
                required
              />
            </div>
            {getFieldError('precioUnitario', formData.precioUnitario, true) && (
              <p className="mt-1 text-xs text-red-500 font-bold">{getFieldError('precioUnitario', formData.precioUnitario, true)}</p>
            )}
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
                onBlur={handleBlur}
                className={`w-full pl-9 pr-4 py-3 bg-app-surface border ${getFieldError('precioMediaDocena', formData.precioMediaDocena, true) ? 'border-red-500' : 'border-gray-100'} rounded-xl focus:ring-2 focus:border-gray-200 shadow-sm`}
              />
            </div>
            {getFieldError('precioMediaDocena', formData.precioMediaDocena, true) && (
              <p className="mt-1 text-xs text-red-500 font-bold">{getFieldError('precioMediaDocena', formData.precioMediaDocena, true)}</p>
            )}
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
                onBlur={handleBlur}
                className={`w-full pl-9 pr-4 py-3 bg-app-surface border ${getFieldError('precioCuarto', formData.precioCuarto, true) ? 'border-red-500' : 'border-gray-100'} rounded-xl focus:ring-2 focus:border-gray-200 shadow-sm`}
              />
            </div>
            {getFieldError('precioCuarto', formData.precioCuarto, true) && (
              <p className="mt-1 text-xs text-red-500 font-bold">{getFieldError('precioCuarto', formData.precioCuarto, true)}</p>
            )}
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
                onBlur={handleBlur}
                className={`w-full pl-9 pr-4 py-3 bg-app-surface border ${getFieldError('precioDocena', formData.precioDocena, true) ? 'border-red-500' : 'border-gray-100'} rounded-xl focus:ring-2 focus:border-gray-200 shadow-sm`}
              />
            </div>
            {getFieldError('precioDocena', formData.precioDocena, true) && (
              <p className="mt-1 text-xs text-red-500 font-bold">{getFieldError('precioDocena', formData.precioDocena, true)}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Precio por 12 unidades (docena completa)
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
