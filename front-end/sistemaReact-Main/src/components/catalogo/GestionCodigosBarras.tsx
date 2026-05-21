import React, { useState, useEffect } from 'react';
import { MaterialIcon } from '@/shared/ui';
import type { Producto } from '../../types/Producto';
import type { ProductoVariante } from '../../types/ProductoVariante';
import type { CodigoBarras, GenerarCodigoRequest, AsignarCodigoRequest } from '../../types/CodigoBarras';
import { CodigoBarrasService } from '../../services/CodigoBarrasService';
import { ProductoVarianteService } from '../../services/ProductoVarianteService';
import { ConfirmModal, TableSkeleton } from '@/shared/ui';

interface GestionCodigosBarrasProps {
  producto?: Producto;
  onClose?: () => void;
}

const GestionCodigosBarras: React.FC<GestionCodigosBarrasProps> = ({ 
  producto, 
  onClose 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  // Estados principales
  const [productos, setProductos] = useState<Producto[]>([]);
  const [variantes, setVariantes] = useState<ProductoVariante[]>([]);
  const [codigosBarras, setCodigosBarras] = useState<CodigoBarras[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para modales
  const [showGenerarCodigo, setShowGenerarCodigo] = useState(false);
  const [showAsignarCodigo, setShowAsignarCodigo] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [entidadSeleccionada, setEntidadSeleccionada] = useState<{
    id: number;
    tipo: 'PRODUCTO' | 'VARIANTE';
    nombre: string;
  } | null>(null);

  // Estados para formularios
  const [formGenerar, setFormGenerar] = useState({
    formato: 'EAN8' as 'EAN8' | 'EAN13' | 'CODE128'
  });

  const [formAsignar, setFormAsignar] = useState({
    codigo: '',
    formato: 'EAN8' as 'EAN8' | 'EAN13' | 'CODE128'
  });

  const [scannerInput, setScannerInput] = useState('');
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; codigoId: number | null }>({ open: false, codigoId: null });

  useEffect(() => {
    if (producto) {
      // Modo individual: gestionar códigos de un producto específico
      cargarDatosProducto();
    } else {
      // Modo general: gestionar códigos de todos los productos
      cargarTodosLosDatos();
    }
  }, [producto]);

  const cargarDatosProducto = async () => {
    if (!producto?.idProducto) return;

    try {
      setLoading(true);
      const [codigosData, variantesData] = await Promise.all([
        CodigoBarrasService.obtenerCodigosProducto(producto.idProducto),
        ProductoVarianteService.obtenerVariantesPorProducto(producto.idProducto)
      ]);

      // Obtener códigos de todas las variantes
      const codigosVariantes = await Promise.all(
        variantesData.map(async (variante) => {
          if (variante.idVariante) {
            return await CodigoBarrasService.obtenerCodigosVariante(variante.idVariante);
          }
          return [];
        })
      );

      const todosLosCodigos = [
        ...codigosData,
        ...codigosVariantes.flat()
      ];

      setCodigosBarras(todosLosCodigos);
      setVariantes(variantesData);
      setProductos([producto]);
    } catch (err) {
      setError('Error al cargar códigos de barras');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  const cargarTodosLosDatos = async () => {
    try {
      setLoading(true);
      console.log('🚀 Iniciando carga optimizada de códigos de barras...');
      
      // ===== MÉTODO OPTIMIZADO: UNA SOLA LLAMADA =====
      // Este método obtiene todos los datos en una sola consulta optimizada
      const codigosConDetallesData = await CodigoBarrasService.obtenerTodosConDetalles();
      
      console.log(`✅ Obtenidos ${codigosConDetallesData.length} códigos con detalles completos`);
      
      // Procesar los datos para extraer productos únicos y variantes
      const productosMap = new Map<number, Producto>();
      const variantesMap = new Map<number, ProductoVariante>();
      const codigosList: CodigoBarras[] = [];
      
      for (const codigoConDetalle of codigosConDetallesData) {
        // Extraer información del producto
        const productoInfo = codigoConDetalle.producto;
        if (!productosMap.has(productoInfo.idProducto)) {
          const producto: Producto = {
            idProducto: productoInfo.idProducto,
            codigoIdentificacion: productoInfo.codigoIdentificacion,
            nombre: productoInfo.nombre,
            descripcion: productoInfo.descripcion,
            marca: productoInfo.marca,
            sexo: productoInfo.sexo,
            tipoPublico: 'adulto', // Valor por defecto
            categoria: codigoConDetalle.categoria,
            subCategoria2: codigoConDetalle.categoria, // Usar la misma categoría como subcategoría
            proveedor: {
              ...codigoConDetalle.proveedor,
              ruc: '' // Campo requerido pero no disponible en este contexto
            },
            cantidad: 0, // Se calculará después
            precioUnitario: 0 // Información no disponible en este contexto
          };
          productosMap.set(productoInfo.idProducto, producto);
        }
        
        // Extraer información de la variante (si existe)
        if (codigoConDetalle.tipo === 'VARIANTE' && codigoConDetalle.variante) {
          const varianteInfo = codigoConDetalle.variante;
          if (!variantesMap.has(varianteInfo.idVariante)) {
            const variante: ProductoVariante = {
              idVariante: varianteInfo.idVariante,
              idProductoVariante: varianteInfo.idVariante, // Asumiendo que son iguales
              producto: productosMap.get(productoInfo.idProducto)!,
              talla: varianteInfo.talla,
              color: varianteInfo.color,
              cantidad: varianteInfo.cantidad,
              codigoBarrasVariante: varianteInfo.codigoBarrasVariante
            };
            variantesMap.set(varianteInfo.idVariante, variante);
          }
        }
        
        // Extraer información del código de barras
        const codigoBarras: CodigoBarras = {
          id: codigoConDetalle.id,
          codigo: codigoConDetalle.codigo,
          formato: codigoConDetalle.formato,
          tipo: codigoConDetalle.tipo,
          entidadId: codigoConDetalle.entidadId,
          fechaCreacion: codigoConDetalle.fechaCreacion,
          activo: codigoConDetalle.activo
        };
        codigosList.push(codigoBarras);
      }
      
      // Actualizar los estados
      setProductos(Array.from(productosMap.values()));
      setVariantes(Array.from(variantesMap.values()));
      setCodigosBarras(codigosList);
      
      console.log(`📊 Procesamiento completado:`, {
        productos: productosMap.size,
        variantes: variantesMap.size,
        codigos: codigosList.length
      });
      
    } catch (err: any) {
      console.error('❌ Error al cargar datos optimizados:', err);
      setError('Error al cargar códigos de barras: ' + (err.message ?? 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarCodigo = async () => {
    if (!entidadSeleccionada) return;

    try {
      setLoading(true);
      setError(null);

      const request: GenerarCodigoRequest = {
        tipo: entidadSeleccionada.tipo,
        entidadId: entidadSeleccionada.id,
        formato: formGenerar.formato
      };

      const nuevoCodigo = await CodigoBarrasService.generarCodigo(request);
      setCodigosBarras(prev => [...prev, nuevoCodigo]);
      setShowGenerarCodigo(false);
      setEntidadSeleccionada(null);
      setExito(`Código ${nuevoCodigo.codigo} generado exitosamente`);
      
      setTimeout(() => setExito(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar código');
    } finally {
      setLoading(false);
    }
  };

  const handleAsignarCodigo = async () => {
    if (!entidadSeleccionada || !formAsignar.codigo.trim()) return;

    try {
      setLoading(true);
      setError(null);

      // Validar formato
      if (!CodigoBarrasService.validarFormato(formAsignar.codigo, formAsignar.formato)) {
        throw new Error(`Código inválido para formato ${formAsignar.formato}`);
      }

      // Validar EAN-8 específicamente
      if (formAsignar.formato === 'EAN8' && !CodigoBarrasService.verificarEAN8(formAsignar.codigo)) {
        throw new Error('Código EAN-8 inválido (checksum incorrecto)');
      }

      const request: AsignarCodigoRequest = {
        codigo: formAsignar.codigo,
        tipo: entidadSeleccionada.tipo,
        entidadId: entidadSeleccionada.id,
        formato: formAsignar.formato
      };

      const nuevoCodigo = await CodigoBarrasService.asignarCodigo(request);
      setCodigosBarras(prev => [...prev, nuevoCodigo]);
      setShowAsignarCodigo(false);
      setEntidadSeleccionada(null);
      setFormAsignar({ codigo: '', formato: 'EAN8' });
      setExito(`Código ${nuevoCodigo.codigo} asignado exitosamente`);
      
      setTimeout(() => setExito(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar código');
    } finally {
      setLoading(false);
    }
  };

  const solicitarEliminarCodigo = (codigoId: number) => {
    setConfirmModal({ open: true, codigoId });
  };

  const confirmarEliminarCodigo = async () => {
    if (confirmModal.codigoId == null) return;

    try {
      await CodigoBarrasService.eliminarCodigo(confirmModal.codigoId);
      setCodigosBarras(prev => prev.filter(c => c.id !== confirmModal.codigoId));
      setExito('Código eliminado exitosamente');
      setTimeout(() => setExito(null), 3000);
    } catch (err: any) {
      console.error('Error al eliminar código:', err);
      setError('Error al eliminar código');
    } finally {
      setConfirmModal({ open: false, codigoId: null });
    }
  };

  const cancelarEliminarCodigo = () => {
    setConfirmModal({ open: false, codigoId: null });
  };

  const handleBuscarPorCodigo = async () => {
    if (!scannerInput.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const resultado = await CodigoBarrasService.buscarPorCodigo(scannerInput);
      
      // Mostrar resultado
      const mensaje = `Encontrado: ${resultado.tipo} - ${
        resultado.tipo === 'PRODUCTO' 
          ? resultado.entidad.nombre 
          : `${resultado.entidad.producto.nombre} (${resultado.entidad.talla.nombre} - ${resultado.entidad.color.nombre})`
      }`;
      
      setExito(mensaje);
      setTimeout(() => setExito(null), 5000);
      
      setScannerInput('');
      setShowScannerModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código no encontrado');
    } finally {
      setLoading(false);
    }
  };

  const generarEAN8Ejemplo = () => {
    const codigo = CodigoBarrasService.generarEAN8();
    setFormAsignar(prev => ({ ...prev, codigo }));
  };

  // Función para obtener las clases CSS del formato
  const getFormatoColorClass = (formato: string) => {
    switch (formato) {
      case 'EAN8':
        return 'bg-blue-100 text-blue-800';
      case 'EAN13':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-purple-100 text-purple-800';
    }
  };

  const codigosFiltrados = codigosBarras.filter(codigo => {
    const termino = searchTerm.toLowerCase();
    return codigo.codigo.toLowerCase().includes(termino) ||
           codigo.formato.toLowerCase().includes(termino) ||
           codigo.tipo.toLowerCase().includes(termino);
  });

  // Función para obtener el nombre de la entidad
  const obtenerNombreEntidad = (codigo: CodigoBarras) => {
    if (codigo.tipo === 'PRODUCTO') {
      const prod = productos.find(p => p.idProducto === codigo.entidadId);
      return prod?.nombre ?? 'Producto no encontrado';
    } else {
      const variante = variantes.find(v => v.idVariante === codigo.entidadId);
      if (variante) {
        return `${variante.producto.nombre} (${variante.talla.nombreTalla} - ${variante.color.nombre})`;
      }
      return 'Variante no encontrada';
    }
  };

  const renderContent = () => (
    <div className="space-y-6">
      {/* Alertas */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
          <MaterialIcon icon="error" className="w-4 h-4" />
          {error}
        </div>
      )}

      {exito && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center gap-2">
          <MaterialIcon icon="check_circle" className="w-4 h-4" />
          {exito}
        </div>
      )}

      {/* Herramientas */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1 flex">
            <input
              type="text"
              placeholder="Buscar códigos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg transition-colors">
              <MaterialIcon icon="search" className="w-4 h-4" />
            </button>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowScannerModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <MaterialIcon icon="qr_code_scanner" className="w-4 h-4" />
              Escanear
            </button>
          </div>
        </div>
      </div>

      {/* Lista de códigos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} columns={5} className="rounded-lg" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Formato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {codigosFiltrados.map((codigo) => (
                  <tr key={codigo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900">
                      {codigo.codigo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        getFormatoColorClass(codigo.formato)
                      }`}>
                        {codigo.formato}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        codigo.tipo === 'PRODUCTO' ? 'bg-orange-100 text-orange-800' : 'bg-cyan-100 text-cyan-800'
                      }`}>
                        {codigo.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {obtenerNombreEntidad(codigo)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => codigo.id && solicitarEliminarCodigo(codigo.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Eliminar"
                        >
                          <MaterialIcon icon="delete" className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {codigosFiltrados.length === 0 && (
              <div className="text-center py-12">
                <MaterialIcon icon="bar_chart" className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay códigos de barras</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'No se encontraron códigos que coincidan con la búsqueda.' : 'Comienza generando códigos para tus productos.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Panel lateral con productos/variantes disponibles */}
      {!producto && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-4">Asignar Códigos a Productos/Variantes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Productos</h4>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {productos.map(prod => (
                  <div key={prod.idProducto} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{prod.nombre}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEntidadSeleccionada({
                            id: prod.idProducto!,
                            tipo: 'PRODUCTO',
                            nombre: prod.nombre
                          });
                          setShowGenerarCodigo(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 border border-blue-300 rounded"
                      >
                        Generar
                      </button>
                      <button
                        onClick={() => {
                          setEntidadSeleccionada({
                            id: prod.idProducto!,
                            tipo: 'PRODUCTO',
                            nombre: prod.nombre
                          });
                          setShowAsignarCodigo(true);
                        }}
                        className="text-green-600 hover:text-green-800 text-xs px-2 py-1 border border-green-300 rounded"
                      >
                        Asignar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Si hay producto específico, mostrar como modal
  if (producto && onClose) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm w-full max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-10 py-7 border-b border-gray-50">
            <div>
              <h2 className="text-[1.5rem] font-bold tracking-tight text-black leading-none mb-1">
                Códigos de Barras
              </h2>
              <p className="text-gray-400 text-sm font-medium">{producto.nombre}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-[#f8f8f8] border border-gray-100 rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all"
            >
              <MaterialIcon icon="close" className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="p-8">
            {renderContent()}
          </div>
        </div>
      </div>
    );
  }

  // Vista independiente
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 pl-4">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Códigos de Barras</h1>
      </div>
      {renderContent()}

      {/* Modales */}
      {showGenerarCodigo && entidadSeleccionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm w-full max-w-md overflow-hidden animate-scaleIn">
            <div className="bg-black px-8 py-6 flex items-center justify-between">
              <div>
                <h3 className="text-[11px] font-bold tracking-[0.3em] text-white uppercase">Generar Código de Barras</h3>
                <p className="text-gray-400 text-[10px] font-medium uppercase tracking-widest mt-0.5">{entidadSeleccionada.nombre}</p>
              </div>
              <button onClick={() => setShowGenerarCodigo(false)} className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all">
                <MaterialIcon icon="close" className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="px-8 py-7 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">Tipo: {entidadSeleccionada.tipo}</label>
              </div>
              <div>
                <label htmlFor="generar-formato" className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">Formato</label>
                <select
                  id="generar-formato"
                  value={formGenerar.formato}
                  onChange={(e) => setFormGenerar(prev => ({ ...prev, formato: e.target.value as any }))}
                  className="w-full px-5 py-4 bg-[#f8f8f8] border-none rounded-[1.5rem] text-sm font-bold text-black focus:outline-none focus:ring-[4px] focus:ring-gray-100 shadow-inner"
                >
                  <option value="EAN8">EAN-8 (8 dígitos)</option>
                  <option value="EAN13">EAN-13 (13 dígitos)</option>
                  <option value="CODE128">CODE128 (alfanumérico)</option>
                </select>
              </div>
            </div>
            <div className="px-8 pb-8 flex gap-3">
              <button onClick={() => setShowGenerarCodigo(false)} className="flex-1 py-4 bg-[#f8f8f8] border border-gray-100 rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:bg-gray-100 transition-all">
                Cancelar
              </button>
              <button onClick={handleGenerarCodigo} disabled={loading} className="flex-1 py-4 bg-black text-white rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-gray-800 transition-all shadow-[0_8px_24px_rgba(0,0,0,0.15)] disabled:opacity-30">
                {loading ? 'Generando...' : 'Generar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAsignarCodigo && entidadSeleccionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm w-full max-w-md overflow-hidden animate-scaleIn">
            <div className="bg-black px-8 py-6 flex items-center justify-between">
              <div>
                <h3 className="text-[11px] font-bold tracking-[0.3em] text-white uppercase">Asignar Código de Barras</h3>
                <p className="text-gray-400 text-[10px] font-medium uppercase tracking-widest mt-0.5">{entidadSeleccionada.nombre}</p>
              </div>
              <button onClick={() => setShowAsignarCodigo(false)} className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all">
                <MaterialIcon icon="close" className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="px-8 py-7 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">Tipo: {entidadSeleccionada.tipo}</label>
              </div>
              <div>
                <label htmlFor="asignar-formato" className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">Formato</label>
                <select
                  id="asignar-formato"
                  value={formAsignar.formato}
                  onChange={(e) => setFormAsignar(prev => ({ ...prev, formato: e.target.value as any }))}
                  className="w-full px-5 py-4 bg-[#f8f8f8] border-none rounded-[1.5rem] text-sm font-bold text-black focus:outline-none focus:ring-[4px] focus:ring-gray-100 shadow-inner"
                >
                  <option value="EAN8">EAN-8 (8 dígitos)</option>
                  <option value="EAN13">EAN-13 (13 dígitos)</option>
                  <option value="CODE128">CODE128 (alfanumérico)</option>
                </select>
              </div>
              <div>
                <label htmlFor="asignar-codigo" className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">Código de Barras</label>
                <div className="flex gap-2">
                  <input
                    id="asignar-codigo"
                    type="text"
                    value={formAsignar.codigo}
                    onChange={(e) => setFormAsignar(prev => ({ ...prev, codigo: e.target.value }))}
                    placeholder="Ingresa el código"
                    className="flex-1 px-5 py-4 bg-[#f8f8f8] border-none rounded-[1.5rem] text-sm font-bold text-black focus:outline-none focus:ring-[4px] focus:ring-gray-100 shadow-inner"
                  />
                  {formAsignar.formato === 'EAN8' && (
                    <button onClick={generarEAN8Ejemplo} className="px-4 py-4 bg-[#f8f8f8] border border-gray-100 rounded-[1.5rem] text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-all" title="Generar EAN-8">
                      Gen
                    </button>
                  )}
                </div>
                {formAsignar.formato === 'EAN8' && (
                  <p className="text-[10px] text-gray-400 font-medium mt-2">EAN-8 debe tener exactamente 8 dígitos con checksum válido</p>
                )}
              </div>
            </div>
            <div className="px-8 pb-8 flex gap-3">
              <button onClick={() => setShowAsignarCodigo(false)} className="flex-1 py-4 bg-[#f8f8f8] border border-gray-100 rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:bg-gray-100 transition-all">
                Cancelar
              </button>
              <button onClick={handleAsignarCodigo} disabled={loading || !formAsignar.codigo.trim()} className="flex-1 py-4 bg-black text-white rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-gray-800 transition-all shadow-[0_8px_24px_rgba(0,0,0,0.15)] disabled:opacity-30">
                {loading ? 'Asignando...' : 'Asignar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showScannerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm w-full max-w-md overflow-hidden animate-scaleIn">
            <div className="bg-black px-8 py-6 flex items-center justify-between">
              <div>
                <h3 className="text-[11px] font-bold tracking-[0.3em] text-white uppercase">Escanear Código</h3>
                <p className="text-gray-400 text-[10px] font-medium uppercase tracking-widest mt-0.5">Ingrese o escanee un código de barras</p>
              </div>
              <button onClick={() => setShowScannerModal(false)} className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all">
                <MaterialIcon icon="close" className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="px-8 py-7">
              <label htmlFor="scanner-input" className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">Código de Barras</label>
              <input
                id="scanner-input"
                type="text"
                value={scannerInput}
                onChange={(e) => setScannerInput(e.target.value)}
                placeholder="Escanea o ingresa el código"
                autoFocus
                className="w-full px-5 py-4 bg-[#f8f8f8] border-none rounded-[1.5rem] text-sm font-bold text-black focus:outline-none focus:ring-[4px] focus:ring-gray-100 shadow-inner"
                onKeyDown={(e) => e.key === 'Enter' && handleBuscarPorCodigo()}
              />
            </div>
            <div className="px-8 pb-8 flex gap-3">
              <button onClick={() => setShowScannerModal(false)} className="flex-1 py-4 bg-[#f8f8f8] border border-gray-100 rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:bg-gray-100 transition-all">
                Cancelar
              </button>
              <button onClick={handleBuscarPorCodigo} disabled={loading || !scannerInput.trim()} className="flex-1 py-4 bg-black text-white rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-gray-800 transition-all shadow-[0_8px_24px_rgba(0,0,0,0.15)] disabled:opacity-30">
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal for Delete */}
      <ConfirmModal
        open={confirmModal.open}
        message="¿Estás seguro de eliminar este código de barras?"
        onConfirm={confirmarEliminarCodigo}
        onCancel={cancelarEliminarCodigo}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};

export default GestionCodigosBarras;
