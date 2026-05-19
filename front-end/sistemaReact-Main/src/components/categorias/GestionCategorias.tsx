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
  AlertCircle,
  GripVertical
} from 'lucide-react';
import type { CategoriaDTO } from '../../types/CategoriaDTO';
import { CategoriaService } from '../../services/CategoriaService';
import { ConfirmModal, ListItemSkeleton } from '@/shared/ui';

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
  const indentacion = nivel * 24;

  return (
    <div className="w-full">
      <div 
        className={`flex items-center justify-between py-3 px-4 mb-2 rounded-2xl transition-all duration-300 group border ${
          estaExpandida && tieneSubcategorias 
            ? 'bg-white/90 backdrop-blur-md border-gray-200 shadow-sm' 
            : 'bg-white/60 backdrop-blur-sm border-transparent hover:bg-white hover:border-gray-200 hover:shadow-sm'
        }`}
        style={{ marginLeft: `${indentacion}px` }}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
               <GripVertical className="w-3.5 h-3.5 text-gray-300" />
            </div>
            
            {tieneSubcategorias ? (
              <button
                onClick={() => toggleExpansion(categoria.id)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
                  estaExpandida ? 'bg-black text-white rotate-0' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-black'
                }`}
              >
                {estaExpandida ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <div className="w-7 h-7 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
              </div>
            )}
            
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              estaExpandida && tieneSubcategorias 
                ? 'bg-black text-white shadow-lg shadow-black/10' 
                : 'bg-gray-50 text-gray-400 border border-gray-100'
            }`}>
              {estaExpandida && tieneSubcategorias ? (
                <FolderOpen className="w-4 h-4" />
              ) : (
                <Folder className="w-4 h-4" />
              )}
            </div>
          </div>
          
          <div className="flex flex-col min-w-0">
            <span className={`text-[15px] font-bold tracking-tight truncate transition-colors ${
                estaExpandida && tieneSubcategorias ? 'text-black' : 'text-gray-900'
            }`}>
              {categoria.nombre}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">
                    ID {categoria.id}
                </span>
                <span className="w-1 h-1 rounded-full bg-gray-200" />
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.1em]">
                    Nivel {nivel + 1}
                </span>
                {tieneSubcategorias && (
                    <>
                        <span className="w-1 h-1 rounded-full bg-gray-200" />
                        <span className="text-[9px] font-extrabold text-gray-500 uppercase tracking-[0.1em]">
                             {categoria.subcategorias!.length} Ramas
                        </span>
                    </>
                )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
          <button
            onClick={() => onCrearSubcategoria(categoria.id)}
            className="p-2.5 bg-white hover:bg-black hover:text-white rounded-xl transition-all shadow-sm border border-gray-100 text-gray-400"
            title="Añadir Subrama"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEditar(categoria)}
            className="p-2.5 bg-white hover:bg-black hover:text-white rounded-xl transition-all shadow-sm border border-gray-100 text-gray-400"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEliminar(categoria.id)}
            className="p-2.5 bg-white hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm border border-gray-100 text-red-400"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {tieneSubcategorias && estaExpandida && (
        <div className="relative ml-3.5">
          {/* vertical line visual for the tree */}
          <div 
            className="absolute left-0 top-0 bottom-4 w-[1px] bg-gray-200 rounded-full" 
            style={{ left: `${indentacion + 12}px` }}
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
    <div className="p-10 max-w-[1600px] mx-auto bg-[#fafafa] lg:bg-transparent min-h-screen animate-fadeIn">
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

      {/* Control & Search Deck (Glassmorphism as per AGENTE.md) */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-4 mb-10 shadow-sm border border-gray-200 sticky top-4 z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          
          {/* Search Module */}
          <div className="lg:col-span-5 relative group">
            <Search className="w-4 h-4 text-gray-400 absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-black transition-colors" />
            <input
              type="text"
              placeholder="Buscar en la estructura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full pl-12 pr-6 py-4 bg-[#f8f8f8] border-transparent rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all font-bold text-black placeholder:text-gray-400 border border-gray-100/50"
            />
          </div>

          {/* Visualization Controls */}
          <div className="lg:col-span-4 flex gap-2">
            <button
              onClick={expandirTodas}
              className="flex-1 h-[56px] flex items-center justify-center bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-sm"
            >
              <FolderOpen className="w-4 h-4 mr-2.5" />
              Expandir
            </button>
            <button
              onClick={contraerTodas}
              className="flex-1 h-[56px] flex items-center justify-center bg-white border border-gray-200 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 hover:text-black transition-all"
            >
              <Folder className="w-4 h-4 mr-2.5" />
              Contraer
            </button>
          </div>

          {/* Stats Display */}
          <div className="lg:col-span-3">
            <div className="h-[56px] flex items-center justify-between bg-gray-50 border border-gray-200 rounded-2xl px-6 text-black">
               <div className="flex items-center gap-3">
                  <Hash className="w-4 h-4 text-gray-300" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Total</span>
               </div>
               <span className="text-xl font-black tabular-nums">{contarCategorias(categorias)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Structural Tree Display */}
      <div className="relative">
        {loading ? (
          <div className="bg-white/40 backdrop-blur-sm rounded-[2.5rem] p-6 border border-gray-200">
            <ListItemSkeleton count={8} className="p-2" />
          </div>
        ) : categoriasFiltradas.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-gray-200 shadow-sm py-40 text-center flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center">
                <TreePine className="w-8 h-8 text-gray-200" />
            </div>
            <div className="space-y-2">
                <h3 className="text-lg font-black text-black uppercase tracking-tight">Sin resultados</h3>
                <p className="text-xs text-gray-400 font-medium">No se encontraron nodos para la búsqueda.</p>
            </div>
          </div>
        ) : (
          <div className="bg-white/40 backdrop-blur-sm rounded-[2.5rem] p-6 border border-gray-200">
            <div className="space-y-2">
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
          </div>
        )}
      </div>

      {/* Modal Rediseñado (Strict Monochrome as per AGENTE.md) */}
      {showFormulario && (
        <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 ${cerrandoModal ? 'animate-fadeOut' : 'animate-fadeIn'}`}>
          <div className={`bg-white rounded-[2.5rem] shadow-xl w-full max-w-lg relative overflow-hidden border border-gray-200 ${cerrandoModal ? 'animate-scaleOut' : 'animate-scaleIn'}`}>
            <div className="p-12">
              <div className="flex justify-between items-start mb-10">
                <div>
                    <h2 className="text-[24px] font-black tracking-tighter text-black uppercase">
                        {categoriaEditar 
                        ? 'Editar Nodo' 
                        : categoriaPadreId 
                            ? 'Nueva Subrama' 
                            : 'Categoría Raíz'}
                    </h2>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-2">
                        Configuración de Estructura
                    </p>
                </div>
                <button 
                    onClick={cerrarModalConAnimacion}
                    className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors text-gray-400"
                >
                    <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-10">
                {error && (
                  <div className="bg-red-50 p-5 rounded-2xl border border-red-100 text-red-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                
                <div className="space-y-4">
                  <label className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase">
                      Nombre Identificador
                  </label>
                  <input
                      type="text"
                      autoFocus
                      value={formData.nombre}
                      onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                      className="w-full px-6 py-5 bg-[#f8f8f8] border-2 border-transparent rounded-2xl text-sm font-black text-black focus:bg-white focus:border-black transition-all outline-none"
                      placeholder="Ej: Calzado Deportivo..."
                      required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={cerrarModalConAnimacion}
                    className="flex-1 py-5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-5 bg-black hover:bg-gray-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{categoriaEditar ? 'Actualizar' : 'Guardar'}</span>
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
