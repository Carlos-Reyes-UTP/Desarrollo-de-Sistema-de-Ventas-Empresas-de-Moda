import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Edit, Trash2, Package, X, Search } from 'lucide-react';
import type { Producto } from '../../interfaces/Producto';
import type { Categoria } from '../../interfaces/Categoria';
import type { Proveedor } from '../../interfaces/Proveedor';
import { ProductoService } from '../../services/ProductoServices';
import { CategoriaService } from '../../services/CategoriaServices';
import { ProveedorService } from '../../services/ProveedorServices';
import { ProductoVarianteService } from '../../services/ProductoVarianteService';
import FormularioProductoUnificado from './FormularioProductoUnificado'
import GestionVariantes from './GestionVariantes';

const GestionProductos: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoriaPrincipal, setSelectedCategoriaPrincipal] = useState<string>('');
  const [selectedSubCategoria, setSelectedSubCategoria] = useState<string>('');
  const [selectedSubCategoria2, setSelectedSubCategoria2] = useState<string>('');
  const [selectedTipoPublico, setSelectedTipoPublico] = useState<string>('');
  const [selectedStock, setSelectedStock] = useState<string>('');
  const [searchCategoriaPrincipal, setSearchCategoriaPrincipal] = useState<string>('');
  const [searchSubCategoria, setSearchSubCategoria] = useState<string>('');
  const [searchSubCategoria2, setSearchSubCategoria2] = useState<string>('');
  const [selectedProveedor, setSelectedProveedor] = useState<string>('');
  const [showFormulario, setShowFormulario] = useState(false);
  const [showVariantes, setShowVariantes] = useState(false);
  const [productoEditar, setProductoEditar] = useState<Producto | null>(null);
  const [productoVariantes, setProductoVariantes] = useState<Producto | null>(null);  const [error, setError] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState<number | null>(null);
  const [isCategoriaPrincipalFocused, setIsCategoriaPrincipalFocused] = useState(false);
  const [isSubCategoriaFocused, setIsSubCategoriaFocused] = useState(false);
  const [isSubCategoria2Focused, setIsSubCategoria2Focused] = useState(false);

  // Referencias para los componentes de búsqueda
  const categoriaPrincipalRef = useRef<HTMLDivElement>(null);
  const subcategoriaRef = useRef<HTMLDivElement>(null);
  const subcategoria2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  // Verificar si se debe abrir el modal automáticamente
  useEffect(() => {
    const openModal = searchParams.get('openModal');
    if (openModal === 'true') {
      setShowFormulario(true);
      // Limpiar el parámetro de URL después de abrir el modal
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Aplicar filtro de stock desde URL
  useEffect(() => {
    const stockFilter = searchParams.get('stockFilter');
    if (stockFilter && (stockFilter === 'critico' || stockFilter === 'normal' || stockFilter === 'sin-stock')) {
      setSelectedStock(stockFilter);
      // Limpiar el parámetro de URL después de aplicar el filtro
      const params = new URLSearchParams(searchParams);
      params.delete('stockFilter');
      setSearchParams(params);
    }
  }, [searchParams, setSearchParams]);

  // Limpiar búsqueda cuando se cambia el tipo de búsqueda
  useEffect(() => {
    setSearchTerm('');
  }, []);

  // Limpiar subcategoría cuando se cambia la categoría principal
  useEffect(() => {
    setSelectedSubCategoria('');
    setSearchSubCategoria(''); // Limpiar también el término de búsqueda de subcategoría
    // Cargar subcategorías si hay una categoría principal seleccionada
    if (selectedCategoriaPrincipal) {
      cargarSubcategorias(selectedCategoriaPrincipal);
    } else {
      setSubcategorias([]);
    }
  }, [selectedCategoriaPrincipal]);

  // Limpiar segunda subcategoría cuando se cambia la subcategoría
  useEffect(() => {
    setSelectedSubCategoria2('');
    setSearchSubCategoria2('');
  }, [selectedSubCategoria]);

  // Manejar clics fuera de los componentes de búsqueda para cerrar las listas
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoriaPrincipalRef.current && !categoriaPrincipalRef.current.contains(event.target as Node)) {
        setSearchCategoriaPrincipal('');
      }
      if (subcategoriaRef.current && !subcategoriaRef.current.contains(event.target as Node)) {
        setSearchSubCategoria('');
      }
      if (subcategoria2Ref.current && !subcategoria2Ref.current.contains(event.target as Node)) {
        setSearchSubCategoria2('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const cargarSubcategorias = async (nombreCategoriaPrincipal: string) => {
    try {
      // Encontrar la categoría principal por nombre
      const categoriaPrincipalObj = categorias.find(cat => cat.nombre === nombreCategoriaPrincipal);
      
      if (categoriaPrincipalObj?.idCategoria) {
        const subcategoriasResponse = await CategoriaService.obtenerSubcategoriasPorIdPadre(categoriaPrincipalObj.idCategoria);
        setSubcategorias(Array.isArray(subcategoriasResponse) ? subcategoriasResponse : []);
      } else {
        setSubcategorias([]);
      }
    } catch (error) {
      console.error('Error al cargar subcategorías:', error);
      setSubcategorias([]);
    }
  };
  // Función para verificar si una categoría principal tiene subcategorías
  const categoriaTieneSubcategorias = (nombreCategoria: string): boolean => {
    if (!nombreCategoria || !categorias.length) return false;
    
    // Si es la categoría actualmente seleccionada, usar el estado de subcategorías cargadas
    if (selectedCategoriaPrincipal === nombreCategoria) {
      return subcategorias.length > 0;
    }
    
    // Para otras categorías, usar el método original como fallback
    const categoriaPrincipalObj = categorias.find(cat => 
      !cat.categoriaPadre && cat.nombre === nombreCategoria
    );
    
    if (!categoriaPrincipalObj) {
      return false;
    }
    
    const tieneSubcategorias = categorias.some(sub => 
      sub.categoriaPadre && sub.categoriaPadre.idCategoria === categoriaPrincipalObj.idCategoria
    );
    
    return tieneSubcategorias;
  };

  // Funciones para filtrar categorías según el término de búsqueda
  const categoriasPrincipalesFiltradas = categorias
    .filter(categoria => !categoria.categoriaPadre) // Solo categorías principales
    .filter(categoria => 
      searchCategoriaPrincipal === '' || 
      categoria.nombre.toLowerCase().includes(searchCategoriaPrincipal.toLowerCase())
    );

  const subcategoriasFiltradas = subcategorias.filter(categoria =>
    searchSubCategoria === '' || 
    categoria.nombre.toLowerCase().includes(searchSubCategoria.toLowerCase())
  );

  // Obtener segundas subcategorías únicas basadas en la subcategoría seleccionada
  const segundasSubcategoriasFiltradas = Array.from(
    new Set(
      productos
        .filter(p => !selectedSubCategoria || p.categoria?.nombre === selectedSubCategoria)
        .map(p => p.subCategoria2?.nombre)
        .filter(Boolean)
    )
  ).filter(nombre =>
    searchSubCategoria2 === '' || 
    nombre.toLowerCase().includes(searchSubCategoria2.toLowerCase())
  );

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [productosResponse, categoriasResponse, proveedoresResponse] = await Promise.all([
        ProductoService.getAllProductos('ROLE_ADMIN'),
        CategoriaService.obtenerCategoriasPrincipales(),
        ProveedorService.obtenerTodosProveedores()
      ]);

      // Validar que las respuestas son arrays
      const productosData = Array.isArray(productosResponse) ? productosResponse : [];
      const categoriasData = Array.isArray(categoriasResponse) ? categoriasResponse : [];
      const proveedoresData = Array.isArray(proveedoresResponse) ? proveedoresResponse : [];

      // Cargar cantidad total para cada producto
      const productosConCantidad = await Promise.all(
        productosData.map(async (producto) => {
          if (producto.idProducto) {
            try {
              const cantidadTotal = await ProductoVarianteService.obtenerCantidadTotalProducto(producto.idProducto);
              return { ...producto, cantidadTotal };
            } catch {
              return { ...producto, cantidadTotal: 0 };
            }
          }
          return producto;
        })
      );      setProductos(productosConCantidad);
      setCategorias(categoriasData);
      setProveedores(proveedoresData);
    } catch (err) {
      setError('Error al cargar los datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const solicitarEliminarProducto = (idProducto: number) => {
    setProductoAEliminar(idProducto);
    setConfirmModalOpen(true);
  };

  const confirmarEliminarProducto = async () => {
    if (productoAEliminar == null) return;
    try {
      await ProductoService.deleteProducto(productoAEliminar);
      cargarDatos();
    } catch (err) {
      console.error('Error al eliminar el producto:', err);
      setError('Error al eliminar el producto.');
    } finally {
      setProductoAEliminar(null);
      setConfirmModalOpen(false);
    }
  };

  const cancelarEliminarProducto = () => {
    setProductoAEliminar(null);
    setConfirmModalOpen(false);
  };
  const handleProductoGuardado = () => {
    setShowFormulario(false);
    setProductoEditar(null);
    cargarDatos();
  };

  const productosFiltrados = productos.filter(producto => {
    // Filtro por nombre o código según la selección del usuario
    let matchBusqueda = true;
    if (searchTerm) {
      matchBusqueda = (
        producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        producto.codigoIdentificacion.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtro por categoría principal
    const matchCategoriaPrincipal = !selectedCategoriaPrincipal || 
      (producto.categoriaPadre?.nombre?.toLowerCase().includes(selectedCategoriaPrincipal.toLowerCase()) ?? false);
    
    // Filtro por subcategoría
    const matchSubCategoria = !selectedSubCategoria || 
      (producto.categoria?.nombre?.toLowerCase().includes(selectedSubCategoria.toLowerCase()) ?? false);
    
    // Filtro por segunda subcategoría
    const matchSubCategoria2 = !selectedSubCategoria2 || 
      (producto.subCategoria2?.nombre?.toLowerCase().includes(selectedSubCategoria2.toLowerCase()) ?? false);
    
    // Filtro por tipo de público
    const matchTipoPublico = !selectedTipoPublico || 
      producto.tipoPublico === selectedTipoPublico;
    
    // Filtro por proveedor
    const matchProveedor = !selectedProveedor || 
      producto.proveedor.nombre.toLowerCase().includes(selectedProveedor.toLowerCase());
    
    // Filtro por stock
    let matchStock = true;
    if (selectedStock) {
      const cantidad = producto.cantidadTotal ?? 0;
      switch (selectedStock) {
        case 'normal':
          matchStock = cantidad > 10;
          break;
        case 'critico':
          matchStock = cantidad <= 10 && cantidad > 0;
          break;
        case 'sin-stock':
          matchStock = cantidad === 0;
          break;
      }
    }
    
    return matchBusqueda && matchCategoriaPrincipal && matchSubCategoria && matchSubCategoria2 && matchTipoPublico && matchProveedor && matchStock;
  });

  // Paginación de productos
  const [paginaActual, setPaginaActual] = useState(1);
  const productosPorPagina = 10;
  const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);

  // Resetear página al cambiar filtros o búsqueda
  useEffect(() => {
    setPaginaActual(1);
  }, [searchTerm, selectedCategoriaPrincipal, selectedSubCategoria, selectedSubCategoria2, selectedTipoPublico, selectedProveedor, selectedStock]);

  // Productos a mostrar en la página actual
  const productosPaginados = productosFiltrados.slice(
    (paginaActual - 1) * productosPorPagina,
    paginaActual * productosPorPagina
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
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Productos</h1>
        <button
          onClick={() => setShowFormulario(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        {/* Primera fila de filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="col-span-2 flex gap-0">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Limpiar búsqueda"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <select
            value={selectedProveedor}
            onChange={(e) => setSelectedProveedor(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los proveedores</option>
            {proveedores.map(proveedor => (
              <option key={proveedor.idProveedor} value={proveedor.nombre}>
                {proveedor.nombre}
              </option>
            ))}
          </select>

          <select
            value={selectedTipoPublico}
            onChange={(e) => setSelectedTipoPublico(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todo tipo de publico</option>
            <option value="ADULTO">👨‍💼 Adulto</option>
            <option value="NIÑO">👶 Niño</option>
          </select>
        </div>

        {/* Segunda fila de filtros - Categorías dinámicas */}
        <div className={`grid grid-cols-1 gap-4 ${(() => {
          let cols = 2; // Base: categoría principal y stock
          if (selectedCategoriaPrincipal && categoriaTieneSubcategorias(selectedCategoriaPrincipal)) {
            cols++; // Agregar subcategoría
          }
          if (selectedSubCategoria) {
            cols++; // Agregar segunda subcategoría
          }
          return `md:grid-cols-${cols}`;
        })()}`}>

          {/* Filtro de Categoría Principal con búsqueda */}
          <div className="relative" ref={categoriaPrincipalRef}>
            <input
              type="text"
              placeholder={selectedCategoriaPrincipal ? "Categoría seleccionada" : "🗂️ Buscar Categoria Principal"}
              value={searchCategoriaPrincipal}
              onChange={(e) => setSearchCategoriaPrincipal(e.target.value)}
              onFocus={() => setIsCategoriaPrincipalFocused(true)}
              onBlur={() => setTimeout(() => setIsCategoriaPrincipalFocused(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchCategoriaPrincipal('');
                } else if (e.key === 'Enter' && categoriasPrincipalesFiltradas.length === 1) {
                  setSelectedCategoriaPrincipal(categoriasPrincipalesFiltradas[0].nombre);
                  setSearchCategoriaPrincipal('');
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!!selectedCategoriaPrincipal}
            />
            {/* Indicador de resultados */}
            {searchCategoriaPrincipal && !selectedCategoriaPrincipal && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 bg-white px-1">
                {categoriasPrincipalesFiltradas.length} resultado{categoriasPrincipalesFiltradas.length !== 1 ? 's' : ''}
              </div>
            )}
            {/* Lista desplegable de categorías filtradas */}
            {(isCategoriaPrincipalFocused || searchCategoriaPrincipal) && !selectedCategoriaPrincipal && categoriasPrincipalesFiltradas.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {categoriasPrincipalesFiltradas.map(categoria => {
                  const numSubcategorias = categorias.filter(sub => 
                    sub.categoriaPadre && sub.categoriaPadre.idCategoria === categoria.idCategoria
                  ).length;
                  return (
                    <button
                      key={categoria.idCategoria}
                      onClick={() => {
                        setSelectedCategoriaPrincipal(categoria.nombre);
                        setSearchCategoriaPrincipal('');
                        setIsCategoriaPrincipalFocused(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                      type="button"
                    >
                      {categoria.nombre}{numSubcategorias > 0 ? ` (${numSubcategorias} subcategorías)` : ''}
                    </button>
                  );
                })}
              </div>
            )}
            {/* Mensaje cuando no hay resultados */}
            {searchCategoriaPrincipal && categoriasPrincipalesFiltradas.length === 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-center text-gray-500 text-sm">
                No se encontraron categorías principales
              </div>
            )}
            
            {/* Mostrar categoría seleccionada */}
            {selectedCategoriaPrincipal && !searchCategoriaPrincipal && (
              <div className="absolute inset-0 px-3 py-2 bg-blue-50 border border-blue-300 rounded-lg flex items-center justify-between">
                <span className="text-blue-800 font-medium">📁 {selectedCategoriaPrincipal}</span>
                <button
                  onClick={() => {
                    setSelectedCategoriaPrincipal('');
                    setSearchCategoriaPrincipal('');
                  }}
                  className="text-blue-600 hover:text-blue-800"
                  title="Limpiar selección"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Filtro de subcategoría - solo se muestra si la categoría principal seleccionada tiene hijos */}
          {selectedCategoriaPrincipal && categoriaTieneSubcategorias(selectedCategoriaPrincipal) && (
            <div className="relative" ref={subcategoriaRef}>
              <input
                type="text"
                placeholder={selectedSubCategoria ? "Subcategoría seleccionada" : "📂 Buscar SubCategoria"}
                value={searchSubCategoria}
                onChange={(e) => setSearchSubCategoria(e.target.value)}
                onFocus={() => setIsSubCategoriaFocused(true)}
                onBlur={() => setTimeout(() => setIsSubCategoriaFocused(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchSubCategoria('');
                  } else if (e.key === 'Enter' && subcategoriasFiltradas.length === 1) {
                    setSelectedSubCategoria(subcategoriasFiltradas[0].nombre);
                    setSearchSubCategoria('');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!!selectedSubCategoria}
              />
              
              {/* Indicador de resultados */}
              {searchSubCategoria && !selectedSubCategoria && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 bg-white px-1">
                  {subcategoriasFiltradas.length} resultado{subcategoriasFiltradas.length !== 1 ? 's' : ''}
                </div>
              )}
              
              {/* Lista desplegable de subcategorías filtradas */}
              {(isSubCategoriaFocused || searchSubCategoria) && !selectedSubCategoria && subcategoriasFiltradas.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {subcategoriasFiltradas.map(categoria => (
                    <button
                      key={categoria.idCategoria}
                      onClick={() => {
                        setSelectedSubCategoria(categoria.nombre);
                        setSearchSubCategoria('');
                        setIsSubCategoriaFocused(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                      type="button"
                    >
                      {categoria.nombre}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Mostrar subcategoría seleccionada */}
              {selectedSubCategoria && !searchSubCategoria && (
                <div className="absolute inset-0 px-3 py-2 bg-purple-50 border border-purple-300 rounded-lg flex items-center justify-between">
                  <span className="text-purple-800 font-medium">📂 {selectedSubCategoria}</span>
                  <button
                    onClick={() => {
                      setSelectedSubCategoria('');
                      setSearchSubCategoria('');
                    }}
                    className="text-purple-600 hover:text-purple-800"
                    title="Limpiar selección"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {/* Mensaje cuando no hay resultados */}
              {searchSubCategoria && subcategoriasFiltradas.length === 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-center text-gray-500 text-sm">
                  No se encontraron subcategorías
                </div>
              )}
            </div>
          )}

          {/* Filtro de segunda subcategoría - solo se muestra si hay una subcategoría seleccionada */}
          {selectedSubCategoria && (
            <div className="relative" ref={subcategoria2Ref}>
              <input
                type="text"
                placeholder={selectedSubCategoria2 ? "2da subcategoría seleccionada" : "📁 Buscar Sub Categoria 2"}
                value={searchSubCategoria2}
                onChange={(e) => setSearchSubCategoria2(e.target.value)}
                onFocus={() => setIsSubCategoria2Focused(true)}
                onBlur={() => setTimeout(() => setIsSubCategoria2Focused(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchSubCategoria2('');
                  } else if (e.key === 'Enter' && segundasSubcategoriasFiltradas.length === 1) {
                    setSelectedSubCategoria2(segundasSubcategoriasFiltradas[0]);
                    setSearchSubCategoria2('');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!!selectedSubCategoria2}
              />
              
              {/* Indicador de resultados */}
              {searchSubCategoria2 && !selectedSubCategoria2 && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 bg-white px-1">
                  {segundasSubcategoriasFiltradas.length} resultado{segundasSubcategoriasFiltradas.length !== 1 ? 's' : ''}
                </div>
              )}
              
              {/* Lista desplegable de segundas subcategorías filtradas */}
              {(isSubCategoria2Focused || searchSubCategoria2) && !selectedSubCategoria2 && segundasSubcategoriasFiltradas.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {segundasSubcategoriasFiltradas.map(nombre => (
                    <button
                      key={nombre}
                      onClick={() => {
                        setSelectedSubCategoria2(nombre);
                        setSearchSubCategoria2('');
                        setIsSubCategoria2Focused(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                      type="button"
                    >
                      {nombre}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Mostrar segunda subcategoría seleccionada */}
              {selectedSubCategoria2 && !searchSubCategoria2 && (
                <div className="absolute inset-0 px-3 py-2 bg-orange-50 border border-orange-300 rounded-lg flex items-center justify-between">
                  <span className="text-orange-800 font-medium">📁 {selectedSubCategoria2}</span>
                  <button
                    onClick={() => {
                      setSelectedSubCategoria2('');
                      setSearchSubCategoria2('');
                    }}
                    className="text-orange-600 hover:text-orange-800"
                    title="Limpiar selección"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {/* Mensaje cuando no hay resultados */}
              {searchSubCategoria2 && segundasSubcategoriasFiltradas.length === 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-center text-gray-500 text-sm">
                  No se encontraron segundas subcategorías
                </div>
              )}
            </div>
          )}

          <select
            value={selectedStock}
            onChange={(e) => setSelectedStock(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">📦 Todo el stock</option>
            <option value="normal">✅ Normal</option>
            <option value="critico">⚠️ Crítico</option>
            <option value="sin-stock">❌ Sin stock</option>
          </select>
        </div>

        {/* Tercera fila: Total y botón limpiar */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600 flex items-center gap-2 flex-wrap">
            <span>Total: {productosFiltrados.length} productos</span>
          </div>

          {/* Botón para limpiar todos los filtros */}
          {(searchTerm || selectedCategoriaPrincipal || selectedSubCategoria || selectedSubCategoria2 || selectedTipoPublico || selectedProveedor || selectedStock || searchCategoriaPrincipal || searchSubCategoria || searchSubCategoria2) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategoriaPrincipal('');
                setSelectedSubCategoria('');
                setSelectedSubCategoria2('');
                setSelectedTipoPublico('');
                setSelectedStock('');
                setSearchCategoriaPrincipal('');
                setSearchSubCategoria('');
                setSearchSubCategoria2('');
                setSelectedProveedor('');
              }}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla de productos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría Principal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sub Categoría 
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sub Categoría 2
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Público
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marca
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio Unitario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio Cuarto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio ½ Docena
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio Docena
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productosPaginados.map((producto) => (
                <tr key={producto.idProducto} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {producto.codigoIdentificacion}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{producto.nombre}</div>
                      {producto.codigoBarras && (
                        <div className="text-xs text-blue-600 font-mono">📊 {producto.codigoBarras}</div>
                      )}
                      {producto.descripcion && (
                        <div className="text-sm text-gray-500">{producto.descripcion}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producto.categoriaPadre?.nombre ?? '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producto.categoria?.nombre ?? '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producto.subCategoria2?.nombre ?? '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producto.tipoPublico === 'ADULTO' ? 'Adulto' : 'Niño'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producto.marca ?? 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producto.proveedor.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="font-semibold text-green-600">S/ {producto.precioUnitario.toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producto.precioCuarto ? (
                      <span className="text-blue-600">S/ {producto.precioCuarto.toFixed(2)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producto.precioMediaDocena ? (
                      <span className="text-purple-600">S/ {producto.precioMediaDocena.toFixed(2)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producto.precioDocena ? (
                      <span className="text-orange-600">S/ {producto.precioDocena.toFixed(2)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const cantidad = producto.cantidadTotal ?? 0;
                      let claseStock = '';
                      if (cantidad > 10) {
                        claseStock = 'bg-green-100 text-green-800';
                      } else if (cantidad > 0) {
                        claseStock = 'bg-yellow-100 text-yellow-800';
                      } else {
                        claseStock = 'bg-red-100 text-red-800';
                      }
                      
                      return (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${claseStock}`}>
                          {cantidad}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setProductoVariantes(producto);
                          setShowVariantes(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="Gestionar Variantes"
                      >
                        <Package className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setProductoEditar(producto);
                          setShowFormulario(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => producto.idProducto && solicitarEliminarProducto(producto.idProducto)}
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

        {/* Paginación visual igual a usuarios/reportes */}
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

      {/* Modales */}
      {showFormulario && (
        <FormularioProductoUnificado
          producto={productoEditar}
          categorias={categorias}
          proveedores={proveedores}
          onClose={() => {
            setShowFormulario(false);
            setProductoEditar(null);
          }}
          onProductoGuardado={handleProductoGuardado}
        />
      )}

      {showVariantes && productoVariantes && (
        <GestionVariantes
          producto={productoVariantes}
          onClose={() => {
            setShowVariantes(false);
            setProductoVariantes(null);
          }}
          onVariantesActualizadas={cargarDatos}
        />      )}

      <ConfirmModal
        open={confirmModalOpen}
        message="¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer."
        onConfirm={confirmarEliminarProducto}
        onCancel={cancelarEliminarProducto}
      />
    </div>
  );
};

const ConfirmModal: React.FC<{
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, message, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm relative">
        <button onClick={onCancel} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
        <div className="text-lg font-semibold mb-4 text-center">Confirmar acción</div>
        <div className="mb-6 text-center text-gray-700">{message}</div>
        <div className="flex justify-center gap-4">
          <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium">Cancelar</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium">Eliminar</button>
        </div>
      </div>
    </div>
  );
};

export default GestionProductos;
