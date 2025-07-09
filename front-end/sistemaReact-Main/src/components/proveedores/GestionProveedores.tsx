import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Save, X, Building2, Users, Loader2 } from 'lucide-react';
import type { Proveedor } from '../../interfaces/Proveedor';
import { ProveedorService } from '../../services/ProveedorServices';

const GestionProveedores: React.FC = () => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormulario, setShowFormulario] = useState(false);
  const [cerrandoModal, setCerrandoModal] = useState(false);
  const [proveedorEditar, setProveedorEditar] = useState<Proveedor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buscandoProveedor, setBuscandoProveedor] = useState(false);

  // Formulario
  const [formData, setFormData] = useState({
    nombre: '',
    ruc: ''
  });

  // Paginación de proveedores
  const [paginaActual, setPaginaActual] = useState(1);
  const proveedoresPorPagina = 10;
  const totalPaginas = Math.ceil(proveedores.length / proveedoresPorPagina);

  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = async () => {
    try {
      setLoading(true);
      const data = await ProveedorService.obtenerTodosProveedores();
      setProveedores(data);
    } catch (err) {
      setError('Error al cargar proveedores');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Función para cerrar modal con animación
  const cerrarModalConAnimacion = () => {
    setCerrandoModal(true);
    setTimeout(() => {
      setShowFormulario(false);
      setCerrandoModal(false);
      // Limpiar el formulario
      setFormData({ nombre: '', ruc: '' });
      setProveedorEditar(null);
      setError(null);
    }, 300); // Duración de la animación
  };

  const handleBuscar = async () => {
    if (!searchTerm.trim()) {
      cargarProveedores();
      return;
    }

    try {
      setLoading(true);
      // Filtrar localmente ya que no hay endpoint de búsqueda específico
      const todosProveedores = await ProveedorService.obtenerTodosProveedores();
      const resultados = todosProveedores.filter(proveedor =>
        proveedor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proveedor.ruc.includes(searchTerm)
      );
      setProveedores(resultados);
    } catch (err) {
      setError('Error al buscar proveedores');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const verificarRUC = async () => {
    if (!formData.ruc.trim()) {
      setError('Ingrese un RUC para buscar');
      return;
    }
    
    // Validar formato RUC (11 dígitos)
    if (!/^\d{11}$/.test(formData.ruc)) {
      setError('El RUC debe tener 11 dígitos');
      return;
    }

    setError(null);
    setBuscandoProveedor(true);
    
    try {
      // Verificar si el proveedor ya existe
      const proveedoresExistentes = await ProveedorService.obtenerTodosProveedores();
      const existente = proveedoresExistentes.find(p => p.ruc === formData.ruc);
      
      if (existente) {
        setError(`El proveedor con RUC ${formData.ruc} ya existe como "${existente.nombre}"`);
        setBuscandoProveedor(false);
        return;
      }
      
      // Si no existe, buscar en la API externa
      try {
        const proveedorEncontrado = await ProveedorService.obtenerProveedorPorRUC(formData.ruc);
        
        if (proveedorEncontrado) {
          setFormData({
            ...formData,
            nombre: proveedorEncontrado.nombre
          });
          setError(null);
        } else {
          setError('No se encontró información del proveedor con este RUC');
        }
      } catch (err) {
        console.error('Error al buscar proveedor por RUC:', err);
        setError('Error al buscar información del proveedor');
      }
    } catch (err) {
      console.error('Error al verificar RUC:', err);
      setError('Error al verificar el RUC');
    } finally {
      setBuscandoProveedor(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }
    
    if (!formData.ruc.trim()) {
      setError('El RUC es requerido');
      return;
    }

    // Validar formato RUC (11 dígitos)
    if (!/^\d{11}$/.test(formData.ruc)) {
      setError('El RUC debe tener 11 dígitos');
      return;
    }

    try {
      // Si no estamos en modo edición, verificar que el RUC no esté ya registrado
      if (!proveedorEditar) {
        const proveedoresExistentes = await ProveedorService.obtenerTodosProveedores();
        const existente = proveedoresExistentes.find(p => p.ruc === formData.ruc);
        
        if (existente) {
          setError(`El proveedor con RUC ${formData.ruc} ya existe como "${existente.nombre}"`);
          return;
        }
      }

      if (proveedorEditar?.idProveedor) {
        await ProveedorService.actualizarProveedor(proveedorEditar.idProveedor, {
          ...formData,
          idProveedor: proveedorEditar.idProveedor
        });
      } else {
        await ProveedorService.crearProveedor(formData);
      }
      
      cerrarModalConAnimacion();
      cargarProveedores();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('Ya existe un proveedor con ese RUC');
      } else {
        setError('Error al guardar proveedor');
      }
      console.error(err);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;

    try {
      await ProveedorService.eliminarProveedor(id);
      cargarProveedores();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('No se puede eliminar el proveedor porque tiene productos asociados');
      } else {
        setError('Error al eliminar proveedor');
      }
      console.error(err);
    }
  };

  const handleEditar = (proveedor: Proveedor) => {
    setProveedorEditar(proveedor);
    setFormData({
      nombre: proveedor.nombre,
      ruc: proveedor.ruc // El RUC estará deshabilitado en modo edición
    });
    setShowFormulario(true);
    setError(null);
  };

  const handleNuevo = () => {
    setProveedorEditar(null);
    setFormData({ nombre: '', ruc: '' });
    setShowFormulario(true);
    setError(null);
  };

  const handleCancelar = () => {
    cerrarModalConAnimacion();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBuscar();
    }
  };

  // Resetear página al buscar o filtrar
  useEffect(() => {
    setPaginaActual(1);
  }, [searchTerm, loading]);

  // Proveedores a mostrar en la página actual
  const proveedoresPaginados = proveedores.slice(
    (paginaActual - 1) * proveedoresPorPagina,
    paginaActual * proveedoresPorPagina
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-3 rounded-lg">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Proveedores</h1>
            <p className="text-gray-600">Administra los proveedores de tu empresa</p>
          </div>
        </div>
        <button
          onClick={handleNuevo}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Proveedor
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o RUC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyPress}
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

      {/* Formulario Modal */}
      {showFormulario && (
        <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${cerrandoModal ? 'animate-fadeOut' : 'animate-fadeIn'}`}>
          <div className={`bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 ease-out ${cerrandoModal ? 'animate-scaleOut' : 'animate-scaleIn'}`}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  {proveedorEditar ? (
                    <Edit className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Building2 className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {proveedorEditar ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                </h2>
              </div>
              <button
                onClick={handleCancelar}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Mensaje de error dentro del modal */}
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}
              
              <div>
                <label htmlFor="ruc-input" className="block text-sm font-medium text-gray-700 mb-1">
                  RUC *
                </label>
                <div className="flex">
                  <input
                    id="ruc-input"
                    type="text"
                    value={formData.ruc}
                    onChange={(e) => {
                      // Solo permitir dígitos
                      if (e.target.value === '' || /^\d+$/.test(e.target.value)) {
                        setFormData({ ...formData, ruc: e.target.value });
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-l-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="12345678901"
                    maxLength={11}
                    disabled={!!proveedorEditar} // Deshabilitar en modo edición
                    required
                  />
                  {!proveedorEditar && (
                    <button
                      type="button"
                      onClick={verificarRUC}
                      disabled={buscandoProveedor || formData.ruc.length !== 11}
                      className="px-3 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-r-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center disabled:bg-blue-400"
                    >
                      {buscandoProveedor ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <Search className="w-4 h-4 mr-1" />
                      )}
                      Verificar
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Debe contener 11 dígitos</p>
              </div>

              <div>
                <label htmlFor="nombre-input" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  id="nombre-input"
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Nombre del proveedor"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCancelar}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {proveedorEditar ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla de proveedores */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading && (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Cargando proveedores...</p>
          </div>
        )}
        
        {!loading && proveedores.length === 0 && (
          <div className="p-8 text-center">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No se encontraron proveedores</p>
            <button
              onClick={handleNuevo}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear primer proveedor
            </button>
          </div>
        )}
        
        {!loading && proveedores.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RUC
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {proveedoresPaginados.map((proveedor) => (
                  <tr key={proveedor.idProveedor} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-2 rounded-lg mr-3">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {proveedor.nombre}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {proveedor.idProveedor}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">
                        {proveedor.ruc}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditar(proveedor)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="Editar proveedor"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEliminar(proveedor.idProveedor!)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Eliminar proveedor"
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
            <Users className="w-4 h-4" />
            <span className="text-sm">Total de proveedores: {proveedores.length}</span>
          </div>
          <div className="text-sm text-gray-500">
            Última actualización: {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestionProveedores;
