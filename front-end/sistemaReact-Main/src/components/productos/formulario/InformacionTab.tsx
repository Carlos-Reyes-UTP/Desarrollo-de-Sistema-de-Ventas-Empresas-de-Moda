import React, { useState } from 'react';
import { Search, FolderTree, Building2, X, Info, Barcode } from 'lucide-react';
import type { Categoria } from '../../../types/Categoria';
import type { Proveedor } from '../../../types/Proveedor';

interface InformacionTabProps {
  formData: {
    codigoIdentificacion: string;
    codigoBarras: string;
    nombre: string;
    sexo: string;
    tipoPublico: string;
    categoriaId: string;
    subcategoriaId: string;
    subCategoria2Id: string;
    marca: string;
    proveedorId: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    codigoIdentificacion: string;
    codigoBarras: string;
    nombre: string;
    sexo: string;
    tipoPublico: string;
    categoriaId: string;
    subcategoriaId: string;
    subCategoria2Id: string;
    marca: string;
    proveedorId: string;
    precioUnitario: string;
    precioCuarto: string;
    precioMediaDocena: string;
    precioDocena: string;
  }>>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  generarCodigoBarrasAutomatico: () => void;
  
  categorias: Categoria[];
  proveedores: Proveedor[];
  
  subcategorias: Categoria[];
  subCategorias2: Categoria[];
  
  handleCategoriaChange: (e: { target: { value: string } }) => void;
  handleSubcategoriaChange: (e: { target: { value: string } }) => void;
  
  categoriaSeleccionada: string;
  setCategoriaSeleccionada: React.Dispatch<React.SetStateAction<string>>;
  subcategoriaSeleccionada: string;
  setSubcategoriaSeleccionada: React.Dispatch<React.SetStateAction<string>>;
  subcategoria2Seleccionada: string;
  setSubcategoria2Seleccionada: React.Dispatch<React.SetStateAction<string>>;
  proveedorSeleccionado: string;
  setProveedorSeleccionado: React.Dispatch<React.SetStateAction<string>>;
}

export const InformacionTab: React.FC<InformacionTabProps> = ({
  formData,
  setFormData,
  handleInputChange,
  generarCodigoBarrasAutomatico,
  categorias,
  proveedores,
  subcategorias,
  subCategorias2,
  handleCategoriaChange,
  handleSubcategoriaChange,
  categoriaSeleccionada,
  setCategoriaSeleccionada,
  subcategoriaSeleccionada,
  setSubcategoriaSeleccionada,
  subcategoria2Seleccionada,
  setSubcategoria2Seleccionada,
  proveedorSeleccionado,
  setProveedorSeleccionado
}) => {
  // Estados locales para la búsqueda y filtrado interactivo en los dropdowns
  const [searchCategoria, setSearchCategoria] = useState('');
  const [searchSubcategoria, setSearchSubcategoria] = useState('');
  const [searchSubcategoria2, setSearchSubcategoria2] = useState('');
  const [searchProveedor, setSearchProveedor] = useState('');
  
  const [isCategoriaFocused, setIsCategoriaFocused] = useState(false);
  const [isSubcategoriaFocused, setIsSubcategoriaFocused] = useState(false);
  const [isSubcategoria2Focused, setIsSubcategoria2Focused] = useState(false);
  const [isProveedorFocused, setIsProveedorFocused] = useState(false);

  // Filtrado reactivo local
  const categoriasPrincipalesFiltradas = categorias
    .filter(categoria => !categoria.categoriaPadre)
    .filter(categoria => 
      searchCategoria === '' || 
      categoria.nombre.toLowerCase().includes(searchCategoria.toLowerCase())
    );

  const subcategoriasFiltradas = subcategorias.filter(categoria =>
    searchSubcategoria === '' || 
    categoria.nombre.toLowerCase().includes(searchSubcategoria.toLowerCase())
  );

  const subcategorias2Filtradas = subCategorias2.filter(categoria =>
    searchSubcategoria2 === '' || 
    categoria.nombre.toLowerCase().includes(searchSubcategoria2.toLowerCase())
  );

  const proveedoresFiltrados = proveedores.filter(proveedor =>
    searchProveedor === '' || 
    proveedor.nombre.toLowerCase().includes(searchProveedor.toLowerCase())
  );

  return (
    <div className="bg-gray-50 rounded-[1.5rem] p-8 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <h3 className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase mb-6">
        Información básica
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
            Código de identificación <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="codigoIdentificacion"
            value={formData.codigoIdentificacion}
            onChange={handleInputChange}
            className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-gray-200 focus:border-gray-200 transition-all shadow-sm"
            placeholder="Ingrese el código de identificación..."
            required
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
            Código de barras
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              name="codigoBarras"
              value={formData.codigoBarras}
              onChange={handleInputChange}
              placeholder="Código de barras (opcional)"
              className="flex-1 px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-gray-200 focus:border-gray-200 transition-all shadow-sm font-mono"
            />
            <button
              type="button"
              onClick={generarCodigoBarrasAutomatico}
              className="px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
              title="Generar código de barras automático"
            >
              <Barcode size={16} />
              Auto
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Se genera automáticamente si se deja vacío
          </p>
        </div>

        <div>
          <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
            Nombre del producto <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleInputChange}
            className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-gray-200 focus:border-gray-200 transition-all shadow-sm"
            placeholder="Ingrese el nombre del producto..."
            required
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
            Sexo <span className="text-red-500">*</span>
          </label>
          <select
            name="sexo"
            value={formData.sexo}
            onChange={handleInputChange}
            className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-gray-200 focus:border-gray-200 transition-all shadow-sm"
            required
          >
            <option value="">Seleccionar sexo</option>
            <option value="Hombre">Hombre</option>
            <option value="Mujer">Mujer</option>
            <option value="Unisex">Unisex</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
            Tipo de público <span className="text-red-500">*</span>
          </label>
          <select
            name="tipoPublico"
            value={formData.tipoPublico}
            onChange={handleInputChange}
            className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-gray-200 focus:border-gray-200 transition-all shadow-sm"
            required
          >
            <option value="">Seleccionar tipo de público</option>
            <option value="NIÑO">Niño</option>
            <option value="ADULTO">Adulto</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
            Marca <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="marca"
            value={formData.marca}
            onChange={handleInputChange}
            className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-gray-200 focus:border-gray-200 transition-all shadow-sm"
            placeholder="Ingrese la marca del producto..."
            required
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
            Categoría principal (nivel 1) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            {!categoriaSeleccionada && (
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            )}
            <input
              type="text"
              placeholder={categoriaSeleccionada ? "Categoría seleccionada" : "Buscar Categoría Principal..."}
              value={searchCategoria}
              onChange={(e) => setSearchCategoria(e.target.value)}
              onFocus={() => setIsCategoriaFocused(true)}
              onBlur={() => setTimeout(() => setIsCategoriaFocused(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchCategoria('');
                } else if (e.key === 'Enter' && categoriasPrincipalesFiltradas.length === 1) {
                  const categoria = categoriasPrincipalesFiltradas[0];
                  setCategoriaSeleccionada(categoria.nombre);
                  setFormData(prev => ({ ...prev, categoriaId: categoria.idCategoria?.toString() || '' }));
                  setSearchCategoria('');
                  handleCategoriaChange({ target: { value: categoria.idCategoria?.toString() || '' } });
                }
              }}
              className={`w-full ${!categoriaSeleccionada ? 'pl-10' : 'px-4'} py-3 bg-[#f8f8f8] border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-gray-200 focus:border-transparent transition-all`}
              disabled={!!categoriaSeleccionada}
              required
            />
            {searchCategoria && !categoriaSeleccionada && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 bg-white px-1">
                {categoriasPrincipalesFiltradas.length} resultado{categoriasPrincipalesFiltradas.length !== 1 ? 's' : ''}
              </div>
            )}
            
            {(isCategoriaFocused || searchCategoria) && !categoriaSeleccionada && categoriasPrincipalesFiltradas.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {categoriasPrincipalesFiltradas.map(categoria => (
                  <button
                    key={categoria.idCategoria}
                    onClick={() => {
                      setCategoriaSeleccionada(categoria.nombre);
                      setFormData(prev => ({ ...prev, categoriaId: categoria.idCategoria?.toString() || '' }));
                      setSearchCategoria('');
                      setIsCategoriaFocused(false);
                      handleCategoriaChange({ target: { value: categoria.idCategoria?.toString() || '' } });
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    type="button"
                  >
                    {categoria.nombre}
                  </button>
                ))}
              </div>
            )}
            
            {searchCategoria && categoriasPrincipalesFiltradas.length === 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-center text-gray-500 text-sm">
                No se encontraron categorías principales
              </div>
            )}
            
            {categoriaSeleccionada && !searchCategoria && (
              <div className="absolute inset-0 px-4 py-3 bg-black rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-white/60" />
                  <span className="text-white font-bold text-sm">{categoriaSeleccionada}</span>
                </div>
                <button
                  onClick={() => {
                    setCategoriaSeleccionada('');
                    setFormData(prev => ({ ...prev, categoriaId: '' }));
                    setSearchCategoria('');
                    handleCategoriaChange({ target: { value: '' } });
                  }}
                  className="text-white/60 hover:text-white transition-colors"
                  title="Limpiar selección"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {subcategorias.length > 0 && (
          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
              Subcategoría (nivel 2) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              {!subcategoriaSeleccionada && (
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
              )}
              <input
                type="text"
                placeholder={subcategoriaSeleccionada ? "Subcategoría seleccionada" : "Buscar Subcategoría..."}
                value={searchSubcategoria}
                onChange={(e) => setSearchSubcategoria(e.target.value)}
                onFocus={() => setIsSubcategoriaFocused(true)}
                onBlur={() => setTimeout(() => setIsSubcategoriaFocused(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchSubcategoria('');
                  } else if (e.key === 'Enter' && subcategoriasFiltradas.length === 1) {
                    const subcategoria = subcategoriasFiltradas[0];
                    setSubcategoriaSeleccionada(subcategoria.nombre);
                    setFormData(prev => ({ ...prev, subcategoriaId: subcategoria.idCategoria?.toString() || '' }));
                    setSearchSubcategoria('');
                    handleSubcategoriaChange({ target: { value: subcategoria.idCategoria?.toString() || '' } });
                  }
                }}
                className={`w-full ${!subcategoriaSeleccionada ? 'pl-10' : 'px-4'} py-3 bg-[#f8f8f8] border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-gray-200 focus:border-transparent transition-all`}
                disabled={!!subcategoriaSeleccionada}
                required
              />
              
              {searchSubcategoria && !subcategoriaSeleccionada && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 bg-white px-1">
                  {subcategoriasFiltradas.length} resultado{subcategoriasFiltradas.length !== 1 ? 's' : ''}
                </div>
              )}
              
              {(isSubcategoriaFocused || searchSubcategoria) && !subcategoriaSeleccionada && subcategoriasFiltradas.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {subcategoriasFiltradas.map(subcategoria => (
                    <button
                      key={subcategoria.idCategoria}
                      onClick={() => {
                        setSubcategoriaSeleccionada(subcategoria.nombre);
                        setFormData(prev => ({ ...prev, subcategoriaId: subcategoria.idCategoria?.toString() || '' }));
                        setSearchSubcategoria('');
                        setIsSubcategoriaFocused(false);
                        handleSubcategoriaChange({ target: { value: subcategoria.idCategoria?.toString() || '' } });
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                      type="button"
                    >
                      {subcategoria.nombre}
                    </button>
                  ))}
                </div>
              )}
              
              {subcategoriaSeleccionada && !searchSubcategoria && (
                <div className="absolute inset-0 px-4 py-3 bg-black rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-white/60" />
                    <span className="text-white font-bold text-sm">{subcategoriaSeleccionada}</span>
                  </div>
                  <button
                    onClick={() => {
                      setSubcategoriaSeleccionada('');
                      setFormData(prev => ({ ...prev, subcategoriaId: '' }));
                      setSearchSubcategoria('');
                      handleSubcategoriaChange({ target: { value: '' } });
                    }}
                    className="text-white/60 hover:text-white transition-colors"
                    title="Limpiar selección"
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {searchSubcategoria && subcategoriasFiltradas.length === 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-center text-gray-500 text-sm">
                  No se encontraron subcategorías
                </div>
              )}
            </div>
          </div>
        )}

        {subCategorias2.length > 0 && (
          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
              Segunda subcategoría (nivel 3) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              {!subcategoria2Seleccionada && (
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
              )}
              <input
                type="text"
                placeholder={subcategoria2Seleccionada ? "2da subcategoría seleccionada" : "Buscar Segunda Subcategoría..."}
                value={searchSubcategoria2}
                onChange={(e) => setSearchSubcategoria2(e.target.value)}
                onFocus={() => setIsSubcategoria2Focused(true)}
                onBlur={() => setTimeout(() => setIsSubcategoria2Focused(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchSubcategoria2('');
                  } else if (e.key === 'Enter' && subcategorias2Filtradas.length === 1) {
                    const subcategoria2 = subcategorias2Filtradas[0];
                    setSubcategoria2Seleccionada(subcategoria2.nombre);
                    setFormData(prev => ({ ...prev, subCategoria2Id: subcategoria2.idCategoria?.toString() || '' }));
                    setSearchSubcategoria2('');
                  }
                }}
                className={`w-full ${!subcategoria2Seleccionada ? 'pl-10' : 'px-4'} py-3 bg-[#f8f8f8] border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-gray-200 focus:border-transparent transition-all`}
                disabled={!!subcategoria2Seleccionada}
                required
              />
              
              {searchSubcategoria2 && !subcategoria2Seleccionada && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 bg-white px-1">
                  {subcategorias2Filtradas.length} resultado{subcategorias2Filtradas.length !== 1 ? 's' : ''}
                </div>
              )}
              
              {(isSubcategoria2Focused || searchSubcategoria2) && !subcategoria2Seleccionada && subcategorias2Filtradas.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {subcategorias2Filtradas.map(subcategoria2 => (
                    <button
                      key={subcategoria2.idCategoria}
                      onClick={() => {
                        setSubcategoria2Seleccionada(subcategoria2.nombre);
                        setFormData(prev => ({ ...prev, subCategoria2Id: subcategoria2.idCategoria?.toString() || '' }));
                        setSearchSubcategoria2('');
                        setIsSubcategoria2Focused(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                      type="button"
                    >
                      {subcategoria2.nombre}
                    </button>
                  ))}
                </div>
              )}
              
              {subcategoria2Seleccionada && !searchSubcategoria2 && (
                <div className="absolute inset-0 px-4 py-3 bg-black rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-white/60" />
                    <span className="text-white font-bold text-sm">{subcategoria2Seleccionada}</span>
                  </div>
                  <button
                    onClick={() => {
                      setSubcategoria2Seleccionada('');
                      setFormData(prev => ({ ...prev, subCategoria2Id: '' }));
                      setSearchSubcategoria2('');
                    }}
                    className="text-white/60 hover:text-white transition-colors"
                    title="Limpiar selección"
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {searchSubcategoria2 && subcategorias2Filtradas.length === 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-center text-gray-500 text-sm">
                  No se encontraron segundas subcategorías
                </div>
              )}
            </div>
          </div>
        )}

        {subcategorias.length > 0 && subCategorias2.length === 0 && formData.subcategoriaId && (
          <div className="md:col-span-2">
            <div className="bg-[#f8f8f8] rounded-xl p-3 border border-gray-100 flex items-start gap-2">
              <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-600">
                La subcategoría seleccionada no tiene categorías de nivel 3 disponibles.
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
            Proveedor <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            {!proveedorSeleccionado && (
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            )}
            <input
              type="text"
              placeholder={proveedorSeleccionado ? "Proveedor seleccionado" : "Buscar Proveedor..."}
              value={searchProveedor}
              onChange={(e) => setSearchProveedor(e.target.value)}
              onFocus={() => setIsProveedorFocused(true)}
              onBlur={() => setTimeout(() => setIsProveedorFocused(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchProveedor('');
                } else if (e.key === 'Enter' && proveedoresFiltrados.length === 1) {
                  const proveedor = proveedoresFiltrados[0];
                  setProveedorSeleccionado(proveedor.nombre);
                  setFormData(prev => ({ ...prev, proveedorId: proveedor.idProveedor?.toString() || '' }));
                  setSearchProveedor('');
                }
              }}
              className={`w-full ${!proveedorSeleccionado ? 'pl-10' : 'px-4'} py-3 bg-[#f8f8f8] border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-gray-200 focus:border-transparent transition-all`}
              disabled={!!proveedorSeleccionado}
              required
            />
            
            {searchProveedor && !proveedorSeleccionado && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 bg-white px-1">
                {proveedoresFiltrados.length} resultado{proveedoresFiltrados.length !== 1 ? 's' : ''}
              </div>
            )}
            
            {(isProveedorFocused || searchProveedor) && !proveedorSeleccionado && proveedoresFiltrados.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {proveedoresFiltrados.map(proveedor => (
                  <button
                    key={proveedor.idProveedor}
                    onClick={() => {
                      setProveedorSeleccionado(proveedor.nombre);
                      setFormData(prev => ({ ...prev, proveedorId: proveedor.idProveedor?.toString() || '' }));
                      setSearchProveedor('');
                      setIsProveedorFocused(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    type="button"
                  >
                    {proveedor.nombre}
                  </button>
                ))}
              </div>
            )}
            
            {proveedorSeleccionado && !searchProveedor && (
              <div className="absolute inset-0 px-4 py-3 bg-black rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-white/60" />
                  <span className="text-white font-bold text-sm">{proveedorSeleccionado}</span>
                </div>
                <button
                  onClick={() => {
                    setProveedorSeleccionado('');
                    setFormData(prev => ({ ...prev, proveedorId: '' }));
                    setSearchProveedor('');
                  }}
                  className="text-white/60 hover:text-white transition-colors"
                  title="Limpiar selección"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {searchProveedor && proveedoresFiltrados.length === 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-center text-gray-500 text-sm">
                No se encontraron proveedores
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
