import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Save, X, Ruler } from 'lucide-react';
import type { Talla } from '../../interfaces/Talla';
import { TallaService } from '../../services/TallaService';

const GestionTallas: React.FC = () => {
  const [tallas, setTallas] = useState<Talla[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormulario, setShowFormulario] = useState(false);
  const [cerrandoModal, setCerrandoModal] = useState(false);
  const [tallaEditar, setTallaEditar] = useState<Talla | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Formulario
  const [formData, setFormData] = useState({
    nombreTalla: '',
    descripcion: '',
    orden: ''
  });

  const tallasFiltradas = tallas.filter(talla =>
    talla.nombreTalla.toLowerCase().includes(searchTerm.toLowerCase()) ||
    talla.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginación de tallas
  const [paginaActual, setPaginaActual] = useState(1);
  const tallasPorPagina = 10;
  const totalPaginas = Math.ceil(tallasFiltradas.length / tallasPorPagina);

  useEffect(() => {
    cargarTallas();
  }, []);

  useEffect(() => {
    setPaginaActual(1);
  }, [searchTerm, loading]);

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

  const tallasPaginadas = tallasFiltradas.slice(
    (paginaActual - 1) * tallasPorPagina,
    paginaActual * tallasPorPagina
  );

  // Función para cerrar modal con animación
  const cerrarModalConAnimacion = () => {
    setCerrandoModal(true);
    setTimeout(() => {
      setShowFormulario(false);
      setCerrandoModal(false);
      // Limpiar el formulario
      setFormData({ nombreTalla: '', descripcion: '', orden: '' });
      setTallaEditar(null);
      setError(null);
    }, 300); // Duración de la animación
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
      
      cerrarModalConAnimacion();
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
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-3 rounded-lg">
            <Ruler className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Tallas</h1>
            <p className="text-gray-600">Administra las tallas de tu inventario</p>
          </div>
        </div>
        <button
          onClick={handleNuevo}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva Talla
        </button>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Barra de búsqueda */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar tallas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleBuscar}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Search className="w-4 h-4" />
            Buscar
          </button>
        </div>
      </div>

      {/* Tabla de tallas */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Cargando tallas...</p>
          </div>
        ) : tallasFiltradas.length === 0 ? (
          <div className="p-8 text-center">
            <Ruler className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No se encontraron tallas</p>
            <button
              onClick={handleNuevo}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear primera talla
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Talla
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tallasPaginadas.map((talla) => (
                <tr key={talla.idTalla} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-2 rounded-lg mr-3">
                        <Ruler className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {talla.nombreTalla}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {talla.idTalla}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {talla.descripcion || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditar(talla)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                        title="Editar talla"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => talla.idTalla && handleEliminar(talla.idTalla)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Eliminar talla"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Paginación visual igual a usuarios/productos/reportes */}
          {totalPaginas > 1 && (
            <div className="flex justify-center items-center gap-2 py-4 bg-white border-t border-gray-100">
              <button
                onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
                disabled={paginaActual === 1}
                className={`px-3 py-1 rounded-lg border text-sm font-medium transition-colors ${paginaActual === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-blue-50 text-blue-600 border-blue-200'}`}
              >
                Anterior
              </button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => setPaginaActual(num)}
                  className={`px-3 py-1 rounded-lg border text-sm font-medium transition-colors ${paginaActual === num ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-blue-50 text-blue-600 border-blue-200'}`}
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))}
                disabled={paginaActual === totalPaginas}
                className={`px-3 py-1 rounded-lg border text-sm font-medium transition-colors ${paginaActual === totalPaginas ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-blue-50 text-blue-600 border-blue-200'}`}
              >
                Siguiente
              </button>
            </div>
          )}
          </div>
        )}
      </div>

      {/* Estadísticas */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <Ruler className="w-4 h-4" />
            <span className="text-sm">Total de tallas: {tallasFiltradas.length}</span>
          </div>
          <div className="text-sm text-gray-500">
            Última actualización: {new Date().toLocaleString()}
          </div>
        </div>
      </div>

      {/* Modal Formulario */}
      {showFormulario && (
        <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 ${cerrandoModal ? 'animate-fadeOut' : 'animate-fadeIn'}`}>
          <div className={`bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 ease-out ${cerrandoModal ? 'animate-scaleOut' : 'animate-scaleIn'}`}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  {tallaEditar ? (
                    <Edit className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Ruler className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {tallaEditar ? 'Editar Talla' : 'Nueva Talla'}
                </h2>
              </div>
              <button
                onClick={() => cerrarModalConAnimacion()}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la Talla *
                </label>
                <input
                  type="text"
                  value={formData.nombreTalla}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombreTalla: e.target.value }))}
                  required
                  placeholder="Ej: Extra Grande, 42, XL"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Información adicional sobre la talla
                </p>
              </div>

              {/* Campo Orden eliminado */}

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => cerrarModalConAnimacion()}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {tallaEditar ? 'Actualizar' : 'Guardar'}
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
