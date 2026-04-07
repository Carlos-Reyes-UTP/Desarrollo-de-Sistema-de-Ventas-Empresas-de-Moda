import React, { useState, useEffect } from 'react';
import { X, Save, Download, Tag, Layers, Package2, Barcode, Trash, Plus, AlertCircle } from 'lucide-react';
import type { Producto } from '../../interfaces/Producto';
import type { Categoria } from '../../interfaces/Categoria';
import type { Proveedor } from '../../interfaces/Proveedor';
import type { Color } from '../../interfaces/Color';
import type { Talla } from '../../interfaces/Talla';
import type { ProductoVariante } from '../../interfaces/ProductoVariante';
import { ProductoService } from '../../services/ProductoServices';
import { ColorService } from '../../services/ColorService';
import { TallaService } from '../../services/TallaService';
import { CodigoBarrasService } from '../../services/CodigoBarrasService';
import { ProductoVarianteService } from '../../services/ProductoVarianteService';
import { getErrorMessage, getStatusCode } from './formulario-producto-unificado/errorUtils';

interface VarianteFormData {
  id?: number;
  tallaId: number;
  colorId: number;
  cantidad: number;
  codigoIdentificacion: string;
}

interface FormularioProductoUnificadoProps {
  producto?: Producto | null;
  categorias: Categoria[];
  proveedores: Proveedor[];
  onClose: () => void;
  onProductoGuardado: (productoGuardado?: Producto) => void;
}

// Definimos las pestaÃ±as disponibles
type TabType = 'informacion' | 'variantes' | 'precios' | 'codigosBarras';
type ValueChangeEvent = { target: { value: string } };

const FormularioProductoUnificado: React.FC<FormularioProductoUnificadoProps> = ({
  producto,
  categorias,
  proveedores,
  onClose,
  onProductoGuardado
}) => {  // Estado bÃ¡sico del formulario
  const [formData, setFormData] = useState({
    codigoIdentificacion: '',
    codigoBarras: '',
    nombre: '',
    sexo: '',
    tipoPublico: '', // NUEVO CAMPO: niÃ±o o adulto
    categoriaId: '',
    subcategoriaId: '',
    subCategoria2Id: '', // NUEVO CAMPO: segunda subcategorÃ­a
    marca: '',
    proveedorId: '',
    precioUnitario: '',
    precioCuarto: '',
    precioMediaDocena: '',
    precioDocena: ''
  });
    // Estados para variantes y datos relacionados
  const [variantes, setVariantes] = useState<VarianteFormData[]>([]);
  const [coloresDisponibles, setColoresDisponibles] = useState<Color[]>([]);
  const [tallasDisponibles, setTallasDisponibles] = useState<Talla[]>([]);
  const [subcategorias, setSubcategorias] = useState<Categoria[]>([]);
  const [subCategorias2, setSubCategorias2] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorPrecio, setErrorPrecio] = useState<string | null>(null);
    // Estados para nueva variante (modo simple)
  const [nuevaVariante, setNuevaVariante] = useState({
    tallaId: 0,
    colorId: 0,
    cantidad: 1,
    codigoIdentificacion: ''
  });
  const [showFormularioVariante, setShowFormularioVariante] = useState(false);
  
  // Estados para formulario optimizado (mÃºltiples colores por talla)
  const [modoFormulario, setModoFormulario] = useState<'simple' | 'optimizado'>('optimizado');
  const [formularioOptimizado, setFormularioOptimizado] = useState({
    tallaSeleccionada: 0,
    cantidadesPorColor: {} as Record<number, number>
  });  // Estados nuevos para UI mejorada
  const [tabActiva, setTabActiva] = useState<TabType>('informacion');
  const [codigoBarrasPreview, setCodigoBarrasPreview] = useState<string | null>(null);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<number | null>(null);
  
  // Estado para animaciÃ³n del modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  // Estados para bÃºsqueda en campos de selecciÃ³n
  const [searchCategoria, setSearchCategoria] = useState('');
  const [searchSubcategoria, setSearchSubcategoria] = useState('');
  const [searchSubcategoria2, setSearchSubcategoria2] = useState('');
  const [searchProveedor, setSearchProveedor] = useState('');
  const [isCategoriaFocused, setIsCategoriaFocused] = useState(false);
  const [isSubcategoriaFocused, setIsSubcategoriaFocused] = useState(false);
  const [isSubcategoria2Focused, setIsSubcategoria2Focused] = useState(false);
  const [isProveedorFocused, setIsProveedorFocused] = useState(false);
  
  // CategorÃ­a, subcategorÃ­a y proveedor seleccionados (por nombre)
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [subcategoriaSeleccionada, setSubcategoriaSeleccionada] = useState('');
  const [subcategoria2Seleccionada, setSubcategoria2Seleccionada] = useState('');
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState('');
  
  // Cargar datos iniciales
  useEffect(() => {
    setIsModalVisible(true);
    cargarColoresYTallas();
  }, []);
  
  // FunciÃ³n para cerrar con animaciÃ³n
  const handleClose = () => {
    setIsModalVisible(false);
    setTimeout(onClose, 300); // Esperar a que la animaciÃ³n termine
  };
  useEffect(() => {
    if (producto) {
      // Determinar la configuraciÃ³n de categorÃ­as del producto
      const tieneCategoriaPadre = producto.categoriaPadre != null;
      const tieneCategoria = producto.categoria != null;
      
      // Caso 1: Producto con categoria y categoriaPadre diferentes (subcategorÃ­a)
      // Caso 2: Producto con categoria y categoriaPadre iguales (categorÃ­a principal sin hijos)
      // Caso 3: Producto solo con categoriaPadre (categorÃ­a principal)
      
      let categoriaIdFormulario = '';
      let subcategoriaIdFormulario = '';
      
      if (tieneCategoriaPadre && tieneCategoria) {
        // Verificar si son iguales (categorÃ­a principal sin hijos) o diferentes (subcategorÃ­a)
        if (producto.categoria?.idCategoria === producto.categoriaPadre?.idCategoria) {
          // CategorÃ­a principal sin hijos
          categoriaIdFormulario = producto.categoriaPadre?.idCategoria?.toString() || '';
          subcategoriaIdFormulario = '';
        } else {
          // Tiene subcategorÃ­a
          categoriaIdFormulario = producto.categoriaPadre?.idCategoria?.toString() || '';
          subcategoriaIdFormulario = producto.categoria?.idCategoria?.toString() || '';
        }
      } else if (tieneCategoriaPadre) {
        // Solo tiene categorÃ­a padre
        categoriaIdFormulario = producto.categoriaPadre?.idCategoria?.toString() || '';
        subcategoriaIdFormulario = '';
      } else if (tieneCategoria) {
        // Solo tiene categorÃ­a (caso legacy)
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
      
      // Inicializar categorÃ­as seleccionadas con sus nombres
      if (producto.categoriaPadre) {
        // Seleccionar categorÃ­a principal
        if (categoriaIdFormulario) {
          setCategoriaSeleccionada(producto.categoriaPadre.nombre);
          
          // Cargar subcategorÃ­as de nivel 2
          const categoriaSeleccionadaObj = categorias.find(c => c.idCategoria?.toString() === categoriaIdFormulario);
          if (categoriaSeleccionadaObj?.subCategorias) {
            setSubcategorias(categoriaSeleccionadaObj.subCategorias);
          }
        }
      }
      
      // Inicializar subcategorÃ­a seleccionada (nivel 2)
      if (producto.categoria && tieneCategoria && producto.categoriaPadre && 
          producto.categoria.idCategoria !== producto.categoriaPadre.idCategoria) {
        if (subcategoriaIdFormulario) {
          setSubcategoriaSeleccionada(producto.categoria.nombre);
          
          // Cargar subcategorÃ­as de nivel 3
          const subcategoriaSeleccionadaObj = producto.categoriaPadre.subCategorias?.find(
            sc => sc.idCategoria?.toString() === subcategoriaIdFormulario
          );
          if (subcategoriaSeleccionadaObj?.subCategorias) {
            setSubCategorias2(subcategoriaSeleccionadaObj.subCategorias);
          }
        }
      }
      
      // Inicializar subcategorÃ­a nivel 3
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

  const cargarColoresYTallas = async () => {
    try {
      setLoading(true);
      const [coloresData, tallasData] = await Promise.all([
        ColorService.getAllColores(),
        TallaService.getAllTallas()
      ]);
      setColoresDisponibles(coloresData);
      setTallasDisponibles(tallasData);
    } catch (err: unknown) {
      console.error('Error al cargar colores y tallas:', err);
      const status = getStatusCode(err);
      
      // Manejo especÃ­fico para errores de autenticaciÃ³n/autorizaciÃ³n
      if (status === 401) {
        setError('Error de autorizaciÃ³n: Tu sesiÃ³n ha expirado. Por favor, inicia sesiÃ³n nuevamente.');
      } else if (status === 403) {
        setError('Error de permisos: No tienes autorizaciÃ³n para acceder a esta informaciÃ³n.');
      } else {
        setError(
          'Error al cargar colores y tallas disponibles: ' +
            getErrorMessage(err, 'Error de comunicaciÃ³n con el servidor')
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Funciones para filtrar datos en bÃºsquedas
  const categoriasPrincipalesFiltradas = categorias
    .filter(categoria => !categoria.categoriaPadre) // Solo categorÃ­as principales
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
        console.warn(`âš ï¸  Se removieron ${variantesExistentes.length - variantesUnicas.length} variantes duplicadas`);
      }      // Mapear variantes del backend al formato del formulario
      const variantesFormData: VarianteFormData[] = variantesUnicas.map(v => {
        // Priorizar idProductoVariante (que es el ID real en BD) sobre idVariante
        const varianteId = v.idProductoVariante || v.idVariante;
        
        const variante = {
          id: varianteId,
          tallaId: v.talla.idTalla || 0,
          colorId: v.color.idColor || 0,
          cantidad: v.cantidad,
          codigoIdentificacion: v.codigoBarrasVariante || ''
        };
        
        console.log(`   âœ… Variante mapeada: ID=${variante.id}, Talla=${v.talla.nombreTalla}, Color=${v.color.nombre}, Cantidad=${variante.cantidad}`);
        return variante;
      });
      
      console.log(`âœ… ${variantesFormData.length} variantes cargadas en el estado del formulario`);
      setVariantes(variantesFormData);
    } catch (err: unknown) {
      console.error('Error al cargar variantes existentes:', err);
      const status = getStatusCode(err);
      
      // Manejo especÃ­fico para errores de autenticaciÃ³n/autorizaciÃ³n
      if (status === 401) {
        setError('Error de autorizaciÃ³n: Tu sesiÃ³n ha expirado. Por favor, inicia sesiÃ³n nuevamente.');
      } else if (status === 403) {
        setError('Error de permisos: No tienes autorizaciÃ³n para acceder a esta informaciÃ³n.');
      } else {
        setError(
          'Error al cargar variantes: ' +
            getErrorMessage(err, 'Error de comunicaciÃ³n con el servidor')
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const cantidadTotal = variantes.reduce((total, variante) => total + variante.cantidad, 0);

  // Funciones para manejar variantes
  const agregarVariante = () => {
    if (nuevaVariante.tallaId === 0 || nuevaVariante.colorId === 0) {
      setError('Debe seleccionar una talla y un color para la variante');
      return;
    }

    // Verificar si ya existe una variante con la misma talla y color
    const existeVariante = variantes.some(v => 
      v.tallaId === nuevaVariante.tallaId && v.colorId === nuevaVariante.colorId
    );

    if (existeVariante) {
      setError('Ya existe una variante con esta combinaciÃ³n de talla y color');
      return;
    }

    const talla = tallasDisponibles.find(t => t.idTalla === nuevaVariante.tallaId);
    const color = coloresDisponibles.find(c => c.idColor === nuevaVariante.colorId);

    if (!talla || !color) {
      setError('Error al encontrar la talla o color seleccionado');
      return;
    }

    // Generar cÃ³digo de identificaciÃ³n si estÃ¡ vacÃ­o
    let codigoIdentificacion = nuevaVariante.codigoIdentificacion;
    if (!codigoIdentificacion) {
      const codigoBase = formData.codigoIdentificacion || 'PROD';
      codigoIdentificacion = `${codigoBase}-${talla.nombreTalla}-${color.nombre}`;
    }

    const nuevaVarianteCompleta: VarianteFormData = {
      tallaId: nuevaVariante.tallaId,
      colorId: nuevaVariante.colorId,
      cantidad: nuevaVariante.cantidad,
      codigoIdentificacion
    };

    setVariantes(prev => [...prev, nuevaVarianteCompleta]);
    setNuevaVariante({
      tallaId: 0,
      colorId: 0,
      cantidad: 1,
      codigoIdentificacion: ''
    });
    setShowFormularioVariante(false);
    setError(null);
  };

  const eliminarVariante = (index: number) => {
    setVariantes(prev => prev.filter((_, i) => i !== index));
  };

  const actualizarCantidadVariante = (index: number, cantidad: number) => {
    if (cantidad < 1) return;
    
    setVariantes(prev => prev.map((variante, i) => 
      i === index ? { ...variante, cantidad } : variante
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('ðŸš€ Iniciando proceso de guardado de producto');
      console.log('ðŸ“Š Estado actual de variantes:', {
        cantidad: variantes.length,
        variantes: variantes.map(v => ({ id: v.id, tallaId: v.tallaId, colorId: v.colorId, cantidad: v.cantidad }))
      });

      // Validaciones bÃ¡sicas
      if (!formData.nombre.trim()) {
        throw new Error('El nombre del producto es requerido');
      }

      if (!formData.codigoIdentificacion.trim()) {
        throw new Error('El cÃ³digo de identificaciÃ³n es requerido');
      }      // Encontrar objetos de categorÃ­as y proveedor
      let categoriaSeleccionada: Categoria | undefined = undefined;
      let categoriaPadreSeleccionada: Categoria | undefined = undefined;

      if (formData.subcategoriaId) {
        // Caso 1: Si hay una subcategorÃ­a seleccionada
        categoriaSeleccionada = subcategorias.find(c => c.idCategoria?.toString() === formData.subcategoriaId)!;
        categoriaPadreSeleccionada = categorias.find(c => c.idCategoria?.toString() === formData.categoriaId);
        
        console.log('ðŸ“‚ Usando subcategorÃ­a como categorÃ­a principal:', categoriaSeleccionada?.nombre);
        console.log('ðŸ“ CategorÃ­a padre seleccionada:', categoriaPadreSeleccionada?.nombre);
      } else {
        // Caso 2: Si solo hay categorÃ­a principal seleccionada
        const categoriaPrincipal = categorias.find(c => c.idCategoria?.toString() === formData.categoriaId)!;
        
        if (!categoriaPrincipal) {
          throw new Error('Debe seleccionar una categorÃ­a vÃ¡lida');
        }
        
        // Verificar si la categorÃ­a principal tiene subcategorÃ­as
        if (categoriaPrincipal.subCategorias && categoriaPrincipal.subCategorias.length > 0) {
          // Si tiene subcategorÃ­as, entonces es una categorÃ­a padre y necesita una subcategorÃ­a
          throw new Error('Debe seleccionar una subcategorÃ­a para esta categorÃ­a principal');
        } else {
          // Si no tiene subcategorÃ­as, se configura SOLO como categorÃ­a padre
          // categoria queda como undefined (null) y categoriaPadre toma la categorÃ­a principal
          categoriaSeleccionada = undefined;
          categoriaPadreSeleccionada = categoriaPrincipal;
          
          console.log('ðŸ“ CategorÃ­a principal sin hijos - configurando SOLO como categoriaPadre:', categoriaPrincipal?.nombre);
        }
      }

      // Validar tipo pÃºblico
      if (!formData.tipoPublico) {
        throw new Error('Debe seleccionar el tipo de pÃºblico (niÃ±o o adulto)');
      }

      // Validar segunda subcategorÃ­a - ahora es obligatoria solo si hay subCategorias2 disponibles
      if (subCategorias2.length > 0 && !formData.subCategoria2Id) {
        throw new Error('Debe seleccionar la segunda subcategorÃ­a (Nivel 3)');
      }

      const proveedor = proveedores.find(p => p.idProveedor?.toString() === formData.proveedorId);

      if (!proveedor) {
        throw new Error('Debe seleccionar un proveedor vÃ¡lido');
      }

      // Obtener la segunda subcategorÃ­a desde el array correcto
      let subCategoria2: Categoria | undefined = undefined;
      if (formData.subCategoria2Id) {
        // Buscar primero en subCategorias2 (nivel 3), luego en categorias completas como fallback
        subCategoria2 = subCategorias2.find(c => c.idCategoria?.toString() === formData.subCategoria2Id) ||
                       categorias.find(c => c.idCategoria?.toString() === formData.subCategoria2Id);
        if (!subCategoria2) {
          throw new Error('Segunda subcategorÃ­a no vÃ¡lida');
        }
      }

      // Si no hay subCategoria2 seleccionada pero es requerida, usar una categorÃ­a por defecto o lanzar error
      if (!subCategoria2 && subCategorias2.length > 0) {
        throw new Error('Debe seleccionar la segunda subcategorÃ­a (Nivel 3)');
      }

      // Crear una categorÃ­a temporal si no hay segunda subcategorÃ­a pero se requiere para la interface
      const subCategoria2Final = subCategoria2 || {
        idCategoria: 0,
        nombre: "Sin categorÃ­a nivel 3",
        categoriaPadre: undefined,
        subCategorias: undefined,
        esCategoriaPrincipal: false,
        tieneSubcategorias: false
      };

      // Crear objeto producto
      const productoData: Omit<Producto, 'idProducto'> = {
        codigoIdentificacion: formData.codigoIdentificacion,
        codigoBarras: formData.codigoBarras || undefined,
        nombre: formData.nombre,
        sexo: formData.sexo || undefined,
        tipoPublico: formData.tipoPublico,
        categoria: categoriaSeleccionada,
        subCategoria2: subCategoria2Final,
        categoriaPadre: categoriaPadreSeleccionada,
        marca: formData.marca || undefined,
        proveedor,
        cantidad: cantidadTotal,
        precioUnitario: parseFloat(formData.precioUnitario),
        precioCuarto: formData.precioCuarto ? parseFloat(formData.precioCuarto) : undefined,
        precioMediaDocena: formData.precioMediaDocena ? parseFloat(formData.precioMediaDocena) : undefined,
        precioDocena: formData.precioDocena ? parseFloat(formData.precioDocena) : undefined
      };

      let productoGuardado: Producto;

      // Crear o actualizar producto
      console.log(`${producto?.idProducto ? 'âœï¸  Actualizando' : 'âž• Creando'} producto...`);
      if (producto?.idProducto) {
        productoGuardado = await ProductoService.updateProducto(producto.idProducto, {
          ...productoData,
          idProducto: producto.idProducto
        });
      } else {
        productoGuardado = await ProductoService.createProducto(productoData);
      }
      console.log(`âœ… Producto ${producto?.idProducto ? 'actualizado' : 'creado'} con ID: ${productoGuardado.idProducto}`);      // ===== PROCESAMIENTO MEJORADO DE VARIANTES =====
      if (productoGuardado.idProducto && variantes.length > 0) {
        console.log('ðŸ”§ Iniciando sincronizaciÃ³n de variantes...');

        // 1. Obtener el estado actual REAL de la base de datos
        const variantesEnBD = producto?.idProducto
          ? await ProductoVarianteService.obtenerVariantesPorProducto(producto.idProducto)
          : [];
        console.log(`ðŸ“¦ Encontradas ${variantesEnBD.length} variantes existentes en la base de datos.`);

        const variantesEnFormulario = variantes; // Las variantes del estado de React
        console.log(`ï¿½ Se procesarÃ¡n ${variantesEnFormulario.length} variantes desde el formulario.`);

        // Convertir a mapas para una bÃºsqueda eficiente (O(1) en lugar de O(n))
        const mapaVariantesBD = new Map(variantesEnBD.map(v => [v.idProductoVariante, v]));
        const mapaVariantesFormulario = new Map(variantesEnFormulario.filter(v => v.id).map(v => [v.id, v]));

        // 2. IDENTIFICAR OPERACIONES
        
        // -> Variantes a ELIMINAR: EstÃ¡n en la BD pero no en el formulario
        const variantesAEliminar = variantesEnBD.filter(
          vDB => !mapaVariantesFormulario.has(vDB.idProductoVariante!)
        );

        // -> Variantes a ACTUALIZAR: EstÃ¡n en ambos, formulario y BD
        const variantesAActualizar = variantesEnFormulario.filter(
          vForm => vForm.id && mapaVariantesBD.has(vForm.id)
        );

        // -> Variantes a CREAR: EstÃ¡n en el formulario pero no tienen ID (son nuevas)
        const variantesACrear = variantesEnFormulario.filter(vForm => !vForm.id);

        console.log(`âž• ${variantesACrear.length} para crear, âœï¸ ${variantesAActualizar.length} para actualizar, ðŸ—‘ï¸ ${variantesAEliminar.length} para eliminar.`);

        // 3. EJECUTAR OPERACIONES EN ORDEN (Eliminar, Actualizar, Crear)
        
        // -> Eliminar primero
        for (const variante of variantesAEliminar) {
          console.log(`  ðŸ—‘ï¸ Eliminando variante ID: ${variante.idProductoVariante}`);
          try {
            await ProductoVarianteService.eliminarVariante(variante.idProductoVariante!);
            console.log(`  âœ… Variante ID=${variante.idProductoVariante} eliminada correctamente`);
          } catch (error: unknown) {
            console.error(
              `âŒ Error al eliminar variante ID ${variante.idProductoVariante}:`,
              getErrorMessage(error, 'Error desconocido')
            );
            throw new Error(`Fallo al eliminar la variante ${variante.talla.nombreTalla} - ${variante.color.nombre}.`);
          }
        }

        // -> Luego, actualizar existentes
        for (const variante of variantesAActualizar) {
          const existente = mapaVariantesBD.get(variante.id!);
          
          // Solo llamar a la API si hay cambios reales
          if (existente && (existente.cantidad !== variante.cantidad || existente.codigoBarrasVariante !== variante.codigoIdentificacion)) {
            console.log(`  âœï¸ Actualizando variante ID: ${variante.id}`);
            console.log(`    ðŸ“Š Cantidad: ${existente.cantidad} â†’ ${variante.cantidad}`);
            console.log(`    ðŸ·ï¸ CÃ³digo: '${existente.codigoBarrasVariante}' â†’ '${variante.codigoIdentificacion}'`);
            
            const talla = tallasDisponibles.find(t => t.idTalla === variante.tallaId);
            const color = coloresDisponibles.find(c => c.idColor === variante.colorId);

            if (!talla || !color) {
              console.warn(`âš ï¸ Saltando actualizaciÃ³n - Talla o color no encontrado: tallaId=${variante.tallaId}, colorId=${variante.colorId}`);
              continue;
            }

            const varianteData: Omit<ProductoVariante, 'idVariante'> = {
              producto: productoGuardado,
              talla,
              color,
              cantidad: variante.cantidad,
              codigoBarrasVariante: variante.codigoIdentificacion
            };

            try {
              await ProductoVarianteService.actualizarVariante(variante.id!, {
                ...varianteData,
                idProductoVariante: variante.id
              });
              console.log(`  âœ… Variante ID=${variante.id} actualizada correctamente`);
            } catch (error: unknown) {
              const errorMessage = getErrorMessage(error, 'Error desconocido');
              console.error(`âŒ Error al actualizar variante ID ${variante.id}:`, errorMessage);
              throw new Error(`Error al actualizar variante ${talla.nombreTalla}-${color.nombre}: ${errorMessage}`);
            }
          } else {
            console.log(`  â© Saltando variante ID: ${variante.id} (sin cambios)`);
          }
        }

        // -> Finalmente, crear nuevas
        for (const variante of variantesACrear) {
          const talla = tallasDisponibles.find(t => t.idTalla === variante.tallaId);
          const color = coloresDisponibles.find(c => c.idColor === variante.colorId);

          if (!talla || !color) {
            console.warn(`âš ï¸ Saltando creaciÃ³n - Talla o color no encontrado: tallaId=${variante.tallaId}, colorId=${variante.colorId}`);
            continue;
          }

          console.log(`  âž• Creando nueva variante (Talla: ${talla.nombreTalla}, Color: ${color.nombre}, Cantidad: ${variante.cantidad})`);
          
          const varianteData: Omit<ProductoVariante, 'idVariante'> = {
            producto: productoGuardado,
            talla,
            color,
            cantidad: variante.cantidad,
            codigoBarrasVariante: variante.codigoIdentificacion
          };

          try {
            const nuevaVariante = await ProductoVarianteService.crearVariante(varianteData);
            console.log(`  âœ… Nueva variante creada con ID=${nuevaVariante.idProductoVariante}`);
          } catch (error: unknown) {
            const errorMessage = getErrorMessage(error, 'Error desconocido');
            console.error(`âŒ Error al crear nueva variante:`, errorMessage);
            throw new Error(`Error al crear variante ${talla.nombreTalla}-${color.nombre}: ${errorMessage}`);
          }
        }

        console.log('\nâœ… Â¡SincronizaciÃ³n de variantes completada exitosamente!');
      } else if (variantes.length === 0) {
        console.log('â„¹ï¸ No hay variantes para procesar');
      }

      // Obtener las variantes actualizadas del producto para devolver un producto completo con sus variantes
      if (productoGuardado.idProducto) {
        const variantesActualizadas = await ProductoVarianteService.obtenerVariantesPorProducto(productoGuardado.idProducto);
        console.log(`ðŸ”„ Obtenidas ${variantesActualizadas.length} variantes actualizadas para el producto`);
        // AÃ±adir la cantidad total actualizada al producto
        const cantidadTotalActualizada = variantesActualizadas.reduce((total, v) => total + v.cantidad, 0);
        productoGuardado = {
          ...productoGuardado,
          cantidad: cantidadTotalActualizada
        };
      }      console.log('ðŸŽ‰ Proceso de guardado completado exitosamente');
      onProductoGuardado(productoGuardado);
      handleClose();
    } catch (err: unknown) {
      console.error('âŒ Error al guardar producto:', err);
      const status = getStatusCode(err);
      
      // Manejo especÃ­fico para errores de autenticaciÃ³n/autorizaciÃ³n
      if (status === 401) {
        setError('Error de autorizaciÃ³n: Tu sesiÃ³n ha expirado o no tienes permisos para realizar esta acciÃ³n. Por favor, inicia sesiÃ³n nuevamente.');
      } else if (status === 403) {
        setError('Error de permisos: No tienes autorizaciÃ³n para realizar esta acciÃ³n.');
      } else {
        setError(getErrorMessage(err, 'Error al guardar el producto'));
      }
    } finally {
      setLoading(false);
    }
  };  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // ValidaciÃ³n para campos de precio
    if (["precioUnitario", "precioCuarto", "precioMediaDocena", "precioDocena"].includes(name)) {
      const nuevoValor = value === '' ? '' : Math.max(0, parseFloat(value));
      // Si el usuario intenta poner un valor negativo, lo forzamos a 0
      if (value !== '' && parseFloat(value) < 0) {
        setErrorPrecio('No se permiten valores negativos en los precios.');
        setFormData(prev => ({ ...prev, [name]: 0 }));
        return;
      }
      // ValidaciÃ³n de jerarquÃ­a de precios por unidad
      let precios = {
        precioUnitario: name === 'precioUnitario' ? (typeof nuevoValor === 'number' ? nuevoValor : 0) : parseFloat(formData.precioUnitario) || 0,
        precioCuarto: name === 'precioCuarto' ? (typeof nuevoValor === 'number' ? nuevoValor : 0) : parseFloat(formData.precioCuarto) || 0,
        precioMediaDocena: name === 'precioMediaDocena' ? (typeof nuevoValor === 'number' ? nuevoValor : 0) : parseFloat(formData.precioMediaDocena) || 0,
        precioDocena: name === 'precioDocena' ? (typeof nuevoValor === 'number' ? nuevoValor : 0) : parseFloat(formData.precioDocena) || 0,
      };
      
      // Calcular precio por unidad para cada volumen
      const precioUnitarioIndividual = precios.precioUnitario;
      const precioUnitarioCuarto = precios.precioCuarto > 0 ? precios.precioCuarto / 3 : 0;
      const precioUnitarioMediaDocena = precios.precioMediaDocena > 0 ? precios.precioMediaDocena / 6 : 0;
      const precioUnitarioDocena = precios.precioDocena > 0 ? precios.precioDocena / 12 : 0;
      
      // Validar que el precio por unidad sea decreciente: Individual â‰¥ Cuarto/3 â‰¥ MediaDocena/6 â‰¥ Docena/12
      if (
        (precios.precioCuarto > 0 && precioUnitarioCuarto > precioUnitarioIndividual) ||
        (precios.precioMediaDocena > 0 && precioUnitarioMediaDocena > precioUnitarioCuarto) ||
        (precios.precioDocena > 0 && precioUnitarioDocena > precioUnitarioMediaDocena)
      ) {
        setErrorPrecio('El precio por unidad debe ser decreciente: Individual â‰¥ Cuarto/3 â‰¥ MediaDocena/6 â‰¥ Docena/12');
        return;
      }
      setErrorPrecio(null);
      setFormData(prev => ({ ...prev, [name]: value }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generarCodigoBarrasAutomatico = () => {
    // Generar un cÃ³digo de barras basado en el timestamp actual y el cÃ³digo de identificaciÃ³n
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
      setError('No se puede generar cÃ³digo de barras: la variante no tiene ID asignado. Guarda el producto primero.');
      return;
    }
      try {
      setLoading(true);
      setError(null);
      console.log(`ðŸ·ï¸ Generando cÃ³digo de barras para variante ID: ${varianteId}`);
      
      const blob = await CodigoBarrasService.generarImagenVariante(varianteId);
      
      // Crear URL para previsualizar la imagen
      const url = window.URL.createObjectURL(blob);
      setCodigoBarrasPreview(url);
      setVarianteSeleccionada(varianteId);
      
      // Cambiar a la pestaÃ±a de cÃ³digos de barras
      setTabActiva('codigosBarras');
    } catch (err: unknown) {
      console.error('Error al generar cÃ³digo de barras de variante:', err);
      setError('Error al generar cÃ³digo de barras: ' + getErrorMessage(err, 'Error desconocido'));
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
    
    // Mostrar mensaje de Ã©xito
    alert('CÃ³digo de barras de variante descargado correctamente');
  };
  
  // FunciÃ³n para manejar cambio de categorÃ­a principal (Nivel 1)
  const handleCategoriaChange = (e: ValueChangeEvent) => {
    const categoriaId = e.target.value;
    setFormData(prev => ({ 
      ...prev, 
      categoriaId,
      subcategoriaId: '', // Limpiar subcategorÃ­a cuando cambia la principal
      subCategoria2Id: ''  // Limpiar segunda subcategorÃ­a tambiÃ©n
    }));

    // Cargar subcategorÃ­as (Nivel 2) de la categorÃ­a seleccionada
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
    
    // Limpiar tambiÃ©n las subcategorÃ­as de nivel 3
    setSubCategorias2([]);
  };

  // FunciÃ³n para manejar cambio de subcategorÃ­a (Nivel 2)
  const handleSubcategoriaChange = (e: ValueChangeEvent) => {
    const subcategoriaId = e.target.value;
    setFormData(prev => ({ 
      ...prev, 
      subcategoriaId,
      subCategoria2Id: '' // Limpiar segunda subcategorÃ­a cuando cambia la subcategorÃ­a
    }));

    // Cargar subcategorÃ­as de nivel 3 de la subcategorÃ­a seleccionada
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

  // FunciÃ³n optimizada para agregar mÃºltiples variantes de una talla
  const agregarVariantesOptimizado = () => {
    if (formularioOptimizado.tallaSeleccionada === 0) {
      setError('Debe seleccionar una talla');
      return;
    }

    const talla = tallasDisponibles.find(t => t.idTalla === formularioOptimizado.tallaSeleccionada);
    if (!talla) {
      setError('Talla no encontrada');
      return;
    }

    // Filtrar solo los colores que tienen cantidad > 0
    const coloresConCantidad = Object.entries(formularioOptimizado.cantidadesPorColor)
      .filter(([_, cantidad]) => cantidad > 0)
      .map(([colorId, cantidad]) => ({ colorId: parseInt(colorId), cantidad }));

    if (coloresConCantidad.length === 0) {
      setError('Debe especificar al menos una cantidad mayor a 0 para algÃºn color');
      return;
    }

    const nuevasVariantes: VarianteFormData[] = [];
    const errores: string[] = [];

    for (const { colorId, cantidad } of coloresConCantidad) {
      // Verificar si ya existe una variante con esta talla y color
      const existeVariante = variantes.some(v => 
        v.tallaId === formularioOptimizado.tallaSeleccionada && v.colorId === colorId
      );

      if (existeVariante) {
        const color = coloresDisponibles.find(c => c.idColor === colorId);
        errores.push(`Ya existe una variante para ${talla.nombreTalla} - ${color?.nombre || 'Color desconocido'}`);
        continue;
      }

      const color = coloresDisponibles.find(c => c.idColor === colorId);
      if (!color) {
        errores.push(`Color con ID ${colorId} no encontrado`);
        continue;
      }

      // Generar cÃ³digo de identificaciÃ³n automÃ¡tico
      const codigoBase = formData.codigoIdentificacion || 'PROD';
      const codigoIdentificacion = `${codigoBase}-${talla.nombreTalla}-${color.nombre}`;

      nuevasVariantes.push({
        tallaId: formularioOptimizado.tallaSeleccionada,
        colorId,
        cantidad,
        codigoIdentificacion
      });
    }

    if (errores.length > 0) {
      setError(errores.join(', '));
      return;
    }

    if (nuevasVariantes.length > 0) {
      setVariantes(prev => [...prev, ...nuevasVariantes]);
      // Limpiar formulario
      setFormularioOptimizado({
        tallaSeleccionada: 0,
        cantidadesPorColor: {}
      });
      setShowFormularioVariante(false);
      setError(null);
    }
  };

  // FunciÃ³n para actualizar cantidad de un color en el formulario optimizado
  const actualizarCantidadColor = (colorId: number, cantidad: number) => {
    setFormularioOptimizado(prev => ({
      ...prev,
      cantidadesPorColor: {
        ...prev.cantidadesPorColor,
        [colorId]: cantidad >= 0 ? cantidad : 0
      }
    }));
  };

  // FunciÃ³n para cambiar talla en formulario optimizado
  const cambiarTallaOptimizada = (tallaId: number) => {
    setFormularioOptimizado({
      tallaSeleccionada: tallaId,
      cantidadesPorColor: {} // Limpiar cantidades al cambiar talla
    });
  };
return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300 ${isModalVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto border border-gray-200 relative transform transition-all duration-300 ${isModalVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        {/* Header */}
        <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl p-6">
          <div className="absolute inset-0 bg-black/10 rounded-t-2xl"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                {producto ? (
                  <Package2 className="w-6 h-6 text-white" />
                ) : (
                  <Package2 className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {producto ? 'Editar Producto' : 'Crear Nuevo Producto'}
                </h2>
                <p className="text-indigo-100 text-sm">
                  {producto ? 'Modifica la informaciÃ³n del producto' : 'Complete la informaciÃ³n para crear el producto'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
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
            {/* NavegaciÃ³n por pestaÃ±as */}
            <div className="flex border-b border-gray-200">
              <button
                type="button"
                onClick={() => setTabActiva('informacion')}
                className={`flex items-center gap-2 px-6 py-3 font-medium text-sm rounded-t-lg ${
                  tabActiva === 'informacion' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Package2 className="w-4 h-4" />
                InformaciÃ³n BÃ¡sica
              </button>
              
              <button
                type="button"
                onClick={() => setTabActiva('variantes')}
                className={`flex items-center gap-2 px-6 py-3 font-medium text-sm rounded-t-lg ${
                  tabActiva === 'variantes' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Layers className="w-4 h-4" />
                Variantes {variantes.length > 0 && `(${variantes.length})`}
              </button>
              
              <button
                type="button"
                onClick={() => setTabActiva('precios')}
                className={`flex items-center gap-2 px-6 py-3 font-medium text-sm rounded-t-lg ${
                  tabActiva === 'precios' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Tag className="w-4 h-4" />
                Precios
              </button>
              
              <button
                type="button"
                onClick={() => setTabActiva('codigosBarras')}
                className={`flex items-center gap-2 px-6 py-3 font-medium text-sm rounded-t-lg ${
                  tabActiva === 'codigosBarras' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Barcode className="w-4 h-4" />
                CÃ³digos de Barras
              </button>
            </div>

            {/* PestaÃ±a: InformaciÃ³n bÃ¡sica */}
            {tabActiva === 'informacion' && (
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">InformaciÃ³n BÃ¡sica</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      CÃ³digo de IdentificaciÃ³n *
                    </label>
                    <input
                      type="text"
                      name="codigoIdentificacion"
                      value={formData.codigoIdentificacion}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400"
                      placeholder="Ingrese el cÃ³digo de identificaciÃ³n..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      CÃ³digo de Barras
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="codigoBarras"
                        value={formData.codigoBarras}
                        onChange={handleInputChange}
                        placeholder="CÃ³digo de barras (opcional)"
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400 font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => generarCodigoBarrasAutomatico()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200 flex items-center gap-2"
                        title="Generar cÃ³digo de barras automÃ¡tico"
                      >
                        <Barcode size={16} />
                        Auto
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Se genera automÃ¡ticamente si se deja vacÃ­o
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nombre del Producto *
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400"
                      placeholder="Ingrese el nombre del producto..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Sexo
                    </label>
                    <select
                      name="sexo"
                      value={formData.sexo}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400"
                    >
                      <option value="">Seleccionar sexo</option>
                      <option value="Hombre">Hombre</option>
                      <option value="Mujer">Mujer</option>
                      <option value="Unisex">Unisex</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tipo de PÃºblico <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="tipoPublico"
                      value={formData.tipoPublico}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400"
                      required
                    >
                      <option value="">Seleccionar tipo de pÃºblico</option>
                      <option value="NIÃ‘O">NiÃ±o</option>
                      <option value="ADULTO">Adulto</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Marca
                    </label>
                    <input
                      type="text"
                      name="marca"
                      value={formData.marca}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400"
                      placeholder="Ingrese la marca del producto..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      CategorÃ­a Principal (Nivel 1) *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={categoriaSeleccionada ? "CategorÃ­a seleccionada" : "ðŸ—‚ï¸ Buscar CategorÃ­a Principal"}
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
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400"
                        disabled={!!categoriaSeleccionada}
                        required
                      />
                      {/* Indicador de resultados */}
                      {searchCategoria && !categoriaSeleccionada && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 bg-white px-1">
                          {categoriasPrincipalesFiltradas.length} resultado{categoriasPrincipalesFiltradas.length !== 1 ? 's' : ''}
                        </div>
                      )}
                      
                      {/* Lista desplegable de categorÃ­as filtradas */}
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
                          No se encontraron categorÃ­as principales
                        </div>
                      )}
                      
                      {/* Mostrar categorÃ­a seleccionada */}
                      {categoriaSeleccionada && !searchCategoria && (
                        <div className="absolute inset-0 px-4 py-3 bg-indigo-50 border border-indigo-300 rounded-lg flex items-center justify-between">
                          <span className="text-indigo-800 font-medium">ðŸ“ {categoriaSeleccionada}</span>
                          <button
                            onClick={() => {
                              setCategoriaSeleccionada('');
                              setFormData(prev => ({ ...prev, categoriaId: '' }));
                              setSearchCategoria('');
                              handleCategoriaChange({ target: { value: '' } });
                            }}
                            className="text-indigo-600 hover:text-indigo-800"
                            title="Limpiar selecciÃ³n"
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        SubcategorÃ­a (Nivel 2) *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder={subcategoriaSeleccionada ? "SubcategorÃ­a seleccionada" : "ðŸ“‚ Buscar SubcategorÃ­a"}
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
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400"
                          disabled={!!subcategoriaSeleccionada}
                          required
                        />
                        
                        {/* Indicador de resultados */}
                        {searchSubcategoria && !subcategoriaSeleccionada && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 bg-white px-1">
                            {subcategoriasFiltradas.length} resultado{subcategoriasFiltradas.length !== 1 ? 's' : ''}
                          </div>
                        )}
                        
                        {/* Lista desplegable de subcategorÃ­as filtradas */}
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
                        
                        {/* Mostrar subcategorÃ­a seleccionada */}
                        {subcategoriaSeleccionada && !searchSubcategoria && (
                          <div className="absolute inset-0 px-4 py-3 bg-indigo-50 border border-indigo-300 rounded-lg flex items-center justify-between">
                            <span className="text-indigo-800 font-medium">ðŸ“‚ {subcategoriaSeleccionada}</span>
                            <button
                              onClick={() => {
                                setSubcategoriaSeleccionada('');
                                setFormData(prev => ({ ...prev, subcategoriaId: '' }));
                                setSearchSubcategoria('');
                                handleSubcategoriaChange({ target: { value: '' } });
                              }}
                              className="text-indigo-600 hover:text-indigo-800"
                              title="Limpiar selecciÃ³n"
                              type="button"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        
                        {/* Mensaje cuando no hay resultados */}
                        {searchSubcategoria && subcategoriasFiltradas.length === 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-center text-gray-500 text-sm">
                            No se encontraron subcategorÃ­as
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {subCategorias2.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Segunda SubcategorÃ­a (Nivel 3) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder={subcategoria2Seleccionada ? "2da subcategorÃ­a seleccionada" : "ðŸ“ Buscar Segunda SubcategorÃ­a"}
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
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400"
                          disabled={!!subcategoria2Seleccionada}
                          required
                        />
                        
                        {/* Indicador de resultados */}
                        {searchSubcategoria2 && !subcategoria2Seleccionada && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 bg-white px-1">
                            {subcategorias2Filtradas.length} resultado{subcategorias2Filtradas.length !== 1 ? 's' : ''}
                          </div>
                        )}
                        
                        {/* Lista desplegable de segundas subcategorÃ­as filtradas */}
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
                        
                        {/* Mostrar segunda subcategorÃ­a seleccionada */}
                        {subcategoria2Seleccionada && !searchSubcategoria2 && (
                          <div className="absolute inset-0 px-4 py-3 bg-orange-50 border border-orange-300 rounded-lg flex items-center justify-between">
                            <span className="text-orange-800 font-medium">ðŸ“ {subcategoria2Seleccionada}</span>
                            <button
                              onClick={() => {
                                setSubcategoria2Seleccionada('');
                                setFormData(prev => ({ ...prev, subCategoria2Id: '' }));
                                setSearchSubcategoria2('');
                              }}
                              className="text-orange-600 hover:text-orange-800"
                              title="Limpiar selecciÃ³n"
                              type="button"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        
                        {/* Mensaje cuando no hay resultados */}
                        {searchSubcategoria2 && subcategorias2Filtradas.length === 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-center text-gray-500 text-sm">
                            No se encontraron segundas subcategorÃ­as
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mensaje informativo cuando no hay subcategorÃ­as de nivel 3 */}
                  {subcategorias.length > 0 && subCategorias2.length === 0 && formData.subcategoriaId && (
                    <div className="md:col-span-2">
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <p className="text-xs text-gray-600">
                          â„¹ï¸ La subcategorÃ­a seleccionada no tiene categorÃ­as de nivel 3 disponibles.
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Proveedor *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={proveedorSeleccionado ? "Proveedor seleccionado" : "ðŸ¢ Buscar Proveedor"}
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
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400"
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
                        <div className="absolute inset-0 px-4 py-3 bg-indigo-50 border border-indigo-300 rounded-lg flex items-center justify-between">
                          <span className="text-indigo-800 font-medium">ðŸ¢ {proveedorSeleccionado}</span>
                          <button
                            onClick={() => {
                              setProveedorSeleccionado('');
                              setFormData(prev => ({ ...prev, proveedorId: '' }));
                              setSearchProveedor('');
                            }}
                            className="text-indigo-600 hover:text-indigo-800"
                            title="Limpiar selecciÃ³n"
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

                  <div className="md:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Precio Unitario (S/) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          name="precioUnitario"
                          value={formData.precioUnitario}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400"
                          placeholder="0.00"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Precio por Cuarto (S/)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          name="precioCuarto"
                          value={formData.precioCuarto}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Precio Media Docena (S/)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          name="precioMediaDocena"
                          value={formData.precioMediaDocena}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Precio por Docena (S/)
                        </label><input
                          type="number"
                          step="0.01"
                          min="0"
                          name="precioDocena"
                          value={formData.precioDocena}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    
                    {/* Mensaje de error para validaciÃ³n de precios */}
                    {errorPrecio && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center">
                          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                          <p className="text-sm text-red-700">{errorPrecio}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}            {/* PestaÃ±a: Variantes */}
            {tabActiva === 'variantes' && (
              <div className="bg-indigo-50 rounded-xl p-6">
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
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="optimizado">Optimizado (por talla)</option>
                        <option value="simple">Simple (individual)</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFormularioVariante(!showFormularioVariante)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      {showFormularioVariante ? 'Cancelar' : 'Agregar Variante'}
                    </button>
                  </div>
                </div>              {/* Formularios de variantes */}
              {showFormularioVariante && (
                <div className="bg-white rounded-lg p-4 mb-4 border border-green-200">
                  {modoFormulario === 'simple' ? (
                    // Formulario simple (una variante a la vez)
                    <>
                      <h4 className="text-md font-semibold mb-3 text-gray-800">Nueva Variante (Modo Simple)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Talla *
                          </label>
                          <select
                            value={nuevaVariante.tallaId}
                            onChange={(e) => setNuevaVariante(prev => ({ ...prev, tallaId: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400 text-sm"
                          >
                            <option value={0}>Seleccionar talla</option>
                            {tallasDisponibles.map(talla => (
                              <option key={talla.idTalla} value={talla.idTalla}>
                                {talla.nombreTalla}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Color *
                          </label>
                          <select
                            value={nuevaVariante.colorId}
                            onChange={(e) => setNuevaVariante(prev => ({ ...prev, colorId: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400 text-sm"
                          >
                            <option value={0}>Seleccionar color</option>
                            {coloresDisponibles.map(color => (
                              <option key={color.idColor} value={color.idColor}>
                                {color.nombre}
                              </option>
                            ))}
                          </select>
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
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400 text-sm"
                          />
                        </div>                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            CÃ³digo (opcional)
                          </label>
                          <input
                            type="text"
                            value={nuevaVariante.codigoIdentificacion}
                            onChange={(e) => setNuevaVariante(prev => ({ ...prev, codigoIdentificacion: e.target.value }))}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400 text-sm"
                            placeholder="Se genera automÃ¡ticamente"
                          />
                          <p className="mt-1 text-xs text-gray-500 italic">
                            La etiqueta incluirÃ¡ automÃ¡ticamente: "{formData.nombre} [{formData.codigoIdentificacion}] - T/X - Color Y"
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={agregarVariante}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Agregar Variante
                        </button>
                      </div>
                    </>
                  ) : (
                    // Formulario optimizado (mÃºltiples colores por talla)
                    <>                      <h4 className="text-md font-semibold mb-3 text-gray-800">Agregar Variantes por Talla (Modo Optimizado)</h4>
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-700 mb-1">ðŸ’¡ <strong>Modo Optimizado:</strong> Selecciona una talla y especifica las cantidades para cada color.</p>
                        <p className="text-xs text-blue-600 italic">
                          Las etiquetas incluirÃ¡n automÃ¡ticamente: "{formData.nombre} [{formData.codigoIdentificacion}] - T/X - Color Y"
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        {/* Selector de talla */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Talla *
                          </label>
                          <select
                            value={formularioOptimizado.tallaSeleccionada}
                            onChange={(e) => cambiarTallaOptimizada(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400 text-sm"
                          >
                            <option value={0}>Seleccionar talla</option>
                            {tallasDisponibles.map(talla => (
                              <option key={talla.idTalla} value={talla.idTalla}>
                                {talla.nombreTalla}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Grid de colores y cantidades */}
                        {formularioOptimizado.tallaSeleccionada > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                              Cantidades por Color
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {coloresDisponibles.map(color => (
                                <div key={color.idColor} className="flex flex-col items-center p-3 border border-gray-200 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div 
                                      className="w-5 h-5 rounded-full border border-gray-300" 
                                      style={{ backgroundColor: color.codigoHex || '#CCCCCC' }}
                                    />
                                    <span className="text-sm font-medium text-gray-700">{color.nombre}</span>
                                  </div>
                                  <input
                                    type="number"
                                    min="0"
                                    value={formularioOptimizado.cantidadesPorColor[color.idColor!] || 0}
                                    onChange={(e) => actualizarCantidadColor(color.idColor!, parseInt(e.target.value) || 0)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                          disabled={formularioOptimizado.tallaSeleccionada === 0 || Object.values(formularioOptimizado.cantidadesPorColor).every(qty => qty === 0)}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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
                <div className="bg-white rounded-lg border border-green-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-green-50">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold text-green-800">Talla</th>
                          <th className="text-left py-3 px-4 font-semibold text-green-800">Color</th>
                          <th className="text-center py-3 px-4 font-semibold text-green-800">Cantidad</th>
                          <th className="text-left py-3 px-4 font-semibold text-green-800">CÃ³digo</th>
                          <th className="text-center py-3 px-4 font-semibold text-green-800">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* FIX: Se usa una clave Ãºnica y estable en lugar del Ã­ndice. */}
                        {variantes.map((variante, index) => (
                          <tr key={variante.id || `new-${variante.tallaId}-${variante.colorId}`} className="border-t border-green-100 hover:bg-green-50 transition-colors">
                            <td className="py-3 px-4">
                              {tallasDisponibles.find(t => t.idTalla === variante.tallaId)?.nombreTalla || 'N/A'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded-full border border-gray-300" 
                                  style={{ 
                                    backgroundColor: coloresDisponibles.find(c => c.idColor === variante.colorId)?.codigoHex || '#CCCCCC'
                                  }} 
                                />
                                {coloresDisponibles.find(c => c.idColor === variante.colorId)?.nombre || 'N/A'}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="number"
                                min="1"
                                value={variante.cantidad}
                                onChange={(e) => actualizarCantidadVariante(index, parseInt(e.target.value) || 1)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                                    className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50"
                                    disabled={loading}
                                    title="Ver cÃ³digo de barras"
                                  >
                                    <Barcode className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <span 
                                    className="text-xs text-gray-400 italic px-2 py-1" 
                                    title="Guarda el producto para generar el cÃ³digo"
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
                  
                  <div className="bg-green-50 px-4 py-3 border-t border-green-200">
                    <div className="text-sm font-semibold text-gray-700 flex items-center justify-between">
                      <span>Total de unidades: <span className="text-green-700 font-bold">{cantidadTotal}</span></span>
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

            {/* Resumen de variantes */}
            {variantes.length > 0 && (
              <div className="bg-blue-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                  Resumen de Variantes ({variantes.length})
                </h3>
                <div className="text-sm text-gray-600 mb-4">                  Cantidad total: <span className="font-semibold">{cantidadTotal}</span> unidades
                </div>
                
                {variantes.length === 0 ? (
                  <div className="text-center py-8 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-blue-700 mb-3">No hay variantes agregadas todavÃ­a</p>
                    <button
                      type="button"
                      onClick={() => setShowFormularioVariante(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow transition-all flex items-center gap-2 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar Variante
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {/* PestaÃ±a: Precios */}
            {tabActiva === 'precios' && (
              <div className="bg-white rounded-xl border border-amber-200 shadow-sm">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4 text-amber-800 flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    ConfiguraciÃ³n de Precios
                  </h3>
                  
                  <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-100">
                    <p className="text-sm text-amber-700">
                      Configure los diferentes precios segÃºn la cantidad. El precio unitario es obligatorio, los demÃ¡s son opcionales.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      <div>                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Precio Unitario *
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
                            className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            required
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Precio por unidad individual
                        </p>
                      </div>

                      <div>                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Precio por Cuarto de Docena
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
                            className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Precio por 3 unidades (1/4 docena)
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Precio por Media Docena
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
                            className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Precio por 6 unidades (1/2 docena)
                        </p>
                      </div>

                      <div>                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Precio por Docena
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
                            className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Precio por 12 unidades (docena completa)
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <h4 className="font-medium text-blue-800 mb-2">Resumen de Descuentos</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {formData.precioCuarto && formData.precioUnitario && (
                        <div className="bg-white p-3 rounded-lg border border-blue-200">
                          <p className="text-xs text-gray-500">Descuento por 1/4 docena</p>
                          <p className="text-lg font-semibold text-blue-600">
                            {(((parseFloat(formData.precioUnitario) * 3) - parseFloat(formData.precioCuarto)) / (parseFloat(formData.precioUnitario) * 3) * 100).toFixed(1)}%
                          </p>
                        </div>
                      )}
                      
                      {formData.precioMediaDocena && formData.precioUnitario && (
                        <div className="bg-white p-3 rounded-lg border border-blue-200">
                          <p className="text-xs text-gray-500">Descuento por 1/2 docena</p>
                          <p className="text-lg font-semibold text-blue-600">
                            {(((parseFloat(formData.precioUnitario) * 6) - parseFloat(formData.precioMediaDocena)) / (parseFloat(formData.precioUnitario) * 6) * 100).toFixed(1)}%
                          </p>
                        </div>
                      )}
                      
                      {formData.precioDocena && formData.precioUnitario && (
                        <div className="bg-white p-3 rounded-lg border border-blue-200">
                          <p className="text-xs text-gray-500">Descuento por docena</p>
                          <p className="text-lg font-semibold text-blue-600">
                            {(((parseFloat(formData.precioUnitario) * 12) - parseFloat(formData.precioDocena)) / (parseFloat(formData.precioUnitario) * 12) * 100).toFixed(1)}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PestaÃ±a: CÃ³digos de Barras */}
            {tabActiva === 'codigosBarras' && (              <div className="bg-white rounded-xl border border-indigo-200 shadow-sm">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4 text-indigo-800 flex items-center gap-2">
                    <Barcode className="w-5 h-5" />
                    CÃ³digos de Barras
                  </h3>
                    {/* Mensaje informativo actualizado */}
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-2">ðŸ·ï¸ Sobre las etiquetas de cÃ³digo de barras</h4>                    <div className="text-sm text-blue-700 space-y-1">
                      <p><strong>Etiquetas de Variantes:</strong> Cada etiqueta incluye automÃ¡ticamente toda la informaciÃ³n necesaria</p>
                      <p className="text-xs italic">Formato: "Nombre del Producto [CÃ³digo] - T/Talla - Color"</p>
                      <p className="text-xs italic">Ejemplo: "Boxer Americano [BA001] - T/M - Azul"</p>
                    </div>
                  </div>
                    <div className="grid grid-cols-1 gap-6">
                    <div>
                      <div className="bg-indigo-50 p-5 rounded-lg border border-indigo-200 h-full"><h4 className="font-medium text-indigo-800 mb-3">
                          {varianteSeleccionada 
                            ? 'Etiqueta con InformaciÃ³n Completa'
                            : 'Etiquetas de Variantes (con nombre del producto)'}
                        </h4>
                        
                        {varianteSeleccionada && codigoBarrasPreview ? (
                          <div className="flex flex-col gap-4">
                            <div className="text-sm text-gray-600">
                              {variantes.map(v => {
                                if (v.id === varianteSeleccionada) {
                                  const talla = tallasDisponibles.find(t => t.idTalla === v.tallaId);
                                  const color = coloresDisponibles.find(c => c.idColor === v.colorId);
                                  return (
                                    <div key={v.id} className="bg-gray-50 p-3 rounded-lg">                                      <p className="font-medium text-gray-800">Esta etiqueta contiene:</p>
                                      <p className="text-green-700 font-semibold">"{formData.nombre} [{formData.codigoIdentificacion}] - T/{talla?.nombreTalla} - {color?.nombre}"</p>
                                      <p className="text-xs text-gray-500 mt-1">CÃ³digo: {v.codigoIdentificacion}</p>
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                            
                            <div className="flex flex-col items-center justify-center bg-white p-4 rounded-lg border border-purple-200">
                              <img 
                                src={codigoBarrasPreview} 
                                alt="CÃ³digo de barras de variante" 
                                className="max-w-full h-auto max-h-48 mb-3"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={descargarCodigoBarrasVariante}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow transition-all flex items-center gap-2"
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
                                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                                >
                                  <X className="w-4 h-4" />
                                  Cerrar
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (variantes.length > 0 ? (
                            <div className="space-y-3">                              <div className="text-sm text-gray-500 mb-3">
                                <p className="font-medium">Cada etiqueta contendrÃ¡:</p>
                                <p className="text-xs italic">"{formData.nombre} [{formData.codigoIdentificacion}] - T/X - Color Y"</p>
                              </div>
                              
                              <div className="max-h-60 overflow-y-auto pr-2">
                                {variantes.map((variante, index) => {
                                  if (!variante.id) return null;
                                  
                                  const talla = tallasDisponibles.find(t => t.idTalla === variante.tallaId);
                                  const color = coloresDisponibles.find(c => c.idColor === variante.colorId);
                                  
                                  return (
                                    <button
                                      key={index}
                                      type="button"
                                      onClick={() => generarCodigoBarrasVariante(variante.id!)}
                                      className="flex flex-col items-start gap-1 w-full p-3 mb-2 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors text-left"
                                      disabled={loading}
                                    >
                                      <div className="flex items-center gap-2 w-full">
                                        <div className="w-3 h-3 rounded-full" style={{
                                          backgroundColor: color?.codigoHex || '#CCCCCC'
                                        }} />                                        <span className="font-medium flex-1">T/{talla?.nombreTalla} - {color?.nombre}</span>
                                        <Barcode className="w-4 h-4 text-indigo-600" />
                                      </div>
                                      <span className="text-xs text-green-600 font-medium">
                                        "{formData.nombre} [{formData.codigoIdentificacion}] - T/{talla?.nombreTalla} - {color?.nombre}"
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ): (                            <div className="text-center py-6">
                              <p className="text-sm text-gray-500 mb-2">
                                No hay variantes agregadas.
                              </p>                              <p className="text-xs text-gray-500 italic mb-4">
                                Las etiquetas de variantes incluirÃ¡n automÃ¡ticamente:<br/>
                                "Nombre del Producto [CÃ³digo] - T/X - Color Y"
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setTabActiva('variantes');
                                  setShowFormularioVariante(true);
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow transition-all flex items-center gap-2 mx-auto"
                              >
                                <Plus className="w-4 h-4" />
                                Agregar Variantes
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botones de acciÃ³n */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-between items-center sticky bottom-0 bg-white py-4 border-t border-gray-200">
              <div className="flex gap-3">                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors"
                >
                  Cancelar
                </button>
                
                <div className="flex gap-2">
                  {tabActiva !== 'informacion' && (
                    <button
                      type="button"
                      onClick={() => setTabActiva('informacion')}
                      className="px-5 py-2.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-sm transition-colors"
                    >
                      Anterior
                    </button>
                  )}
                  
                  {tabActiva === 'informacion' && (
                    <button
                      type="button"
                      onClick={() => setTabActiva('variantes')}
                      className="px-5 py-2.5 rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 font-medium text-sm transition-colors"
                    >
                      Continuar a Variantes
                    </button>
                  )}
                  
                  {tabActiva === 'variantes' && (
                    <button
                      type="button"
                      onClick={() => setTabActiva('precios')}
                      className="px-5 py-2.5 rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-sm transition-colors"
                    >
                      Continuar a Precios
                    </button>
                  )}
                </div>
              </div>
              
              <button
                type="submit"
                className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 border-2 border-transparent rounded-xl shadow-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-indigo-600 disabled:hover:to-purple-600 inline-flex items-center gap-2"
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
  );
};

export default FormularioProductoUnificado;

