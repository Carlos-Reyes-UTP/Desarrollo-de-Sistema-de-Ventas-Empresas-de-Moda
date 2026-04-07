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
  const [selectedTipoPublico, setSelectedTipoPublico] = useState<string>('');
  const [selectedStock, setSelectedStock] = useState<string>('');
  const [searchCategoriaPrincipal, setSearchCategoriaPrincipal] = useState<string>('');
  const [searchSubCategoria, setSearchSubCategoria] = useState<string>('');
  const [selectedProveedor, setSelectedProveedor] = useState<string>('');

  const [showFormulario, setShowFormulario] = useState(false);
  const [showVariantes, setShowVariantes] = useState(false);
  const [productoEditar, setProductoEditar] = useState<Producto | null>(null);
  const [productoVariantes, setProductoVariantes] = useState<Producto | null>(null);  const [error, setError] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState<number | null>(null);
  const [isCategoriaPrincipalFocused, setIsCategoriaPrincipalFocused] = useState(false);
  const [isSubCategoriaFocused, setIsSubCategoriaFocused] = useState(false);

  // Referencias para los componentes de búsqueda
  const categoriaPrincipalRef = useRef<HTMLDivElement>(null);
  const subcategoriaRef = useRef<HTMLDivElement>(null);



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


  // Manejar clics fuera de los componentes de búsqueda para cerrar las listas

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoriaPrincipalRef.current && !categoriaPrincipalRef.current.contains(event.target as Node)) {
        setIsCategoriaPrincipalFocused(false);
      }
      if (subcategoriaRef.current && !subcategoriaRef.current.contains(event.target as Node)) {
        setIsSubCategoriaFocused(false);
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
        case 'bajo':
          matchStock = cantidad >= 6 && cantidad <= 10;
          break;
        case 'critico':
          matchStock = cantidad >= 1 && cantidad <= 5;
          break;
        case 'sin-stock':
          matchStock = cantidad === 0;
          break;
      }
    }
    
    return matchBusqueda && matchCategoriaPrincipal && matchSubCategoria && matchTipoPublico && matchProveedor && matchStock;
  });


  // Paginación de productos
  const [paginaActual, setPaginaActual] = useState(1);
  const productosPorPagina = 10;
  const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);

  // Resetear página al cambiar filtros o búsqueda
  useEffect(() => {
    setPaginaActual(1);
  }, [searchTerm, selectedCategoriaPrincipal, selectedSubCategoria, selectedTipoPublico, selectedProveedor, selectedStock]);


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
    <div className="p-8 bg-[#fafafa] min-h-screen font-sans text-gray-900">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-[2.5rem] font-bold tracking-tight text-black leading-none mb-2">
            Gestión de productos
          </h1>
          <p className="text-gray-500 text-sm max-w-md font-medium">
            Sincronización avanzada de precios multinivel y stock para el ecosistema DK-SYSTEM.
          </p>
        </div>

        
        <div className="flex items-center gap-3">
          <button
            onClick={() => {/* Lógica de exportación si existe */}}
            className="bg-white hover:bg-gray-50 text-gray-900 px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm border border-gray-100 transition-all font-bold text-xs uppercase tracking-wider"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar Lista
          </button>

          
          <button
            onClick={() => setShowFormulario(true)}
            className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all font-bold text-xs uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </button>

        </div>
      </div>

      {error && (
        <div className="mb-8 px-4 py-3 bg-red-50 text-red-600 text-sm font-medium border border-red-100 rounded-xl flex items-start animate-fadeIn">
           <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
           </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-[1.5rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-8 mb-10 border border-gray-50">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-8 items-end">
          
          {/* Search Input - Taking more space */}
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
              Buscar Producto
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Nombre o Código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}

                className="w-full pl-11 pr-4 py-3 bg-[#f8f8f8] border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all font-medium"
              />
            </div>
          </div>

          {/* Primary Category */}
          <div className="lg:col-span-1 relative" ref={categoriaPrincipalRef}>
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
              Categoría Principal
            </label>
            <div 
              onClick={() => !selectedCategoriaPrincipal && setIsCategoriaPrincipalFocused(true)}
              className={`relative cursor-pointer ${selectedCategoriaPrincipal ? 'bg-black text-white' : 'bg-[#f8f8f8] text-gray-900'} rounded-xl py-3 px-4 flex items-center justify-between transition-all`}
            >
              <span className="text-sm font-bold truncate">
                {selectedCategoriaPrincipal || "Departamentos"}
              </span>

              {selectedCategoriaPrincipal ? (
                <X 
                  className="w-4 h-4 cursor-pointer hover:text-gray-300" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCategoriaPrincipal('');
                    setSearchCategoriaPrincipal('');
                  }}
                />
              ) : (
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>

            {/* Dropdown logic for Categoria Principal */}
            {isCategoriaPrincipalFocused && !selectedCategoriaPrincipal && (
              <div className="absolute z-20 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto p-2 animate-fadeIn">
                <input
                  type="text"
                  autoFocus
                  placeholder="Filtrar..."
                  value={searchCategoriaPrincipal}
                  onChange={(e) => setSearchCategoriaPrincipal(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 rounded-lg mb-2 focus:outline-none"
                />

                {categoriasPrincipalesFiltradas.map(categoria => (
                  <button
                    key={categoria.idCategoria}
                    onClick={() => {
                      setSelectedCategoriaPrincipal(categoria.nombre);
                      setSearchCategoriaPrincipal('');
                      setIsCategoriaPrincipalFocused(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-lg transition-colors font-medium"
                  >
                    {categoria.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Subcategory */}
          <div className="lg:col-span-1 relative" ref={subcategoriaRef}>
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
              Subcategoría
            </label>
            <div 
              onClick={() => selectedCategoriaPrincipal && !selectedSubCategoria && setIsSubCategoriaFocused(true)}
              className={`relative ${!selectedCategoriaPrincipal ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${selectedSubCategoria ? 'bg-gray-800 text-white' : 'bg-[#f8f8f8] text-gray-900'} rounded-xl py-3 px-4 flex items-center justify-between transition-all`}
            >
              <span className="text-sm font-bold truncate">
                {selectedSubCategoria || "Subcategorías"}
              </span>

              {selectedSubCategoria ? (
                <X 
                  className="w-4 h-4 cursor-pointer hover:text-gray-300" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSubCategoria('');
                    setSearchSubCategoria('');
                  }}
                />
              ) : (
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>

            {isSubCategoriaFocused && selectedCategoriaPrincipal && !selectedSubCategoria && (
              <div className="absolute z-20 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto p-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Filtrar..."
                  value={searchSubCategoria}
                  onChange={(e) => setSearchSubCategoria(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 rounded-lg mb-2 focus:outline-none"
                />

                {subcategoriasFiltradas.map(categoria => (
                  <button
                    key={categoria.idCategoria}
                    onClick={() => {
                      setSelectedSubCategoria(categoria.nombre);
                      setSearchSubCategoria('');
                      setIsSubCategoriaFocused(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-lg transition-colors font-medium"
                  >
                    {categoria.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Provider / Public Combined (Simplified for UI) */}
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
              Proveedor / Público
            </label>
            <select
              value={selectedProveedor}
              onChange={(e) => setSelectedProveedor(e.target.value)}
              className="w-full px-4 py-3 bg-[#f8f8f8] border-transparent rounded-xl text-sm font-bold focus:ring-2 focus:ring-gray-100 transition-all appearance-none cursor-pointer"
            >
              <option value="">Cualquier Proveedor</option>
              {proveedores.map(p => <option key={p.idProveedor} value={p.nombre}>{p.nombre}</option>)}
            </select>
          </div>


          {/* Adult Toggle */}
          <div className="lg:col-span-1 flex flex-col">
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3 text-center">
              Público
            </label>
            <div className="flex bg-[#f8f8f8] p-1 rounded-xl">
              <button 
                onClick={() => setSelectedTipoPublico(selectedTipoPublico === 'ADULTO' ? '' : 'ADULTO')}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${selectedTipoPublico === 'ADULTO' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}
              >
                Adulto
              </button>
              <button 
                onClick={() => setSelectedTipoPublico(selectedTipoPublico === 'NIÑO' ? '' : 'NIÑO')}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${selectedTipoPublico === 'NIÑO' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}
              >
                Niño
              </button>
            </div>
          </div>


          {/* Critical Stock Toggle */}
          <div className="lg:col-span-1 flex items-center justify-center gap-3 mb-1">
            <div 
              onClick={() => setSelectedStock(selectedStock === 'critico' ? '' : 'critico')}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${selectedStock === 'critico' ? 'bg-black' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${selectedStock === 'critico' ? 'left-7' : 'left-1'}`}></div>
            </div>
            <span className="text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">
              Stock Crítico
            </span>

          </div>

        </div>
      </div>

      {/* Product Table Section */}
      <div className="bg-white rounded-[1.5rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">
                  Código e Identidad
                </th>
                <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">
                  Nombre del Producto
                </th>
                <th className="px-8 py-6 text-center text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">
                  Matriz de Precios (U/C/M/D)
                </th>
                <th className="px-8 py-6 text-left text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">
                  Nivel de Stock
                </th>
                <th className="px-8 py-6 text-right text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {productosPaginados.map((producto) => {
                const cantidad = producto.cantidadTotal ?? 0;
                let stockStatus = { color: 'bg-gray-400', label: 'SIN STOCK', text: 'text-gray-400' };
                
                if (cantidad > 10) {
                  stockStatus = { color: 'bg-[#10b981]', label: 'ÓPTIMO', text: 'text-[#10b981]' };
                } else if (cantidad >= 6) {
                  stockStatus = { color: 'bg-[#f59e0b]', label: 'MEDIO', text: 'text-[#f59e0b]' };
                } else if (cantidad >= 1) {
                  stockStatus = { color: 'bg-[#ef4444]', label: 'CRÍTICO', text: 'text-[#ef4444]' };
                }


                return (
                  <tr key={producto.idProducto} className="hover:bg-[#fafafa] transition-colors group">
                    {/* Code & Identity */}
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-black mb-1">{producto.codigoIdentificacion}</span>
                        <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M4 8h12m4 8h.01M4 16h4m12 0h2" />
                          </svg>
                          <span className="text-[10px] font-mono font-medium tracking-tight">
                            {producto.codigoBarras || "SIN BARRAS"}
                          </span>

                        </div>
                      </div>
                    </td>

                    {/* Product Name & Thumbnail */}
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center p-2 group-hover:bg-white border border-transparent group-hover:border-gray-100 transition-all shadow-sm">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-black leading-tight mb-1">
                            {producto.nombre}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            {(producto.categoriaPadre?.nombre || 'General') + ' • ' + (producto.categoria?.nombre || 'Sin categoría')}
                          </span>

                        </div>
                      </div>
                    </td>

                    {/* Pricing Matrix */}
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-center gap-6">
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-bold text-gray-300 uppercase mb-1">Unid</span>
                          <span className="text-sm font-bold text-gray-900">S/ {producto.precioUnitario.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-bold text-gray-300 uppercase mb-1">Cto</span>
                          <span className="text-sm font-bold text-gray-500">S/ {(producto.precioCuarto || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-bold text-gray-300 uppercase mb-1">1/2 D</span>
                          <span className="text-sm font-bold text-gray-500">S/ {(producto.precioMediaDocena || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-bold text-gray-300 uppercase mb-1">Doc</span>
                          <span className="text-sm font-bold text-gray-500">S/ {(producto.precioDocena || 0).toFixed(2)}</span>
                        </div>

                      </div>
                    </td>

                    {/* Stock Level */}
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${stockStatus.color}`}></div>
                        <div className="flex flex-col">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-black text-black">{cantidad}</span>
                            <span className={`text-[10px] font-bold ${stockStatus.text} tracking-widest`}>
                              {stockStatus.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setProductoVariantes(producto);
                            setShowVariantes(true);
                          }}
                          className="p-2.5 hover:bg-black hover:text-white rounded-xl transition-all text-gray-400 shadow-sm hover:shadow-md border border-transparent"
                          title="Detalles de Stock"
                        >
                          <Package className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setProductoEditar(producto);
                            setShowFormulario(true);
                          }}
                          className="p-2.5 hover:bg-black hover:text-white rounded-xl transition-all text-gray-400 shadow-sm hover:shadow-md border border-transparent"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => producto.idProducto && solicitarEliminarProducto(producto.idProducto)}
                          className="p-2.5 hover:bg-red-500 hover:text-white rounded-xl transition-all text-red-400 shadow-sm hover:shadow-md border border-transparent"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Improved Pagination / Footer */}
        <div className="px-8 py-6 bg-[#fafafa] flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Mostrando <span className="text-black">{productosPaginados.length}</span> de <span className="text-black">{productosFiltrados.length}</span> productos
          </p>

          
          <div className="flex items-center gap-1 bg-white p-1 rounded-[14px] shadow-sm border border-gray-100">
            <button
              onClick={() => setPaginaActual(Math.max(1, paginaActual - 1))}
              disabled={paginaActual === 1}
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>

            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => setPaginaActual(num)}
                  className={`w-9 h-9 flex items-center justify-center rounded-[10px] text-xs font-bold transition-all ${
                    paginaActual === num ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPaginaActual(Math.min(totalPaginas, paginaActual + 1))}
              disabled={paginaActual === totalPaginas}
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>

          </div>
        </div>
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

    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-[2rem] shadow-2xl p-10 w-full max-w-md relative animate-scaleIn">
        <div className="mb-6 w-12 h-1 bg-red-500"></div>
        <h2 className="text-2xl font-bold tracking-tight text-black mb-4 uppercase">
          Confirmar Eliminación
        </h2>

        <p className="text-gray-500 text-sm mb-10 leading-relaxed font-medium">
          {message}
        </p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel} 
            className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm} 
            className="flex-1 py-4 bg-black hover:bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg active:scale-[0.98]"
          >
            Confirmar
          </button>
        </div>

      </div>
    </div>
  );
};

export default GestionProductos;
