import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Save, X, Building2, Users, Loader2 } from 'lucide-react';
import type { Proveedor } from '../../interfaces/Proveedor';
import { ProveedorService } from '../../services/ProveedorServices';

const GestionProveedores: React.FC = () => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedoresOriginal, setProveedoresOriginal] = useState<Proveedor[]>([]);
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
      setProveedoresOriginal(data);
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
    // Ya no se usa, la búsqueda es en tiempo real
    return;
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
    if (!searchTerm.trim()) {
      setProveedores(proveedoresOriginal);
    } else {
      const resultados = proveedoresOriginal.filter(proveedor =>
        proveedor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proveedor.ruc.includes(searchTerm)
      );
      setProveedores(resultados);
    }
  }, [searchTerm, proveedoresOriginal]);

  // Proveedores a mostrar en la página actual
  const proveedoresPaginados = proveedores.slice(
    (paginaActual - 1) * proveedoresPorPagina,
    paginaActual * proveedoresPorPagina
  );

  return (
    <div className="p-6 max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 pl-4">
          <div className="bg-indigo-100 p-3 rounded-lg">
            <Building2 className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Proveedores</h1>
            <p className="text-gray-600">Administra los proveedores de tu empresa</p>
          </div>
        </div>
        <button
          onClick={handleNuevo}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Proveedor
        </button>
      </div>

      {/* Contenedor principal con sombra y barra de búsqueda igual a tallas/colores */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        {/* Barra de búsqueda */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o RUC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 
                       focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 
                       transition-all duration-200 hover:border-indigo-400"
            />
          </div>
        </div>
        {/* Tabla de proveedores igual a tallas/colores */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RUC</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && (
                <tr>
                  <td colSpan={3} className="text-center p-12 text-gray-500">Cargando proveedores...</td>
                </tr>
              )}
              {!loading && proveedores.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center p-12">
                    <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron proveedores</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm ? 'Intenta con otra búsqueda o limpia el filtro.' : '¡Comienza añadiendo tu primer proveedor!'}
                    </p>
                  </td>
                </tr>
              )}
              {proveedoresPaginados.map((proveedor) => (
                <tr key={proveedor.idProveedor} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{proveedor.nombre}</div>
                        <div className="text-sm text-gray-500">ID: {proveedor.idProveedor}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-mono">{proveedor.ruc}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditar(proveedor)}
                        className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-100 transition-colors"
                        title="Editar proveedor"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEliminar(proveedor.idProveedor!)}
                        className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-100 transition-colors"
                        title="Eliminar proveedor"
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
      {/* Paginación responsiva */}
      {totalPaginas > 1 && (
        <div className="max-w-7xl mx-auto">
          <div className="mt-6 bg-gray-50 border-t border-gray-200 rounded-b-lg shadow-sm border-x border-b">
            {/* Versión móvil */}
            <div className="block sm:hidden px-3 py-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
                  disabled={paginaActual === 1}
                  className={`flex items-center px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md ${
                    paginaActual === 1 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  ← Anterior
                </button>
                
                <div className="flex flex-col items-center">
                  <span className="text-sm text-gray-700 font-medium">
                    Página {paginaActual} de {totalPaginas}
                  </span>
                  <span className="text-xs text-gray-500">
                    {proveedores.length} proveedores
                  </span>
                </div>
                
                <button
                  onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))}
                  disabled={paginaActual === totalPaginas}
                  className={`flex items-center px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md ${
                    paginaActual === totalPaginas 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Siguiente →
                </button>
              </div>
            </div>

            {/* Versión desktop */}
            <div className="hidden sm:flex items-center justify-between px-4 py-3 sm:px-6">
              <div className="text-sm text-gray-600">
                Mostrando {((paginaActual - 1) * proveedoresPorPagina) + 1}
                -{Math.min(paginaActual * proveedoresPorPagina, proveedores.length)}
                {' '}de {proveedores.length} proveedores
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
                        className={`flex items-center justify-center h-9 w-9 rounded-md border text-sm font-medium transition-colors ${paginaActual === num ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'}`}
                        aria-current={paginaActual === num ? 'page' : undefined}
                      >
                        {num}
                      </button>
                    ) : (
                      <span key={`ellipsis-${num}-${idx}`} className="px-2 text-gray-400 select-none text-base">...</span>
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
        </div>
      )}

      {/* Formulario Modal */}
      {showFormulario && (
        <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${cerrandoModal ? 'animate-fadeOut' : 'animate-fadeIn'}`}>
          <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-md ${cerrandoModal ? 'animate-scaleOut' : 'animate-scaleIn'}`}>
            <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl p-6">
              <div className="absolute inset-0 bg-black/10 rounded-t-2xl"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                    {proveedorEditar ? (
                      <Edit className="w-6 h-6 text-white" />
                    ) : (
                      <Building2 className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {proveedorEditar ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                    </h2>
                    <p className="text-indigo-100 text-sm">
                      {proveedorEditar ? 'Modifica la información del proveedor' : 'Complete la información para crear el proveedor'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCancelar}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Mensaje de error dentro del modal */}
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label htmlFor="ruc-input" className="block text-sm font-medium text-gray-700">
                  RUC <span className="text-red-500">*</span>
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
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-l-xl bg-gray-50 text-gray-900 
                             focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 
                             transition-all duration-200 hover:border-indigo-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                      className="px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 
                               rounded-r-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 
                               hover:shadow-lg hover:shadow-indigo-500/25 flex items-center 
                               disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed 
                               focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
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

              <div className="space-y-2">
                <label htmlFor="nombre-input" className="block text-sm font-medium text-gray-700">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  id="nombre-input"
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 text-gray-900 
                           focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 
                           transition-all duration-200 hover:border-indigo-400"
                  placeholder="Nombre del proveedor"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCancelar}
                  className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl 
                           hover:bg-gray-200 transition-all duration-200 hover:shadow-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 
                           rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 
                           hover:shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2 
                           focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
                >
                  <Save className="w-4 h-4" />
                  {proveedorEditar ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionProveedores;
