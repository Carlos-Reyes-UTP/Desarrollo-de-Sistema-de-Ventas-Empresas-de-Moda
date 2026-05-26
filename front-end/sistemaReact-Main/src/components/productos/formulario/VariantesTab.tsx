import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppSelect, MaterialIcon } from '@/shared/ui';
import { aplicarMatrizAlVariantes } from '../../../utils/aplicarMatrizVariantes';
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

// Mapa de colores en español e inglés para Swatches premium
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
  CAFE: '#6F4E37',
  VINO: '#722F37',
  DORADO: '#D4AF37',
};

const PLANTILLAS_TALLAS = {
  letras: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  numerosRopa: ['28', '30', '32', '34', '36', '38', '40', '42'],
  unica: ['UNICA'],
} as const;

export const ColorSwatch: React.FC<{ colorName: string; size?: string }> = ({ colorName, size = 'w-4 h-4' }) => {
  const nameUpper = colorName.toUpperCase().trim();
  const hexColor = COLOR_MAP[nameUpper] || null;

  if (hexColor) {
    return (
      <span
        className={`${size} rounded-full border border-gray-250 shadow-sm shrink-0 inline-block`}
        style={{ 
          backgroundColor: hexColor,
          boxShadow: nameUpper === 'BLANCO' ? 'inset 0 0 0 1px rgba(0,0,0,0.15)' : 'none' 
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

const PLANTILLA_ICONOS: Record<keyof typeof PLANTILLAS_TALLAS, string> = {
  letras: 'format_size',
  numerosRopa: 'numbers',
  unica: 'block',
};

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
  const [modoFormulario, setModoFormulario] = useState<'simple' | 'matriz'>('matriz');

  const coloresRapidos = [
    'NEGRO', 'BLANCO', 'PLOMO', 'ROJO', 'AZUL', 'MARINO', 'BEIGE', 'VERDE', 'CAFE', 'VINO', 'DORADO',
  ];

  const [tallasSeleccionadas, setTallasSeleccionadas] = useState<string[]>(() => {
    const t = variantes.map((v) => v.nombreTalla.toUpperCase().trim()).filter(Boolean);
    return nombresUnicosOrdenados(t);
  });

  const [coloresSeleccionados, setColoresSeleccionados] = useState<string[]>(() => {
    const c = variantes.map((v) => v.nombreColor.toUpperCase().trim()).filter(Boolean);
    return nombresUnicosOrdenados(c);
  });

  const aplicarPlantillaTallas = (tallas: readonly string[]) => {
    setTallasSeleccionadas((prev) => nombresUnicosOrdenados([...prev, ...tallas]));
  };

  const haAutoAbiertoSinVariantes = useRef(false);
  useEffect(() => {
    if (variantes.length > 0) {
      haAutoAbiertoSinVariantes.current = false;
      return;
    }
    if (!haAutoAbiertoSinVariantes.current) {
      setShowFormularioVariante(true);
      haAutoAbiertoSinVariantes.current = true;
    }
  }, [variantes.length, setShowFormularioVariante]);

  // Matriz 2D de stocks
  const [matrixStocks, setMatrixStocks] = useState<Record<string, Record<string, number>>>(() => {
    const initial: Record<string, Record<string, number>> = {};
    variantes.forEach((v) => {
      const t = v.nombreTalla.toUpperCase().trim();
      const c = v.nombreColor.toUpperCase().trim();
      if (!initial[t]) initial[t] = {};
      initial[t][c] = v.stockAlmacen ?? v.cantidad;
    });
    return initial;
  });

  // Input manual para nuevas dimensiones
  const [nuevaTallaInput, setNuevaTallaInput] = useState('');
  const [nuevoColorInput, setNuevoColorInput] = useState('');
  const [bulkValue, setBulkValue] = useState<number | ''>('');

  // Formulario Variante Simple
  const [nuevaVarianteSimple, setNuevaVarianteSimple] = useState({
    nombreTalla: '',
    nombreColor: '',
    cantidad: 1,
    codigoIdentificacion: ''
  });

  const [mensajeMatriz, setMensajeMatriz] = useState<{
    tipo: 'success' | 'error';
    texto: string;
  } | null>(null);
  const listaCombinacionesRef = useRef<HTMLDivElement>(null);

  const cantidadTotal = variantes.reduce((total, variante) => total + (variante.stockAlmacen ?? variante.cantidad), 0);

  // Sincronizar desde variantes del producto para mantener pre-existencias frescas
  useEffect(() => {
    setMatrixStocks((prev) => {
      const next = { ...prev };
      variantes.forEach((v) => {
        const t = v.nombreTalla.toUpperCase().trim();
        const c = v.nombreColor.toUpperCase().trim();
        if (!next[t]) next[t] = {};
        if (next[t][c] === undefined || next[t][c] === 0) {
          next[t][c] = v.stockAlmacen ?? v.cantidad;
        }
      });
      return next;
    });
  }, [variantes]);

  // Manejar cambio en celdas de la Matriz 2D
  const handleCellChange = (talla: string, color: string, value: string) => {
    const num = value === '' ? 0 : parseInt(value, 10);
    setMatrixStocks((prev) => ({
      ...prev,
      [talla]: {
        ...prev[talla],
        [color]: num >= 0 ? num : 0
      }
    }));
  };

  // Keyboard navigation Excel Style
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    tallaIndex: number,
    colorIndex: number
  ) => {
    let targetTallaIndex = tallaIndex;
    let targetColorIndex = colorIndex;

    if (e.key === 'ArrowUp') {
      targetTallaIndex = tallaIndex - 1;
    } else if (e.key === 'ArrowDown') {
      targetTallaIndex = tallaIndex + 1;
    } else if (e.key === 'ArrowLeft') {
      targetColorIndex = colorIndex - 1;
    } else if (e.key === 'ArrowRight') {
      targetColorIndex = colorIndex + 1;
    } else {
      return; // No interrumpir otras teclas
    }

    if (
      targetTallaIndex >= 0 &&
      targetTallaIndex < tallasSeleccionadas.length &&
      targetColorIndex >= 0 &&
      targetColorIndex < coloresSeleccionados.length
    ) {
      e.preventDefault();
      const nextInput = document.getElementById(`cell-${targetTallaIndex}-${targetColorIndex}`) as HTMLInputElement | null;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  // Bulk Actions
  const llenarTodaLaMatriz = () => {
    if (bulkValue === '') return;
    const val = Number(bulkValue);
    setMatrixStocks((prev) => {
      const next = { ...prev };
      tallasSeleccionadas.forEach((t) => {
        if (!next[t]) next[t] = {};
        coloresSeleccionados.forEach((c) => {
          next[t][c] = val;
        });
      });
      return next;
    });
    setBulkValue('');
  };

  const llenarFila = (talla: string) => {
    const primerColor = coloresSeleccionados[0];
    if (!primerColor) return;
    const valor = matrixStocks[talla]?.[primerColor] ?? 0;
    setMatrixStocks((prev) => {
      const next = { ...prev };
      if (!next[talla]) next[talla] = {};
      coloresSeleccionados.forEach((c) => {
        next[talla][c] = valor;
      });
      return next;
    });
  };

  const copiarFilaAbajo = (tallaActual: string, tallaSiguiente: string) => {
    setMatrixStocks((prev) => {
      const next = { ...prev };
      next[tallaSiguiente] = { ...prev[tallaActual] };
      return next;
    });
  };

  // Toggles de selección rápida
  const toggleTallaSeleccionada = (talla: string) => {
    const t = talla.toUpperCase().trim();
    if (tallasSeleccionadas.includes(t)) {
      setTallasSeleccionadas((prev) => prev.filter((x) => x !== t));
    } else {
      setTallasSeleccionadas((prev) => nombresUnicosOrdenados([...prev, t]));
    }
  };

  const toggleColorSeleccionado = (color: string) => {
    const c = color.toUpperCase().trim();
    if (coloresSeleccionados.includes(c)) {
      setColoresSeleccionados((prev) => prev.filter((x) => x !== c));
    } else {
      setColoresSeleccionados((prev) => nombresUnicosOrdenados([...prev, c]));
    }
  };

  const agregarTallaManual = () => {
    const t = nuevaTallaInput.toUpperCase().trim();
    if (!t) return;
    if (!tallasSeleccionadas.includes(t)) {
      setTallasSeleccionadas((prev) => nombresUnicosOrdenados([...prev, t]));
    }
    setNuevaTallaInput('');
  };

  const agregarColorManual = () => {
    const c = nuevoColorInput.toUpperCase().trim();
    if (!c) return;
    if (!coloresSeleccionados.includes(c)) {
      setColoresSeleccionados((prev) => nombresUnicosOrdenados([...prev, c]));
    }
    setNuevoColorInput('');
  };

  // Validaciones y verificación de cambios pendientes en la matriz
  const variantesMatrizPendientes = useMemo(() => {
    let count = 0;
    tallasSeleccionadas.forEach((t) => {
      coloresSeleccionados.forEach((c) => {
        const val = matrixStocks[t]?.[c] ?? 0;
        if (val > 0) {
          const yaExiste = variantes.some(
            (v) => v.nombreTalla.toUpperCase().trim() === t &&
                   v.nombreColor.toUpperCase().trim() === c
          );
          if (!yaExiste) count++;
        }
      });
    });
    return count;
  }, [tallasSeleccionadas, coloresSeleccionados, matrixStocks, variantes]);

  // Aplicar matriz de stock al formulario
  const aplicarMatrizAlProducto = () => {
    setMensajeMatriz(null);

    if (tallasSeleccionadas.length === 0 || coloresSeleccionados.length === 0) {
      setError('Seleccione al menos una talla y un color antes de confirmar las combinaciones.');
      return;
    }

    const { variantes: nuevasVariantes, combinacionesAplicadas, celdasConStock } =
      aplicarMatrizAlVariantes(
        variantes,
        tallasSeleccionadas,
        coloresSeleccionados,
        matrixStocks,
        formData.codigoIdentificacion
      );

    if (celdasConStock === 0) {
      setError(
        'Indique cantidad mayor a 0 en al menos una celda de la cuadrícula, o use «Llenar todo» con una cantidad.'
      );
      setMensajeMatriz({
        tipo: 'error',
        texto: 'No se registró ninguna combinación: todas las celdas están en 0.',
      });
      return;
    }

    setVariantes(nuevasVariantes);
    setError(null);
    setMensajeMatriz({
      tipo: 'success',
      texto: `Se registraron ${combinacionesAplicadas} combinación${combinacionesAplicadas === 1 ? '' : 'es'} en el producto. Revise la lista abajo antes de crear el producto.`,
    });

    setSugerenciasTallas((prev) => nombresUnicosOrdenados([...prev, ...tallasSeleccionadas]));
    setSugerenciasColores((prev) => nombresUnicosOrdenados([...prev, ...coloresSeleccionados]));

    setShowFormularioVariante(false);

    requestAnimationFrame(() => {
      listaCombinacionesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  // Agregar variante en modo Simple
  const agregarVarianteSimple = () => {
    const nt = nuevaVarianteSimple.nombreTalla.toUpperCase().trim();
    const nc = nuevaVarianteSimple.nombreColor.toUpperCase().trim();
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

    let codigoIdentificacion = nuevaVarianteSimple.codigoIdentificacion.trim();
    if (!codigoIdentificacion) {
      const codigoBase = formData.codigoIdentificacion || 'PROD';
      codigoIdentificacion = `${codigoBase}-${nt}-${nc}`;
    }

    const nuevaVarianteCompleta: VarianteFormData = {
      nombreTalla: nt,
      nombreColor: nc,
      cantidad: nuevaVarianteSimple.cantidad,
      stockAlmacen: nuevaVarianteSimple.cantidad,
      codigoIdentificacion
    };

    setVariantes(prev => [...prev, nuevaVarianteCompleta]);
    setNuevaVarianteSimple({
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

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex items-start gap-3">
          <MaterialIcon icon="straighten" className="w-5 h-5 text-black mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-black mb-1">
              Tallas y colores
            </h3>
            <p className="text-xs text-gray-600">
              Cada combinación talla + color es un ítem en inventario con su propio stock.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowFormularioVariante(!showFormularioVariante);
            setError(null);
          }}
          className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-200 ease-in-out shadow-md flex items-center gap-2 shrink-0"
        >
          <MaterialIcon icon="add" className="w-4 h-4" />
          {showFormularioVariante ? 'Ocultar configuración' : 'Configurar tallas y colores'}
        </button>
      </div>

      <div className="mb-6 p-4 bg-white border border-gray-200 rounded-xl">
        <p className="text-[10px] font-bold text-gray-900 uppercase tracking-wider mb-3">
          Cómo funciona
        </p>
        <ol className="text-xs text-gray-700 space-y-2 list-decimal list-inside leading-relaxed">
          <li><span className="font-semibold">Define tallas</span> — letras, números o personalizadas</li>
          <li><span className="font-semibold">Define colores</span> — elige o escribe los que uses</li>
          <li><span className="font-semibold">Indica stock</span> en la cuadrícula y pulsa <span className="font-semibold">Confirmar combinaciones</span></li>
        </ol>
      </div>

      {/* Control de Área de Almacén (Supervisor) */}
      {accesoAreaAlmacen?.puedeElegirAreaEntrada && (
        <div className="mb-6 p-6 bg-slate-50/70 border border-slate-100 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <MaterialIcon icon="corporate_fare" className="w-5 h-5 text-black" />
            <h4 className="text-xs font-bold text-black uppercase tracking-wider">
              Área de Ingreso de Mercadería
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-2">
                Seleccione el área de stock <span className="text-red-500">*</span>
              </label>
              <AppSelect
                value={idAreaEntradaSupervisor}
                onChange={(v) =>
                  setIdAreaEntradaSupervisor(v === '' ? '' : Number(v))
                }
                placeholder="Seleccionar área destino"
                options={accesoAreaAlmacen.areasAlmacen.map((a) => ({
                  value: a.idUbicacionArea,
                  label:
                    a.descripcion ?? (a.area ? `${a.nombre} · ${a.area}` : a.nombre),
                }))}
              />
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-white p-4 rounded-xl border border-slate-100">
              <MaterialIcon icon="info" className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="leading-relaxed">
                Como Supervisor de Almacén, debe indicar en qué sector ({SECTORES_ALMACEN_TEXTO}) se registrarán estas unidades de stock.
              </p>
            </div>
          </div>
        </div>
      )}

      {mensajeMatriz && (
        <div
          className={`mb-6 p-4 rounded-2xl flex items-center gap-3 border ${
            mensajeMatriz.tipo === 'success'
              ? 'bg-emerald-50/80 border-emerald-100'
              : 'bg-rose-50/60 border-rose-100'
          }`}
        >
          <MaterialIcon
            icon={mensajeMatriz.tipo === 'success' ? 'check_circle' : 'error'}
            className={`w-5 h-5 shrink-0 ${
              mensajeMatriz.tipo === 'success' ? 'text-emerald-600' : 'text-rose-500'
            }`}
          />
          <p
            className={`text-xs font-bold leading-relaxed ${
              mensajeMatriz.tipo === 'success' ? 'text-emerald-800' : 'text-rose-700'
            }`}
          >
            {mensajeMatriz.texto}
          </p>
        </div>
      )}

      {errorContextoInventario && (
        <div className="mb-6 p-4 bg-rose-50/60 border border-rose-100 rounded-2xl flex items-center gap-3">
          <MaterialIcon icon="error" className="w-5 h-5 text-rose-500 shrink-0" />
          <p className="text-xs font-black uppercase tracking-widest text-rose-700">{errorContextoInventario}</p>
        </div>
      )}

      {/* Formulario para Agregar Variante (Wizard / Matriz / Simple) */}
      {showFormularioVariante && (
        <div className="mb-8 p-6 border border-slate-100 rounded-3xl bg-slate-50/50 shadow-sm space-y-6">
          <div className="flex border-b border-slate-100 pb-3 gap-2">
            <button
              type="button"
              onClick={() => setModoFormulario('matriz')}
              className={`flex-1 pb-3 font-bold text-[11px] uppercase tracking-[0.12em] transition-all flex flex-col items-center justify-center gap-0.5 ${
                modoFormulario === 'matriz' ? 'text-black border-b-2 border-black' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <span className="flex items-center gap-2">
              <MaterialIcon icon="grid_on" className="w-4 h-4" />
              Cuadrícula de stock
              </span>
              <span className="text-[9px] font-medium normal-case tracking-normal text-slate-500">
                Ideal para muchas combinaciones
              </span>
            </button>
            <button
              type="button"
              onClick={() => setModoFormulario('simple')}
              className={`flex-1 pb-3 font-bold text-[11px] uppercase tracking-[0.12em] transition-all flex flex-col items-center justify-center gap-0.5 ${
                modoFormulario === 'simple' ? 'text-black border-b-2 border-black' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <MaterialIcon icon="add" className="w-4 h-4" />
                Agregar una combinación
              </span>
              <span className="text-[9px] font-medium normal-case tracking-normal text-slate-500">
                Ideal si son pocas
              </span>
            </button>
          </div>

          {modoFormulario === 'matriz' ? (
            <div className="space-y-6">
              {/* Sección 1: Selección de Tallas */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100/60 space-y-3.5">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <span className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
                    1. Configurar Tallas en la Matriz
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nueva talla (ej. 36)"
                      value={nuevaTallaInput}
                      onChange={(e) => setNuevaTallaInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarTallaManual())}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold w-36 uppercase outline-none focus:border-black transition-all"
                    />
                    <button
                      type="button"
                      onClick={agregarTallaManual}
                      className="bg-black hover:bg-gray-800 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider"
                    >
                      Añadir
                    </button>
                  </div>
                </div>

                {/* Tallas seleccionadas actuales */}
                <div className="flex flex-wrap gap-2 py-1">
                  {tallasSeleccionadas.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No hay tallas seleccionadas en la matriz</span>
                  ) : (
                    tallasSeleccionadas.map((talla) => (
                      <span
                        key={talla}
                        className="inline-flex items-center gap-1.5 bg-black text-white px-2.5 py-1 rounded-lg text-xs font-mono font-bold"
                      >
                        {talla}
                        <button
                          type="button"
                          onClick={() => toggleTallaSeleccionada(talla)}
                          className="hover:text-red-400 text-[10px] font-light transition-colors pl-0.5 border-l border-white/20"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Plantillas y tallas rápidas por grupo */}
                <div className="space-y-3 pt-2 border-t border-slate-50">
                  {(
                    [
                      { key: 'letras', label: 'Letras', tallas: PLANTILLAS_TALLAS.letras },
                      { key: 'numerosRopa', label: 'Números (ropa)', tallas: PLANTILLAS_TALLAS.numerosRopa },
                      { key: 'unica', label: 'Única', tallas: PLANTILLAS_TALLAS.unica },
                    ] as const
                  ).map(({ key, label, tallas }) => (
                    <div key={key} className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-gray-500 font-bold uppercase min-w-[100px]">
                          {label}:
                        </span>
                        <button
                          type="button"
                          onClick={() => aplicarPlantillaTallas(tallas)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-gray-100 border border-gray-200 text-gray-700 hover:bg-black hover:text-white hover:border-black transition-all duration-200 ease-in-out"
                        >
                          <MaterialIcon icon={PLANTILLA_ICONOS[key]} className="w-3 h-3" />
                          Usar plantilla
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pl-0 sm:pl-[108px]">
                        {tallas.map((t) => {
                          const isSel = tallasSeleccionadas.includes(t);
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => toggleTallaSeleccionada(t)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all border ${
                                isSel
                                  ? 'bg-slate-100 border-slate-300 text-black shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-black'
                              }`}
                            >
                              {isSel ? '✓ ' : ''}{t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-slate-400 italic pt-1">
                    También puede escribir cualquier talla arriba (2XL, 14, etc.).
                  </p>
                </div>
              </div>

              {/* Sección 2: Selección de Colores */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100/60 space-y-3.5">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <span className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
                    2. Configurar Colores en la Matriz
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nuevo color (ej. Fucsia)"
                      value={nuevoColorInput}
                      onChange={(e) => setNuevoColorInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarColorManual())}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold w-36 uppercase outline-none focus:border-black transition-all"
                    />
                    <button
                      type="button"
                      onClick={agregarColorManual}
                      className="bg-black hover:bg-gray-800 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider"
                    >
                      Añadir
                    </button>
                  </div>
                </div>

                {/* Colores seleccionados actuales */}
                <div className="flex flex-wrap gap-2 py-1">
                  {coloresSeleccionados.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No hay colores seleccionados en la matriz</span>
                  ) : (
                    coloresSeleccionados.map((color) => (
                      <span
                        key={color}
                        className="inline-flex items-center gap-2 bg-black text-white px-3 py-1 rounded-lg text-xs font-bold"
                      >
                        <ColorSwatch colorName={color} size="w-3 h-3" />
                        <span className="uppercase">{color}</span>
                        <button
                          type="button"
                          onClick={() => toggleColorSeleccionado(color)}
                          className="hover:text-red-400 text-[10px] font-light transition-colors pl-1 border-l border-white/20"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Colores Rápidos */}
                <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-50">
                  Puede escribir cualquier color; los chips son atajos.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Atajos:</span>
                  {coloresRapidos.map((c) => {
                    const isSel = coloresSeleccionados.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleColorSeleccionado(c)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                          isSel
                            ? 'bg-slate-100 border-slate-300 text-black shadow-sm'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-black'
                        }`}
                      >
                        <ColorSwatch colorName={c} size="w-2.5 h-2.5" />
                        <span>{c}</span>
                        {isSel && <span className="text-slate-650 ml-0.5">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Llenado Rápido General */}
              {tallasSeleccionadas.length > 0 && coloresSeleccionados.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    Autollenar toda la Matriz:
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Cant. (ej. 12)"
                    value={bulkValue}
                    onChange={(e) => setBulkValue(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-center text-xs font-mono font-bold focus:border-black outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={llenarTodaLaMatriz}
                    className="bg-black hover:bg-gray-800 text-white px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ease-in-out"
                  >
                    Llenar Todo
                  </button>
                </div>
              )}

              {/* Matriz 2D Real Grid */}
              {tallasSeleccionadas.length > 0 && coloresSeleccionados.length > 0 ? (
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          {/* Celda de Título de Esquina */}
                          <th className="p-3 text-center border-b border-r border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-450 min-w-[140px]">
                            TALLAS \ COLORES
                          </th>
                          {coloresSeleccionados.map((color) => (
                            <th
                              key={color}
                              className="p-3 text-center border-b border-slate-100 bg-slate-50/50 min-w-[100px]"
                            >
                              <div className="flex flex-col items-center gap-1.5">
                                <ColorSwatch colorName={color} size="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold text-slate-650 uppercase tracking-widest font-mono">
                                  {color}
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tallasSeleccionadas.map((talla, tIdx) => {
                          return (
                            <tr key={talla} className="hover:bg-slate-50/20 group transition-all">
                              {/* Fila Talla Header y Acciones Rápidas */}
                              <td className="p-3 border-r border-b border-slate-100 bg-slate-50/30 text-center font-mono font-bold text-xs uppercase text-slate-800">
                                <div className="flex items-center justify-between gap-2 px-1">
                                  <span className="text-sm font-black">{talla}</span>
                                  <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={() => llenarFila(talla)}
                                      className="p-1 rounded bg-white border border-slate-200 hover:border-black text-[9px] font-bold text-slate-600 hover:text-black uppercase shadow-xs"
                                      title="Llenar toda la fila con la cant. de la primera celda"
                                    >
                                      Fila
                                    </button>
                                    {tIdx < tallasSeleccionadas.length - 1 && (
                                      <button
                                        type="button"
                                        onClick={() => copiarFilaAbajo(talla, tallasSeleccionadas[tIdx + 1])}
                                        className="p-1 rounded bg-white border border-slate-200 hover:border-black text-[9px] text-slate-600 hover:text-black shadow-xs flex items-center"
                                        title={`Copiar fila abajo a ${tallasSeleccionadas[tIdx + 1]}`}
                                      >
                                        <MaterialIcon icon="content_copy" className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {coloresSeleccionados.map((color, cIdx) => {
                                const val = matrixStocks[talla]?.[color] ?? 0;
                                
                                // Determinar si la combinación de variante ya existía
                                const varExistente = variantes.find(
                                  (v) => v.nombreTalla.toUpperCase().trim() === talla &&
                                         v.nombreColor.toUpperCase().trim() === color
                                );
                                const esExistente = !!varExistente;
                                const stockBD = varExistente ? (varExistente.stockAlmacen ?? varExistente.cantidad) : 0;

                                // Determinar estilos dinámicos de inputs
                                let inputBgClass = 'bg-slate-50 border-slate-100 text-slate-400 focus:bg-white focus:border-black';
                                if (val > 0) {
                                  if (esExistente) {
                                    inputBgClass = 'bg-amber-50/50 border-amber-250 text-amber-900 font-black focus:ring-amber-500/20 focus:border-amber-400';
                                  } else {
                                    inputBgClass = 'bg-gray-100 border-gray-300 text-gray-900 font-black focus:ring-black/10 focus:border-black';
                                  }
                                }

                                return (
                                  <td
                                    key={color}
                                    className={`p-2 border-b border-slate-50 text-center transition-colors ${
                                      esExistente && val > 0 ? 'bg-amber-50/[0.08]' : ''
                                    }`}
                                  >
                                    <div className="flex flex-col items-center justify-center relative">
                                      <input
                                        id={`cell-${tIdx}-${cIdx}`}
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={val === 0 ? '' : val}
                                        onChange={(e) => handleCellChange(talla, color, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, tIdx, cIdx)}
                                        className={`w-full max-w-[80px] px-2.5 py-2.5 rounded-xl text-center text-sm border focus:ring-4 focus:outline-none focus:bg-white transition-all font-mono ${inputBgClass}`}
                                      />
                                      {esExistente && (
                                        <div className="text-[8px] font-bold text-amber-600 tracking-wide mt-1 uppercase">
                                          Stock: {stockBD}
                                        </div>
                                      )}
                                      {!esExistente && val > 0 && (
                                        <div className="text-[8px] font-bold text-gray-700 tracking-wide mt-1 uppercase">
                                          Nueva
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Acciones de sincronización de la matriz */}
                  <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-xs text-slate-500">
                      Variantes cargadas en matriz listos para sincronizar:{' '}
                      <span className="font-extrabold text-black font-mono">
                        {tallasSeleccionadas.length * coloresSeleccionados.length} combinaciones
                      </span>{' '}
                      {variantesMatrizPendientes > 0 && (
                        <span>
                          (
                          <span className="text-gray-800 font-extrabold font-mono">
                            +{variantesMatrizPendientes} nuevas
                          </span>
                          )
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={aplicarMatrizAlProducto}
                      className="px-6 py-3 rounded-xl bg-black hover:bg-gray-800 text-white font-bold text-xs uppercase tracking-widest transition-all duration-200 ease-in-out shadow-md active:scale-95"
                    >
                      Confirmar combinaciones
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-white border border-slate-100 rounded-3xl">
                  <MaterialIcon icon="layers" className="w-10 h-10 text-slate-300 mx-auto mb-3 animate-pulse" />
                  <p className="font-bold text-sm text-slate-800 mb-1">Configuración incompleta</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Seleccione al menos una talla y un color en las secciones de arriba para renderizar la cuadrícula interactiva.
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Carga Simple
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-2">
                    Talla <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="sugerencias-tallas"
                    value={nuevaVarianteSimple.nombreTalla}
                    onChange={(e) => setNuevaVarianteSimple(prev => ({ ...prev, nombreTalla: e.target.value }))}
                    placeholder="Talla (S, M, L, etc.)"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-black outline-none transition-all font-mono font-bold"
                  />
                  <datalist id="sugerencias-tallas">
                    {sugerenciasTallas.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-2">
                    Color <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="sugerencias-colores"
                    value={nuevaVarianteSimple.nombreColor}
                    onChange={(e) => setNuevaVarianteSimple(prev => ({ ...prev, nombreColor: e.target.value }))}
                    placeholder="Color (Rojo, Azul, etc.)"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-black outline-none transition-all uppercase font-bold"
                  />
                  <datalist id="sugerencias-colores">
                    {sugerenciasColores.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-2">
                    Cantidad Inicial
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={nuevaVarianteSimple.cantidad}
                    onChange={(e) => setNuevaVarianteSimple(prev => ({ ...prev, cantidad: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-black outline-none transition-all font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-2">
                    Código de barras específico
                  </label>
                  <input
                    type="text"
                    value={nuevaVarianteSimple.codigoIdentificacion}
                    onChange={(e) => setNuevaVarianteSimple(prev => ({ ...prev, codigoIdentificacion: e.target.value }))}
                    placeholder="Generar automático..."
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:border-black outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={agregarVarianteSimple}
                  className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                >
                  Agregar combinación
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lista total de combinaciones aplicadas */}
      {variantes.length > 0 && (
        <div
          ref={listaCombinacionesRef}
          id="combinaciones-registradas"
          className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.015)]"
        >
          <div className="px-5 py-3 border-b border-slate-50 bg-slate-50/50">
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Las combinaciones se guardan en el inventario al pulsar{' '}
              <span className="font-bold text-black">Crear producto</span> o{' '}
              <span className="font-bold text-black">Guardar cambios</span>.
              Los códigos de barras se generan después, en el paso{' '}
              <span className="font-bold text-black">Generar código de barras</span>.
            </p>
          </div>
          <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
            <h4 className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase">
              Combinaciones registradas
            </h4>
            <span className="text-[10px] font-bold bg-black text-white px-2 py-0.5 rounded-full font-mono">
              {variantes.length} {variantes.length === 1 ? 'combinación' : 'combinaciones'}
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/30 border-b border-slate-100">
                <tr>
                  <th className="text-left py-3.5 px-5 text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">Talla</th>
                  <th className="text-left py-3.5 px-5 text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">Color</th>
                  <th className="text-center py-3.5 px-5 text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
                    Stock ({etiquetaStockActiva})
                  </th>
                  <th className="text-left py-3.5 px-5 text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">Código Identificación</th>
                  <th className="text-center py-3.5 px-5 text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {variantes.map((variante, index) => (
                  <tr key={variante.id || `new-${variante.nombreTalla}-${variante.nombreColor}`} className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors">
                    <td className="py-4 px-5 font-mono font-black text-xs uppercase text-slate-800">
                      {variante.nombreTalla || 'N/A'}
                    </td>
                    <td className="py-4 px-5 uppercase text-slate-800">
                      <div className="flex items-center gap-2">
                        <ColorSwatch colorName={variante.nombreColor} size="w-3 h-3" />
                        <span className="font-medium text-xs">{variante.nombreColor || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <input
                        type="number"
                        min="1"
                        value={variante.stockAlmacen ?? variante.cantidad}
                        onChange={(e) => actualizarCantidadVariante(index, parseInt(e.target.value) || 1)}
                        className="w-20 px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-center text-sm font-mono font-bold focus:bg-white focus:border-black outline-none transition-all"
                      />
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-500 font-mono">
                      {variante.codigoIdentificacion}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {variante.id ? (
                          <button
                            type="button"
                            onClick={() => generarCodigoBarrasVariante(variante.id)}
                            className="text-slate-400 hover:text-black p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                            disabled={loading}
                            title="Ver código de barras"
                          >
                            <MaterialIcon icon="barcode" className="w-4 h-4" />
                          </button>
                        ) : (
                          <span 
                            className="text-[10px] font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full uppercase" 
                            title="Guarda el producto para generar el código"
                          >
                            Nueva
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => eliminarVariante(index)}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          title="Eliminar variante"
                        >
                          <MaterialIcon icon="delete" className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-slate-50/50 px-5 py-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              Total de unidades: <span className="text-black font-extrabold font-mono text-sm">{cantidadTotal}</span>
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              {variantes.length === 1 ? '1 combinación activa' : `${variantes.length} combinaciones activas`}
            </span>
          </div>
        </div>
      )}

      {variantes.length === 0 && !showFormularioVariante && (
        <div className="text-center py-12 text-slate-450 bg-white border border-dashed border-slate-200 rounded-3xl">
          <MaterialIcon icon="layers" className="w-10 h-10 text-slate-350 mx-auto mb-3" />
          <p className="font-extrabold text-sm text-slate-800">No hay combinaciones definidas</p>
          <p className="text-xs text-slate-450 mt-1 max-w-sm mx-auto">
            Pulsa &quot;Configurar tallas y colores&quot; para elegir tallas, colores y cantidades.
          </p>
        </div>
      )}
    </div>
  );
};
