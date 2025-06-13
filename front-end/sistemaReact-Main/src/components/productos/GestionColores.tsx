import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Save, X, Palette } from 'lucide-react';
import type { Color } from '../../interfaces/Color';
import { ColorService } from '../../services/ColorService';

const GestionColores: React.FC = () => {
  const [colores, setColores] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormulario, setShowFormulario] = useState(false);
  const [colorEditar, setColorEditar] = useState<Color | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Formulario
  const [formData, setFormData] = useState({
    nombre: '',
    codigoHex: ''
  });

  useEffect(() => {
    cargarColores();
  }, []);

  const cargarColores = async () => {
    try {
      setLoading(true);
      const data = await ColorService.getAllColores();
      setColores(data);
    } catch (err) {
      setError('Error al cargar colores');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = async () => {
    if (!searchTerm.trim()) {
      cargarColores();
      return;
    }

    try {
      setLoading(true);
      const resultados = await ColorService.buscarColores(searchTerm);
      setColores(resultados);
    } catch (err) {
      setError('Error al buscar colores');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (colorEditar?.idColor) {
        await ColorService.updateColor(colorEditar.idColor, {
          ...formData,
          idColor: colorEditar.idColor
        });
      } else {
        await ColorService.createColor(formData);
      }
      
      setShowFormulario(false);
      setColorEditar(null);
      setFormData({ nombre: '', codigoHex: '' });
      cargarColores();
    } catch (err) {
      setError('Error al guardar color');
      console.error(err);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este color?')) return;

    try {
      await ColorService.deleteColor(id);
      cargarColores();
    } catch (err) {
      setError('Error al eliminar color');
      console.error(err);
    }
  };

  const handleEditar = (color: Color) => {
    setColorEditar(color);
    setFormData({
      nombre: color.nombre,
      codigoHex: color.codigoHex || ''
    });
    setShowFormulario(true);
  };

  const handleNuevo = () => {
    setColorEditar(null);
    setFormData({ nombre: '', codigoHex: '' });
    setShowFormulario(true);
  };

  const coloresFiltrados = colores.filter(color =>
    color.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Colores</h1>
        <button
          onClick={handleNuevo}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Color
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Búsqueda */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 flex">
            <input
              type="text"
              placeholder="Buscar colores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleBuscar()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleBuscar}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
          <div className="text-sm text-gray-600 flex items-center">
            Total: {coloresFiltrados.length} colores
          </div>
        </div>
      </div>

      {/* Grid de colores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {coloresFiltrados.map((color) => (
          <div key={color.idColor} className="bg-white rounded-lg shadow-md p-4 border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {color.codigoHex && (
                  <div
                    className="w-8 h-8 rounded-full border-2 border-gray-300"
                    style={{ backgroundColor: color.codigoHex }}
                  />
                )}
                <div>
                  <h3 className="font-medium text-gray-900">{color.nombre}</h3>
                  {color.codigoHex && (
                    <p className="text-sm text-gray-500">{color.codigoHex}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => handleEditar(color)}
                className="text-blue-600 hover:text-blue-800 p-1 rounded"
                title="Editar"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => color.idColor && handleEliminar(color.idColor)}
                className="text-red-600 hover:text-red-800 p-1 rounded"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {coloresFiltrados.length === 0 && (
        <div className="text-center py-12">
          <Palette className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay colores</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'No se encontraron colores que coincidan con la búsqueda.' : 'Comienza creando un nuevo color.'}
          </p>
        </div>
      )}

      {/* Modal Formulario */}
      {showFormulario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {colorEditar ? 'Editar Color' : 'Nuevo Color'}
              </h2>
              <button
                onClick={() => setShowFormulario(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Color *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código Hexadecimal
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={formData.codigoHex}
                    onChange={(e) => setFormData(prev => ({ ...prev, codigoHex: e.target.value }))}
                    placeholder="#000000"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="color"
                    value={formData.codigoHex || '#000000'}
                    onChange={(e) => setFormData(prev => ({ ...prev, codigoHex: e.target.value }))}
                    className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Ejemplo: #FF0000 para rojo
                </p>
              </div>

              {/* Vista previa */}
              {formData.codigoHex && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-gray-300"
                    style={{ backgroundColor: formData.codigoHex }}
                  />
                  <span className="text-sm text-gray-700">
                    Vista previa: {formData.nombre || 'Sin nombre'}
                  </span>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowFormulario(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionColores;
