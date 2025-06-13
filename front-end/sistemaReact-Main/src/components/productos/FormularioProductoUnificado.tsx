import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Package, Minus } from 'lucide-react';
import type { Producto } from '../../interfaces/Producto';
import type { Categoria } from '../../interfaces/Categoria';
import type { Proveedor } from '../../interfaces/Proveedor';
import type { Color } from '../../interfaces/Color';
import type { Talla } from '../../interfaces/Talla';
import type { ProductoVariante } from '../../interfaces/ProductoVariante';
import { ProductoService } from '../../services/ProductoServices';
import { ColorService } from '../../services/ColorService';
import { TallaService } from '../../services/TallaService';
import { ProductoVarianteService } from '../../services/ProductoVarianteService';

interface VarianteFormData {
  id?: number;
  tallaId: number;
  colorId: number;
  cantidad: number;
  codigoIdentificacion: string;
}

interface FormularioProductoUnificadoProps {
  producto?: Producto | null;
  categorias: Categoria[];
  proveedores: Proveedor[];
  onClose: () => void;
  onProductoGuardado: () => void;
}

const FormularioProductoUnificado: React.FC<FormularioProductoUnificadoProps> = ({
  producto,
  categorias,
  proveedores,
  onClose,
  onProductoGuardado
}) => {
  // Estados para el formulario principal del producto
  const [formData, setFormData] = useState({
    codigoIdentificacion: '',
    nombre: '',
    descripcion: '',
    sexo: '',
    categoriaId: '',
    categoriaPadreId: '',
    marca: '',
    proveedorId: '',
    precioUnitario: '',
    precioCuarto: '',
    precioMediaDocena: '',
    precioDocena: ''
  });

  // Estados para colores y tallas disponibles
  const [coloresDisponibles, setColoresDisponibles] = useState<Color[]>([]);
  const [tallasDisponibles, setTallasDisponibles] = useState<Talla[]>([]);

  // Estados para variantes
  const [variantes, setVariantes] = useState<VarianteFormData[]>([]);
  const [nuevaVariante, setNuevaVariante] = useState<Omit<VarianteFormData, 'id'>>({
    tallaId: 0,
    colorId: 0,
    cantidad: 1,
    codigoIdentificacion: ''
  });

  // Estados para gestión de formulario
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    cargarColoresYTallas();
  }, []);

  useEffect(() => {
    if (producto) {
      setFormData({
        codigoIdentificacion: producto.codigoIdentificacion,
        nombre: producto.nombre,
        descripcion: producto.descripcion || '',
        sexo: producto.sexo || '',
        categoriaId: producto.categoria.idCategoria?.toString() || '',
        categoriaPadreId: producto.categoriaPadre?.idCategoria?.toString() || '',
        marca: producto.marca || '',
        proveedorId: producto.proveedor.idProveedor?.toString() || '',
        precioUnitario: producto.precioUnitario.toString(),
        precioCuarto: producto.precioCuarto?.toString() || '',
        precioMediaDocena: producto.precioMediaDocena?.toString() || '',
        precioDocena: producto.precioDocena?.toString() || ''
      });
      
      // Cargar variantes existentes si estamos editando
      cargarVariantesExistentes();
    }
  }, [producto]);

  const cargarColoresYTallas = async () => {
    try {
      const [coloresData, tallasData] = await Promise.all([
        ColorService.getAllColores(),
        TallaService.getAllTallas()
      ]);
      setColoresDisponibles(coloresData);
      setTallasDisponibles(tallasData);
    } catch (err) {
      console.error('Error al cargar colores y tallas:', err);
      setError('Error al cargar colores y tallas disponibles');
    }
  };

  const cargarVariantesExistentes = async () => {
    if (!producto?.idProducto) return;
    
    try {
      const variantesExistentes = await ProductoVarianteService.obtenerVariantesPorProducto(producto.idProducto);
      const variantesFormData: VarianteFormData[] = variantesExistentes.map(v => ({
        id: v.idVariante,
        tallaId: v.talla.idTalla || 0,
        colorId: v.color.idColor || 0,
        cantidad: v.cantidad,
        codigoIdentificacion: v.codigoIdentificacion
      }));
      setVariantes(variantesFormData);
    } catch (err) {
      console.error('Error al cargar variantes existentes:', err);
    }
  };

  // Función para agregar nueva variante
  const agregarVariante = () => {
    if (nuevaVariante.tallaId === 0 || nuevaVariante.colorId === 0) {
      setError('Debe seleccionar una talla y un color');
      return;
    }

    // Verificar que no exista ya esta combinación
    const existeVariante = variantes.some(v => 
      v.tallaId === nuevaVariante.tallaId && v.colorId === nuevaVariante.colorId
    );

    if (existeVariante) {
      setError('Ya existe una variante con esta combinación de talla y color');
      return;
    }

    // Generar código automático si no se proporciona
    let codigoVariante = nuevaVariante.codigoIdentificacion;
    if (!codigoVariante) {
      const talla = tallasDisponibles.find(t => t.idTalla === nuevaVariante.tallaId);
      const color = coloresDisponibles.find(c => c.idColor === nuevaVariante.colorId);
      codigoVariante = `${formData.codigoIdentificacion}-${talla?.nombreTalla || 'T'}-${color?.nombre || 'C'}`;
    }

    const nuevaVarianteCompleta: VarianteFormData = {
      ...nuevaVariante,
      codigoIdentificacion: codigoVariante
    };

    setVariantes(prev => [...prev, nuevaVarianteCompleta]);
    setNuevaVariante({
      tallaId: 0,
      colorId: 0,
      cantidad: 1,
      codigoIdentificacion: ''
    });
    setError(null);
  };

  // Función para eliminar variante
  const eliminarVariante = (index: number) => {
    setVariantes(prev => prev.filter((_, i) => i !== index));
  };

  // Función para actualizar cantidad de variante
  const actualizarCantidadVariante = (index: number, cantidad: number) => {
    if (cantidad < 0) return;
    
    setVariantes(prev => prev.map((v, i) => 
      i === index ? { ...v, cantidad } : v
    ));
  };

  // Calcular cantidad total
  const cantidadTotal = variantes.reduce((total, v) => total + v.cantidad, 0);

  // Función para obtener nombre de talla
  const getNombreTalla = (tallaId: number) => {
    return tallasDisponibles.find(t => t.idTalla === tallaId)?.nombreTalla || 'N/A';
  };

  // Función para obtener color
  const getColor = (colorId: number) => {
    return coloresDisponibles.find(c => c.idColor === colorId);
  };

  // Manejar cambios en el formulario principal
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validaciones básicas
      if (!formData.nombre.trim()) {
        throw new Error('El nombre del producto es requerido');
      }

      if (!formData.codigoIdentificacion.trim()) {
        throw new Error('El código de identificación es requerido');
      }

      if (variantes.length === 0) {
        throw new Error('Debe agregar al menos una variante');
      }

      // Encontrar objetos de categorías y proveedor
      const categoria = categorias.find(c => c.idCategoria?.toString() === formData.categoriaId);
      const categoriaPadre = categorias.find(c => c.idCategoria?.toString() === formData.categoriaPadreId);
      const proveedor = proveedores.find(p => p.idProveedor?.toString() === formData.proveedorId);

      if (!categoria || !proveedor) {
        throw new Error('Debe seleccionar una categoría y un proveedor válidos');
      }      // Crear objeto producto
      const productoData: Omit<Producto, 'idProducto'> = {
        codigoIdentificacion: formData.codigoIdentificacion,
        nombre: formData.nombre,
        descripcion: formData.descripcion || undefined,
        sexo: formData.sexo || undefined,
        categoria,
        categoriaPadre: categoriaPadre || undefined,
        marca: formData.marca || undefined,
        proveedor,
        cantidad: cantidadTotal, // Use the calculated total from variants
        precioUnitario: parseFloat(formData.precioUnitario),
        precioCuarto: formData.precioCuarto ? parseFloat(formData.precioCuarto) : undefined,
        precioMediaDocena: formData.precioMediaDocena ? parseFloat(formData.precioMediaDocena) : undefined,
        precioDocena: formData.precioDocena ? parseFloat(formData.precioDocena) : undefined
      };

      let productoGuardado: Producto;

      // Crear o actualizar producto
      if (producto?.idProducto) {
        productoGuardado = await ProductoService.updateProducto(producto.idProducto, {
          ...productoData,
          idProducto: producto.idProducto
        });
      } else {
        productoGuardado = await ProductoService.createProducto(productoData);
      }

      // Procesar variantes
      if (productoGuardado.idProducto) {
        // Si estamos editando, eliminar variantes existentes que no están en la nueva lista
        if (producto?.idProducto) {
          const variantesExistentes = await ProductoVarianteService.obtenerVariantesPorProducto(producto.idProducto);
          
          for (const varianteExistente of variantesExistentes) {
            const sigueExistiendo = variantes.some(v => v.id === varianteExistente.idVariante);
            if (!sigueExistiendo && varianteExistente.idVariante) {
              await ProductoVarianteService.eliminarVariante(varianteExistente.idVariante);
            }
          }
        }

        // Crear o actualizar variantes
        for (const variante of variantes) {
          const talla = tallasDisponibles.find(t => t.idTalla === variante.tallaId);
          const color = coloresDisponibles.find(c => c.idColor === variante.colorId);

          if (!talla || !color) continue;

          const varianteData: Omit<ProductoVariante, 'idVariante'> = {
            producto: productoGuardado,
            talla,
            color,
            cantidad: variante.cantidad,
            codigoIdentificacion: variante.codigoIdentificacion
          };

          if (variante.id) {
            // Actualizar variante existente
            await ProductoVarianteService.actualizarVariante(variante.id, {
              ...varianteData,
              idVariante: variante.id
            });
          } else {
            // Crear nueva variante
            await ProductoVarianteService.crearVariante(varianteData);
          }
        }
      }

      onProductoGuardado();
      onClose();
    } catch (err: any) {
      console.error('Error al guardar producto:', err);
      setError(err.message || 'Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {producto ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica del producto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código de Identificación *
              </label>
              <input
                type="text"
                name="codigoIdentificacion"
                value={formData.codigoIdentificacion}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Producto *
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sexo
              </label>
              <select
                name="sexo"
                value={formData.sexo}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar...</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="U">Unisex</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marca
              </label>
              <input
                type="text"
                name="marca"
                value={formData.marca}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría *
              </label>
              <select
                name="categoriaId"
                value={formData.categoriaId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccionar categoría...</option>
                {categorias.map(categoria => (
                  <option key={categoria.idCategoria} value={categoria.idCategoria}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría Padre
              </label>
              <select
                name="categoriaPadreId"
                value={formData.categoriaPadreId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar categoría padre...</option>
                {categorias.map(categoria => (
                  <option key={categoria.idCategoria} value={categoria.idCategoria}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proveedor *
              </label>
              <select
                name="proveedorId"
                value={formData.proveedorId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccionar proveedor...</option>
                {proveedores.map(proveedor => (
                  <option key={proveedor.idProveedor} value={proveedor.idProveedor}>
                    {proveedor.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Unitario *
              </label>
              <input
                type="number"
                step="0.01"
                name="precioUnitario"
                value={formData.precioUnitario}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio por Cuarto
              </label>
              <input
                type="number"
                step="0.01"
                name="precioCuarto"
                value={formData.precioCuarto}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio por Media Docena
              </label>
              <input
                type="number"
                step="0.01"
                name="precioMediaDocena"
                value={formData.precioMediaDocena}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio por Docena
              </label>
              <input
                type="number"
                step="0.01"
                name="precioDocena"
                value={formData.precioDocena}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Sección de Variantes */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Variantes del Producto
            </h3>

            {/* Agregar nueva variante */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="text-md font-medium text-gray-700 mb-3">Agregar Nueva Variante</h4>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Talla
                  </label>
                  <select
                    value={nuevaVariante.tallaId}
                    onChange={(e) => setNuevaVariante(prev => ({ ...prev, tallaId: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>Seleccionar talla...</option>
                    {tallasDisponibles.map(talla => (
                      <option key={talla.idTalla} value={talla.idTalla}>
                        {talla.nombreTalla}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <select
                    value={nuevaVariante.colorId}
                    onChange={(e) => setNuevaVariante(prev => ({ ...prev, colorId: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>Seleccionar color...</option>
                    {coloresDisponibles.map(color => (
                      <option key={color.idColor} value={color.idColor}>
                        {color.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={nuevaVariante.cantidad}
                    onChange={(e) => setNuevaVariante(prev => ({ ...prev, cantidad: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código (opcional)
                  </label>
                  <input
                    type="text"
                    value={nuevaVariante.codigoIdentificacion}
                    onChange={(e) => setNuevaVariante(prev => ({ ...prev, codigoIdentificacion: e.target.value }))}
                    placeholder="Se generará automático"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <button
                    type="button"
                    onClick={agregarVariante}
                    className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de variantes */}
            {variantes.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-md font-medium text-gray-700">
                    Variantes Agregadas ({variantes.length})
                  </h4>
                  <div className="text-sm text-gray-600">
                    Cantidad Total: <span className="font-semibold">{cantidadTotal}</span>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Talla
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Color
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cantidad
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Código
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {variantes.map((variante, index) => {
                          const color = getColor(variante.colorId);
                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {getNombreTalla(variante.tallaId)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                <div className="flex items-center">
                                  <div
                                    className="w-4 h-4 rounded-full mr-2 border border-gray-300"
                                    style={{ backgroundColor: color?.codigoHex || '#000000' }}
                                  ></div>
                                  {color?.nombre || 'N/A'}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                <div className="flex items-center space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => actualizarCantidadVariante(index, variante.cantidad - 1)}
                                    className="text-gray-500 hover:text-gray-700"
                                    disabled={variante.cantidad <= 1}
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <span className="mx-2 min-w-[3ch] text-center">{variante.cantidad}</span>
                                  <button
                                    type="button"
                                    onClick={() => actualizarCantidadVariante(index, variante.cantidad + 1)}
                                    className="text-gray-500 hover:text-gray-700"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {variante.codigoIdentificacion}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                <button
                                  type="button"
                                  onClick={() => eliminarVariante(index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || variantes.length === 0}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {producto ? 'Actualizar' : 'Crear'} Producto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormularioProductoUnificado;
