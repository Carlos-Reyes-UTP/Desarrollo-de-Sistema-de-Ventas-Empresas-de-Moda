import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Folder, 
  FolderOpen, 
  FolderPlus,
  ChevronRight,
  ChevronDown,
  TreePine,
  Hash
} from 'lucide-react';
import type { CategoriaDTO } from '../../interfaces/CategoriaDTO';
import { CategoriaService } from '../../services/CategoriaServices';

interface ArbolCategoriaProps {
  categoria: CategoriaDTO;
  nivel?: number;
  onEditar: (categoria: CategoriaDTO) => void;
  onEliminar: (id: number) => void;
  onCrearSubcategoria: (idPadre: number) => void;
  categoriasExpandidas: Set<number>;
  toggleExpansion: (id: number) => void;
}

const ArbolCategoria: React.FC<ArbolCategoriaProps> = ({
  categoria,
  nivel = 0,
  onEditar,
  onEliminar,
  onCrearSubcategoria,
  categoriasExpandidas,
  toggleExpansion
}) => {
  const tieneSubcategorias = categoria.subcategorias && categoria.subcategorias.length > 0;
  const estaExpandida = categoriasExpandidas.has(categoria.id);
  const indentacion = nivel * 20;

  return (
    <div className="w-full">
      <div 
        className={`flex items-center justify-between p-3 hover:bg-gray-50 border-l-4 ${
          nivel === 0 ? 'border-blue-500 bg-blue-50' : 
          nivel === 1 ? 'border-green-500 bg-green-50' : 
          'border-orange-500 bg-orange-50'
        }`}
        style={{ marginLeft: `${indentacion}px` }}
      >
        <div className="flex items-center gap-2 flex-1">
          {tieneSubcategorias ? (
            <button
              onClick={() => toggleExpansion(categoria.id)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {estaExpandida ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          ) : (
            <div className="w-6 h-6" />
          )}
          
          <div className={`p-2 rounded-lg ${
            nivel === 0 ? 'bg-blue-100' :
            nivel === 1 ? 'bg-green-100' :
            'bg-orange-100'
          }`}>
            {estaExpandida && tieneSubcategorias ? (
              <FolderOpen className={`w-5 h-5 ${
                nivel === 0 ? 'text-blue-600' :
                nivel === 1 ? 'text-green-600' :
                'text-orange-600'
              }`} />
            ) : (
              <Folder className={`w-5 h-5 ${
                nivel === 0 ? 'text-blue-600' :
                nivel === 1 ? 'text-green-600' :
                'text-orange-600'
              }`} />
            )}
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-900">
              {categoria.nombre}
            </div>
            <div className="text-xs text-gray-500">
              ID: {categoria.id} | Nivel: {nivel + 1}
              {tieneSubcategorias && ` | ${categoria.subcategorias!.length} subcategorías`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onCrearSubcategoria(categoria.id)}
            className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
            title="Crear subcategoría"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEditar(categoria)}
            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
            title="Editar categoría"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEliminar(categoria.id)}
            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
            title="Eliminar categoría"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subcategorías */}
      {tieneSubcategorias && estaExpandida && (
        <div className="ml-4">
          {categoria.subcategorias!.map((subcategoria) => (
            <ArbolCategoria
              key={subcategoria.id}
              categoria={subcategoria}
              nivel={nivel + 1}
              onEditar={onEditar}
              onEliminar={onEliminar}
              onCrearSubcategoria={onCrearSubcategoria}
              categoriasExpandidas={categoriasExpandidas}
              toggleExpansion={toggleExpansion}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const GestionCategorias: React.FC = () => {
  const [categorias, setCategorias] = useState<CategoriaDTO[]>([]);
  const [categoriasFiltradas, setCategoriasFiltradas] = useState<CategoriaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormulario, setShowFormulario] = useState(false);
  const [categoriaEditar, setCategoriaEditar] = useState<CategoriaDTO | null>(null);
  const [categoriaPadreId, setCategoriaPadreId] = useState<number | null>(null);  const [error, setError] = useState<string | null>(null);
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<number>>(new Set());

  // Formulario
  const [formData, setFormData] = useState({
    nombre: ''
  });

  useEffect(() => {
    cargarCategorias();
  }, []);

  useEffect(() => {
    filtrarCategorias();
  }, [searchTerm, categorias]);

  const cargarCategorias = async () => {
    try {
      setLoading(true);
      const data = await CategoriaService.obtenerArbolCategorias();
      setCategorias(data);
      // Expandir categorías principales por defecto
      const categoriasParaExpandir = new Set<number>();
      data.forEach(cat => {
        categoriasParaExpandir.add(cat.id);
      });
      setCategoriasExpandidas(categoriasParaExpandir);
    } catch (err) {
      setError('Error al cargar categorías');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtrarCategorias = () => {
    if (!searchTerm.trim()) {
      setCategoriasFiltradas(categorias);
      return;
    }

    const filtrarRecursivo = (cats: CategoriaDTO[]): CategoriaDTO[] => {
      return cats.filter(cat => {
        const coincideNombre = cat.nombre.toLowerCase().includes(searchTerm.toLowerCase());
        const subcategoriasCoinciden = cat.subcategorias && filtrarRecursivo(cat.subcategorias).length > 0;
        
        if (coincideNombre || subcategoriasCoinciden) {
          return {
            ...cat,
            subcategorias: cat.subcategorias ? filtrarRecursivo(cat.subcategorias) : []
          };
        }
        return false;
      }).map(cat => ({
        ...cat,
        subcategorias: cat.subcategorias ? filtrarRecursivo(cat.subcategorias) : []
      }));
    };

    setCategoriasFiltradas(filtrarRecursivo(categorias));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }

    try {
      if (categoriaEditar) {
        // Actualizar categoría existente
        await CategoriaService.actualizarCategoria(categoriaEditar.id, { nombre: formData.nombre });
      } else if (categoriaPadreId) {
        // Crear subcategoría
        await CategoriaService.crearSubcategoria(categoriaPadreId, { nombre: formData.nombre });
      } else {
        // Crear categoría principal
        await CategoriaService.crearCategoria({ nombre: formData.nombre });
      }
      
      setShowFormulario(false);
      setCategoriaEditar(null);
      setCategoriaPadreId(null);
      setFormData({ nombre: '' });
      setError(null);
      cargarCategorias();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('Ya existe una categoría con ese nombre');
      } else {
        setError('Error al guardar categoría');
      }
      console.error(err);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría? Se eliminarán también todas sus subcategorías.')) return;

    try {
      await CategoriaService.eliminarCategoria(id);
      cargarCategorias();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('No se puede eliminar la categoría porque tiene productos asociados');
      } else {
        setError('Error al eliminar categoría');
      }
      console.error(err);
    }
  };

  const handleEditar = (categoria: CategoriaDTO) => {
    setCategoriaEditar(categoria);
    setCategoriaPadreId(null);
    setFormData({ nombre: categoria.nombre });
    setShowFormulario(true);
    setError(null);
  };

  const handleNuevaCategoria = () => {
    setCategoriaEditar(null);
    setCategoriaPadreId(null);
    setFormData({ nombre: '' });
    setShowFormulario(true);
    setError(null);
  };

  const handleNuevaSubcategoria = (idPadre: number) => {
    setCategoriaEditar(null);
    setCategoriaPadreId(idPadre);
    setFormData({ nombre: '' });
    setShowFormulario(true);
    setError(null);
  };

  const handleCancelar = () => {
    setShowFormulario(false);
    setCategoriaEditar(null);
    setCategoriaPadreId(null);
    setFormData({ nombre: '' });
    setError(null);
  };

  const toggleExpansion = (id: number) => {
    const nuevasExpandidas = new Set(categoriasExpandidas);
    if (nuevasExpandidas.has(id)) {
      nuevasExpandidas.delete(id);
    } else {
      nuevasExpandidas.add(id);
    }
    setCategoriasExpandidas(nuevasExpandidas);
  };

  const expandirTodas = () => {
    const todasLasCategorias = new Set<number>();
    const agregarRecursivo = (cats: CategoriaDTO[]) => {
      cats.forEach(cat => {
        todasLasCategorias.add(cat.id);
        if (cat.subcategorias) {
          agregarRecursivo(cat.subcategorias);
        }
      });
    };
    agregarRecursivo(categorias);
    setCategoriasExpandidas(todasLasCategorias);
  };

  const contraerTodas = () => {
    setCategoriasExpandidas(new Set());
  };

  const contarCategorias = (cats: CategoriaDTO[]): number => {
    return cats.reduce((total, cat) => {
      return total + 1 + (cat.subcategorias ? contarCategorias(cat.subcategorias) : 0);
    }, 0);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      filtrarCategorias();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-3 rounded-lg">
            <TreePine className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Categorías</h1>
            <p className="text-gray-600">Administra las categorías de productos de tu empresa</p>
          </div>
        </div>
        <button
          onClick={handleNuevaCategoria}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva Categoría
        </button>
      </div>

      {/* Controles */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Barra de búsqueda */}
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar categorías..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Controles de vista */}
          <div className="flex gap-2">
            <button
              onClick={expandirTodas}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
            >
              <FolderOpen className="w-4 h-4" />
              Expandir
            </button>
            <button
              onClick={contraerTodas}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
            >
              <Folder className="w-4 h-4" />
              Contraer
            </button>
          </div>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Formulario Modal */}
      {showFormulario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TreePine className="w-5 h-5 text-green-600" />
                {categoriaEditar 
                  ? 'Editar Categoría' 
                  : categoriaPadreId 
                    ? 'Nueva Subcategoría' 
                    : 'Nueva Categoría Principal'}
              </h3>
              <button
                onClick={handleCancelar}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Nombre de la categoría"
                  required
                />
                {categoriaPadreId && (
                  <p className="text-xs text-gray-500 mt-1">
                    Se creará como subcategoría de la categoría seleccionada
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancelar}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {categoriaEditar ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Cargando categorías...</p>
          </div>
        ) : categoriasFiltradas.length === 0 ? (
          <div className="p-8 text-center">
            <TreePine className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {searchTerm ? 'No se encontraron categorías que coincidan con la búsqueda' : 'No hay categorías registradas'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleNuevaCategoria}
                className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors"
              >
                <Plus className="w-4 h-4" />
                Crear primera categoría
              </button>
            )}
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {categoriasFiltradas.map((categoria) => (
              <ArbolCategoria
                key={categoria.id}
                categoria={categoria}
                onEditar={handleEditar}
                onEliminar={handleEliminar}
                onCrearSubcategoria={handleNuevaSubcategoria}
                categoriasExpandidas={categoriasExpandidas}
                toggleExpansion={toggleExpansion}
              />
            ))}
          </div>
        )}
      </div>

      {/* Estadísticas */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-gray-600">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              <span className="text-sm">Total de categorías: {contarCategorias(categorias)}</span>
            </div>
            <div className="flex items-center gap-2">
              <TreePine className="w-4 h-4" />
              <span className="text-sm">Categorías principales: {categorias.length}</span>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Última actualización: {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestionCategorias;
