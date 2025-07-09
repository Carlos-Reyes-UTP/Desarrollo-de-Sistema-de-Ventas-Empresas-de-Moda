import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Save, X, Palette } from 'lucide-react';
import type { Color } from '../../interfaces/Color';
import { ColorService } from '../../services/ColorService';

// Pequeño componente para mostrar la píldora de color, reutilizable y limpio.
const ColorPill: React.FC<{ hexCode?: string }> = ({ hexCode }) => (
  <div
    className="w-6 h-6 rounded-full border-2 border-gray-200 shadow-sm"
    style={{ backgroundColor: hexCode || '#FFFFFF' }}
  />
);

const GestionColores: React.FC = () => {
  const [colores, setColores] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // --- Estados para la edición en línea ---
  // Guarda el ID del color que se está editando, o 'new' para un nuevo color.
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  // Guarda los datos del formulario de la fila que se está editando.
  const [formData, setFormData] = useState<{ nombre: string; codigoHex: string }>({
    nombre: '',
    codigoHex: '#000000',
  });

  const coloresFiltrados = colores.filter(color =>
    color.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    color.codigoHex?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginación de colores
  const [paginaActual, setPaginaActual] = useState(1);
  const coloresPorPagina = 10;
  const totalPaginas = Math.ceil(coloresFiltrados.length / coloresPorPagina);

  useEffect(() => {
    cargarColores();
  }, []);

  useEffect(() => {
    setPaginaActual(1);
  }, [searchTerm, loading]);

  const cargarColores = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ColorService.getAllColores();
      setColores(data);
    } catch (err: any) {
      setError('Error al cargar colores: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Inicia la creación de un nuevo color en una nueva fila.
  const handleNuevo = () => {
    if (editingId) return; // Evitar añadir más de uno a la vez
    setEditingId('new');
    setFormData({ nombre: '', codigoHex: '#ffffff' });
  };

  // Pone una fila existente en modo de edición.
  const handleEditar = (color: Color) => {
    if (editingId) return; // Evitar editar más de uno a la vez
    setEditingId(color.idColor!);
    setFormData({ nombre: color.nombre, codigoHex: color.codigoHex || '#ffffff' });
  };

  // Cancela la edición o la creación.
  const handleCancelar = () => {
    setEditingId(null);
    setError(null);
  };

  // Lógica para guardar (ya sea creando o actualizando).
  const handleGuardar = async () => {
    if (!formData.nombre.trim()) {
      setError('El nombre del color no puede estar vacío.');
      return;
    }
    
    try {
      if (editingId === 'new') {
        await ColorService.createColor(formData);
      } else {
        await ColorService.updateColor(editingId!, { ...formData, idColor: editingId! });
      }
      
      handleCancelar(); // Salir del modo edición
      cargarColores(); // Recargar la lista
    } catch (err: any) {
      setError('Error al guardar el color: ' + (err.response?.data?.message || err.message));
    }
  };
  
  // Lógica para eliminar un color.
  const handleEliminar = async (id: number) => {
    // Usar un modal personalizado en el futuro sería ideal.
    if (window.confirm('¿Estás seguro de eliminar este color? Esta acción no se puede deshacer.')) {
      try {
        await ColorService.deleteColor(id);
        cargarColores();
      } catch (err: any) {
        setError('Error al eliminar el color. Asegúrate de que no esté en uso por algún producto.');
      }
    }
  };
  
  const coloresPaginados = coloresFiltrados.slice(
    (paginaActual - 1) * coloresPorPagina,
    paginaActual * coloresPorPagina
  );

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Colores</h1>
            <p className="text-sm text-gray-600 mt-1">Añade, edita y gestiona los colores disponibles para tus productos.</p>
          </div>
          <button
            onClick={handleNuevo}
            disabled={editingId !== null}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Nuevo Color
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Contenedor principal con sombra */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
            {/* Barra de búsqueda */}
            <div className="p-4 border-b border-gray-200">
                <div className="relative">
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o código hexadecimal..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>
            
            {/* Tabla de colores */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código Hex</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {/* Fila para crear un nuevo color */}
                        {editingId === 'new' && (
                            <tr className="bg-blue-50">
                                <td className="px-6 py-4">
                                    <input
                                        type="color"
                                        name="codigoHex"
                                        value={formData.codigoHex}
                                        onChange={handleInputChange}
                                        className="w-10 h-10 p-1 border border-gray-300 rounded-md cursor-pointer"
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <input
                                        type="text"
                                        name="nombre"
                                        value={formData.nombre}
                                        onChange={handleInputChange}
                                        placeholder="Nombre del color"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        autoFocus
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <input
                                        type="text"
                                        name="codigoHex"
                                        value={formData.codigoHex}
                                        onChange={handleInputChange}
                                        placeholder="#FFFFFF"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                                    />
                                </td>
                                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                    <button onClick={handleGuardar} className="text-green-600 hover:text-green-800 p-2 rounded-full hover:bg-green-100" title="Guardar"><Save className="w-5 h-5" /></button>
                                    <button onClick={handleCancelar} className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100" title="Cancelar"><X className="w-5 h-5" /></button>
                                </td>
                            </tr>
                        )}
                        
                        {/* Filas de colores existentes */}
                        {coloresPaginados.map((color) => (
                            <tr key={color.idColor}>
                                {editingId === color.idColor ? (
                                    // ---- VISTA DE EDICIÓN ----
                                    <>
                                        <td className="px-6 py-4"><input type="color" name="codigoHex" value={formData.codigoHex} onChange={handleInputChange} className="w-10 h-10 p-1 border border-gray-300 rounded-md cursor-pointer" /></td>
                                        <td className="px-6 py-4"><input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" autoFocus/></td>
                                        <td className="px-6 py-4"><input type="text" name="codigoHex" value={formData.codigoHex} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"/></td>
                                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                            <button onClick={handleGuardar} className="text-green-600 hover:text-green-800 p-2 rounded-full hover:bg-green-100" title="Guardar"><Save className="w-5 h-5" /></button>
                                            <button onClick={handleCancelar} className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100" title="Cancelar"><X className="w-5 h-5" /></button>
                                        </td>
                                    </>
                                ) : (
                                    // ---- VISTA NORMAL ----
                                    <>
                                        <td className="px-6 py-4"><ColorPill hexCode={color.codigoHex} /></td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{color.nombre}</td>
                                        <td className="px-6 py-4 text-gray-500 font-mono">{color.codigoHex}</td>
                                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                            <button onClick={() => handleEditar(color)} disabled={editingId !== null} className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-100 disabled:text-gray-300 disabled:cursor-not-allowed" title="Editar"><Edit className="w-5 h-5" /></button>
                                            <button onClick={() => color.idColor && handleEliminar(color.idColor)} disabled={editingId !== null} className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-100 disabled:text-gray-300 disabled:cursor-not-allowed" title="Eliminar"><Trash2 className="w-5 h-5" /></button>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Mensaje si no hay colores */}
            {loading && (
                 <div className="text-center p-12 text-gray-500">Cargando colores...</div>
            )}
            {!loading && coloresFiltrados.length === 0 && (
              <div className="text-center p-12">
                <Palette className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron colores</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Intenta con otra búsqueda o limpia el filtro.' : '¡Comienza añadiendo tu primer color!'}
                </p>
              </div>
            )}
        </div>
      </div>
      {/* Controles de paginación separados, igual que en usuarios */}
      {totalPaginas > 1 && (
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mt-6 px-4 py-3 bg-gray-50 border-t border-gray-200 sm:px-6 rounded-b-lg shadow-sm border-x border-b">
            <div className="text-sm text-gray-600">
              Mostrando {((paginaActual - 1) * coloresPorPagina) + 1}
              -{Math.min(paginaActual * coloresPorPagina, coloresFiltrados.length)}
              {' '}de {coloresFiltrados.length} colores
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
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => setPaginaActual(num)}
                  className={`flex items-center justify-center h-9 w-9 rounded-md border text-sm font-medium transition-colors ${paginaActual === num ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'}`}
                  aria-current={paginaActual === num ? 'page' : undefined}
                >
                  {num}
                </button>
              ))}
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
  );
};

export default GestionColores;
