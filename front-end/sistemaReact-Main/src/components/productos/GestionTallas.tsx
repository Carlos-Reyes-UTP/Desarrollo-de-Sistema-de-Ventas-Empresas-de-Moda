import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Save, X, Ruler, ArrowUp, ArrowDown } from 'lucide-react';
import type { Talla } from '../../interfaces/Talla';
import { TallaService } from '../../services/TallaService';

const GestionTallas: React.FC = () => {
  const [tallas, setTallas] = useState<Talla[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormulario, setShowFormulario] = useState(false);
  const [tallaEditar, setTallaEditar] = useState<Talla | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Formulario
  const [formData, setFormData] = useState({
    nombreTalla: '',
    descripcion: '',
    orden: ''
  });

  useEffect(() => {
    cargarTallas();
  }, []);

  const cargarTallas = async () => {
    try {
      setLoading(true);
      const data = await TallaService.getTallasOrdenadas();
      setTallas(data);
    } catch (err) {
      setError('Error al cargar tallas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = async () => {
    if (!searchTerm.trim()) {
      cargarTallas();
      return;
    }

    try {
      setLoading(true);
      const resultados = await TallaService.buscarTallas(searchTerm);
      setTallas(resultados);
    } catch (err) {
      setError('Error al buscar tallas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tallaData = {
        nombreTalla: formData.nombreTalla,
        descripcion: formData.descripcion || undefined,
        orden: formData.orden ? parseInt(formData.orden) : undefined
      };

      if (tallaEditar?.idTalla) {
        await TallaService.updateTalla(tallaEditar.idTalla, {
          ...tallaData,
          idTalla: tallaEditar.idTalla
        });
      } else {
        await TallaService.createTalla(tallaData);
      }
      
      setShowFormulario(false);
      setTallaEditar(null);
      setFormData({ nombreTalla: '', descripcion: '', orden: '' });
      cargarTallas();
    } catch (err) {
      setError('Error al guardar talla');
      console.error(err);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta talla?')) return;

    try {
      await TallaService.deleteTalla(id);
      cargarTallas();
    } catch (err) {
      setError('Error al eliminar talla');
      console.error(err);
    }
  };
  const handleEditar = (talla: Talla) => {
    setTallaEditar(talla);
    setFormData({
      nombreTalla: talla.nombreTalla,
      descripcion: talla.descripcion || '',
      orden: talla.orden?.toString() || ''
    });
    setShowFormulario(true);
  };
  const handleNuevo = () => {
    setTallaEditar(null);
    const siguienteOrden = Math.max(...tallas.map(t => t.orden || 0), 0) + 1;
    setFormData({ nombreTalla: '', descripcion: '', orden: siguienteOrden.toString() });
    setShowFormulario(true);
  };
  const tallasFiltradas = tallas.filter(talla =>
    talla.nombreTalla.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (talla.descripcion && talla.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
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
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Tallas</h1>
        <button
          onClick={handleNuevo}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva Talla
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
              placeholder="Buscar tallas..."
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
            Total: {tallasFiltradas.length} tallas
          </div>
        </div>
      </div>

      {/* Tabla de tallas */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orden
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tallasFiltradas.map((talla, index) => (
                <tr key={talla.idTalla} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {talla.orden || index + 1}
                      </span>
                      <div className="flex flex-col">                        <button
                          onClick={() => {
                            // Lógica para mover hacia arriba
                            console.log('Mover arriba:', talla.nombreTalla);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                          title="Mover arriba"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            // Lógica para mover hacia abajo
                            console.log('Mover abajo:', talla.nombreTalla);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                          title="Mover abajo"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </td>                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{talla.nombreTalla}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {talla.descripcion || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditar(talla)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => talla.idTalla && handleEliminar(talla.idTalla)}
                        className="text-red-600 hover:text-red-900 p-1 rounded"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tallasFiltradas.length === 0 && (
          <div className="text-center py-12">
            <Ruler className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay tallas</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No se encontraron tallas que coincidan con la búsqueda.' : 'Comienza creando una nueva talla.'}
            </p>
          </div>
        )}
      </div>

      {/* Modal Formulario */}
      {showFormulario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {tallaEditar ? 'Editar Talla' : 'Nueva Talla'}
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
                  Nombre de la Talla *
                </label>                <input
                  type="text"
                  value={formData.nombreTalla}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombreTalla: e.target.value }))}
                  required
                  placeholder="Ej: Extra Grande, 42, XL"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <input
                  type="text"
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Descripción adicional de la talla"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Información adicional sobre la talla
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Orden
                </label>
                <input
                  type="number"
                  value={formData.orden}
                  onChange={(e) => setFormData(prev => ({ ...prev, orden: e.target.value }))}
                  min="1"
                  placeholder="Orden de aparición (1, 2, 3...)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Determina el orden en que aparecen las tallas (menor número = primero)
                </p>
              </div>

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

export default GestionTallas;
