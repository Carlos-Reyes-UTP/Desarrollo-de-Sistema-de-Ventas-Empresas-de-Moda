import React from 'react';
import { MaterialIcon } from '@/shared/ui';

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

const COLOR_MAP: Record<string, string> = {
  NEGRO: '#1E1E1E',
  BLACK: '#1E1E1E',
  BLANCO: '#FFFFFF',
  WHITE: '#FFFFFF',
  PLOMO: '#8E8E93',
  GRIS: '#8E8E93',
  GREY: '#8E8E93',
  GRAY: '#8E8E93',
  ROJO: '#E53E3E',
  RED: '#E53E3E',
  AZUL: '#3182CE',
  BLUE: '#3182CE',
  MARINO: '#1A365D',
  NAVY: '#1A365D',
  BEIGE: '#F5F5DC',
  VERDE: '#38A169',
  GREEN: '#38A169',
  AMARILLO: '#ECC94B',
  YELLOW: '#ECC94B',
  ROSA: '#ED64A6',
  PINK: '#ED64A6',
  CELESTE: '#63B3ED',
  NARANJA: '#DD6B20',
  ORANGE: '#DD6B20',
  MORADO: '#805AD5',
  PURPLE: '#805AD5',
  FUXIA: '#D53F8C',
  FUCSIA: '#D53F8C',
  FUSHIA: '#D53F8C',
  CREMA: '#FFFDD0',
};

const ColorSwatch: React.FC<{ colorName: string; size?: string }> = ({ colorName, size = 'w-3.5 h-3.5' }) => {
  const nameUpper = colorName.toUpperCase().trim();
  const hexColor = COLOR_MAP[nameUpper] || null;

  if (hexColor) {
    return (
      <span
        className={`${size} rounded-full border border-gray-200 shadow-sm shrink-0 inline-block`}
        style={{
          backgroundColor: hexColor,
          boxShadow: nameUpper === 'BLANCO' ? 'inset 0 0 0 1px rgba(0,0,0,0.15)' : 'none',
        }}
        title={colorName}
      />
    );
  }

  return (
    <span
      className={`${size} rounded-full border border-gray-200 shadow-sm shrink-0 inline-flex items-center justify-center bg-gray-200`}
      title={colorName}
    >
      <MaterialIcon icon="palette" className="w-2.5 h-2.5 text-gray-500" />
    </span>
  );
};

/** Vista previa decorativa (Material Symbol, sin llamada al API) */
const BarcodePlaceholder: React.FC = () => (
  <MaterialIcon
    icon="barcode"
    className="w-[180px] h-14 text-black"
    aria-hidden
  />
);

interface EtiquetaPreviewCardProps {
  nombre: string;
  sku: string;
  talla: string;
  color: string;
  codigoNumerico: string;
}

const EtiquetaPreviewCard: React.FC<EtiquetaPreviewCardProps> = ({
  nombre,
  sku,
  talla,
  color,
  codigoNumerico,
}) => (
  <div className="bg-white rounded-xl p-4 border border-gray-200">
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 max-w-[280px] mx-auto text-center space-y-3">
      <h5 className="font-bold text-sm text-black leading-tight">{nombre}</h5>
      <p className="text-xs font-semibold text-gray-500">SKU: {sku}</p>
      <div className="h-px bg-gray-200" />
      <p className="text-xs text-gray-600">
        Talla: {talla} | Color: {color}
      </p>
      <div className="pt-2 flex flex-col items-center gap-2">
        <BarcodePlaceholder />
        <p className="text-[10px] font-mono font-semibold text-gray-800 tracking-wider">
          {codigoNumerico}
        </p>
      </div>
    </div>
  </div>
);

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
  loading,
}) => {
  const primeraVariante = variantes[0];
  const previewTalla = primeraVariante?.nombreTalla || '—';
  const previewColor = primeraVariante?.nombreColor || '—';
  const previewCodigo =
    primeraVariante?.codigoIdentificacion?.trim() || '7501234567890';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Columna izquierda: estructura + vista previa */}
        <div className="space-y-5">
          <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white rounded-lg border border-gray-100">
                <MaterialIcon icon="label" className="w-4 h-4 text-black" />
              </div>
              <h4 className="text-sm font-bold text-black">
                Estructura de las etiquetas
              </h4>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Las etiquetas se generan automáticamente con el nombre del producto, el SKU y los atributos de cada variante (talla y color).
            </p>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                Vista previa de impresión
              </p>
              <EtiquetaPreviewCard
                nombre={formData.nombre || 'Nombre del producto'}
                sku={formData.codigoIdentificacion || 'SKU'}
                talla={previewTalla}
                color={previewColor}
                codigoNumerico={previewCodigo}
              />
            </div>
          </div>
        </div>

        {/* Columna derecha: lista, etiqueta generada o empty state */}
        <div className="min-h-[280px] flex flex-col">
          {varianteSeleccionada && codigoBarrasPreview ? (
            <div className="space-y-6 flex-1">
              {variantes.map((v) => {
                if (v.id !== varianteSeleccionada) return null;

                return (
                  <div key={v.id} className="space-y-5 animate-fadeIn">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">
                        Etiqueta generada
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setVarianteSeleccionada(null);
                          setCodigoBarrasPreview(null);
                        }}
                        className="text-xs font-bold text-gray-500 hover:text-black flex items-center gap-1 transition-colors"
                      >
                        <MaterialIcon icon="close" className="w-3.5 h-3.5" />
                        Volver a la lista
                      </button>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 max-w-[280px] mx-auto text-center space-y-3">
                        <h5 className="font-bold text-sm text-black leading-tight">
                          {formData.nombre}
                        </h5>
                        <p className="text-xs font-semibold text-gray-500">
                          SKU: {formData.codigoIdentificacion}
                        </p>
                        <div className="h-px bg-gray-200" />
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                          <span>Talla: {v.nombreTalla}</span>
                          <span className="text-gray-300">|</span>
                          <ColorSwatch colorName={v.nombreColor} />
                          <span>Color: {v.nombreColor}</span>
                        </div>
                        <div className="pt-2 flex flex-col items-center gap-2">
                          <img
                            src={codigoBarrasPreview}
                            alt="Código de barras"
                            className="max-w-full h-auto max-h-28 object-contain"
                          />
                          <p className="text-[10px] font-mono font-semibold text-gray-800 tracking-wider">
                            {v.codigoIdentificacion}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 justify-center flex-wrap">
                      <button
                        type="button"
                        onClick={descargarCodigoBarrasVariante}
                        className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-200 ease-in-out shadow-md flex items-center gap-2"
                      >
                        <MaterialIcon icon="download" className="w-4 h-4" />
                        Descargar PNG
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVarianteSeleccionada(null);
                          setCodigoBarrasPreview(null);
                        }}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : variantes.length > 0 ? (
            <div className="space-y-4 flex-1">
              <span className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase block">
                Seleccione variante para generar código
              </span>
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                {variantes.map((variante, index) => {
                  if (!variante.id) return null;

                  const tallaNombre = variante.nombreTalla;
                  const colorNombre = variante.nombreColor;

                  return (
                    <button
                      key={variante.id || index}
                      type="button"
                      onClick={() => generarCodigoBarrasVariante(variante.id)}
                      className="flex items-center justify-between w-full p-4 rounded-xl border border-gray-100 bg-white hover:border-black hover:shadow-sm transition-all text-left group"
                      disabled={loading}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <ColorSwatch colorName={colorNombre} size="w-4 h-4" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-black bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                              T/{tallaNombre}
                            </span>
                            <span className="text-xs font-bold text-gray-800 uppercase">
                              {colorNombre}
                            </span>
                          </div>
                          <p className="text-[9px] font-medium text-gray-500 truncate max-w-md mt-1.5">
                            {formData.nombre} [{formData.codigoIdentificacion}] — T/{tallaNombre} — {colorNombre}
                          </p>
                        </div>
                      </div>
                      <MaterialIcon
                        icon="barcode"
                        className="w-5 h-5 text-gray-300 group-hover:text-black transition-colors shrink-0"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-white rounded-2xl border border-dashed border-gray-200 flex-1 min-h-[280px]">
              <div className="relative w-20 h-20 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-5">
                <MaterialIcon icon="inventory_2" className="w-10 h-10 text-gray-300" />
                <span className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                  <MaterialIcon icon="add" className="w-4 h-4 text-gray-500" />
                </span>
              </div>
              <p className="font-bold text-sm text-gray-900 mb-2">
                Sin variantes cargadas
              </p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mb-6 leading-relaxed">
                Para generar etiquetas y códigos de barras, primero configure las tallas y colores del producto.
              </p>
              <button
                type="button"
                onClick={() => {
                  setTabActiva('variantes');
                  setShowFormularioVariante(true);
                }}
                className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-200 ease-in-out shadow-md flex items-center gap-2"
              >
                <MaterialIcon icon="grid_view" className="w-4 h-4" />
                Ir a tallas y colores
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
