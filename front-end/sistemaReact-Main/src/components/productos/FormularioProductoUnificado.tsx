import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Download, Tag, Package2, Barcode, Trash, Plus, AlertCircle, Search, FolderTree, Building2, Info, Layers } from 'lucide-react';
import type { Producto } from '../../types/Producto';
import type { Categoria } from '../../types/Categoria';
import type { Proveedor } from '../../types/Proveedor';
import type { ProductoVariante } from '../../types/ProductoVariante';
import { ProductoService } from '../../services/ProductoService';
import { CodigoBarrasService } from '../../services/CodigoBarrasService';
import { ProductoVarianteService } from '../../services/ProductoVarianteService';
import {
  collectTallaNamesFromVariantes,
  collectColorNamesFromVariantes,
  tallaDesdeNombre,
  colorDesdeNombre,
  mismoParTallaColor,
  nombresUnicosOrdenados,
} from '../../utils/varianteCatalogoHelpers';
import { validarJerarquiaPreciosProducto } from '../../utils/validarPreciosProducto';
import { getErrorMessage, getStatusCode } from '@/utils/errorUtils';
import { AlertModal } from '@/shared/ui';
import { useAuth } from '@/context/AuthContext';
import { resolveInventarioUserRole } from '@/hooks/useProductoVarianteService';

interface VarianteFormData {
  id?: number;
  nombreTalla: string;
  nombreColor: string;
  cantidad: number;
  stockAlmacen?: number;
  codigoIdentificacion: string;
}

interface FormularioProductoUnificadoProps {
  producto?: Producto | null;
  categorias: Categoria[];
  proveedores: Proveedor[];
  onClose: () => void;
  onProductoGuardado: (productoGuardado?: Producto) => void;
}

// Definimos las pestañas disponibles
type TabType = 'informacion' | 'variantes' | 'precios' | 'codigosBarras';
type ValueChangeEvent = { target: { value: string } };

const FormularioProductoUnificado: React.FC<FormularioProductoUnificadoProps> = ({
  producto,
  categorias,
  proveedores,
  onClose,
  onProductoGuardado
}) => {  // Estado básico del formulario
  const { usuario } = useAuth();
  const [formData, setFormData] = useState({
    codigoIdentificacion: '',
    codigoBarras: '',
    nombre: '',
    sexo: '',
    tipoPublico: '', // NUEVO CAMPO: niño o adulto
    categoriaId: '',
    subcategoriaId: '',
    subCategoria2Id: '', // NUEVO CAMPO: segunda subcategoría
    marca: '',
    proveedorId: '',
    precioUnitario: '',
    precioCuarto: '',
    precioMediaDocena: '',
    precioDocena: ''
  });
    // Estados para variantes y datos relacionados
  const [variantes, setVariantes] = useState<VarianteFormData[]>([]);
  const [sugerenciasTallas, setSugerenciasTallas] = useState<string[]>([]);
  const [sugerenciasColores, setSugerenciasColores] = useState<string[]>([]);
  const [coloresExtraOptimizado, setColoresExtraOptimizado] = useState<string[]>([]);
  const [nuevoColorExtraInput, setNuevoColorExtraInput] = useState('');
  const [subcategorias, setSubcategorias] = useState<Categoria[]>([]);
  const [subCategorias2, setSubCategorias2] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorPrecio, setErrorPrecio] = useState<string | null>(null);
    // Estados para nueva variante (modo simple)
  const [nuevaVariante, setNuevaVariante] = useState({
    nombreTalla: '',
    nombreColor: '',
    cantidad: 1,
    codigoIdentificacion: ''
  });
  const [showFormularioVariante, setShowFormularioVariante] = useState(false);
  
  // Estados para formulario optimizado (múltiples colores por talla)
  const [modoFormulario, setModoFormulario] = useState<'simple' | 'optimizado'>('optimizado');
  const [formularioOptimizado, setFormularioOptimizado] = useState({
    nombreTalla: '',
    cantidadesPorColor: {} as Record<string, number>
  });  // Estados nuevos para UI mejorada
  const [tabActiva, setTabActiva] = useState<TabType>('informacion');
  const [codigoBarrasPreview, setCodigoBarrasPreview] = useState<string | null>(null);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<number | null>(null);
  const [alertModal, setAlertModal] = useState<{ open: boolean; message: string; variant: 'error' | 'info' | 'success' }>({ open: false, message: '', variant: 'info' });
  
  // Estado para animación del modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  // Estados para búsqueda en campos de selección
  const [searchCategoria, setSearchCategoria] = useState('');
  const [searchSubcategoria, setSearchSubcategoria] = useState('');
  const [searchSubcategoria2, setSearchSubcategoria2] = useState('');
  const [searchProveedor, setSearchProveedor] = useState('');
  const [isCategoriaFocused, setIsCategoriaFocused] = useState(false);
  const [isSubcategoriaFocused, setIsSubcategoriaFocused] = useState(false);
  const [isSubcategoria2Focused, setIsSubcategoria2Focused] = useState(false);
  const [isProveedorFocused, setIsProveedorFocused] = useState(false);
  
  // Categoría, subcategoría y proveedor seleccionados (por nombre)
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [subcategoriaSeleccionada, setSubcategoriaSeleccionada] = useState('');
  const [subcategoria2Seleccionada, setSubcategoria2Seleccionada] = useState('');
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState('');
  
  // Cargar datos iniciales
  useEffect(() => {
    setIsModalVisible(true);
    cargarSugerenciasCatalogo();
  }, []);
  
  // Función para cerrar con animación
  const handleClose = () => {
    setIsModalVisible(false);
    setTimeout(onClose, 300); // Esperar a que la animación termine
  };
  useEffect(() => {
    if (producto) {
      // Determinar la configuración de categorías del producto
      const tieneCategoriaPadre = producto.categoriaPadre != null;
      const tieneCategoria = producto.categoria != null;
      
      // Caso 1: Producto con categoria y categoriaPadre diferentes (subcategoría)
      // Caso 2: Producto con categoria y categoriaPadre iguales (categoría principal sin hijos)
      // Caso 3: Producto solo con categoriaPadre (categoría principal)
      
      let categoriaIdFormulario = '';
      let subcategoriaIdFormulario = '';
      
      if (tieneCategoriaPadre && tieneCategoria) {
        // Verificar si son iguales (categoría principal sin hijos) o diferentes (subcategoría)
        if (producto.categoria?.idCategoria === producto.categoriaPadre?.idCategoria) {
          // Categoría principal sin hijos
          categoriaIdFormulario = producto.categoriaPadre?.idCategoria?.toString() || '';
          subcategoriaIdFormulario = '';
        } else {
          // Tiene subcategoría
          categoriaIdFormulario = producto.categoriaPadre?.idCategoria?.toString() || '';
          subcategoriaIdFormulario = producto.categoria?.idCategoria?.toString() || '';
        }
      } else if (tieneCategoriaPadre) {
        // Solo tiene categoría padre
        categoriaIdFormulario = producto.categoriaPadre?.idCategoria?.toString() || '';
        subcategoriaIdFormulario = '';
      } else if (tieneCategoria) {
        // Solo tiene categoría (caso legacy)
        categoriaIdFormulario = producto.categoria?.idCategoria?.toString() || '';
        subcategoriaIdFormulario = '';
      }
      
      setFormData({
        codigoIdentificacion: producto.codigoIdentificacion,
        codigoBarras: producto.codigoBarras || '',
        nombre: producto.nombre,
        sexo: producto.sexo || '',
        tipoPublico: producto.tipoPublico || '',
        categoriaId: categoriaIdFormulario,
        subcategoriaId: subcategoriaIdFormulario,
        subCategoria2Id: producto.subCategoria2?.idCategoria?.toString() || '',
        marca: producto.marca || '',
        proveedorId: producto.proveedor.idProveedor?.toString() || '',
        precioUnitario: producto.precioUnitario.toString(),
        precioCuarto: producto.precioCuarto?.toString() || '',
        precioMediaDocena: producto.precioMediaDocena?.toString() || '',
        precioDocena: producto.precioDocena?.toString() || ''
      });
      
      // Inicializar categorías seleccionadas con sus nombres
      if (producto.categoriaPadre) {
        // Seleccionar categoría principal
        if (categoriaIdFormulario) {
          setCategoriaSeleccionada(producto.categoriaPadre.nombre);
          
          // Cargar subcategorías de nivel 2
          const categoriaSeleccionadaObj = categorias.find(c => c.idCategoria?.toString() === categoriaIdFormulario);
          if (categoriaSeleccionadaObj?.subCategorias) {
            setSubcategorias(categoriaSeleccionadaObj.subCategorias);
          }
        }
      }
      
      // Inicializar subcategoría seleccionada (nivel 2)
      if (producto.categoria && tieneCategoria && producto.categoriaPadre && 
          producto.categoria.idCategoria !== producto.categoriaPadre.idCategoria) {
        if (subcategoriaIdFormulario) {
          setSubcategoriaSeleccionada(producto.categoria.nombre);
          
          // Cargar subcategorías de nivel 3
          const subcategoriaSeleccionadaObj = producto.categoriaPadre.subCategorias?.find(
            sc => sc.idCategoria?.toString() === subcategoriaIdFormulario
          );
          if (subcategoriaSeleccionadaObj?.subCategorias) {
            setSubCategorias2(subcategoriaSeleccionadaObj.subCategorias);
          }
        }
      }
      
      // Inicializar subcategoría nivel 3
      if (producto.subCategoria2) {
        setSubcategoria2Seleccionada(producto.subCategoria2.nombre);
      }
      
      // Inicializar proveedor
      if (producto.proveedor) {
        setProveedorSeleccionado(producto.proveedor.nombre);
      }
      
      // Cargar variantes existentes si estamos editando
      cargarVariantesExistentes();
    }
  }, [producto, categorias]);

  const coloresGridOptimizado = useMemo(
    () => nombresUnicosOrdenados([...sugerenciasColores, ...coloresExtraOptimizado]),
    [sugerenciasColores, coloresExtraOptimizado]
  );

  const cargarSugerenciasCatalogo = async () => {
    try {
      setLoading(true);
      const todas = await ProductoVarianteService.obtenerTodasLasVariantes(
        resolveInventarioUserRole(usuario?.roles),
        false
      );
      setSugerenciasTallas(collectTallaNamesFromVariantes(todas));
      setSugerenciasColores(collectColorNamesFromVariantes(todas));
    } catch (err: unknown) {
      console.error('Error al cargar sugerencias de tallas y colores:', err);
      const status = getStatusCode(err);
      if (status === 401) {
        setError('Error de autorización: Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      } else if (status === 403) {
        setError('Error de permisos: No tienes autorización para acceder a esta información.');
      } else {
        setError(
          'Error al cargar sugerencias de tallas y colores: ' +
            getErrorMessage(err, 'Error de comunicación con el servidor')
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Funciones para filtrar datos en búsquedas
  const categoriasPrincipalesFiltradas = categorias
    .filter(categoria => !categoria.categoriaPadre) // Solo categorías principales
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

  const cargarVariantesExistentes = async () => {
    if (!producto?.idProducto) return;
    
    try {
      setLoading(true);
      console.log(`ðŸ”„ Cargando variantes existentes para producto ID: ${producto.idProducto}`);
      
      const variantesExistentes = await ProductoVarianteService.obtenerVariantesPorProducto(producto.idProducto);
      console.log(`ðŸ“¦ Variantes obtenidas del backend: ${variantesExistentes.length}`);
      
      // Verificar que no haya duplicados por ID
      const variantesUnicas = Array.from(
        new Map(variantesExistentes.map(v => [v.idVariante, v])).values()
      );
      
      if (variantesUnicas.length !== variantesExistentes.length) {
        console.warn(
          `Se removieron ${variantesExistentes.length - variantesUnicas.length} variantes duplicadas`
        );
      }

      // Mapear variantes del backend al formato del formulario
      const variantesFormData: VarianteFormData[] = variantesUnicas.map(v => {
        const varianteId = v.idProductoVariante || v.idVariante;
        const variante = {
          id: varianteId,
          nombreTalla: v.talla?.nombreTalla?.trim() ?? '',
          nombreColor: v.color?.nombre?.trim() ?? '',
          cantidad: v.cantidad,
          stockAlmacen: v.stockAlmacen ?? v.cantidad,
          codigoIdentificacion: v.codigoBarrasVariante || ''
        };
        console.log(` Variante mapeada: ID=${variante.id}, Talla=${variante.nombreTalla}, Color=${variante.nombreColor}, Cantidad=${variante.cantidad}`);
        return variante;
      });
      
      console.log(`${variantesFormData.length} variantes cargadas en el estado del formulario`);
      setVariantes(variantesFormData);

      setSugerenciasTallas((prev) =>
        nombresUnicosOrdenados([...prev, ...collectTallaNamesFromVariantes(variantesUnicas)])
      );
      setSugerenciasColores((prev) =>
        nombresUnicosOrdenados([...prev, ...collectColorNamesFromVariantes(variantesUnicas)])
      );
    } catch (err: unknown) {
      console.error('Error al cargar variantes existentes:', err);
      const status = getStatusCode(err);
      
      // Manejo específico para errores de autenticación/autorización
      if (status === 401) {
        setError('Error de autorización: Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      } else if (status === 403) {
        setError('Error de permisos: No tienes autorización para acceder a esta información.');
      } else {
        setError(
          'Error al cargar variantes: ' +
            getErrorMessage(err, 'Error de comunicación con el servidor')
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const cantidadTotal = variantes.reduce((total, variante) => total + (variante.stockAlmacen ?? variante.cantidad), 0);

  // Funciones para manejar variantes
  const agregarVariante = () => {
    const nt = nuevaVariante.nombreTalla.trim();
    const nc = nuevaVariante.nombreColor.trim();
    if (!nt || !nc) {
      setError('Debe indicar talla y color para la variante');
      return;
    }

    const existeVariante = variantes.some((v) =>
      mismoParTallaColor(
        { nombreTalla: v.nombreTalla, nombreColor: v.nombreColor },
        { nombreTalla: nt, nombreColor: nc }
      )
    );

    if (existeVariante) {
      setError('Ya existe una variante con esta combinación de talla y color');
      return;
    }

    let codigoIdentificacion = nuevaVariante.codigoIdentificacion;
    if (!codigoIdentificacion) {
      const codigoBase = formData.codigoIdentificacion || 'PROD';
      codigoIdentificacion = `${codigoBase}-${nt}-${nc}`;
    }

    const nuevaVarianteCompleta: VarianteFormData = {
      nombreTalla: nt,
      nombreColor: nc,
      cantidad: nuevaVariante.cantidad,
      stockAlmacen: nuevaVariante.cantidad,
      codigoIdentificacion
    };

    setVariantes(prev => [...prev, nuevaVarianteCompleta]);
    setNuevaVariante({
      nombreTalla: '',
      nombreColor: '',
      cantidad: 1,
      codigoIdentificacion: ''
    });
    setShowFormularioVariante(false);
    setError(null);
    setSugerenciasTallas((p) => nombresUnicosOrdenados([...p, nt]));
    setSugerenciasColores((p) => nombresUnicosOrdenados([...p, nc]));
  };

  const eliminarVariante = (index: number) => {
    setVariantes(prev => prev.filter((_, i) => i !== index));
  };

  const actualizarCantidadVariante = (index: number, cantidad: number) => {
    if (cantidad < 1) return;
    
    setVariantes(prev => prev.map((variante, i) => 
      i === index ? { ...variante, stockAlmacen: cantidad } : variante
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrorPrecio(null);

    try {
      console.log('Iniciando proceso de guardado de producto');
      console.log('ðŸ“Š Estado actual de variantes:', {
        cantidad: variantes.length,
        variantes: variantes.map(v => ({ id: v.id, nombreTalla: v.nombreTalla, nombreColor: v.nombreColor, cantidad: v.cantidad }))
      });

      // Validaciones básicas
      if (!formData.nombre.trim()) {
        throw new Error('El nombre del producto es requerido');
      }

      if (!formData.codigoIdentificacion.trim()) {
        throw new Error('El código de identificación es requerido');
      }

      if (!formData.categoriaId) {
        throw new Error('Debe seleccionar una categoría principal');
      }

      if (!formData.sexo) {
        throw new Error('Debe seleccionar el sexo del producto');
      }

      if (!formData.marca.trim()) {
        throw new Error('La marca es requerida');
      }

      if (!formData.precioUnitario.trim() || isNaN(parseFloat(formData.precioUnitario))) {
        setErrorPrecio('Indique un precio unitario válido.');
        setTabActiva('precios');
        setLoading(false);
        return;
      }

      const pu = parseFloat(formData.precioUnitario);
      const pc = parseFloat(formData.precioCuarto);
      const pmd = parseFloat(formData.precioMediaDocena);
      const pd = parseFloat(formData.precioDocena);
      const faltanTotalesVolumen =
        !formData.precioCuarto.trim() ||
        !formData.precioMediaDocena.trim() ||
        !formData.precioDocena.trim() ||
        !Number.isFinite(pc) ||
        !Number.isFinite(pmd) ||
        !Number.isFinite(pd);

      if (faltanTotalesVolumen) {
        setErrorPrecio(
          'Para guardar hace falta indicar el total para 3, 6 y 12 unidades (además del unitario). No son opcionales en el servidor.'
        );
        setTabActiva('precios');
        setLoading(false);
        return;
      }

      const errJerarquia = validarJerarquiaPreciosProducto(pu, pc, pmd, pd);
      if (errJerarquia) {
        setErrorPrecio(errJerarquia);
        setTabActiva('precios');
        setLoading(false);
        return;
      }

      // Encontrar objetos de categorías y proveedor
      let categoriaSeleccionada: Categoria | undefined = undefined;
      let categoriaPadreSeleccionada: Categoria | undefined = undefined;

      if (formData.subcategoriaId) {
        // Caso 1: Si hay una subcategoría seleccionada
        categoriaSeleccionada = subcategorias.find(c => c.idCategoria?.toString() === formData.subcategoriaId)!;
        categoriaPadreSeleccionada = categorias.find(c => c.idCategoria?.toString() === formData.categoriaId);
        
        console.log('Usando subcategoría como categoría principal:', categoriaSeleccionada?.nombre);
        console.log('ðŸ“ Categoría padre seleccionada:', categoriaPadreSeleccionada?.nombre);
      } else {
        // Caso 2: Si solo hay categoría principal seleccionada
        const categoriaPrincipal = categorias.find(c => c.idCategoria?.toString() === formData.categoriaId)!;
        
        if (!categoriaPrincipal) {
          throw new Error('Debe seleccionar una categoría válida');
        }
        
        // Verificar si la categoría principal tiene subcategorías
        if (categoriaPrincipal.subCategorias && categoriaPrincipal.subCategorias.length > 0) {
          // Si tiene subcategorías, entonces es una categoría padre y necesita una subcategoría
          throw new Error('Debe seleccionar una subcategoría para esta categoría principal');
        } else {
          // Si no tiene subcategorías, se configura SOLO como categoría padre
          // categoria queda como undefined (null) y categoriaPadre toma la categoría principal
          categoriaSeleccionada = undefined;
          categoriaPadreSeleccionada = categoriaPrincipal;
          
          console.log('ðŸ“ Categoría principal sin hijos - configurando SOLO como categoriaPadre:', categoriaPrincipal?.nombre);
        }
      }

      // Validar tipo público
      if (!formData.tipoPublico) {
        throw new Error('Debe seleccionar el tipo de público (niño o adulto)');
      }

      // Validar segunda subcategoría - ahora es obligatoria solo si hay subCategorias2 disponibles
      if (subCategorias2.length > 0 && !formData.subCategoria2Id) {
        throw new Error('Debe seleccionar la segunda subcategoría (Nivel 3)');
      }

      if (!formData.proveedorId) {
        throw new Error('Debe seleccionar un proveedor');
      }

      const proveedor = proveedores.find(p => p.idProveedor?.toString() === formData.proveedorId);

      if (!proveedor) {
        throw new Error('Debe seleccionar un proveedor válido');
      }

      // Obtener la segunda subcategoría desde el array correcto
      let subCategoria2: Categoria | undefined = undefined;
      if (formData.subCategoria2Id) {
        // Buscar primero en subCategorias2 (nivel 3), luego en categorias completas como fallback
        subCategoria2 = subCategorias2.find(c => c.idCategoria?.toString() === formData.subCategoria2Id) ||
                       categorias.find(c => c.idCategoria?.toString() === formData.subCategoria2Id);
        if (!subCategoria2) {
          throw new Error('Segunda subcategoría no válida');
        }
      }

      // Si no hay subCategoria2 seleccionada pero es requerida, usar una categoría por defecto o lanzar error
      if (!subCategoria2 && subCategorias2.length > 0) {
        throw new Error('Debe seleccionar la segunda subcategoría (Nivel 3)');
      }

      // Crear objeto producto
      // subCategoria2 se envía solo con idCategoria para que JPA resuelva la referencia correctamente.
      // Cuando no existe nivel 3, se omite (null) — el campo es nullable en la BD.
      const subCategoria2Final: Categoria | undefined = subCategoria2?.idCategoria
        ? { ...subCategoria2, idCategoria: subCategoria2.idCategoria }
        : undefined;

      const productoData: Omit<Producto, 'idProducto'> = {
        codigoIdentificacion: formData.codigoIdentificacion,
        codigoBarras: formData.codigoBarras || undefined,
        nombre: formData.nombre,
        sexo: formData.sexo,
        tipoPublico: formData.tipoPublico,
        categoria: categoriaSeleccionada,
        subCategoria2: subCategoria2Final as Categoria,
        categoriaPadre: categoriaPadreSeleccionada,
        marca: formData.marca,
        proveedor,
        cantidad: cantidadTotal,
        precioUnitario: parseFloat(formData.precioUnitario),
        precioCuarto: parseFloat(formData.precioCuarto),
        precioMediaDocena: parseFloat(formData.precioMediaDocena),
        precioDocena: parseFloat(formData.precioDocena),
      };

      let productoGuardado: Producto;

      // Crear o actualizar producto
      console.log(`${producto?.idProducto ? '  Actualizando' : 'Creando'} producto...`);
      if (producto?.idProducto) {
        productoGuardado = await ProductoService.updateProducto(producto.idProducto, {
          ...productoData,
          idProducto: producto.idProducto
        });
      } else {
        productoGuardado = await ProductoService.createProducto(productoData);
      }
      console.log(`Producto ${producto?.idProducto ? 'actualizado' : 'creado'} con ID: ${productoGuardado.idProducto}`);      // ===== PROCESAMIENTO MEJORADO DE VARIANTES =====
      if (productoGuardado.idProducto && variantes.length > 0) {
        console.log('ðŸ”§ Iniciando sincronización de variantes...');

        // 1. Obtener el estado actual REAL de la base de datos
        const variantesEnBD = producto?.idProducto
          ? await ProductoVarianteService.obtenerVariantesPorProducto(producto.idProducto)
          : [];
        console.log(`ðŸ“¦ Encontradas ${variantesEnBD.length} variantes existentes en la base de datos.`);

        const variantesEnFormulario = variantes; // Las variantes del estado de React
        console.log(`ï¿½ Se procesarán ${variantesEnFormulario.length} variantes desde el formulario.`);

        // Convertir a mapas para una búsqueda eficiente (O(1) en lugar de O(n))
        const mapaVariantesBD = new Map(variantesEnBD.map(v => [v.idProductoVariante, v]));
        const mapaVariantesFormulario = new Map(variantesEnFormulario.filter(v => v.id).map(v => [v.id, v]));

        // 2. IDENTIFICAR OPERACIONES
        
        // -> Variantes a ELIMINAR: Están en la BD pero no en el formulario
        const variantesAEliminar = variantesEnBD.filter(
          vDB => !mapaVariantesFormulario.has(vDB.idProductoVariante!)
        );

        // -> Variantes a ACTUALIZAR: Están en ambos, formulario y BD
        const variantesAActualizar = variantesEnFormulario.filter(
          vForm => vForm.id && mapaVariantesBD.has(vForm.id)
        );

        // -> Variantes a CREAR: Están en el formulario pero no tienen ID (son nuevas)
        const variantesACrear = variantesEnFormulario.filter(vForm => !vForm.id);

        console.log(`${variantesACrear.length} para crear,  ${variantesAActualizar.length} para actualizar, ðŸ—‘ ${variantesAEliminar.length} para eliminar.`);

        // 3. EJECUTAR OPERACIONES EN ORDEN (Eliminar, Actualizar, Crear)
        
        // -> Eliminar primero
        for (const variante of variantesAEliminar) {
          console.log(`ðŸ—‘ Eliminando variante ID: ${variante.idProductoVariante}`);
          try {
            await ProductoVarianteService.eliminarVariante(variante.idProductoVariante!);
            console.log(`Variante ID=${variante.idProductoVariante} eliminada correctamente`);
          } catch (error: unknown) {
            console.error(
              `Œ Error al eliminar variante ID ${variante.idProductoVariante}:`,
              getErrorMessage(error, 'Error desconocido')
            );
            throw new Error(`Fallo al eliminar la variante ${variante.talla?.nombreTalla ?? ''} - ${variante.color?.nombre ?? ''}.`);
          }
        }

        // -> Luego, actualizar existentes
        for (const variante of variantesAActualizar) {
          const existente = mapaVariantesBD.get(variante.id!);
          if (!existente) continue;

          const stockAlmacenForm = variante.stockAlmacen ?? variante.cantidad;
          const stockAlmacenBD = existente.stockAlmacen ?? existente.cantidad;
          const cantidadCambio = stockAlmacenForm !== stockAlmacenBD;
          const codigoCambio = existente.codigoBarrasVariante !== variante.codigoIdentificacion;

          if (!cantidadCambio && !codigoCambio) {
            console.log(`Saltando variante ID: ${variante.id} (sin cambios)`);
            continue;
          }

          console.log(`🔄 Actualizando variante ID: ${variante.id}`);
          if (cantidadCambio) {
            console.log(`📊 Stock Almacén: ${stockAlmacenBD} → ${stockAlmacenForm}`);
          }
          if (codigoCambio) {
            console.log(`🏷️ Código: '${existente.codigoBarrasVariante}' → '${variante.codigoIdentificacion}'`);
          }

          try {
            // Cantidad: usar PATCH (actualizarCantidad) para stock de Almacén
            if (cantidadCambio) {
              await ProductoVarianteService.actualizarCantidad(variante.id!, stockAlmacenForm);
            }
            // Código: usar PUT (actualizarVariante) solo si cambió
            if (codigoCambio) {
              const talla = tallaDesdeNombre(variante.nombreTalla);
              const color = colorDesdeNombre(variante.nombreColor);
              if (!variante.nombreTalla.trim() || !variante.nombreColor.trim()) {
                console.warn(`Saltando actualización - Talla o color vacío: ${variante.nombreTalla} / ${variante.nombreColor}`);
                continue;
              }
              const varianteData: Omit<ProductoVariante, 'idVariante'> = {
                producto: productoGuardado,
                talla,
                color,
                cantidad: existente.cantidad,
                codigoBarrasVariante: variante.codigoIdentificacion
              };
              await ProductoVarianteService.actualizarVariante(variante.id!, {
                ...varianteData,
                idProductoVariante: variante.id
              });
            }
            console.log(`Variante ID=${variante.id} actualizada correctamente`);
          } catch (error: unknown) {
            const errorMessage = getErrorMessage(error, 'Error desconocido');
            console.error(`❌ Error al actualizar variante ID ${variante.id}:`, errorMessage);
            throw new Error(`Error al actualizar variante ${variante.nombreTalla}-${variante.nombreColor}: ${errorMessage}`);
          }
        }

        // -> Finalmente, crear nuevas
        for (const variante of variantesACrear) {
          const talla = tallaDesdeNombre(variante.nombreTalla);
          const color = colorDesdeNombre(variante.nombreColor);

          if (!variante.nombreTalla.trim() || !variante.nombreColor.trim()) {
            console.warn(`Saltando creación - Talla o color vacío: ${variante.nombreTalla} / ${variante.nombreColor}`);
            continue;
          }

          console.log(`Creando nueva variante (Talla: ${variante.nombreTalla}, Color: ${variante.nombreColor}, Cantidad: ${variante.cantidad})`);
          
          const varianteData: Omit<ProductoVariante, 'idVariante'> = {
            producto: productoGuardado,
            talla,
            color,
            cantidad: variante.stockAlmacen ?? variante.cantidad,
            codigoBarrasVariante: variante.codigoIdentificacion
          };

          try {
            const nuevaVariante = await ProductoVarianteService.crearVariante(varianteData);
            console.log(`Nueva variante creada con ID=${nuevaVariante.idProductoVariante}`);
          } catch (error: unknown) {
            const errorMessage = getErrorMessage(error, 'Error desconocido');
            console.error(`Œ Error al crear nueva variante:`, errorMessage);
            throw new Error(`Error al crear variante ${variante.nombreTalla}-${variante.nombreColor}: ${errorMessage}`);
          }
        }

        console.log('\n¡Sincronización de variantes completada exitosamente!');
      } else if (variantes.length === 0) {
        console.log(' No hay variantes para procesar');
      }

      // Obtener las variantes actualizadas del producto para devolver un producto completo con sus variantes
      if (productoGuardado.idProducto) {
        const variantesActualizadas = await ProductoVarianteService.obtenerVariantesPorProducto(productoGuardado.idProducto);
        console.log(`ðŸ”„ Obtenidas ${variantesActualizadas.length} variantes actualizadas para el producto`);
        // Añadir la cantidad total actualizada al producto
        const cantidadTotalActualizada = variantesActualizadas.reduce((total, v) => total + (v.stockAlmacen ?? v.cantidad), 0);
        productoGuardado = {
          ...productoGuardado,
          cantidad: cantidadTotalActualizada
        };
      }      console.log('Proceso de guardado completado exitosamente');
      onProductoGuardado(productoGuardado);
      handleClose();
    } catch (err: unknown) {
      console.error('Œ Error al guardar producto:', err);
      const status = getStatusCode(err);
      
      // Manejo específico para errores de autenticación/autorización
      if (status === 401) {
        setError('Error de autorización: Tu sesión ha expirado o no tienes permisos para realizar esta acción. Por favor, inicia sesión nuevamente.');
      } else if (status === 403) {
        setError('Error de permisos: No tienes autorización para realizar esta acción.');
      } else {
        setError(getErrorMessage(err, 'Error al guardar el producto'));
      }
    } finally {
      setLoading(false);
    }
  };  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (["precioUnitario", "precioCuarto", "precioMediaDocena", "precioDocena"].includes(name)) {
      if (value !== '' && parseFloat(value) < 0) {
        setErrorPrecio('No se permiten valores negativos en los precios.');
        setFormData((prev) => ({ ...prev, [name]: '0' }));
        return;
      }

      const nextPu = name === 'precioUnitario' ? value : formData.precioUnitario;
      const nextPc = name === 'precioCuarto' ? value : formData.precioCuarto;
      const nextPmd = name === 'precioMediaDocena' ? value : formData.precioMediaDocena;
      const nextPd = name === 'precioDocena' ? value : formData.precioDocena;

      const pu = parseFloat(nextPu);
      const pc = parseFloat(nextPc);
      const pmd = parseFloat(nextPmd);
      const pd = parseFloat(nextPd);

      const errJer = validarJerarquiaPreciosProducto(
        Number.isFinite(pu) ? pu : NaN,
        Number.isFinite(pc) ? pc : NaN,
        Number.isFinite(pmd) ? pmd : NaN,
        Number.isFinite(pd) ? pd : NaN
      );

      if (errJer) {
        setErrorPrecio(errJer);
        return;
      }

      setErrorPrecio(null);
      setFormData((prev) => ({ ...prev, [name]: value }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generarCodigoBarrasAutomatico = () => {
    // Generar un código de barras basado en el timestamp actual y el código de identificación
    const timestamp = Date.now();
    const codigoBase = formData.codigoIdentificacion || 'PROD';
    const codigoGenerado = `${codigoBase}-${timestamp}`;
    
    setFormData(prev => ({
      ...prev,
      codigoBarras: codigoGenerado
    }));
  };

  const generarCodigoBarrasVariante = async (varianteId: number | undefined) => {
    if (!varianteId) {
      setError('No se puede generar código de barras: la variante no tiene ID asignado. Guarda el producto primero.');
      return;
    }
      try {
      setLoading(true);
      setError(null);
      console.log(`ðŸ· Generando código de barras para variante ID: ${varianteId}`);
      
      const blob = await CodigoBarrasService.generarImagenVariante(varianteId);
      
      // Crear URL para previsualizar la imagen
      const url = window.URL.createObjectURL(blob);
      setCodigoBarrasPreview(url);
      setVarianteSeleccionada(varianteId);
      
      // Cambiar a la pestaña de códigos de barras
      setTabActiva('codigosBarras');
    } catch (err: unknown) {
      console.error('Error al generar código de barras de variante:', err);
      setError('Error al generar código de barras: ' + getErrorMessage(err, 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };
  const descargarCodigoBarrasVariante = () => {
    if (!codigoBarrasPreview || !varianteSeleccionada) return;

    const link = document.createElement('a');
    link.href = codigoBarrasPreview;
    link.download = `codigo_barras_variante_${varianteSeleccionada}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Mostrar mensaje de éxito
    setAlertModal({ open: true, message: 'Código de barras de variante descargado correctamente', variant: 'success' });
  };
  
  // Función para manejar cambio de categoría principal (Nivel 1)
  const handleCategoriaChange = (e: ValueChangeEvent) => {
    const categoriaId = e.target.value;
    setFormData(prev => ({ 
      ...prev, 
      categoriaId,
      subcategoriaId: '', // Limpiar subcategoría cuando cambia la principal
      subCategoria2Id: ''  // Limpiar segunda subcategoría también
    }));

    // Cargar subcategorías (Nivel 2) de la categoría seleccionada
    if (categoriaId) {
      const categoriaSeleccionada = categorias.find(c => c.idCategoria?.toString() === categoriaId);
      if (categoriaSeleccionada?.subCategorias) {
        setSubcategorias(categoriaSeleccionada.subCategorias);
      } else {
        setSubcategorias([]);
      }
    } else {
      setSubcategorias([]);
    }
    
    // Limpiar también las subcategorías de nivel 3
    setSubCategorias2([]);
  };

  // Función para manejar cambio de subcategoría (Nivel 2)
  const handleSubcategoriaChange = (e: ValueChangeEvent) => {
    const subcategoriaId = e.target.value;
    setFormData(prev => ({ 
      ...prev, 
      subcategoriaId,
      subCategoria2Id: '' // Limpiar segunda subcategoría cuando cambia la subcategoría
    }));

    // Cargar subcategorías de nivel 3 de la subcategoría seleccionada
    if (subcategoriaId) {
      const subcategoriaSeleccionada = subcategorias.find(c => c.idCategoria?.toString() === subcategoriaId);
      if (subcategoriaSeleccionada?.subCategorias) {
        setSubCategorias2(subcategoriaSeleccionada.subCategorias);
      } else {
        setSubCategorias2([]);
      }
    } else {
      setSubCategorias2([]);
    }
  };

  // Función optimizada para agregar múltiples variantes de una talla
  const agregarVariantesOptimizado = () => {
    const nt = formularioOptimizado.nombreTalla.trim();
    if (!nt) {
      setError('Debe indicar una talla');
      return;
    }

    const coloresConCantidad = Object.entries(formularioOptimizado.cantidadesPorColor)
      .filter(([, cantidad]) => cantidad > 0)
      .map(([nombreColor, cantidad]) => ({ nombreColor, cantidad }));

    if (coloresConCantidad.length === 0) {
      setError('Debe especificar al menos una cantidad mayor a 0 para algún color');
      return;
    }

    const nuevasVariantes: VarianteFormData[] = [];
    const errores: string[] = [];

    for (const { nombreColor, cantidad } of coloresConCantidad) {
      const nc = nombreColor.trim();
      if (!nc) continue;

      const existeVariante = variantes.some((v) =>
        mismoParTallaColor(
          { nombreTalla: v.nombreTalla, nombreColor: v.nombreColor },
          { nombreTalla: nt, nombreColor: nc }
        )
      );

      if (existeVariante) {
        errores.push(`Ya existe una variante para ${nt} - ${nc}`);
        continue;
      }

      const codigoBase = formData.codigoIdentificacion || 'PROD';
      const codigoIdentificacion = `${codigoBase}-${nt}-${nc}`;

      nuevasVariantes.push({
        nombreTalla: nt,
        nombreColor: nc,
        cantidad,
        stockAlmacen: cantidad,
        codigoIdentificacion
      });
    }

    if (errores.length > 0) {
      setError(errores.join(', '));
      return;
    }

    if (nuevasVariantes.length > 0) {
      setVariantes(prev => [...prev, ...nuevasVariantes]);
      setFormularioOptimizado({
        nombreTalla: '',
        cantidadesPorColor: {}
      });
      setColoresExtraOptimizado([]);
      setNuevoColorExtraInput('');
      setShowFormularioVariante(false);
      setError(null);
      setSugerenciasTallas((p) => nombresUnicosOrdenados([...p, nt]));
      for (const nv of nuevasVariantes) {
        setSugerenciasColores((p) => nombresUnicosOrdenados([...p, nv.nombreColor]));
      }
    }
  };

  const actualizarCantidadColor = (nombreColor: string, cantidad: number) => {
    setFormularioOptimizado(prev => ({
      ...prev,
      cantidadesPorColor: {
        ...prev.cantidadesPorColor,
        [nombreColor]: cantidad >= 0 ? cantidad : 0
      }
    }));
  };

  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] transition-opacity duration-300 ${isModalVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-200 relative transform flex flex-col transition-all duration-300 ${isModalVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        {/* Header */}
        <div className="relative bg-white border-b border-gray-100 p-10 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <Package2 className="w-6 h-6 text-black" />
              </div>
              <div>
                <div className="mb-2 w-10 h-1 bg-black"></div>
                <h2 className="text-2xl font-bold tracking-tight text-black uppercase mb-1">
                  {producto ? 'Editar Producto' : 'Crear Nuevo Producto'}
                </h2>
                <p className="text-gray-500 text-sm font-medium">
                  {producto ? 'Modifica la información del producto' : 'Complete la información para crear el producto'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-black rounded-xl flex items-center justify-center transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
        <div className="px-8 py-6">
          {error && (
            <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-400 rounded-lg shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Navegación por pestañas */}
            <div className="flex border-b border-gray-100 mb-6 overflow-x-auto custom-scrollbar">
              <button
                type="button"
                onClick={() => setTabActiva('informacion')}
                className={`flex items-center justify-center min-w-max gap-2 flex-1 px-6 py-4 font-bold text-[11px] uppercase tracking-[0.15em] transition-all ${
                  tabActiva === 'informacion' 
                  ? 'text-black border-b-2 border-black bg-gray-50/50' 
                  : 'text-gray-400 hover:text-gray-900 border-b-2 border-transparent'
                }`}
              >
                <Package2 className="w-4 h-4" />
                Información Básica
              </button>
              
              <button
                type="button"
                onClick={() => setTabActiva('variantes')}
                className={`flex items-center justify-center min-w-max gap-2 flex-1 px-6 py-4 font-bold text-[11px] uppercase tracking-[0.15em] transition-all ${
                  tabActiva === 'variantes' 
                  ? 'text-black border-b-2 border-black bg-gray-50/50' 
                  : 'text-gray-400 hover:text-gray-900 border-b-2 border-transparent'
                }`}
              >
                <Layers className="w-4 h-4" />
                Variantes {variantes.length > 0 && `(${variantes.length})`}
              </button>
              
              <button
                type="button"
                onClick={() => setTabActiva('precios')}
                className={`flex items-center justify-center min-w-max gap-2 flex-1 px-6 py-4 font-bold text-[11px] uppercase tracking-[0.15em] transition-all ${
                  tabActiva === 'precios' 
                  ? 'text-black border-b-2 border-black bg-gray-50/50' 
                  : 'text-gray-400 hover:text-gray-900 border-b-2 border-transparent'
                }`}
              >
                <Tag className="w-4 h-4" />
                Precios
              </button>
              
              <button
                type="button"
                onClick={() => setTabActiva('codigosBarras')}
                className={`flex items-center justify-center min-w-max gap-2 flex-1 px-6 py-4 font-bold text-[11px] uppercase tracking-[0.15em] transition-all ${
                  tabActiva === 'codigosBarras' 
                  ? 'text-black border-b-2 border-black bg-gray-50/50' 
                  : 'text-gray-400 hover:text-gray-900 border-b-2 border-transparent'
                }`}
              >
                <Barcode className="w-4 h-4" />
                Códigos de Barras
              </button>
            </div>

            {/* Pestaña: Información básica */}
            {tabActiva === 'informacion' && (
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
                        onClick={() => generarCodigoBarrasAutomatico()}
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
                      {/* Indicador de resultados */}
                      {searchCategoria && !categoriaSeleccionada && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 bg-white px-1">
                          {categoriasPrincipalesFiltradas.length} resultado{categoriasPrincipalesFiltradas.length !== 1 ? 's' : ''}
                        </div>
                      )}
                      
                      {/* Lista desplegable de categorías filtradas */}
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
                      
                      {/* Mensaje cuando no hay resultados */}
                      {searchCategoria && categoriasPrincipalesFiltradas.length === 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-center text-gray-500 text-sm">
                          No se encontraron categorías principales
                        </div>
                      )}
                      
                      {/* Mostrar categoría seleccionada */}
                      {categoriaSeleccionada && !searchCategoria && (
                        <div className="absolute inset-0 px-4 py-3 bg-black rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2"><FolderTree className="w-4 h-4 text-white/60" /><span className="text-white font-bold text-sm">{categoriaSeleccionada}</span></div>
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
                        
                        {/* Indicador de resultados */}
                        {searchSubcategoria && !subcategoriaSeleccionada && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 bg-white px-1">
                            {subcategoriasFiltradas.length} resultado{subcategoriasFiltradas.length !== 1 ? 's' : ''}
                          </div>
                        )}
                        
                        {/* Lista desplegable de subcategorías filtradas */}
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
                        
                        {/* Mostrar subcategoría seleccionada */}
                        {subcategoriaSeleccionada && !searchSubcategoria && (
                          <div className="absolute inset-0 px-4 py-3 bg-black rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2"><FolderTree className="w-4 h-4 text-white/60" /><span className="text-white font-bold text-sm">{subcategoriaSeleccionada}</span></div>
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
                        
                        {/* Mensaje cuando no hay resultados */}
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
                        
                        {/* Indicador de resultados */}
                        {searchSubcategoria2 && !subcategoria2Seleccionada && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 bg-white px-1">
                            {subcategorias2Filtradas.length} resultado{subcategorias2Filtradas.length !== 1 ? 's' : ''}
                          </div>
                        )}
                        
                        {/* Lista desplegable de segundas subcategorías filtradas */}
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
                        
                        {/* Mostrar segunda subcategoría seleccionada */}
                        {subcategoria2Seleccionada && !searchSubcategoria2 && (
                          <div className="absolute inset-0 px-4 py-3 bg-black rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2"><FolderTree className="w-4 h-4 text-white/60" /><span className="text-white font-bold text-sm">{subcategoria2Seleccionada}</span></div>
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
                        
                        {/* Mensaje cuando no hay resultados */}
                        {searchSubcategoria2 && subcategorias2Filtradas.length === 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-center text-gray-500 text-sm">
                            No se encontraron segundas subcategorías
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mensaje informativo cuando no hay subcategorías de nivel 3 */}
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
                      
                      {/* Indicador de resultados */}
                      {searchProveedor && !proveedorSeleccionado && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 bg-white px-1">
                          {proveedoresFiltrados.length} resultado{proveedoresFiltrados.length !== 1 ? 's' : ''}
                        </div>
                      )}
                      
                      {/* Lista desplegable de proveedores filtrados */}
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
                      
                      {/* Mostrar proveedor seleccionado */}
                      {proveedorSeleccionado && !searchProveedor && (
                        <div className="absolute inset-0 px-4 py-3 bg-black rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-white/60" /><span className="text-white font-bold text-sm">{proveedorSeleccionado}</span></div>
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
                      
                      {/* Mensaje cuando no hay resultados */}
                      {searchProveedor && proveedoresFiltrados.length === 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-center text-gray-500 text-sm">
                          No se encontraron proveedores
                        </div>
                      )}
                    </div>
                  </div>

                  
                </div>
              </div>
            )}            {/* Pestaña: Variantes */}
            {tabActiva === 'variantes' && (
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Variantes del Producto ({variantes.length})
                  </h3>
                  <div className="flex items-center gap-3">
                    {/* Selector de modo */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Modo:</label>
                      <select
                        value={modoFormulario}
                        onChange={(e) => setModoFormulario(e.target.value as 'simple' | 'optimizado')}
                        className="px-3 py-1.5 bg-[#f8f8f8] border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-gray-200 transition-all"
                      >
                        <option value="optimizado">Optimizado (por talla)</option>
                        <option value="simple">Simple (individual)</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFormularioVariante(!showFormularioVariante)}
                      className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                    >
                      {showFormularioVariante ? 'Cancelar' : 'Agregar Variante'}
                    </button>
                  </div>
                </div>              {/* Formularios de variantes */}
              {showFormularioVariante && (
                <div className="bg-white rounded-xl p-6 mb-4 border border-gray-200">
                  {modoFormulario === 'simple' ? (
                    <>
                      <h4 className="text-md font-semibold mb-3 text-gray-800">Nueva Variante (Modo Simple)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Talla *
                          </label>
                          <input
                            list="fp-simple-tallas-dl"
                            value={nuevaVariante.nombreTalla}
                            onChange={(e) => setNuevaVariante(prev => ({ ...prev, nombreTalla: e.target.value }))}
                            placeholder="Escribir o elegir"
                            className="w-full px-3 py-2 bg-[#f8f8f8] border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-gray-200 transition-all"
                          />
                          <datalist id="fp-simple-tallas-dl">
                            {sugerenciasTallas.map((t) => (
                              <option key={t} value={t} />
                            ))}
                          </datalist>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Color *
                          </label>
                          <input
                            list="fp-simple-colores-dl"
                            value={nuevaVariante.nombreColor}
                            onChange={(e) => setNuevaVariante(prev => ({ ...prev, nombreColor: e.target.value }))}
                            placeholder="Escribir o elegir"
                            className="w-full px-3 py-2 bg-[#f8f8f8] border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-gray-200 transition-all"
                          />
                          <datalist id="fp-simple-colores-dl">
                            {sugerenciasColores.map((c) => (
                              <option key={c} value={c} />
                            ))}
                          </datalist>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Cantidad *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={nuevaVariante.cantidad}
                            onChange={(e) => setNuevaVariante(prev => ({ ...prev, cantidad: parseInt(e.target.value) || 1 }))}
                            className="w-full px-3 py-2 bg-[#f8f8f8] border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-gray-200 transition-all"
                          />
                        </div>                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Código (opcional)
                          </label>
                          <input
                            type="text"
                            value={nuevaVariante.codigoIdentificacion}
                            onChange={(e) => setNuevaVariante(prev => ({ ...prev, codigoIdentificacion: e.target.value }))}
                            className="w-full px-3 py-2 bg-[#f8f8f8] border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-gray-200 transition-all"
                            placeholder="Se genera automáticamente"
                          />
                          <p className="mt-1 text-xs text-gray-500 italic">
                            La etiqueta incluirá automáticamente: "{formData.nombre} [{formData.codigoIdentificacion}] - T/X - Color Y"
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={agregarVariante}
                          className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                        >
                          Agregar Variante
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h4 className="text-md font-semibold mb-3 text-gray-800">Agregar Variantes por Talla (Modo Optimizado)</h4>
                      <div className="mb-4 p-3 bg-[#f8f8f8] rounded-xl border border-gray-100">
                        <p className="text-sm text-gray-700 mb-1"><strong>Modo Optimizado:</strong> Indica la talla y las cantidades por color (sugerencias desde el inventario; puedes añadir colores nuevos).</p>
                        <p className="text-xs text-gray-500 italic">
                          Las etiquetas incluirán automáticamente: "{formData.nombre} [{formData.codigoIdentificacion}] - T/X - Color Y"
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Talla *
                          </label>
                          <input
                            list="fp-opt-tallas-dl"
                            value={formularioOptimizado.nombreTalla}
                            onChange={(e) =>
                              setFormularioOptimizado((prev) => ({ ...prev, nombreTalla: e.target.value }))
                            }
                            placeholder="Escribir o elegir talla"
                            className="w-full px-3 py-2 bg-[#f8f8f8] border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-gray-200 transition-all"
                          />
                          <datalist id="fp-opt-tallas-dl">
                            {sugerenciasTallas.map((t) => (
                              <option key={t} value={t} />
                            ))}
                          </datalist>
                        </div>

                        {formularioOptimizado.nombreTalla.trim() !== '' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                              Cantidades por color
                            </label>
                            <div className="flex flex-wrap gap-2 mb-3">
                              <input
                                type="text"
                                value={nuevoColorExtraInput}
                                onChange={(e) => setNuevoColorExtraInput(e.target.value)}
                                placeholder="Otro color (nombre)"
                                className="flex-1 min-w-[160px] px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const n = nuevoColorExtraInput.trim();
                                  if (!n) return;
                                  setColoresExtraOptimizado((prev) =>
                                    prev.some((x) => x.toLowerCase() === n.toLowerCase()) ? prev : [...prev, n]
                                  );
                                  setNuevoColorExtraInput('');
                                }}
                                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                              >
                                Añadir color
                              </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {coloresGridOptimizado.map((nombreColor) => (
                                <div key={nombreColor} className="flex flex-col items-center p-3 border border-gray-100 rounded-xl bg-[#fafafa]">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div
                                      className="w-5 h-5 rounded-full border border-gray-300"
                                      style={{ backgroundColor: '#CCCCCC' }}
                                    />
                                    <span className="text-sm font-medium text-gray-700">{nombreColor}</span>
                                  </div>
                                  <input
                                    type="number"
                                    min="0"
                                    value={formularioOptimizado.cantidadesPorColor[nombreColor] || 0}
                                    onChange={(e) => actualizarCantidadColor(nombreColor, parseInt(e.target.value, 10) || 0)}
                                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-center text-sm font-bold focus:ring-2 focus:ring-gray-200 focus:border-transparent transition-all"
                                    placeholder="0"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          Total de variantes: <span className="font-semibold">
                            {Object.values(formularioOptimizado.cantidadesPorColor).reduce((sum, qty) => sum + qty, 0)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={agregarVariantesOptimizado}
                          disabled={!formularioOptimizado.nombreTalla.trim() || Object.values(formularioOptimizado.cantidadesPorColor).every(qty => qty === 0)}
                          className="bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                        >
                          Agregar Variantes
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Lista de variantes */}
              {variantes.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#fafafa]">
                        <tr>
                          <th className="text-left py-3 px-4 text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">Talla</th>
                          <th className="text-left py-3 px-4 text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">Color</th>
                          <th className="text-center py-3 px-4 text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">Cantidad</th>
                          <th className="text-left py-3 px-4 text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">Código</th>
                          <th className="text-center py-3 px-4 text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* FIX: Se usa una clave única y estable en lugar del índice. */}
                        {variantes.map((variante, index) => (
                          <tr key={variante.id || `new-${variante.nombreTalla}-${variante.nombreColor}`} className="border-t border-gray-50 hover:bg-[#fafafa] transition-colors">
                            <td className="py-3 px-4">
                              {variante.nombreTalla || 'N/A'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded-full border border-gray-300" 
                                  style={{ 
                                    backgroundColor: '#CCCCCC'
                                  }} 
                                />
                                {variante.nombreColor || 'N/A'}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="number"
                                min="1"
                                value={variante.stockAlmacen ?? variante.cantidad}
                                onChange={(e) => actualizarCantidadVariante(index, parseInt(e.target.value) || 1)}
                                className="w-20 px-2 py-1.5 bg-[#f8f8f8] border border-transparent rounded-lg text-center text-sm font-bold focus:ring-2 focus:ring-gray-200 transition-all"
                              />
                            </td>
                            <td className="py-3 px-4 text-xs text-gray-600 font-mono">
                              {variante.codigoIdentificacion}
                            </td>                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {variante.id ? (
                                  <button
                                    type="button"
                                    onClick={() => generarCodigoBarrasVariante(variante.id)}
                                    className="text-gray-400 hover:text-black p-1 rounded-full hover:bg-gray-100 transition-colors"
                                    disabled={loading}
                                    title="Ver código de barras"
                                  >
                                    <Barcode className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <span 
                                    className="text-xs text-gray-400 italic px-2 py-1" 
                                    title="Guarda el producto para generar el código"
                                  >
                                    Pendiente
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => eliminarVariante(index)}
                                  className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50"
                                  title="Eliminar variante"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="bg-[#fafafa] px-4 py-3 border-t border-gray-100">
                    <div className="text-sm font-semibold text-gray-700 flex items-center justify-between">
                      <span>Total de unidades: <span className="text-black font-bold">{cantidadTotal}</span></span>
                      <span className="text-xs text-gray-500">
                        {variantes.length === 1 ? '1 variante' : `${variantes.length} variantes`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {variantes.length === 0 && !showFormularioVariante && (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay variantes agregadas</p>
                  <p className="text-sm">Haz clic en "Agregar Variante" para comenzar</p>
                </div>
              )}
              </div>
            )}

            

            {/* Pestaña: Precios */}
            {tabActiva === 'precios' && (
              <div className="bg-gray-50 rounded-[1.5rem] p-8 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                <h3 className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase mb-6 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Precios por volumen
                </h3>

                  {errorPrecio && (
                    <div className="mb-4 p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">
                      {errorPrecio}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
                          Precio unitario <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-gray-500">S/</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            name="precioUnitario"
                            value={formData.precioUnitario}
                            onChange={handleInputChange}
                            className="w-full pl-9 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-gray-200 focus:border-gray-200 shadow-sm"
                            required
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Precio por unidad individual
                        </p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
                          Precio por cuarto (3 u.)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-gray-500">S/</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            name="precioCuarto"
                            value={formData.precioCuarto}
                            onChange={handleInputChange}
                            className="w-full pl-9 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-gray-200 focus:border-gray-200 shadow-sm"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Precio por 3 unidades (1/4 docena)
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
                          Precio por media docena (6 u.)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-gray-500">S/</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            name="precioMediaDocena"
                            value={formData.precioMediaDocena}
                            onChange={handleInputChange}
                            className="w-full pl-9 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-gray-200 focus:border-gray-200 shadow-sm"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Precio por 6 unidades (1/2 docena)
                        </p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
                          Precio por docena (12 u.)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-gray-500">S/</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            name="precioDocena"
                            value={formData.precioDocena}
                            onChange={handleInputChange}
                            className="w-full pl-9 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-gray-200 focus:border-gray-200 shadow-sm"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Precio por 12 unidades (docena completa)
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <h4 className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">Resumen de descuentos</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {formData.precioCuarto && formData.precioUnitario && (
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500">Descuento por 1/4 docena</p>
                          <p className="text-lg font-black text-black">
                            {(((parseFloat(formData.precioUnitario) * 3) - parseFloat(formData.precioCuarto)) / (parseFloat(formData.precioUnitario) * 3) * 100).toFixed(1)}%
                          </p>
                        </div>
                      )}
                      
                      {formData.precioMediaDocena && formData.precioUnitario && (
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500">Descuento por 1/2 docena</p>
                          <p className="text-lg font-black text-black">
                            {(((parseFloat(formData.precioUnitario) * 6) - parseFloat(formData.precioMediaDocena)) / (parseFloat(formData.precioUnitario) * 6) * 100).toFixed(1)}%
                          </p>
                        </div>
                      )}
                      
                      {formData.precioDocena && formData.precioUnitario && (
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500">Descuento por docena</p>
                          <p className="text-lg font-black text-black">
                            {(((parseFloat(formData.precioUnitario) * 12) - parseFloat(formData.precioDocena)) / (parseFloat(formData.precioUnitario) * 12) * 100).toFixed(1)}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
              </div>
            )}

            {/* Pestaña: Códigos de Barras */}
            {tabActiva === 'codigosBarras' && (              <div className="bg-gray-50 rounded-xl p-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 flex items-center gap-2">
                    <Barcode className="w-5 h-5" />
                    Códigos de Barras
                  </h3>
                    {/* Mensaje informativo actualizado */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-start gap-3">
                    <Tag className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Sobre las etiquetas de código de barras</h4>                    <div className="text-sm text-gray-700 space-y-1">
                      <p><strong>Etiquetas de Variantes:</strong> Cada etiqueta incluye automáticamente toda la información necesaria</p>
                      <p className="text-xs italic">Formato: "Nombre del Producto [Código] - T/Talla - Color"</p>
                      <p className="text-xs italic">Ejemplo: "Boxer Americano [BA001] - T/M - Azul"</p>
                      </div>
                    </div>
                  </div>
                    <div className="grid grid-cols-1 gap-6">
                    <div>
                      <div className="bg-white p-5 rounded-xl border border-gray-100 h-full"><h4 className="font-medium text-black mb-3">
                          {varianteSeleccionada 
                            ? 'Etiqueta con Información Completa'
                            : 'Etiquetas de Variantes (con nombre del producto)'}
                        </h4>
                        
                        {varianteSeleccionada && codigoBarrasPreview ? (
                          <div className="flex flex-col gap-4">
                            <div className="text-sm text-gray-600">
                              {variantes.map(v => {
                                if (v.id === varianteSeleccionada) {
                                  return (
                                    <div key={v.id} className="bg-gray-50 p-3 rounded-lg">                                      <p className="font-medium text-gray-800">Esta etiqueta contiene:</p>
                                      <p className="text-black font-semibold">"{formData.nombre} [{formData.codigoIdentificacion}] - T/{v.nombreTalla} - {v.nombreColor}"</p>
                                      <p className="text-xs text-gray-500 mt-1">Código: {v.codigoIdentificacion}</p>
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                            
                            <div className="flex flex-col items-center justify-center bg-white p-4 rounded-xl border border-gray-200">
                              <img 
                                src={codigoBarrasPreview} 
                                alt="Código de barras de variante" 
                                className="max-w-full h-auto max-h-48 mb-3"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={descargarCodigoBarrasVariante}
                                  className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm flex items-center gap-2"
                                >
                                  <Download className="w-4 h-4" />
                                  Descargar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVarianteSeleccionada(null);
                                    setCodigoBarrasPreview(null);
                                  }}
                                  className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                                >
                                  <X className="w-4 h-4" />
                                  Cerrar
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (variantes.length > 0 ? (
                            <div className="space-y-3">                              <div className="text-sm text-gray-500 mb-3">
                                <p className="font-medium">Cada etiqueta contendrá:</p>
                                <p className="text-xs italic">"{formData.nombre} [{formData.codigoIdentificacion}] - T/X - Color Y"</p>
                              </div>
                              
                              <div className="max-h-60 overflow-y-auto pr-2">
                                {variantes.map((variante, index) => {
                                  if (!variante.id) return null;
                                  
                                  const tallaNombre = variante.nombreTalla;
                                  const colorNombre = variante.nombreColor;
                                  
                                  return (
                                    <button
                                      key={index}
                                      type="button"
                                      onClick={() => generarCodigoBarrasVariante(variante.id!)}
                                      className="flex flex-col items-start gap-1 w-full p-3 mb-2 rounded-xl border border-gray-100 hover:bg-[#f8f8f8] transition-colors text-left"
                                      disabled={loading}
                                    >
                                      <div className="flex items-center gap-2 w-full">
                                        <div className="w-3 h-3 rounded-full" style={{
                                          backgroundColor: '#CCCCCC'
                                        }} />                                        <span className="font-medium flex-1">T/{tallaNombre} - {colorNombre}</span>
                                        <Barcode className="w-4 h-4 text-gray-400" />
                                      </div>
                                      <span className="text-xs text-gray-500 font-medium">
                                        "{formData.nombre} [{formData.codigoIdentificacion}] - T/{tallaNombre} - {colorNombre}"
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-6">
                              <p className="text-sm text-gray-500 mb-2">
                                No hay variantes agregadas.
                              </p>                              <p className="text-xs text-gray-500 italic mb-4">
                                Las etiquetas de variantes incluirán automáticamente:<br/>
                                "Nombre del Producto [Código] - T/X - Color Y"
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setTabActiva('variantes');
                                  setShowFormularioVariante(true);
                                }}
                                className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 mx-auto"
                              >
                                <Plus className="w-4 h-4" />
                                Agregar Variantes
                              </button>
                            </div>
                          )
                        )
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-between items-center sticky bottom-0 bg-white px-8 py-6 border-t border-gray-100 rounded-b-[2rem]">
              <div className="flex gap-3">                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-3.5 rounded-xl border border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200 font-bold text-xs uppercase tracking-widest transition-all"
                >
                  Cancelar
                </button>
                
                <div className="flex gap-2">
                  {tabActiva !== 'informacion' && (
                    <button
                      type="button"
                      onClick={() => setTabActiva('informacion')}
                      className="px-5 py-3.5 rounded-xl border border-transparent bg-[#f8f8f8] text-gray-600 hover:text-black font-bold text-xs uppercase tracking-widest transition-all"
                    >
                      Anterior
                    </button>
                  )}
                  
                  {tabActiva === 'informacion' && (
                    <button
                      type="button"
                      onClick={() => setTabActiva('variantes')}
                      className="px-5 py-3.5 rounded-xl border border-transparent bg-[#f8f8f8] text-gray-600 hover:text-black font-bold text-xs uppercase tracking-widest transition-all"
                    >
                      Continuar a Variantes
                    </button>
                  )}
                  
                  {tabActiva === 'variantes' && (
                    <button
                      type="button"
                      onClick={() => setTabActiva('precios')}
                      className="px-5 py-3.5 rounded-xl border border-transparent bg-[#f8f8f8] text-gray-600 hover:text-black font-bold text-xs uppercase tracking-widest transition-all"
                    >
                      Continuar a Precios
                    </button>
                  )}
                </div>
              </div>
              
              <button
                type="submit"
                className="px-8 py-3.5 text-xs font-bold text-white bg-black hover:bg-gray-900 rounded-xl shadow-lg active:scale-[0.98] transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                disabled={loading}
              >
                <Save className="w-5 h-5" />
                {loading ? 'Guardando...' : (producto ? 'Guardar Cambios' : 'Crear Producto')}
              </button>
            </div>
          </form>
        </div>
        </div>
      </div>

      {/* Alert Modal */}
      <AlertModal
        open={alertModal.open}
        message={alertModal.message}
        variant={alertModal.variant}
        onClose={() => setAlertModal({ open: false, message: '', variant: 'info' })}
      />
    </div>
  );
};

export default FormularioProductoUnificado;

