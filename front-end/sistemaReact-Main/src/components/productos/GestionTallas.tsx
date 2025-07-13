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
    descripcion: ''
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
      setFormData({ nombreTalla: '', descripcion: '' });
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
        descripcion: formData.descripcion || undefined
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
      descripcion: talla.descripcion || ''
    });
    setShowFormulario(true);
  };
  const handleNuevo = () => {
    setTallaEditar(null);
    setFormData({ nombreTalla: '', descripcion: '' });
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
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex items-center gap-3 pl-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Ruler className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Tallas</h1>
              <p className="text-sm text-gray-600 mt-1">Administra las tallas de tu inventario</p>
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
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Contenedor principal con sombra y barra de búsqueda igual a colores */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          {/* Barra de búsqueda */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
              />
            </div>
          </div>
          {/* Tabla de tallas igual a colores */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Talla</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tallasPaginadas.length === 0 && !loading && (
                  <tr>
                    <td colSpan={3} className="text-center p-12">
                      <Ruler className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron tallas</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {searchTerm ? 'Intenta con otra búsqueda o limpia el filtro.' : '¡Comienza añadiendo tu primera talla!'}
                      </p>
                    </td>
                  </tr>
                )}
                {tallasPaginadas.map((talla) => (
                  <tr key={talla.idTalla} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-2 rounded-lg mr-3">
                          <Ruler className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{talla.nombreTalla}</div>
                          <div className="text-sm text-gray-500">ID: {talla.idTalla}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{talla.descripcion || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditar(talla)}
                          className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-100 transition-colors"
                          title="Editar talla"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => talla.idTalla && handleEliminar(talla.idTalla)}
                          className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-100 transition-colors"
                          title="Eliminar talla"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginación igual a colores */}
        {totalPaginas > 1 && (
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mt-6 px-4 py-3 bg-gray-50 border-t border-gray-200 sm:px-6 rounded-b-lg shadow-sm border-x border-b">
              <div className="text-sm text-gray-600">
                Mostrando {((paginaActual - 1) * tallasPorPagina) + 1}
                -{Math.min(paginaActual * tallasPorPagina, tallasFiltradas.length)}
                {' '}de {tallasFiltradas.length} tallas
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
                  disabled={paginaActual === 1}
                  className={`flex items-center justify-center h-9 px-4 rounded-md border border-gray-300 text-gray-500 bg-white hover:bg-gray-100 transition-colors disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed`}
                  aria-label="Anterior"
                >
                  Anterior
                </button>
                {(() => {
                  let pages: (number | string)[] = [];
                  if (totalPaginas <= 5) {
                    pages = Array.from({ length: totalPaginas }, (_, i) => i + 1);
                  } else {
                    pages.push(1);
                    let rangeStart = Math.max(2, paginaActual - 2);
                    let rangeEnd = Math.min(totalPaginas - 1, paginaActual + 2);
                    if (paginaActual <= 3) {
                      rangeStart = 2;
                      rangeEnd = 5;
                    } else if (paginaActual >= totalPaginas - 2) {
                      rangeStart = totalPaginas - 4;
                      rangeEnd = totalPaginas - 1;
                    }
                    if (rangeStart > 2) pages.push('...');
                    for (let i = rangeStart; i <= rangeEnd; i++) {
                      pages.push(i);
                    }
                    if (rangeEnd < totalPaginas - 1) pages.push('...');
                    pages.push(totalPaginas);
                  }
                  return pages.map((num, idx) =>
                    typeof num === 'number' ? (
                      <button
                        key={num}
                        onClick={() => setPaginaActual(num)}
                        className={`flex items-center justify-center h-9 w-9 rounded-md border text-sm font-medium transition-colors ${paginaActual === num ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'}`}
                        aria-current={paginaActual === num ? 'page' : undefined}
                      >
                        {num}
                      </button>
                    ) : (
                      <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 select-none text-base">...</span>
                    )
                  );
                })()}
                <button
                  onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))}
                  disabled={paginaActual === totalPaginas}
                  className={`flex items-center justify-center h-9 px-4 rounded-md border border-gray-300 text-gray-500 bg-white hover:bg-gray-100 transition-colors disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed`}
                  aria-label="Siguiente"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Formulario igual a colores, pero mantiene animación e iconos */}
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
                <label htmlFor="nombreTalla" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la Talla *
                </label>
                <input
                  id="nombreTalla"
                  type="text"
                  value={formData.nombreTalla}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombreTalla: e.target.value }))}
                  required
                  placeholder="Ej: Extra Grande, 42, XL"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <input
                  id="descripcion"
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
