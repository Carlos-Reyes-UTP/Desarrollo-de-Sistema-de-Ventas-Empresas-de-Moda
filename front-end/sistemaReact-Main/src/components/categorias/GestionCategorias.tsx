import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Save,
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  TreePine,
  Hash,
  AlertCircle
} from 'lucide-react';
import type { CategoriaDTO } from '../../interfaces/CategoriaDTO';
import { CategoriaService } from '../../services/CategoriaServices';
import { ConfirmModal } from '../common';

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
  const indentacion = nivel * 32;

  return (
    <div className="w-full">
      <div 
        className={`flex items-center justify-between p-4 hover:bg-[#fafafa] transition-colors group border-b border-gray-50`}
        style={{ paddingLeft: `${indentacion + 16}px` }}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-2">
            {tieneSubcategorias ? (
              <button
                onClick={() => toggleExpansion(categoria.id)}
                className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
              >
                {estaExpandida ? (
                  <ChevronDown className="w-3 h-3 text-black" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-black" />
                )}
              </button>
            ) : (
              <div className="w-6 h-6 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-gray-300" />
              </div>
            )}
            
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
              estaExpandida && tieneSubcategorias ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
            } transition-all`}>
              {estaExpandida && tieneSubcategorias ? (
                <FolderOpen className="w-4 h-4" />
              ) : (
                <Folder className="w-4 h-4" />
              )}
            </div>
          </div>
          
          <div className="flex flex-col">
            <span className="text-sm font-bold text-black leading-tight mb-0.5">
              {categoria.nombre}
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">
              ID {categoria.id} • Nivel {nivel + 1} {tieneSubcategorias && `• ${categoria.subcategorias!.length} RAMAS`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pr-4">
          <button
            onClick={() => onCrearSubcategoria(categoria.id)}
            className="p-2.5 hover:bg-black hover:text-white rounded-xl transition-all shadow-sm hover:shadow-md border border-transparent text-gray-400"
            title="Añadir Subrama"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEditar(categoria)}
            className="p-2.5 hover:bg-black hover:text-white rounded-xl transition-all shadow-sm hover:shadow-md border border-transparent text-gray-400"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => solicitarEliminar(categoria.id)}
            className="p-2.5 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-md border border-transparent text-red-400"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {tieneSubcategorias && estaExpandida && (
        <div className="relative">
          {/* Vertical line for the tree structure */}
          <div 
            className="absolute left-[36px] top-0 bottom-0 w-[1px] bg-gray-100" 
            style={{ left: `${indentacion + 36}px` }}
          />
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
  const [categoriaPadreId, setCategoriaPadreId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<number>>(new Set());
  const [cerrandoModal, setCerrandoModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; categoriaId: number | null }>({ open: false, categoriaId: null });

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
      const results: CategoriaDTO[] = [];
      cats.forEach(cat => {
        const match = cat.nombre.toLowerCase().includes(searchTerm.toLowerCase());
        const subFiltered = cat.subcategorias ? filtrarRecursivo(cat.subcategorias) : [];
        if (match || subFiltered.length > 0) {
          results.push({ ...cat, subcategorias: subFiltered });
        }
      });
      return results;
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
        await CategoriaService.actualizarCategoria(categoriaEditar.id, { nombre: formData.nombre });
      } else if (categoriaPadreId) {
        await CategoriaService.crearSubcategoria(categoriaPadreId, { nombre: formData.nombre });
      } else {
        await CategoriaService.crearCategoria({ nombre: formData.nombre });
      }
      cerrarModalConAnimacion();
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

  const solicitarEliminar = (id: number) => {
    setConfirmModal({ open: true, categoriaId: id });
  };

  const confirmarEliminar = async () => {
    if (confirmModal.categoriaId == null) return;

    try {
      await CategoriaService.eliminarCategoria(confirmModal.categoriaId);
      cargarCategorias();
      setConfirmModal({ open: false, categoriaId: null });
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('No se puede eliminar la categoría porque tiene productos asociados');
      } else {
        setError('Error al eliminar categoría');
      }
      console.error(err);
      setConfirmModal({ open: false, categoriaId: null });
    }
  };

  const cancelarEliminar = () => {
    setConfirmModal({ open: false, categoriaId: null });
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

  const cerrarModalConAnimacion = () => {
    setCerrandoModal(true);
    setTimeout(() => {
      setShowFormulario(false);
      setCerrandoModal(false);
      setCategoriaEditar(null);
      setCategoriaPadreId(null);
      setFormData({ nombre: '' });
      setError(null);
    }, 300);
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
    <div className="p-10 max-w-[1600px] mx-auto bg-[#fafafa] min-h-screen animate-fadeIn">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-[2.5rem] font-bold tracking-tight text-black leading-none mb-2">
            Arquitectura de categorías
          </h1>
          <p className="text-gray-500 text-sm max-w-md font-medium">
            Definición de jerarquías y taxonomía de productos para el ecosistema DK-SYSTEM.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleNuevaCategoria}
            className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all font-bold text-xs uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            Nueva Categoría
          </button>
        </div>
      </div>

      {/* Primary Context Bar */}
      <div className="bg-white rounded-[2rem] p-8 mb-8 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-8 items-end">
          
          {/* Search Box */}
          <div className="lg:col-span-3">
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3 text-left">
              Filtro Jerárquico
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Nombre de categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyPress}
                className="w-full pl-11 pr-4 py-3 bg-[#f8f8f8] border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all font-medium"
              />
            </div>
          </div>

          {/* Tree Controls */}
          <div className="lg:col-span-2 flex gap-2">
            <button
              onClick={expandirTodas}
              className="flex-1 h-[46px] flex items-center justify-center bg-black text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Expandir Todo
            </button>
            <button
              onClick={contraerTodas}
              className="flex-1 h-[46px] flex items-center justify-center bg-gray-100 text-gray-400 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-200 hover:text-black transition-all"
            >
              <Folder className="w-4 h-4 mr-2" />
              Contraer Todo
            </button>
          </div>

          <div className="lg:col-span-1">
            <div className="h-[46px] flex items-center justify-center bg-[#f8f8f8] rounded-xl px-4 text-gray-400">
               <Hash className="w-4 h-4" />
              <span className="ml-2 text-xs font-bold uppercase tracking-widest">{contarCategorias(categorias)} TOTAL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tree Container */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-3">
             <div className="w-10 h-10 border-4 border-gray-100 border-t-black rounded-full animate-spin"></div>
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Sincronizando Taxonomía...</span>
          </div>
        ) : categoriasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 opacity-30 gap-3 text-center">
            <TreePine className="w-16 h-16" />
            <span className="text-xs font-bold uppercase tracking-widest">No se detectaron nodos</span>
          </div>
        ) : (
          <div className="p-4">
            {categoriasFiltradas.map((categoria) => (
              <ArbolCategoria
                key={categoria.id}
                categoria={categoria}
                onEditar={handleEditar}
                onEliminar={solicitarEliminar}
                onCrearSubcategoria={handleNuevaSubcategoria}
                categoriasExpandidas={categoriasExpandidas}
                toggleExpansion={toggleExpansion}
              />
            ))}
          </div>
        )}
      </div>

      {/* Redesigned Modal */}
      {showFormulario && (
        <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 ${cerrandoModal ? 'animate-fadeOut' : 'animate-fadeIn'}`}>
          <div className={`bg-white rounded-[2rem] shadow-2xl w-full max-w-lg relative overflow-hidden ${cerrandoModal ? 'animate-scaleOut' : 'animate-scaleIn'}`}>
            <div className="p-10 text-left">
              <div className="mb-6 w-12 h-1 bg-black"></div>
              <h2 className="text-2xl font-bold tracking-tight text-black mb-2 uppercase">
                {categoriaEditar 
                  ? 'Editar Nodo' 
                  : categoriaPadreId 
                    ? 'Nueva Subcategoría' 
                    : 'Nueva Categoría Raíz'}
              </h2>
              <p className="text-gray-500 text-sm mb-10 font-medium">
                {categoriaPadreId ? 'Defina la especialización para la rama seleccionada.' : 'Defina una nueva categoría principal de productos.'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">
                    Nombre Identificador
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-5 py-4 bg-[#f8f8f8] border-transparent rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all"
                    placeholder="Ej: Calzado de Seguridad..."
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={cerrarModalConAnimacion}
                    className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-black hover:bg-gray-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {categoriaEditar ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal for Delete */}
      <ConfirmModal
        open={confirmModal.open}
        message="¿Estás seguro de eliminar esta categoría? Se eliminarán también todas sus subcategorías."
        onConfirm={confirmarEliminar}
        onCancel={cancelarEliminar}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};

export default GestionCategorias;
