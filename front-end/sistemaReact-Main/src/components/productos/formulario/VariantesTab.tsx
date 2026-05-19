import React, { useState, useMemo } from 'react';
import { Building2, Info, Plus, Layers, Barcode, Trash, AlertCircle } from 'lucide-react';
import {
  mismoParTallaColor,
  nombresUnicosOrdenados,
} from '../../../utils/varianteCatalogoHelpers';
import type { AccesoAreaAlmacen } from '../../../types/AccesoAreaAlmacen';
import { SECTORES_ALMACEN_TEXTO } from '../../../shared/constants/sectoresAlmacen';

interface VarianteFormData {
  id?: number;
  nombreTalla: string;
  nombreColor: string;
  cantidad: number;
  stockAlmacen?: number;
  codigoIdentificacion: string;
}

interface VariantesTabProps {
  formData: {
    codigoIdentificacion: string;
    nombre: string;
  };
  variantes: VarianteFormData[];
  setVariantes: React.Dispatch<React.SetStateAction<VarianteFormData[]>>;
  
  // Lógica de área de almacén
  accesoAreaAlmacen: AccesoAreaAlmacen | null;
  cargandoContextoInventario?: boolean;
  errorContextoInventario?: string | null;
  etiquetaStockActiva: string;
  idAreaEntradaSupervisor: number | '';
  setIdAreaEntradaSupervisor: React.Dispatch<React.SetStateAction<number | ''>>;
  
  // Sugerencias para autocompletado
  sugerenciasTallas: string[];
  setSugerenciasTallas: React.Dispatch<React.SetStateAction<string[]>>;
  sugerenciasColores: string[];
  setSugerenciasColores: React.Dispatch<React.SetStateAction<string[]>>;
  
  // Handlers compartidos
  actualizarCantidadVariante: (index: number, cantidad: number) => void;
  eliminarVariante: (index: number) => void;
  generarCodigoBarrasVariante: (varianteId: number | undefined) => void;
  setError: (error: string | null) => void;
  loading: boolean;
  
  // Sincronización de formulario
  showFormularioVariante: boolean;
  setShowFormularioVariante: React.Dispatch<React.SetStateAction<boolean>>;
}

export const VariantesTab: React.FC<VariantesTabProps> = ({
  formData,
  variantes,
  setVariantes,
  accesoAreaAlmacen,
  errorContextoInventario = null,
  etiquetaStockActiva,
  idAreaEntradaSupervisor,
  setIdAreaEntradaSupervisor,
  sugerenciasTallas,
  setSugerenciasTallas,
  sugerenciasColores,
  setSugerenciasColores,
  actualizarCantidadVariante,
  eliminarVariante,
  generarCodigoBarrasVariante,
  setError,
  loading,
  showFormularioVariante,
  setShowFormularioVariante
}) => {
  const [modoFormulario, setModoFormulario] = useState<'simple' | 'optimizado'>('simple');
  
  // Formulario Variante Simple
  const [nuevaVariante, setNuevaVariante] = useState({
    nombreTalla: '',
    nombreColor: '',
    cantidad: 1,
    codigoIdentificacion: ''
  });

  // Formulario Variante Optimizado
  const [formularioOptimizado, setFormularioOptimizado] = useState<{
    nombreTalla: string;
    cantidadesPorColor: { [color: string]: number };
  }>({
    nombreTalla: '',
    cantidadesPorColor: {}
  });
  
  const [coloresExtraOptimizado, setColoresExtraOptimizado] = useState<string[]>([]);
  const [nuevoColorExtraInput, setNuevoColorExtraInput] = useState('');

  const coloresGridOptimizado = useMemo(
    () => nombresUnicosOrdenados([...sugerenciasColores, ...coloresExtraOptimizado]),
    [sugerenciasColores, coloresExtraOptimizado]
  );

  const cantidadTotal = variantes.reduce((total, variante) => total + (variante.stockAlmacen ?? variante.cantidad), 0);

  // Agregar variante en modo Simple
  const agregarVarianteSimple = () => {
    const nt = nuevaVariante.nombreTalla.trim();
    const nc = nuevaVariante.nombreColor.trim();
    if (!nt || !nc) {
      setError('Debe indicar talla y color para la variante');
      return;
    }

    const existeVariante = variantes.some((v) =>
      mismoParTallaColor(
        { nombreTalla: v.nombreTalla, nombreColor: v.nombreColor },
        { nombreTalla: nt, nombreColor: nc }
      )
    );

    if (existeVariante) {
      setError('Ya existe una variante con esta combinación de talla y color');
      return;
    }

    let codigoIdentificacion = nuevaVariante.codigoIdentificacion.trim();
    if (!codigoIdentificacion) {
      const codigoBase = formData.codigoIdentificacion || 'PROD';
      codigoIdentificacion = `${codigoBase}-${nt}-${nc}`;
    }

    const nuevaVarianteCompleta: VarianteFormData = {
      nombreTalla: nt,
      nombreColor: nc,
      cantidad: nuevaVariante.cantidad,
      stockAlmacen: nuevaVariante.cantidad,
      codigoIdentificacion
    };

    setVariantes(prev => [...prev, nuevaVarianteCompleta]);
    setNuevaVariante({
      nombreTalla: '',
      nombreColor: '',
      cantidad: 1,
      codigoIdentificacion: ''
    });
    setShowFormularioVariante(false);
    setError(null);
    setSugerenciasTallas((p) => nombresUnicosOrdenados([...p, nt]));
    setSugerenciasColores((p) => nombresUnicosOrdenados([...p, nc]));
  };

  // Agregar variante en modo Optimizado (matriz de colores)
  const agregarVariantesOptimizado = () => {
    const nt = formularioOptimizado.nombreTalla.trim();
    if (!nt) {
      setError('Debe indicar una talla');
      return;
    }

    const coloresConCantidad = Object.entries(formularioOptimizado.cantidadesPorColor)
      .filter(([, cantidad]) => cantidad > 0)
      .map(([nombreColor, cantidad]) => ({ nombreColor, cantidad }));

    if (coloresConCantidad.length === 0) {
      setError('Debe especificar al menos una cantidad mayor a 0 para algún color');
      return;
    }

    const nuevasVariantes: VarianteFormData[] = [];
    const errores: string[] = [];

    for (const { nombreColor, cantidad } of coloresConCantidad) {
      const nc = nombreColor.trim();
      if (!nc) continue;

      const existeVariante = variantes.some((v) =>
        mismoParTallaColor(
          { nombreTalla: v.nombreTalla, nombreColor: v.nombreColor },
          { nombreTalla: nt, nombreColor: nc }
        )
      );

      if (existeVariante) {
        errores.push(`Ya existe una variante para ${nt} - ${nc}`);
        continue;
      }

      const codigoBase = formData.codigoIdentificacion || 'PROD';
      const codigoIdentificacion = `${codigoBase}-${nt}-${nc}`;

      nuevasVariantes.push({
        nombreTalla: nt,
        nombreColor: nc,
        cantidad,
        stockAlmacen: cantidad,
        codigoIdentificacion
      });
    }

    if (errores.length > 0) {
      setError(errores.join(', '));
      return;
    }

    if (nuevasVariantes.length > 0) {
      setVariantes(prev => [...prev, ...nuevasVariantes]);
      setFormularioOptimizado({
        nombreTalla: '',
        cantidadesPorColor: {}
      });
      setColoresExtraOptimizado([]);
      setNuevoColorExtraInput('');
      setShowFormularioVariante(false);
      setError(null);
      setSugerenciasTallas((p) => nombresUnicosOrdenados([...p, nt]));
      for (const nv of nuevasVariantes) {
        setSugerenciasColores((p) => nombresUnicosOrdenados([...p, nv.nombreColor]));
      }
    }
  };

  const actualizarCantidadColor = (nombreColor: string, cantidad: number) => {
    setFormularioOptimizado(prev => ({
      ...prev,
      cantidadesPorColor: {
        ...prev.cantidadesPorColor,
        [nombreColor]: cantidad >= 0 ? cantidad : 0
      }
    }));
  };

  return (
    <div className="bg-gray-50 rounded-[1.5rem] p-8 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h3 className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">
          Gestión de Variantes
        </h3>
        
        <button
          type="button"
          onClick={() => {
            setShowFormularioVariante(!showFormularioVariante);
            setError(null);
          }}
          className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {showFormularioVariante ? 'Ocultar Formulario' : 'Agregar Variante'}
        </button>
      </div>

      {/* Control de Área de Almacén (Supervisor) */}
      {accesoAreaAlmacen?.puedeElegirAreaEntrada && (
        <div className="mb-6 p-5 bg-white border border-gray-100 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-5 h-5 text-gray-900" />
            <h4 className="text-sm font-semibold text-black uppercase tracking-wider">
              Área de Ingreso de Mercadería
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-2">
                Seleccione el área de stock <span className="text-red-500">*</span>
              </label>
              <select
                value={idAreaEntradaSupervisor}
                onChange={(e) => setIdAreaEntradaSupervisor(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm"
              >
                <option value="">-- Seleccionar área destino --</option>
                {accesoAreaAlmacen.areasAlmacen.map((a) => (
                  <option key={a.idUbicacionArea} value={a.idUbicacionArea}>
                    {a.descripcion ?? (a.area ? `${a.nombre} · ${a.area}` : a.nombre)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-start gap-2 text-xs text-gray-500 bg-[#f8f8f8] p-3 rounded-lg border border-gray-100">
              <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p>
                Como Supervisor de Almacén, debe indicar en qué sector ({SECTORES_ALMACEN_TEXTO}) se registrarán estas unidades de stock.
              </p>
            </div>
          </div>
        </div>
      )}

      {errorContextoInventario && (
        <div className="mb-6 p-4 bg-rose-50/60 border border-rose-100 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <p className="text-xs font-black uppercase tracking-widest text-rose-700">{errorContextoInventario}</p>
        </div>
      )}

      {/* Formulario para Agregar Variante */}
      {showFormularioVariante && (
        <div className="mb-8 p-6 border border-gray-100 rounded-[1.5rem] bg-white shadow-sm space-y-6">
          <div className="flex border-b border-gray-100 pb-3">
            <button
              type="button"
              onClick={() => setModoFormulario('simple')}
              className={`flex-1 pb-2 font-bold text-xs uppercase tracking-wider transition-colors ${
                modoFormulario === 'simple' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-900'
              }`}
            >
              Carga Simple
            </button>
            <button
              type="button"
              onClick={() => setModoFormulario('optimizado')}
              className={`flex-1 pb-2 font-bold text-xs uppercase tracking-wider transition-colors ${
                modoFormulario === 'optimizado' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-900'
              }`}
            >
              Carga Optimizada (Varios colores a la vez)
            </button>
          </div>

          {modoFormulario === 'simple' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-2">
                    Talla <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="sugerencias-tallas"
                    value={nuevaVariante.nombreTalla}
                    onChange={(e) => setNuevaVariante(prev => ({ ...prev, nombreTalla: e.target.value }))}
                    placeholder="Talla (S, M, L, 30, etc.)"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                  />
                  <datalist id="sugerencias-tallas">
                    {sugerenciasTallas.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-2">
                    Color <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="sugerencias-colores"
                    value={nuevaVariante.nombreColor}
                    onChange={(e) => setNuevaVariante(prev => ({ ...prev, nombreColor: e.target.value }))}
                    placeholder="Color (Rojo, Azul, etc.)"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                  />
                  <datalist id="sugerencias-colores">
                    {sugerenciasColores.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-2">
                    Cantidad Inicial
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={nuevaVariante.cantidad}
                    onChange={(e) => setNuevaVariante(prev => ({ ...prev, cantidad: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-2">
                    Código de barras específico
                  </label>
                  <input
                    type="text"
                    value={nuevaVariante.codigoIdentificacion}
                    onChange={(e) => setNuevaVariante(prev => ({ ...prev, codigoIdentificacion: e.target.value }))}
                    placeholder="Generar automático..."
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={agregarVarianteSimple}
                  className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                >
                  Agregar Variante
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-2">
                    Seleccione la Talla <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="sugerencias-tallas-opt"
                    value={formularioOptimizado.nombreTalla}
                    onChange={(e) => setFormularioOptimizado(prev => ({ ...prev, nombreTalla: e.target.value }))}
                    placeholder="Escriba o seleccione talla..."
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold uppercase"
                  />
                  <datalist id="sugerencias-tallas-opt">
                    {sugerenciasTallas.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
              </div>

              {formularioOptimizado.nombreTalla.trim() !== '' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Cantidades por color para talla {formularioOptimizado.nombreTalla.toUpperCase()}
                    </label>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      <input
                        type="text"
                        value={nuevoColorExtraInput}
                        onChange={(e) => setNuevoColorExtraInput(e.target.value)}
                        placeholder="Otro color (nombre)"
                        className="flex-1 min-w-[160px] px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const n = nuevoColorExtraInput.trim();
                          if (!n) return;
                          setColoresExtraOptimizado((prev) =>
                            prev.some((x) => x.toLowerCase() === n.toLowerCase()) ? prev : [...prev, n]
                          );
                          setNuevoColorExtraInput('');
                        }}
                        className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                      >
                        Añadir color
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {coloresGridOptimizado.map((nombreColor) => (
                        <div key={nombreColor} className="flex flex-col items-center p-3 border border-gray-100 rounded-xl bg-[#fafafa]">
                          <span className="text-sm font-medium text-gray-700 w-full text-center pb-1">{nombreColor}</span>
                          <input
                            type="number"
                            min="0"
                            value={formularioOptimizado.cantidadesPorColor[nombreColor] || 0}
                            onChange={(e) => actualizarCantidadColor(nombreColor, parseInt(e.target.value, 10) || 0)}
                            className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-center text-sm font-bold focus:ring-2 focus:ring-gray-200 focus:border-transparent transition-all"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center border-t border-gray-100">
                    <div className="text-sm text-gray-600">
                      Total de variantes: <span className="font-semibold">
                        {Object.values(formularioOptimizado.cantidadesPorColor).reduce((sum, qty) => sum + qty, 0)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={agregarVariantesOptimizado}
                      disabled={!formularioOptimizado.nombreTalla.trim() || Object.values(formularioOptimizado.cantidadesPorColor).every(qty => qty === 0)}
                      className="bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                    >
                      Agregar Variantes
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lista de variantes */}
      {variantes.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#fafafa]">
                <tr>
                  <th className="text-left py-3 px-4 text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">Talla</th>
                  <th className="text-left py-3 px-4 text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">Color</th>
                  <th className="text-center py-3 px-4 text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">
                    Stock ({etiquetaStockActiva})
                  </th>
                  <th className="text-left py-3 px-4 text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">Código</th>
                  <th className="text-center py-3 px-4 text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {variantes.map((variante, index) => (
                  <tr key={variante.id || `new-${variante.nombreTalla}-${variante.nombreColor}`} className="border-t border-gray-50 hover:bg-[#fafafa] transition-colors">
                    <td className="py-3 px-4 font-bold uppercase text-gray-750">
                      {variante.nombreTalla || 'N/A'}
                    </td>
                    <td className="py-3 px-4 uppercase text-gray-750">
                      {variante.nombreColor || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        min="1"
                        value={variante.stockAlmacen ?? variante.cantidad}
                        onChange={(e) => actualizarCantidadVariante(index, parseInt(e.target.value) || 1)}
                        className="w-20 px-2 py-1.5 bg-[#f8f8f8] border border-transparent rounded-lg text-center text-sm font-bold focus:ring-2 focus:ring-gray-200 transition-all"
                      />
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-600 font-mono">
                      {variante.codigoIdentificacion}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {variante.id ? (
                          <button
                            type="button"
                            onClick={() => generarCodigoBarrasVariante(variante.id)}
                            className="text-gray-400 hover:text-black p-1 rounded-full hover:bg-gray-100 transition-colors"
                            disabled={loading}
                            title="Ver código de barras"
                          >
                            <Barcode className="w-4 h-4" />
                          </button>
                        ) : (
                          <span 
                            className="text-xs text-gray-400 italic px-2 py-1" 
                            title="Guarda el producto para generar el código"
                          >
                            Pendiente
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => eliminarVariante(index)}
                          className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50"
                          title="Eliminar variante"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-[#fafafa] px-4 py-3 border-t border-gray-100">
            <div className="text-sm font-semibold text-gray-700 flex items-center justify-between">
              <span>Total de unidades: <span className="text-black font-bold">{cantidadTotal}</span></span>
              <span className="text-xs text-gray-500">
                {variantes.length === 1 ? '1 variante' : `${variantes.length} variantes`}
              </span>
            </div>
          </div>
        </div>
      )}

      {variantes.length === 0 && !showFormularioVariante && (
        <div className="text-center py-8 text-gray-500 bg-white border border-dashed border-gray-200 rounded-xl">
          <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="font-medium text-sm">No hay variantes agregadas</p>
          <p className="text-xs text-gray-400">Haz clic en "Agregar Variante" para comenzar</p>
        </div>
      )}
    </div>
  );
};
