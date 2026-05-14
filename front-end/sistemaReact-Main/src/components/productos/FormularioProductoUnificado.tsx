import React, { useState, useEffect } from 'react';
import { X, Save, Download, Tag, Package2, Barcode, Trash, Plus, AlertCircle, Search, FolderTree, Building2, Info, Lightbulb, Layers } from 'lucide-react';
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
import { AlertModal } from '../common';

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
  
  // Estados para formulario optimizado (múltiples colores por talla)
  const [modoFormulario, setModoFormulario] = useState<'simple' | 'optimizado'>('optimizado');
  const [formularioOptimizado, setFormularioOptimizado] = useState({
    tallaSeleccionada: 0,
    cantidadesPorColor: {} as Record<number, number>
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
    cargarColoresYTallas();
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
      
      // Manejo específico para errores de autenticación/autorización
      if (status === 401) {
        setError('Error de autorización: Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      } else if (status === 403) {
        setError('Error de permisos: No tienes autorización para acceder a esta información.');
      } else {
        setError(
          'Error al cargar colores y tallas disponibles: ' +
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
        console.warn(`âš   Se removieron ${variantesExistentes.length - variantesUnicas.length} variantes duplicadas`);
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
        
        console.log(` Variante mapeada: ID=${variante.id}, Talla=${v.talla.nombreTalla}, Color=${v.color.nombre}, Cantidad=${variante.cantidad}`);
        return variante;
      });
      
      console.log(`${variantesFormData.length} variantes cargadas en el estado del formulario`);
      setVariantes(variantesFormData);
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
      setError('Ya existe una variante con esta combinación de talla y color');
      return;
    }

    const talla = tallasDisponibles.find(t => t.idTalla === nuevaVariante.tallaId);
    const color = coloresDisponibles.find(c => c.idColor === nuevaVariante.colorId);

    if (!talla || !color) {
      setError('Error al encontrar la talla o color seleccionado');
      return;
    }

    // Generar código de identificación si está vacío
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
      console.log('Iniciando proceso de guardado de producto');
      console.log('ðŸ“Š Estado actual de variantes:', {
        cantidad: variantes.length,
        variantes: variantes.map(v => ({ id: v.id, tallaId: v.tallaId, colorId: v.colorId, cantidad: v.cantidad }))
      });

      // Validaciones básicas
      if (!formData.nombre.trim()) {
        throw new Error('El nombre del producto es requerido');
      }

      if (!formData.codigoIdentificacion.trim()) {
        throw new Error('El código de identificación es requerido');
      }      // Encontrar objetos de categorías y proveedor
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

      // Crear una categoría temporal si no hay segunda subcategoría pero se requiere para la interface
      const subCategoria2Final = subCategoria2 || {
        idCategoria: 0,
        nombre: "Sin categoría nivel 3",
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
            throw new Error(`Fallo al eliminar la variante ${variante.talla.nombreTalla} - ${variante.color.nombre}.`);
          }
        }

        // -> Luego, actualizar existentes
        for (const variante of variantesAActualizar) {
          const existente = mapaVariantesBD.get(variante.id!);
          
          // Solo llamar a la API si hay cambios reales
          if (existente && (existente.cantidad !== variante.cantidad || existente.codigoBarrasVariante !== variante.codigoIdentificacion)) {
            console.log(` Actualizando variante ID: ${variante.id}`);
            console.log(`ðŸ“Š Cantidad: ${existente.cantidad} â†’ ${variante.cantidad}`);
            console.log(`ðŸ· Código: '${existente.codigoBarrasVariante}' â†’ '${variante.codigoIdentificacion}'`);
            
            const talla = tallasDisponibles.find(t => t.idTalla === variante.tallaId);
            const color = coloresDisponibles.find(c => c.idColor === variante.colorId);

            if (!talla || !color) {
              console.warn(`âš  Saltando actualización - Talla o color no encontrado: tallaId=${variante.tallaId}, colorId=${variante.colorId}`);
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
              console.log(`Variante ID=${variante.id} actualizada correctamente`);
            } catch (error: unknown) {
              const errorMessage = getErrorMessage(error, 'Error desconocido');
              console.error(`Œ Error al actualizar variante ID ${variante.id}:`, errorMessage);
              throw new Error(`Error al actualizar variante ${talla.nombreTalla}-${color.nombre}: ${errorMessage}`);
            }
          } else {
            console.log(`Saltando variante ID: ${variante.id} (sin cambios)`);
          }
        }

        // -> Finalmente, crear nuevas
        for (const variante of variantesACrear) {
          const talla = tallasDisponibles.find(t => t.idTalla === variante.tallaId);
          const color = coloresDisponibles.find(c => c.idColor === variante.colorId);

          if (!talla || !color) {
            console.warn(`âš  Saltando creación - Talla o color no encontrado: tallaId=${variante.tallaId}, colorId=${variante.colorId}`);
            continue;
          }

          console.log(`Creando nueva variante (Talla: ${talla.nombreTalla}, Color: ${color.nombre}, Cantidad: ${variante.cantidad})`);
          
          const varianteData: Omit<ProductoVariante, 'idVariante'> = {
            producto: productoGuardado,
            talla,
            color,
            cantidad: variante.cantidad,
            codigoBarrasVariante: variante.codigoIdentificacion
          };

          try {
            const nuevaVariante = await ProductoVarianteService.crearVariante(varianteData);
            console.log(`Nueva variante creada con ID=${nuevaVariante.idProductoVariante}`);
          } catch (error: unknown) {
            const errorMessage = getErrorMessage(error, 'Error desconocido');
            console.error(`Œ Error al crear nueva variante:`, errorMessage);
            throw new Error(`Error al crear variante ${talla.nombreTalla}-${color.nombre}: ${errorMessage}`);
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
        const cantidadTotalActualizada = variantesActualizadas.reduce((total, v) => total + v.cantidad, 0);
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
    // Validación para campos de precio
    if (["precioUnitario", "precioCuarto", "precioMediaDocena", "precioDocena"].includes(name)) {
      const nuevoValor = value === '' ? '' : Math.max(0, parseFloat(value));
      // Si el usuario intenta poner un valor negativo, lo forzamos a 0
      if (value !== '' && parseFloat(value) < 0) {
        setErrorPrecio('No se permiten valores negativos en los precios.');
        setFormData(prev => ({ ...prev, [name]: 0 }));
        return;
      }
      // Validación de jerarquía de precios por unidad
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
      
      // Validar que el precio por unidad sea decreciente: Individual >= Cuarto/3 >= MediaDocena/6 >= Docena/12
      if (
        (precios.precioCuarto > 0 && precioUnitarioCuarto > precioUnitarioIndividual) ||
        (precios.precioMediaDocena > 0 && precioUnitarioMediaDocena > precioUnitarioCuarto) ||
        (precios.precioDocena > 0 && precioUnitarioDocena > precioUnitarioMediaDocena)
      ) {
        setErrorPrecio('El precio por unidad debe ser decreciente: Individual >= Cuarto/3 >= MediaDocena/6 >= Docena/12');
        return;
      }
      setErrorPrecio(null);
      setFormData(prev => ({ ...prev, [name]: value }));
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
      setError('Debe especificar al menos una cantidad mayor a 0 para algún color');
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

      // Generar código de identificación automático
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

  // Función para actualizar cantidad de un color en el formulario optimizado
  const actualizarCantidadColor = (colorId: number, cantidad: number) => {
    setFormularioOptimizado(prev => ({
      ...prev,
      cantidadesPorColor: {
        ...prev.cantidadesPorColor,
        [colorId]: cantidad >= 0 ? cantidad : 0
      }
    }));
  };

  // Función para cambiar talla en formulario optimizado
  const cambiarTallaOptimizada = (tallaId: number) => {
    setFormularioOptimizado({
      tallaSeleccionada: tallaId,
      cantidadesPorColor: {} // Limpiar cantidades al cambiar talla
    });
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
            <div className="flex border-b border-gray-100 mb-6 mx-8 mt-2 overflow-x-auto custom-scrollbar">
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
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Información Básica</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Código de Identificación *
                    </label>
                    <input
                      type="text"
                      name="codigoIdentificacion"
                      value={formData.codigoIdentificacion}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-[#f8f8f8] border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-gray-200 focus:border-transparent transition-all"
                      placeholder="Ingrese el código de identificación..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Código de Barras
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="codigoBarras"
                        value={formData.codigoBarras}
                        onChange={handleInputChange}
                        placeholder="Código de barras (opcional)"
                        className="flex-1 px-4 py-3 bg-[#f8f8f8] border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-gray-200 focus:border-transparent transition-all font-mono"
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nombre del Producto *
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-[#f8f8f8] border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-gray-200 focus:border-transparent transition-all"
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
                      className="w-full px-4 py-3 bg-[#f8f8f8] border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-gray-200 focus:border-transparent transition-all"
                    >
                      <option value="">Seleccionar sexo</option>
                      <option value="Hombre">Hombre</option>
                      <option value="Mujer">Mujer</option>
                      <option value="Unisex">Unisex</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tipo de Público <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="tipoPublico"
                      value={formData.tipoPublico}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-[#f8f8f8] border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-gray-200 focus:border-transparent transition-all"
                      required
                    >
                      <option value="">Seleccionar tipo de público</option>
                      <option value="NIÑO">Niño</option>
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
                      className="w-full px-4 py-3 bg-[#f8f8f8] border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-gray-200 focus:border-transparent transition-all"
                      placeholder="Ingrese la marca del producto..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Categoría Principal (Nivel 1) *
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Subcategoría (Nivel 2) *
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Segunda Subcategoría (Nivel 3) <span className="text-red-500">*</span>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Proveedor *
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
                            className="w-full px-3 py-2 bg-[#f8f8f8] border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-gray-200 transition-all"
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
                            className="w-full px-3 py-2 bg-[#f8f8f8] border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-gray-200 transition-all"
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
                    // Formulario optimizado (múltiples colores por talla)
                    <>                      <h4 className="text-md font-semibold mb-3 text-gray-800">Agregar Variantes por Talla (Modo Optimizado)</h4>
                      <div className="mb-4 p-3 bg-[#f8f8f8] rounded-xl border border-gray-100">
                        <p className="text-sm text-gray-700 mb-1"><strong>Modo Optimizado:</strong> Selecciona una talla y especifica las cantidades para cada color.</p>
                        <p className="text-xs text-gray-500 italic">
                          Las etiquetas incluirán automáticamente: "{formData.nombre} [{formData.codigoIdentificacion}] - T/X - Color Y"
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
                            className="w-full px-3 py-2 bg-[#f8f8f8] border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-gray-200 transition-all"
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
                                <div key={color.idColor} className="flex flex-col items-center p-3 border border-gray-100 rounded-xl bg-[#fafafa]">
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
                          disabled={formularioOptimizado.tallaSeleccionada === 0 || Object.values(formularioOptimizado.cantidadesPorColor).every(qty => qty === 0)}
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
                          <tr key={variante.id || `new-${variante.tallaId}-${variante.colorId}`} className="border-t border-gray-50 hover:bg-[#fafafa] transition-colors">
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
              <div className="bg-gray-50 rounded-xl">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Configuración de Precios
                  </h3>
                  
                  <div className="mb-4 p-4 bg-[#f8f8f8] rounded-xl border border-gray-100">
                    <p className="text-sm text-gray-600">
                      Configure los diferentes precios según la cantidad. El precio unitario es obligatorio, los demás son opcionales.
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
                            className="w-full pl-9 pr-4 py-3 bg-[#f8f8f8] border border-transparent rounded-xl focus:ring-2 focus:ring-gray-200 focus:border-transparent"
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
                            className="w-full pl-9 pr-4 py-3 bg-[#f8f8f8] border border-transparent rounded-xl focus:ring-2 focus:ring-gray-200 focus:border-transparent"
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
                            className="w-full pl-9 pr-4 py-3 bg-[#f8f8f8] border border-transparent rounded-xl focus:ring-2 focus:ring-gray-200 focus:border-transparent"
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
                            className="w-full pl-9 pr-4 py-3 bg-[#f8f8f8] border border-transparent rounded-xl focus:ring-2 focus:ring-gray-200 focus:border-transparent"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Precio por 12 unidades (docena completa)
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-[#f8f8f8] rounded-xl border border-gray-100">
                    <h4 className="font-medium text-black mb-2">Resumen de Descuentos</h4>
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
                                  const talla = tallasDisponibles.find(t => t.idTalla === v.tallaId);
                                  const color = coloresDisponibles.find(c => c.idColor === v.colorId);
                                  return (
                                    <div key={v.id} className="bg-gray-50 p-3 rounded-lg">                                      <p className="font-medium text-gray-800">Esta etiqueta contiene:</p>
                                      <p className="text-black font-semibold">"{formData.nombre} [{formData.codigoIdentificacion}] - T/{talla?.nombreTalla} - {color?.nombre}"</p>
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
                                  
                                  const talla = tallasDisponibles.find(t => t.idTalla === variante.tallaId);
                                  const color = coloresDisponibles.find(c => c.idColor === variante.colorId);
                                  
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
                                          backgroundColor: color?.codigoHex || '#CCCCCC'
                                        }} />                                        <span className="font-medium flex-1">T/{talla?.nombreTalla} - {color?.nombre}</span>
                                        <Barcode className="w-4 h-4 text-gray-400" />
                                      </div>
                                      <span className="text-xs text-gray-500 font-medium">
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
                        )}
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

