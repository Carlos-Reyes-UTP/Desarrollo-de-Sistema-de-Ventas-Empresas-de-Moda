import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Producto } from '../../types/Producto';
import type { Categoria } from '../../types/Categoria';
import type { Proveedor } from '../../types/Proveedor';
import { ProductoService } from '../../services/ProductoService';
import { CategoriaService } from '../../services/CategoriaService';
import { ProveedorService } from '../../services/ProveedorService';
import { ConfirmModal, TableSkeleton, Skeleton, PageHeader, PageHeaderMetaChip, PageActionButton, PageActionGroup, MaterialIcon } from '@/shared/ui';
import { SubViewTransition } from '@/shared/ui/SubViewTransition';
import { getProductTabIndex } from '@/shared/layout/pageTransitionConfig';
import FormularioProducto from './FormularioProducto'
import GestionVariantes from './GestionVariantes';
import GestionPisos from '../almacen/GestionPisos';
import { useAuth } from '@/context/AuthContext';
import { useAccesoAreaAlmacen } from '@/hooks/useAccesoAreaAlmacen';

const GestionProductos: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { tieneRol } = useAuth();
  const puedeVerPisos = tieneRol('ROLE_ALMACENERO');
  const tabActual =
    tabParam === 'pisos' && puedeVerPisos ? 'pisos' : 'catalogo';
  const { acceso: accesoAreaAlmacen, etiquetaStock } = useAccesoAreaAlmacen(true);

  const sectorParaApi = useMemo(() => {
    if (accesoAreaAlmacen?.restriccionTrasladoMismaAreaCatalogo) {
      return accesoAreaAlmacen.sectoresVisibles[0] ?? undefined;
    }
    return undefined;
  }, [accesoAreaAlmacen]);

  const etiquetaColumnaStock = useMemo(() => {
    if (accesoAreaAlmacen?.restriccionTrasladoMismaAreaCatalogo && sectorParaApi) {
      return `Stock (${sectorParaApi})`;
    }
    return 'Nivel de Stock';
  }, [accesoAreaAlmacen, sectorParaApi]);

  const rolParaApiProductos = useMemo(() => {
    if (tieneRol('ROLE_ADMIN')) return 'ROLE_ADMIN';
    if (tieneRol('ROLE_ALMACENERO')) return 'ROLE_ALMACENERO';
    if (tieneRol('ROLE_SUPERVISOR_ALMACEN')) return 'ROLE_ALMACENERO';
    if (tieneRol('ROLE_VENDEDOR')) return 'ROLE_VENDEDOR';
    return undefined;
  }, [tieneRol]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoriaPrincipal, setSelectedCategoriaPrincipal] = useState<string>('');
  const [selectedSubCategoria, setSelectedSubCategoria] = useState<string>('');
  const [selectedStock, setSelectedStock] = useState<string>('');
  const [searchCategoriaPrincipal, setSearchCategoriaPrincipal] = useState<string>('');
  const [searchSubCategoria, setSearchSubCategoria] = useState<string>('');
  const [searchProveedor, setSearchProveedor] = useState<string>('');
  const [selectedProveedor, setSelectedProveedor] = useState<string>('');

  const [showFormulario, setShowFormulario] = useState(false);
  const [showVariantes, setShowVariantes] = useState(false);
  const [productoEditar, setProductoEditar] = useState<Producto | null>(null);
  const [productoVariantes, setProductoVariantes] = useState<Producto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState<number | null>(null);
  const [isCategoriaPrincipalFocused, setIsCategoriaPrincipalFocused] = useState(false);
  const [isSubCategoriaFocused, setIsSubCategoriaFocused] = useState(false);
  const [isProveedorFocused, setIsProveedorFocused] = useState(false);

  // Referencias para los componentes de búsqueda
  const categoriaPrincipalRef = useRef<HTMLDivElement>(null);
  const subcategoriaRef = useRef<HTMLDivElement>(null);
  const proveedorRef = useRef<HTMLDivElement>(null);
  const datosInicialesCargadosRef = useRef(false);
  const busquedaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const omitirDebounceBusquedaRef = useRef(true);
  const tabAnteriorRef = useRef<'catalogo' | 'pisos'>('catalogo');



  const cargarSubcategorias = useCallback(async (nombreCategoriaPrincipal: string) => {
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
  }, [categorias]);
  // Estados de Paginación Server-Side
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [ultimaCargaLista, setUltimaCargaLista] = useState<string | null>(null);

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

  const proveedoresFiltradas = proveedores.filter(p =>
    searchProveedor === '' || 
    p.nombre.toLowerCase().includes(searchProveedor.toLowerCase())
  );

  const productosFiltrados = productos.filter((producto) => {
    const categoriaPrincipalNombre =
      producto.categoriaPadre?.nombre ??
      producto.categoria?.categoriaPadre?.nombre ??
      '';
    const subcategoriaNombre = producto.categoria?.nombre ?? '';
    const proveedorNombre = producto.proveedor?.nombre ?? '';
    const cantidad = producto.stockAlmacen ?? 0;

    const coincideCategoriaPrincipal =
      !selectedCategoriaPrincipal ||
      categoriaPrincipalNombre === selectedCategoriaPrincipal;
    const coincideSubCategoria =
      !selectedSubCategoria || subcategoriaNombre === selectedSubCategoria;
    const coincideProveedor =
      !selectedProveedor || proveedorNombre === selectedProveedor;
    const coincideStock =
      !selectedStock ||
      (selectedStock === 'sin-stock' && cantidad === 0) ||
      (selectedStock === 'critico' && cantidad >= 1 && cantidad <= 5) ||
      (selectedStock === 'normal' && cantidad > 5);

    return (
      coincideCategoriaPrincipal &&
      coincideSubCategoria &&
      coincideProveedor &&
      coincideStock
    );
  });


  const cargarFiltrosYDatos = useCallback(async (numeroPagina: number, busqueda: string) => {
    try {
      setLoading(true);
      
      // Cargar filtros solo si están vacíos
      if (categorias.length === 0 || proveedores.length === 0) {
        const [categoriasResponse, proveedoresResponse] = await Promise.all([
          CategoriaService.obtenerCategoriasPrincipales(),
          ProveedorService.obtenerTodosProveedores()
        ]);
        setCategorias(Array.isArray(categoriasResponse) ? categoriasResponse : []);
        setProveedores(Array.isArray(proveedoresResponse) ? proveedoresResponse : []);
      }

      // Cargar productos PAGINADOS desde el servidor (Evita N+1 y colapso de RAM)
      const paginaProductos = await ProductoService.getProductosPaginados(
        numeroPagina,
        20,
        busqueda,
        rolParaApiProductos,
        sectorParaApi
      );
      
      setProductos(paginaProductos.content || []);
      setTotalPages(paginaProductos.totalPages);
      setTotalElements(paginaProductos.totalElements);
      setPage(paginaProductos.pageNumber);
      setUltimaCargaLista(
        new Date().toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })
      );
      
    } catch (err) {
      setError('Error al cargar los datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [categorias.length, proveedores.length, rolParaApiProductos, sectorParaApi]);

  useEffect(() => {
    if (!datosInicialesCargadosRef.current) return;
    setPage(0);
    void cargarFiltrosYDatos(0, searchTerm);
  }, [sectorParaApi]);

  // Búsqueda en tiempo real (al escribir o borrar, sin Enter ni blur).
  useEffect(() => {
    if (!datosInicialesCargadosRef.current) return;
    if (omitirDebounceBusquedaRef.current) {
      omitirDebounceBusquedaRef.current = false;
      return;
    }

    if (busquedaDebounceRef.current) {
      clearTimeout(busquedaDebounceRef.current);
    }

    busquedaDebounceRef.current = setTimeout(() => {
      setPage(0);
      void cargarFiltrosYDatos(0, searchTerm);
    }, 300);

    return () => {
      if (busquedaDebounceRef.current) {
        clearTimeout(busquedaDebounceRef.current);
      }
    };
  }, [searchTerm, cargarFiltrosYDatos]);

  const cargarDatos = useCallback(() => {
    cargarFiltrosYDatos(page, searchTerm);
  }, [cargarFiltrosYDatos, page, searchTerm]);

  useEffect(() => {
    if (datosInicialesCargadosRef.current) {
      return;
    }

    datosInicialesCargadosRef.current = true;
    void cargarFiltrosYDatos(0, '');
  }, [cargarFiltrosYDatos]);

  useEffect(() => {
    if (tabActual === 'catalogo' && tabAnteriorRef.current === 'pisos') {
      cargarDatos();
    }
    tabAnteriorRef.current = tabActual;
  }, [tabActual, cargarDatos]);

  // Verificar si se debe abrir el modal automáticamente
  useEffect(() => {
    const openModal = searchParams.get('openModal');
    if (openModal === 'true') {
      setShowFormulario(true);
      const params = new URLSearchParams(searchParams);
      params.delete('openModal');
      setSearchParams(params);
    }
  }, [searchParams, setSearchParams]);

  // Aplicar filtro de stock desde URL
  useEffect(() => {
    const stockFilter = searchParams.get('stockFilter');
    if (stockFilter && (stockFilter === 'critico' || stockFilter === 'normal' || stockFilter === 'sin-stock')) {
      setSelectedStock(stockFilter);
      const params = new URLSearchParams(searchParams);
      params.delete('stockFilter');
      setSearchParams(params);
    }
  }, [searchParams, setSearchParams]);

  // Limpiar subcategoría cuando se cambia la categoría principal
  useEffect(() => {
    setSelectedSubCategoria('');
    setSearchSubCategoria('');
    if (selectedCategoriaPrincipal) {
      cargarSubcategorias(selectedCategoriaPrincipal);
    } else {
      setSubcategorias([]);
    }
  }, [selectedCategoriaPrincipal, cargarSubcategorias]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoriaPrincipalRef.current && !categoriaPrincipalRef.current.contains(event.target as Node)) {
        setIsCategoriaPrincipalFocused(false);
      }
      if (subcategoriaRef.current && !subcategoriaRef.current.contains(event.target as Node)) {
        setIsSubCategoriaFocused(false);
      }
      if (proveedorRef.current && !proveedorRef.current.contains(event.target as Node)) {
        setIsProveedorFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const limpiarFiltrosYRecargar = () => {
    setSearchTerm("");
    setSelectedCategoriaPrincipal("");
    setSelectedSubCategoria("");
    setSelectedProveedor("");
    setSelectedStock("");
    setSearchCategoriaPrincipal("");
    setSearchSubCategoria("");
    setSearchProveedor("");
    setPage(0);
    void cargarFiltrosYDatos(0, "");
  };

  const handleBuscar = () => {
    setPage(0);
    cargarFiltrosYDatos(0, searchTerm);
  };

  const handlePaginaAnterior = () => {
    if (page > 0) {
      const newPage = page - 1;
      setPage(newPage);
      cargarFiltrosYDatos(newPage, searchTerm);
    }
  };

  const handlePaginaSiguiente = () => {
    if (page < totalPages - 1) {
      const newPage = page + 1;
      setPage(newPage);
      cargarFiltrosYDatos(newPage, searchTerm);
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

  return (
    <div className="app-page p-4 sm:p-6 max-w-[1600px] mx-auto lg:bg-transparent font-sans pb-8">
      <PageHeader
        surface="elevated"
        eyebrow="Módulo · Inventario"
        title="Inventario"
        belowTitle={
          <>
            {accesoAreaAlmacen?.restriccionTrasladoMismaAreaCatalogo && etiquetaStock && (
              <PageHeaderMetaChip variant="context" icon="corporate_fare">
                Sector asignado: {etiquetaStock}
              </PageHeaderMetaChip>
            )}
            {tabActual === "catalogo" && ultimaCargaLista && (
              <>
                <PageHeaderMetaChip variant="stat">
                  {totalElements} producto{totalElements !== 1 ? "s" : ""} en catálogo
                </PageHeaderMetaChip>
                <PageHeaderMetaChip variant="muted">
                  Lista actualizada · {ultimaCargaLista}
                </PageHeaderMetaChip>
              </>
            )}
          </>
        }
        toolbar={
          <div className="space-y-3 min-w-0">
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-px snap-x snap-mandatory custom-scrollbar -mx-1 px-1">
              <button
                type="button"
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('tab');
                  setSearchParams(newParams);
                }}
                className={`shrink-0 snap-start min-h-10 px-4 py-2 text-xs sm:text-sm font-bold tracking-wide uppercase transition-all rounded-lg touch-manipulation whitespace-nowrap ${
                  tabActual === 'catalogo'
                    ? 'app-btn-primary shadow-sm'
                    : 'app-text-muted hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]'
                }`}
              >
                Catálogo principal
              </button>
              {puedeVerPisos && (
                <button
                  type="button"
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set('tab', 'pisos');
                    setSearchParams(newParams);
                  }}
                  className={`shrink-0 snap-start min-h-10 px-4 py-2 text-xs sm:text-sm font-bold tracking-wide uppercase transition-all rounded-lg touch-manipulation whitespace-nowrap ${
                    tabActual === 'pisos'
                      ? 'app-btn-primary shadow-sm'
                      : 'app-text-muted hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]'
                  }`}
                >
                  Pisos y áreas
                </button>
              )}
            </div>
          </div>
        }
        actions={
          tabActual === "catalogo" ? (
            <PageActionGroup>
              <PageActionButton grouped variant="secondary" onClick={() => {}}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Exportar Lista
              </PageActionButton>
              <PageActionButton grouped onClick={() => setShowFormulario(true)}>
                <MaterialIcon icon="add" className="w-4 h-4" />
                Nuevo Producto
              </PageActionButton>
            </PageActionGroup>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-8 px-4 py-3 bg-red-50 text-red-600 text-sm font-medium border border-red-100 rounded-xl flex items-start animate-fadeIn">
           <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
           </svg>
          <span>{error}</span>
        </div>
      )}

      <SubViewTransition
        viewKey={tabActual}
        pattern="shared-x"
        indexOf={getProductTabIndex}
      >
      {tabActual === 'pisos' ? (
        <GestionPisos embedded />
      ) : (
        <>
          {/* Filters and Search Bar */}
          <div className="bg-app-surface rounded-[1.5rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-8 mb-10 border border-app-border">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-8 items-end">
          
          {/* Search Input - Taking more space */}
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
              Buscar Producto
            </label>
            <div className="relative">
              <MaterialIcon icon="search" className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Nombre o Código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (busquedaDebounceRef.current) {
                      clearTimeout(busquedaDebounceRef.current);
                    }
                    handleBuscar();
                  }
                }}
                className="w-full pl-11 pr-4 py-3 bg-app-input border-transparent rounded-xl text-sm focus:bg-app-surface focus:ring-2 focus:ring-app-ring transition-all font-medium"
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
              className={`relative cursor-pointer ${selectedCategoriaPrincipal ? 'bg-app-accent text-app-accent-fg' : 'bg-app-input text-app-text'} rounded-xl py-3 px-4 flex items-center justify-between transition-all`}
            >
              <span className="text-sm font-bold truncate">
                {selectedCategoriaPrincipal || "Todas las categorías"}
              </span>

              {selectedCategoriaPrincipal ? (
                <MaterialIcon 
                  icon="close"
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
              <div className="absolute z-20 w-full mt-2 bg-app-surface border border-app-border rounded-xl shadow-xl max-h-60 overflow-y-auto p-2 animate-fadeIn">
                <input
                  type="text"
                  autoFocus
                  placeholder="Filtrar..."
                  value={searchCategoriaPrincipal}
                  onChange={(e) => setSearchCategoriaPrincipal(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-app-bg-muted rounded-lg mb-2 focus:outline-none text-app-text"
                />

                {categoriasPrincipalesFiltradas.map(categoria => (
                  <button
                    key={categoria.idCategoria}
                    onClick={() => {
                      setSelectedCategoriaPrincipal(categoria.nombre);
                      setSearchCategoriaPrincipal('');
                      setIsCategoriaPrincipalFocused(false);
                      // handleBuscar(); // Idealmente recargar con filtro server-side
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-app-hover-overlay text-app-text rounded-lg transition-colors font-medium"
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
              className={`relative ${!selectedCategoriaPrincipal ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${selectedSubCategoria ? 'bg-app-accent text-app-accent-fg' : 'bg-app-input text-app-text'} rounded-xl py-3 px-4 flex items-center justify-between transition-all`}
            >
              <span className="text-sm font-bold truncate">
                {selectedSubCategoria || "Subcategorías"}
              </span>

              {selectedSubCategoria ? (
                <MaterialIcon 
                  icon="close"
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
              <div className="absolute z-20 w-full mt-2 bg-app-surface border border-app-border rounded-xl shadow-xl max-h-60 overflow-y-auto p-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Filtrar..."
                  value={searchSubCategoria}
                  onChange={(e) => setSearchSubCategoria(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-app-bg-muted rounded-lg mb-2 focus:outline-none text-app-text"
                />

                {subcategoriasFiltradas.map(categoria => (
                  <button
                    key={categoria.idCategoria}
                    onClick={() => {
                      setSelectedSubCategoria(categoria.nombre);
                      setSearchSubCategoria('');
                      setIsSubCategoriaFocused(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-app-hover-overlay text-app-text rounded-lg transition-colors font-medium"
                  >
                    {categoria.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Provider / Public Combined (Simplified for UI) */}
          <div className="lg:col-span-1 relative" ref={proveedorRef}>
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
              Proveedor
            </label>
            <div 
              onClick={() => !selectedProveedor && setIsProveedorFocused(true)}
              className={`relative cursor-pointer ${selectedProveedor ? 'bg-app-accent text-app-accent-fg' : 'bg-app-input text-app-text'} rounded-xl py-3 px-4 flex items-center justify-between transition-all`}
            >
              <span className="text-sm font-bold truncate">
                {selectedProveedor || "Cualquier Proveedor"}
              </span>

              {selectedProveedor ? (
                <MaterialIcon 
                  icon="close"
                  className="w-4 h-4 cursor-pointer hover:text-gray-300" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProveedor('');
                    setSearchProveedor('');
                  }}
                />
              ) : (
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>

            {/* Dropdown logic for Proveedor */}
            {isProveedorFocused && !selectedProveedor && (
              <div className="absolute z-20 w-full mt-2 bg-app-surface border border-app-border rounded-xl shadow-xl max-h-60 overflow-y-auto p-2 animate-fadeIn">
                <input
                  type="text"
                  autoFocus
                  placeholder="Filtrar..."
                  value={searchProveedor}
                  onChange={(e) => setSearchProveedor(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-app-bg-muted rounded-lg mb-2 focus:outline-none text-app-text"
                />

                {proveedoresFiltradas.map(p => (
                  <button
                    key={p.idProveedor}
                    type="button"
                    onClick={() => {
                      setSelectedProveedor(p.nombre);
                      setSearchProveedor('');
                      setIsProveedorFocused(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-app-hover-overlay rounded-lg transition-colors font-medium text-app-text"
                  >
                    {p.nombre}
                  </button>
                ))}

                {proveedoresFiltradas.length === 0 && (
                  <div className="px-3 py-2 text-xs text-gray-400 text-center">
                    No se encontraron proveedores
                  </div>
                )}
              </div>
            )}
          </div>


          {/* Botón Buscar explícito */}
          <div className="lg:col-span-2 flex flex-col justify-end h-full">
             <button
              onClick={handleBuscar}
              className="w-full py-3 bg-app-accent text-app-accent-fg rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-md hover:opacity-90"
            >
              Aplicar Búsqueda
            </button>
          </div>

        </div>
      </div>

      {/* Product Table Section */}
      <div className="bg-app-surface rounded-[1.5rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-app-border overflow-hidden">
        {/* Top Pagination Control */}
        <div className="px-8 py-4 border-b border-app-border flex justify-between items-center bg-app-surface">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Listado de Existencias</h3>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-1 bg-app-bg-muted p-1 rounded-xl border border-app-border scale-90 origin-right">
              <button
                onClick={handlePaginaAnterior}
                disabled={page === 0}
                className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest text-app-text-muted hover:text-app-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Atrás
              </button>
              
              <div className="px-4 py-1.5 text-[10px] font-mono font-bold text-app-text border-x border-app-border">
                {page + 1} / {totalPages}
              </div>

              <button
                onClick={handlePaginaSiguiente}
                disabled={page >= totalPages - 1}
                className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest text-app-text-muted hover:text-app-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                Sig.
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse table-zebra">
            <thead>
              <tr className="bg-app-surface border-b border-app-border">
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
                  {etiquetaColumnaStock}
                </th>
                <th className="px-8 py-6 text-right text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-app-border">
              {loading ? (
                Array.from({ length: 8 }, (_, row) => (
                  <tr key={`sk-${row}`}>
                    {Array.from({ length: 5 }, (_, col) => (
                      <td key={col} className="px-8 py-6">
                        <Skeleton className={`h-4 ${col === 0 ? 'w-32' : col === 1 ? 'w-48' : 'w-20'}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : productosFiltrados.map((producto) => {
                const cantidad = producto.stockAlmacen ?? 0;
                let stockStatus = { color: 'bg-gray-400', label: 'SIN STOCK', text: 'text-gray-400' };
                
                if (cantidad > 10) {
                  stockStatus = { color: 'bg-[#10b981]', label: 'ÓPTIMO', text: 'text-[#10b981]' };
                } else if (cantidad >= 6) {
                  stockStatus = { color: 'bg-[#f59e0b]', label: 'MEDIO', text: 'text-[#f59e0b]' };
                } else if (cantidad >= 1) {
                  stockStatus = { color: 'bg-[#ef4444]', label: 'CRÍTICO', text: 'text-[#ef4444]' };
                }

                return (
                  <tr key={producto.idProducto} className="hover:bg-app-hover-overlay transition-colors duration-150 group">
                    {/* Code & Identity */}
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-app-text mb-1">{producto.codigoIdentificacion}</span>
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
                        <div className="w-12 h-12 rounded-xl bg-app-bg-muted flex items-center justify-center p-2 group-hover:bg-app-surface border border-transparent group-hover:border-app-border transition-all shadow-sm">
                          <MaterialIcon icon="package" className="w-6 h-6 text-gray-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-app-text leading-tight mb-1">
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
                          <span className="text-sm font-bold text-app-text">S/ {(producto.precioUnitario ?? 0).toFixed(2)}</span>
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
                            <span className="text-sm font-black text-app-text">{cantidad}</span>
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
                          className="p-2.5 hover:bg-app-accent hover:text-app-accent-fg rounded-xl transition-all text-app-text-muted shadow-sm hover:shadow-md border border-transparent"
                          title="Detalles de Stock"
                        >
                          <MaterialIcon icon="package" className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setProductoEditar(producto);
                            setShowFormulario(true);
                          }}
                          className="p-2.5 hover:bg-app-accent hover:text-app-accent-fg rounded-xl transition-all text-app-text-muted shadow-sm hover:shadow-md border border-transparent"
                          title="Editar"
                        >
                          <MaterialIcon icon="edit" className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => producto.idProducto && solicitarEliminarProducto(producto.idProducto)}
                          className="p-2.5 hover:bg-red-500 hover:text-white rounded-xl transition-all text-red-400 shadow-sm hover:shadow-md border border-transparent"
                          title="Eliminar"
                        >
                          <MaterialIcon icon="delete" className="w-4 h-4" />
                        </button>

                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {loading && productos.length === 0 && (
          <TableSkeleton rows={8} columns={5} className="rounded-none border-0 shadow-none" />
        )}
          
          {productosFiltrados.length === 0 && !loading && (
            <div className="text-center py-16 px-4 border-t border-app-border bg-app-surface-elevated">
              <MaterialIcon icon="package" className="mx-auto h-14 w-14 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-app-text">No hay productos que coincidan</h3>
              <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                Prueba otra búsqueda, ajusta los filtros o crea un producto nuevo en el catálogo.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowFormulario(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-app-accent px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-app-accent-fg shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  <MaterialIcon icon="add" className="h-4 w-4" />
                  Nuevo producto
                </button>
                <button
                  type="button"
                  onClick={limpiarFiltrosYRecargar}
                  className="inline-flex items-center gap-2 rounded-xl border border-app-border bg-app-surface px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-app-text shadow-sm transition-all hover:bg-app-hover-overlay active:scale-[0.98]"
                >
                  Limpiar filtros y recargar
                </button>
              </div>
            </div>
          )}

        {/* Improved Pagination / Footer SERVER SIDE */}
        {totalPages > 0 && (
          <div className="px-8 py-6 bg-app-bg-muted flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Mostrando página <span className="text-app-text">{page + 1}</span> de <span className="text-app-text">{totalPages}</span> ({totalElements} totales)
            </p>
            
            <div className="flex items-center gap-1 bg-app-surface p-1 rounded-[14px] shadow-sm border border-app-border">
              <button
                onClick={handlePaginaAnterior}
                disabled={page === 0}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-app-text-muted hover:text-app-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              
              <div className="px-4 py-2 text-[12px] font-bold text-app-text border-x border-app-border">
                Pág. {page + 1}
              </div>

              <button
                onClick={handlePaginaSiguiente}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-app-text-muted hover:text-app-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

        {/* Cierre de la vista Catálogo */}
        </>
      )}
      </SubViewTransition>

      {/* Modales */}
      {showFormulario && (
        <FormularioProducto
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
        />
      )}

      <ConfirmModal
        open={confirmModalOpen}
        message="¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer."
        onConfirm={confirmarEliminarProducto}
        onCancel={cancelarEliminarProducto}
      />
    </div>
  );
};

export default GestionProductos;
