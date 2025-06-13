import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Package, Palette, Ruler, Check, Edit } from 'lucide-react';
import type { Producto } from '../../interfaces/Producto';
import type { Categoria } from '../../interfaces/Categoria';
import type { Proveedor } from '../../interfaces/Proveedor';
import type { Color } from '../../interfaces/Color';
import type { Talla } from '../../interfaces/Talla';
import { ProductoService } from '../../services/ProductoServices';
import { ColorService } from '../../services/ColorService';
import { TallaService } from '../../services/TallaService';

interface FormularioProductoProps {
  producto?: Producto | null;
  categorias: Categoria[];
  proveedores: Proveedor[];
  onClose: () => void;
  onProductoGuardado: () => void;
}

const FormularioProducto: React.FC<FormularioProductoProps> = ({
  producto,
  categorias,
  proveedores,
  onClose,
  onProductoGuardado
}) => {
  // Estados para el formulario principal
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
  
  // Estados para navegación por pestañas
  const [activeTab, setActiveTab] = useState<'producto' | 'colores' | 'tallas'>('producto');
  
  // Estados para colores
  const [colores, setColores] = useState<Color[]>([]);
  const [coloresDisponibles, setColoresDisponibles] = useState<Color[]>([]);
  const [nuevoColor, setNuevoColor] = useState({ nombre: '', codigoHex: '#000000' });
  const [showNuevoColor, setShowNuevoColor] = useState(false);
  const [editandoColor, setEditandoColor] = useState<number | null>(null);
  const [colorEditado, setColorEditado] = useState<Color>({ nombre: '', codigoHex: '#000000' });
    // Estados para tallas
  const [tallas, setTallas] = useState<Talla[]>([]);
  const [tallasDisponibles, setTallasDisponibles] = useState<Talla[]>([]);
  const [nuevaTalla, setNuevaTalla] = useState({ nombreTalla: '', descripcion: '', orden: 0 });
  const [showNuevaTalla, setShowNuevaTalla] = useState(false);
  const [editandoTalla, setEditandoTalla] = useState<number | null>(null);
  const [tallaEditada, setTallaEditada] = useState<Talla>({ nombreTalla: '', descripcion: '', orden: 0 });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    }
  };

    // Funciones de manejo de colores
  const agregarColor = async () => {
    try {
      if (!nuevoColor.nombre.trim()) return;
      
      const colorCreado = await ColorService.createColor(nuevoColor);
      setColoresDisponibles(prev => [...prev, colorCreado]);
      setColores(prev => [...prev, colorCreado]);
      setNuevoColor({ nombre: '', codigoHex: '#000000' });
      setShowNuevoColor(false);
    } catch (err) {
      console.error('Error al crear color:', err);
    }
  };

  const editarColor = async (id: number) => {
    try {
      const colorActualizado = await ColorService.updateColor(id, colorEditado);
      setColoresDisponibles(prev => 
        prev.map(c => c.idColor === id ? colorActualizado : c)
      );
      setColores(prev => 
        prev.map(c => c.idColor === id ? colorActualizado : c)
      );
      setEditandoColor(null);
    } catch (err) {
      console.error('Error al editar color:', err);
    }
  };

  const eliminarColor = async (id: number) => {
    try {
      await ColorService.deleteColor(id);
      setColoresDisponibles(prev => prev.filter(c => c.idColor !== id));
      setColores(prev => prev.filter(c => c.idColor !== id));
    } catch (err) {
      console.error('Error al eliminar color:', err);
    }
  };

  const agregarColorAProducto = (color: Color) => {
    if (!colores.find(c => c.idColor === color.idColor)) {
      setColores(prev => [...prev, color]);
    }
  };
  // Funciones de manejo de tallas
  const agregarTalla = async () => {
    try {
      if (!nuevaTalla.nombreTalla.trim()) return;
      
      const tallaCreada = await TallaService.createTalla(nuevaTalla);
      setTallasDisponibles(prev => [...prev, tallaCreada]);
      setTallas(prev => [...prev, tallaCreada]);
      setNuevaTalla({ nombreTalla: '', descripcion: '', orden: 0 });
      setShowNuevaTalla(false);
    } catch (err) {
      console.error('Error al crear talla:', err);
    }
  };

  const editarTalla = async (id: number) => {
    try {
      const tallaActualizada = await TallaService.updateTalla(id, tallaEditada);
      setTallasDisponibles(prev => 
        prev.map(t => t.idTalla === id ? tallaActualizada : t)
      );
      setTallas(prev => 
        prev.map(t => t.idTalla === id ? tallaActualizada : t)
      );
      setEditandoTalla(null);
    } catch (err) {
      console.error('Error al editar talla:', err);
    }
  };

  const eliminarTalla = async (id: number) => {
    try {
      await TallaService.deleteTalla(id);
      setTallasDisponibles(prev => prev.filter(t => t.idTalla !== id));
      setTallas(prev => prev.filter(t => t.idTalla !== id));
    } catch (err) {
      console.error('Error al eliminar talla:', err);
    }
  };

  const agregarTallaAProducto = (talla: Talla) => {
    if (!tallas.find(t => t.idTalla === talla.idTalla)) {
      setTallas(prev => [...prev, talla]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const categoria = categorias.find(c => c.idCategoria?.toString() === formData.categoriaId);
      const categoriaPadre = categorias.find(c => c.idCategoria?.toString() === formData.categoriaPadreId);
      const proveedor = proveedores.find(p => p.idProveedor?.toString() === formData.proveedorId);

      if (!categoria || !proveedor) {
        throw new Error('Categoría y proveedor son requeridos');
      }

      const productoData: Omit<Producto, 'idProducto'> = {
        codigoIdentificacion: formData.codigoIdentificacion,
        nombre: formData.nombre,
        descripcion: formData.descripcion || undefined,
        sexo: formData.sexo || undefined,
        categoria,
        categoriaPadre: categoriaPadre || null,
        marca: formData.marca || undefined,
        proveedor,
        cantidad: producto ? producto.cantidad : 0,
        precioUnitario: parseFloat(formData.precioUnitario),
        precioCuarto: formData.precioCuarto ? parseFloat(formData.precioCuarto) : undefined,
        precioMediaDocena: formData.precioMediaDocena ? parseFloat(formData.precioMediaDocena) : undefined,
        precioDocena: formData.precioDocena ? parseFloat(formData.precioDocena) : undefined
      };

      if (producto?.idProducto) {
        await ProductoService.updateProducto(producto.idProducto, { ...productoData, idProducto: producto.idProducto });
      } else {
        await ProductoService.createProducto(productoData);
      }

      onProductoGuardado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {producto ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navegación por pestañas */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('producto')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'producto'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              Producto
            </button>
            <button
              onClick={() => setActiveTab('colores')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'colores'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Palette className="w-4 h-4 inline mr-2" />
              Colores
            </button>
            <button
              onClick={() => setActiveTab('tallas')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tallas'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Ruler className="w-4 h-4 inline mr-2" />
              Tallas
            </button>
          </nav>
        </div>

        {/* Contenido de las pestañas */}
        <div className="p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Pestaña Producto */}
          {activeTab === 'producto' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código de Identificación *
                  </label>
                  <input
                    type="text"
                    name="codigoIdentificacion"
                    value={formData.codigoIdentificacion}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sexo
                  </label>
                  <select
                    name="sexo"
                    value={formData.sexo}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMENINO">Femenino</option>
                    <option value="UNISEX">Unisex</option>
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
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría *
                  </label>
                  <select
                    name="categoriaId"
                    value={formData.categoriaId}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin categoría padre...</option>
                    {categorias.map(categoria => (
                      <option key={categoria.idCategoria} value={categoria.idCategoria}>
                        {categoria.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proveedor *
                </label>
                <select
                  name="proveedorId"
                  value={formData.proveedorId}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map(proveedor => (
                    <option key={proveedor.idProveedor} value={proveedor.idProveedor}>
                      {proveedor.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio Unitario *
                  </label>
                  <input
                    type="number"
                    name="precioUnitario"
                    value={formData.precioUnitario}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio x 4
                  </label>
                  <input
                    type="number"
                    name="precioCuarto"
                    value={formData.precioCuarto}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio x 6
                  </label>
                  <input
                    type="number"
                    name="precioMediaDocena"
                    value={formData.precioMediaDocena}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio x 12
                  </label>
                  <input
                    type="number"
                    name="precioDocena"
                    value={formData.precioDocena}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </form>
          )}

          {/* Pestaña Colores */}
          {activeTab === 'colores' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Gestión de Colores</h3>
                <button
                  onClick={() => setShowNuevoColor(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo Color
                </button>
              </div>

              {/* Formulario nuevo color */}
              {showNuevoColor && (
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Crear Nuevo Color</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        value={nuevoColor.nombre}
                        onChange={(e) => setNuevoColor(prev => ({ ...prev, nombre: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ej: Rojo"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Código Hex
                      </label>
                      <input
                        type="color"
                        value={nuevoColor.codigoHex}
                        onChange={(e) => setNuevoColor(prev => ({ ...prev, codigoHex: e.target.value }))}
                        className="w-full h-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <button
                        onClick={agregarColor}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Guardar
                      </button>
                      <button
                        onClick={() => setShowNuevoColor(false)}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de colores disponibles */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Colores Disponibles</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {coloresDisponibles.map(color => (
                    <div
                      key={color.idColor}
                      className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      {editandoColor === color.idColor ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={colorEditado.nombre}
                            onChange={(e) => setColorEditado(prev => ({ ...prev, nombre: e.target.value }))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="color"
                            value={colorEditado.codigoHex}
                            onChange={(e) => setColorEditado(prev => ({ ...prev, codigoHex: e.target.value }))}
                            className="w-full h-8 border border-gray-300 rounded"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => editarColor(color.idColor!)}
                              className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditandoColor(null)}
                              className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 mb-2">
                            <div
                              className="w-6 h-6 rounded border border-gray-300"
                              style={{ backgroundColor: color.codigoHex }}
                            ></div>
                            <span className="font-medium text-gray-900">{color.nombre}</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => agregarColorAProducto(color)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                            >
                              Agregar
                            </button>
                            <button
                              onClick={() => {
                                setEditandoColor(color.idColor!);
                                setColorEditado(color);
                              }}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded text-xs"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => eliminarColor(color.idColor!)}
                              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Colores seleccionados para el producto */}
              {colores.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Colores del Producto</h4>
                  <div className="flex flex-wrap gap-2">
                    {colores.map(color => (
                      <div
                        key={color.idColor}
                        className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                      >
                        <div
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: color.codigoHex }}
                        ></div>
                        <span>{color.nombre}</span>
                        <button
                          onClick={() => setColores(prev => prev.filter(c => c.idColor !== color.idColor))}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pestaña Tallas */}
          {activeTab === 'tallas' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Gestión de Tallas</h3>
                <button
                  onClick={() => setShowNuevaTalla(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Talla
                </button>
              </div>

              {/* Formulario nueva talla */}
              {showNuevaTalla && (
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Crear Nueva Talla</h4>                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        value={nuevaTalla.nombreTalla}
                        onChange={(e) => setNuevaTalla(prev => ({ ...prev, nombreTalla: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ej: Mediano"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descripción
                      </label>
                      <input
                        type="text"
                        value={nuevaTalla.descripcion}
                        onChange={(e) => setNuevaTalla(prev => ({ ...prev, descripcion: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ej: M"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Orden
                      </label>
                      <input
                        type="number"
                        value={nuevaTalla.orden}
                        onChange={(e) => setNuevaTalla(prev => ({ ...prev, orden: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <button
                        onClick={agregarTalla}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Guardar
                      </button>
                      <button
                        onClick={() => setShowNuevaTalla(false)}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de tallas disponibles */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Tallas Disponibles</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tallasDisponibles.map(talla => (
                    <div
                      key={talla.idTalla}
                      className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >                      {editandoTalla === talla.idTalla ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={tallaEditada.nombreTalla}
                            onChange={(e) => setTallaEditada(prev => ({ ...prev, nombreTalla: e.target.value }))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="text"
                            value={tallaEditada.descripcion}
                            onChange={(e) => setTallaEditada(prev => ({ ...prev, descripcion: e.target.value }))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Descripción"
                          />
                          <input
                            type="number"
                            value={tallaEditada.orden}
                            onChange={(e) => setTallaEditada(prev => ({ ...prev, orden: parseInt(e.target.value) }))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            min="0"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => editarTalla(talla.idTalla!)}
                              className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditandoTalla(null)}
                              className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (                        <>
                          <div className="mb-2">
                            <span className="font-medium text-gray-900">{talla.nombreTalla}</span>
                            {talla.descripcion && (
                              <span className="text-gray-500 text-sm ml-2">({talla.descripcion})</span>
                            )}
                            {talla.orden !== undefined && (
                              <span className="text-gray-400 text-xs block">Orden: {talla.orden}</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => agregarTallaAProducto(talla)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                            >
                              Agregar
                            </button>
                            <button
                              onClick={() => {
                                setEditandoTalla(talla.idTalla!);
                                setTallaEditada(talla);
                              }}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded text-xs"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => eliminarTalla(talla.idTalla!)}
                              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tallas seleccionadas para el producto */}
              {tallas.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Tallas del Producto</h4>
                  <div className="flex flex-wrap gap-2">
                    {tallas.map(talla => (                      <div
                        key={talla.idTalla}
                        className="flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm"
                      >
                        <span>{talla.nombreTalla}</span>
                        {talla.descripcion && (
                          <span className="text-xs">({talla.descripcion})</span>
                        )}
                        <button
                          onClick={() => setTallas(prev => prev.filter(t => t.idTalla !== talla.idTalla))}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          {activeTab === 'producto' && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              {loading ? 'Guardando...' : 'Guardar Producto'}
            </button>
          )}
        </div>
      </div>    </div>
  );
};

export default FormularioProducto;
