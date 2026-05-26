import { useState } from 'react';
import { MaterialIcon } from '@/shared/ui';

const EstructuraJerarquiaInfo = () => {
  const [abierto, setAbierto] = useState(true);

  return (
    <div className="app-panel rounded-[1.5rem] border shadow-sm mb-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-gray-50/80 transition-all"
      >
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
          <MaterialIcon icon="help_outline" className="w-4 h-4" />
          ¿Cómo funciona la estructura?
        </span>
        <MaterialIcon
          icon="expand_more"
          className={`w-4 h-4 text-gray-400 transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>
      {abierto && (
        <div className="px-6 pb-5 pt-0 border-t border-gray-100 space-y-3">
          <p className="text-sm text-gray-600 leading-relaxed">
            Configure en tres pasos dónde puede guardarse el inventario. No necesita ver stock aquí; solo
            define la estructura física.
          </p>
          <ul className="space-y-2 text-sm text-gray-800">
            <li className="flex gap-3">
              <span className="shrink-0 w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-[10px] font-black">
                1
              </span>
              <span>
                <strong className="font-bold">Piso</strong> — nivel físico del local (ej. Piso 1, Almacén).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-[10px] font-black">
                2
              </span>
              <span>
                <strong className="font-bold">Sector</strong> — línea de catálogo (Damas, Caballeros, Niños…).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-[10px] font-black">
                3
              </span>
              <span>
                <strong className="font-bold">Ubicación</strong> — combinación piso + sector donde vive el
                stock. En el listado verá cada piso como sección y el sector en cada fila.
              </span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default EstructuraJerarquiaInfo;
