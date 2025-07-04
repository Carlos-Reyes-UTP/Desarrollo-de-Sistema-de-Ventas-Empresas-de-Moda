import React, { useState, useEffect } from 'react';
import { X, Save, Download, Tag, Layers, Package2, Barcode, Trash, Plus, Minus } from 'lucide-react';
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
  
  // Estado para animación del modal
  const [isModalVisible, setIsModalVisible] = useState(false);
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
      
      // Cargar subcategorías jerárquicamente si el producto tiene categorías
      if (tieneCategoriaPadre && producto.categoriaPadre) {
        const categoriaSeleccionada = categorias.find(c => c.idCategoria === producto.categoriaPadre?.idCategoria);
        if (categoriaSeleccionada?.subCategorias) {
          setSubcategorias(categoriaSeleccionada.subCategorias);
          
          // Si también hay una subcategoría seleccionada, cargar sus subcategorías (nivel 3)
          if (tieneCategoria && producto.categoria && 
              producto.categoria.idCategoria !== producto.categoriaPadre.idCategoria) {
            const subcategoriaSeleccionada = categoriaSeleccionada.subCategorias.find(
              sc => sc.idCategoria === producto.categoria?.idCategoria
            );
            if (subcategoriaSeleccionada?.subCategorias) {
              setSubCategorias2(subcategoriaSeleccionada.subCategorias);
            }
          }
        }
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
    } catch (err: any) {
      console.error('Error al cargar colores y tallas:', err);
      
      // Manejo específico para errores de autenticación/autorización
      if (err.response?.status === 401) {
        setError('Error de autorización: Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      } else if (err.response?.status === 403) {
        setError('Error de permisos: No tienes autorización para acceder a esta información.');
      } else {
        setError('Error al cargar colores y tallas disponibles: ' + (err.message || 'Error de comunicación con el servidor'));
      }
    } finally {
      setLoading(false);
    }
  };

  const cargarVariantesExistentes = async () => {
    if (!producto?.idProducto) return;
    
    try {
      setLoading(true);
      console.log(`🔄 Cargando variantes existentes para producto ID: ${producto.idProducto}`);
      
      const variantesExistentes = await ProductoVarianteService.obtenerVariantesPorProducto(producto.idProducto);
      console.log(`📦 Variantes obtenidas del backend: ${variantesExistentes.length}`);
      
      // Verificar que no haya duplicados por ID
      const variantesUnicas = Array.from(
        new Map(variantesExistentes.map(v => [v.idVariante, v])).values()
      );
      
      if (variantesUnicas.length !== variantesExistentes.length) {
        console.warn(`⚠️  Se removieron ${variantesExistentes.length - variantesUnicas.length} variantes duplicadas`);
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
        
        console.log(`   ✅ Variante mapeada: ID=${variante.id}, Talla=${v.talla.nombreTalla}, Color=${v.color.nombre}, Cantidad=${variante.cantidad}`);
        return variante;
      });
      
      console.log(`✅ ${variantesFormData.length} variantes cargadas en el estado del formulario`);
      setVariantes(variantesFormData);
    } catch (err: any) {
      console.error('Error al cargar variantes existentes:', err);
      
      // Manejo específico para errores de autenticación/autorización
      if (err.response?.status === 401) {
        setError('Error de autorización: Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      } else if (err.response?.status === 403) {
        setError('Error de permisos: No tienes autorización para acceder a esta información.');
      } else {
        setError('Error al cargar variantes: ' + (err.message || 'Error de comunicación con el servidor'));
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
      console.log('🚀 Iniciando proceso de guardado de producto');
      console.log('📊 Estado actual de variantes:', {
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
        categoriaSeleccionada = categorias.find(c => c.idCategoria?.toString() === formData.subcategoriaId)!;
        categoriaPadreSeleccionada = categorias.find(c => c.idCategoria?.toString() === formData.categoriaId);
        
        console.log('📂 Usando subcategoría como categoría principal:', categoriaSeleccionada?.nombre);
        console.log('📁 Categoría padre seleccionada:', categoriaPadreSeleccionada?.nombre);
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
          
          console.log('📁 Categoría principal sin hijos - configurando SOLO como categoriaPadre:', categoriaPrincipal?.nombre);
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
      console.log(`${producto?.idProducto ? '✏️  Actualizando' : '➕ Creando'} producto...`);
      if (producto?.idProducto) {
        productoGuardado = await ProductoService.updateProducto(producto.idProducto, {
          ...productoData,
          idProducto: producto.idProducto
        });
      } else {
        productoGuardado = await ProductoService.createProducto(productoData);
      }
      console.log(`✅ Producto ${producto?.idProducto ? 'actualizado' : 'creado'} con ID: ${productoGuardado.idProducto}`);      // ===== PROCESAMIENTO MEJORADO DE VARIANTES =====
      if (productoGuardado.idProducto && variantes.length > 0) {
        console.log('🔧 Iniciando sincronización de variantes...');

        // 1. Obtener el estado actual REAL de la base de datos
        const variantesEnBD = producto?.idProducto
          ? await ProductoVarianteService.obtenerVariantesPorProducto(producto.idProducto)
          : [];
        console.log(`📦 Encontradas ${variantesEnBD.length} variantes existentes en la base de datos.`);

        const variantesEnFormulario = variantes; // Las variantes del estado de React
        console.log(`� Se procesarán ${variantesEnFormulario.length} variantes desde el formulario.`);

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

        console.log(`➕ ${variantesACrear.length} para crear, ✏️ ${variantesAActualizar.length} para actualizar, 🗑️ ${variantesAEliminar.length} para eliminar.`);

        // 3. EJECUTAR OPERACIONES EN ORDEN (Eliminar, Actualizar, Crear)
        
        // -> Eliminar primero
        for (const variante of variantesAEliminar) {
          console.log(`  🗑️ Eliminando variante ID: ${variante.idProductoVariante}`);
          try {
            await ProductoVarianteService.eliminarVariante(variante.idProductoVariante!);
            console.log(`  ✅ Variante ID=${variante.idProductoVariante} eliminada correctamente`);
          } catch (error: any) {
            console.error(`❌ Error al eliminar variante ID ${variante.idProductoVariante}:`, error.message);
            throw new Error(`Fallo al eliminar la variante ${variante.talla.nombreTalla} - ${variante.color.nombre}.`);
          }
        }

        // -> Luego, actualizar existentes
        for (const variante of variantesAActualizar) {
          const existente = mapaVariantesBD.get(variante.id!);
          
          // Solo llamar a la API si hay cambios reales
          if (existente && (existente.cantidad !== variante.cantidad || existente.codigoBarrasVariante !== variante.codigoIdentificacion)) {
            console.log(`  ✏️ Actualizando variante ID: ${variante.id}`);
            console.log(`    📊 Cantidad: ${existente.cantidad} → ${variante.cantidad}`);
            console.log(`    🏷️ Código: '${existente.codigoBarrasVariante}' → '${variante.codigoIdentificacion}'`);
            
            const talla = tallasDisponibles.find(t => t.idTalla === variante.tallaId);
            const color = coloresDisponibles.find(c => c.idColor === variante.colorId);

            if (!talla || !color) {
              console.warn(`⚠️ Saltando actualización - Talla o color no encontrado: tallaId=${variante.tallaId}, colorId=${variante.colorId}`);
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
              console.log(`  ✅ Variante ID=${variante.id} actualizada correctamente`);
            } catch (error: any) {
              console.error(`❌ Error al actualizar variante ID ${variante.id}:`, error.message);
              throw new Error(`Error al actualizar variante ${talla.nombreTalla}-${color.nombre}: ${error.message}`);
            }
          } else {
            console.log(`  ⏩ Saltando variante ID: ${variante.id} (sin cambios)`);
          }
        }

        // -> Finalmente, crear nuevas
        for (const variante of variantesACrear) {
          const talla = tallasDisponibles.find(t => t.idTalla === variante.tallaId);
          const color = coloresDisponibles.find(c => c.idColor === variante.colorId);

          if (!talla || !color) {
            console.warn(`⚠️ Saltando creación - Talla o color no encontrado: tallaId=${variante.tallaId}, colorId=${variante.colorId}`);
            continue;
          }

          console.log(`  ➕ Creando nueva variante (Talla: ${talla.nombreTalla}, Color: ${color.nombre}, Cantidad: ${variante.cantidad})`);
          
          const varianteData: Omit<ProductoVariante, 'idVariante'> = {
            producto: productoGuardado,
            talla,
            color,
            cantidad: variante.cantidad,
            codigoBarrasVariante: variante.codigoIdentificacion
          };

          try {
            const nuevaVariante = await ProductoVarianteService.crearVariante(varianteData);
            console.log(`  ✅ Nueva variante creada con ID=${nuevaVariante.idProductoVariante}`);
          } catch (error: any) {
            console.error(`❌ Error al crear nueva variante:`, error.message);
            throw new Error(`Error al crear variante ${talla.nombreTalla}-${color.nombre}: ${error.message}`);
          }
        }

        console.log('\n✅ ¡Sincronización de variantes completada exitosamente!');
      } else if (variantes.length === 0) {
        console.log('ℹ️ No hay variantes para procesar');
      }

      // Obtener las variantes actualizadas del producto para devolver un producto completo con sus variantes
      if (productoGuardado.idProducto) {
        const variantesActualizadas = await ProductoVarianteService.obtenerVariantesPorProducto(productoGuardado.idProducto);
        console.log(`🔄 Obtenidas ${variantesActualizadas.length} variantes actualizadas para el producto`);
        // Añadir la cantidad total actualizada al producto
        const cantidadTotalActualizada = variantesActualizadas.reduce((total, v) => total + v.cantidad, 0);
        productoGuardado = {
          ...productoGuardado,
          cantidad: cantidadTotalActualizada
        };
      }      console.log('🎉 Proceso de guardado completado exitosamente');
      onProductoGuardado(productoGuardado);
      handleClose();
    } catch (err: any) {
      console.error('❌ Error al guardar producto:', err);
      
      // Manejo específico para errores de autenticación/autorización
      if (err.response?.status === 401) {
        setError('Error de autorización: Tu sesión ha expirado o no tienes permisos para realizar esta acción. Por favor, inicia sesión nuevamente.');
      } else if (err.response?.status === 403) {
        setError('Error de permisos: No tienes autorización para realizar esta acción.');
      } else {
        setError(err.message || 'Error al guardar el producto');
      }
    } finally {
      setLoading(false);
    }
  };  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
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
      console.log(`🏷️ Generando código de barras para variante ID: ${varianteId}`);
      
      const blob = await CodigoBarrasService.generarImagenVariante(varianteId);
      
      // Crear URL para previsualizar la imagen
      const url = window.URL.createObjectURL(blob);
      setCodigoBarrasPreview(url);
      setVarianteSeleccionada(varianteId);
      
      // Cambiar a la pestaña de códigos de barras
      setTabActiva('codigosBarras');
    } catch (err: any) {
      console.error('Error al generar código de barras de variante:', err);
      setError('Error al generar código de barras: ' + (err.message || 'Error desconocido'));
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
    alert('Código de barras de variante descargado correctamente');
  };
  
  // Función para manejar cambio de categoría principal (Nivel 1)
  const handleCategoriaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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
  const handleSubcategoriaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300 ${isModalVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto border border-gray-200 relative transform transition-all duration-300 ${isModalVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-8 py-5 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {producto ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            <button 
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors hover:bg-gray-100 p-2 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          {error && (
            <div className="mb-6 p-4 border-l-4 border-red-500 bg-red-50 rounded-lg">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Navegación por pestañas */}
            <div className="flex border-b border-gray-200">
              <button
                type="button"
                onClick={() => setTabActiva('informacion')}
                className={`flex items-center gap-2 px-6 py-3 font-medium text-sm rounded-t-lg ${
                  tabActiva === 'informacion' 
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Package2 className="w-4 h-4" />
                Información Básica
              </button>
              
              <button
                type="button"
                onClick={() => setTabActiva('variantes')}
                className={`flex items-center gap-2 px-6 py-3 font-medium text-sm rounded-t-lg ${
                  tabActiva === 'variantes' 
                  ? 'text-green-600 border-b-2 border-green-600 bg-green-50' 
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
                  ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50' 
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
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código de Identificación *
                    </label>
                    <input
                      type="text"
                      name="codigoIdentificacion"
                      value={formData.codigoIdentificacion}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código de Barras
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="codigoBarras"
                        value={formData.codigoBarras}
                        onChange={handleInputChange}
                        placeholder="Código de barras (opcional)"
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => generarCodigoBarrasAutomatico()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 flex items-center gap-2"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Producto *
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sexo
                    </label>
                    <select
                      name="sexo"
                      value={formData.sexo}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar sexo</option>
                      <option value="Hombre">Hombre</option>
                      <option value="Mujer">Mujer</option>
                      <option value="Unisex">Unisex</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Público <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="tipoPublico"
                      value={formData.tipoPublico}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Seleccionar tipo de público</option>
                      <option value="NIÑO">Niño</option>
                      <option value="ADULTO">Adulto</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Marca
                    </label>
                    <input
                      type="text"
                      name="marca"
                      value={formData.marca}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Sección de Categorías Jerárquicas */}
                  <div className="md:col-span-2 mb-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="text-sm font-semibold text-blue-800 mb-2">Sistema de Categorías Jerárquico</h4>
                      <p className="text-xs text-blue-700 mb-2">
                        Las categorías se organizan en 3 niveles jerárquicos:
                      </p>
                      <div className="text-xs text-blue-600 space-y-1">
                        <div>• <strong>Nivel 1:</strong> Categoría Principal (ej: Ropa Interior, Ropa Invierno)</div>
                        <div>• <strong>Nivel 2:</strong> Subcategoría (ej: Boxer, Sostén, Calzón)</div>
                        <div>• <strong>Nivel 3:</strong> Segunda Subcategoría (ej: Tela, Algodón)</div>
                      </div>
                      <p className="text-xs text-blue-600 mt-2 italic">
                        Las opciones se filtran automáticamente según la selección anterior.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoría Principal (Nivel 1) *
                    </label>
                    <select
                      name="categoriaId"
                      value={formData.categoriaId}
                      onChange={handleCategoriaChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Seleccionar categoría principal</option>
                      {categorias.map(categoria => (
                        <option key={categoria.idCategoria} value={categoria.idCategoria}>
                          {categoria.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {subcategorias.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subcategoría (Nivel 2) *
                      </label>
                      <select
                        name="subcategoriaId"
                        value={formData.subcategoriaId}
                        onChange={handleSubcategoriaChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Seleccionar subcategoría</option>
                        {subcategorias.map(subcategoria => (
                          <option key={subcategoria.idCategoria} value={subcategoria.idCategoria}>
                            {subcategoria.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {subCategorias2.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Segunda Subcategoría (Nivel 3) <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="subCategoria2Id"
                        value={formData.subCategoria2Id}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Seleccionar segunda subcategoría</option>
                        {subCategorias2.map(categoria => (
                          <option key={categoria.idCategoria} value={categoria.idCategoria}>
                            {categoria.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Mensaje informativo cuando no hay subcategorías de nivel 3 */}
                  {subcategorias.length > 0 && subCategorias2.length === 0 && formData.subcategoriaId && (
                    <div className="md:col-span-2">
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <p className="text-xs text-gray-600">
                          ℹ️ La subcategoría seleccionada no tiene categorías de nivel 3 disponibles.
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Proveedor *
                    </label>
                    <select
                      name="proveedorId"
                      value={formData.proveedorId}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Seleccionar proveedor</option>
                      {proveedores.map(proveedor => (
                        <option key={proveedor.idProveedor} value={proveedor.idProveedor}>
                          {proveedor.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Precio Unitario (S/) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          name="precioUnitario"
                          value={formData.precioUnitario}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Precio por Cuarto (S/)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          name="precioCuarto"
                          value={formData.precioCuarto}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Precio Media Docena (S/)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          name="precioMediaDocena"
                          value={formData.precioMediaDocena}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Precio por Docena (S/)
                        </label><input
                          type="number"
                          step="0.01"
                          name="precioDocena"
                          value={formData.precioDocena}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}            {/* Pestaña: Variantes */}
            {tabActiva === 'variantes' && (
              <div className="bg-green-50 rounded-xl p-6">
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
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="optimizado">Optimizado (por talla)</option>
                        <option value="simple">Simple (individual)</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFormularioVariante(!showFormularioVariante)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Talla *
                          </label>
                          <select
                            value={nuevaVariante.tallaId}
                            onChange={(e) => setNuevaVariante(prev => ({ ...prev, tallaId: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Color *
                          </label>
                          <select
                            value={nuevaVariante.colorId}
                            onChange={(e) => setNuevaVariante(prev => ({ ...prev, colorId: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cantidad *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={nuevaVariante.cantidad}
                            onChange={(e) => setNuevaVariante(prev => ({ ...prev, cantidad: parseInt(e.target.value) || 1 }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                          />
                        </div>                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Código (opcional)
                          </label>
                          <input
                            type="text"
                            value={nuevaVariante.codigoIdentificacion}
                            onChange={(e) => setNuevaVariante(prev => ({ ...prev, codigoIdentificacion: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
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
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Agregar Variante
                        </button>
                      </div>
                    </>
                  ) : (
                    // Formulario optimizado (múltiples colores por talla)
                    <>                      <h4 className="text-md font-semibold mb-3 text-gray-800">Agregar Variantes por Talla (Modo Optimizado)</h4>
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-700 mb-1">💡 <strong>Modo Optimizado:</strong> Selecciona una talla y especifica las cantidades para cada color.</p>
                        <p className="text-xs text-blue-600 italic">
                          Las etiquetas incluirán automáticamente: "{formData.nombre} [{formData.codigoIdentificacion}] - T/X - Color Y"
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        {/* Selector de talla */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Talla *
                          </label>
                          <select
                            value={formularioOptimizado.tallaSeleccionada}
                            onChange={(e) => cambiarTallaOptimizada(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
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
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                          <th className="text-left py-3 px-4 font-semibold text-green-800">Código</th>
                          <th className="text-center py-3 px-4 font-semibold text-green-800">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* FIX: Se usa una clave única y estable en lugar del índice. */}
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
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                    <p className="text-blue-700 mb-3">No hay variantes agregadas todavía</p>
                    <button
                      type="button"
                      onClick={() => setShowFormularioVariante(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow transition-all flex items-center gap-2 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar Variante
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-blue-200">
                          <th className="text-left py-2">ID</th>
                          <th className="text-left py-2">Talla</th>
                          <th className="text-left py-2">Color</th>
                          <th className="text-right py-2">Cantidad</th>
                          <th className="text-left py-2">Código</th>
                          <th className="text-center py-2">Acciones</th>
                        </tr>
                      </thead>
                      {/* FIX: Se usa una clave única y se cierra la etiqueta <tbody> */}
                      <tbody>
                        {variantes.map((variante, index) => (
                          <tr key={variante.id || `new-summary-${variante.tallaId}-${variante.colorId}`} className="border-b border-blue-100 hover:bg-blue-50 transition-colors">
                            <td className="py-2 text-xs text-gray-500">{variante.id || 'Nuevo'}</td>
                            <td className="py-2">
                              {tallasDisponibles.find(t => t.idTalla === variante.tallaId)?.nombreTalla || 'N/A'}
                            </td>
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded-full border border-gray-300" 
                                  style={{
                                    backgroundColor: coloresDisponibles.find(c => c.idColor === variante.colorId)?.codigoHex || '#FFF'
                                  }}
                                ></div>
                                {coloresDisponibles.find(c => c.idColor === variante.colorId)?.nombre || 'N/A'}
                              </div>
                            </td>
                            <td className="py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => actualizarCantidadVariante(index, variante.cantidad - 1)}
                                  className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                                  disabled={variante.cantidad <= 1}
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="font-medium mx-1">{variante.cantidad}</span>
                                <button
                                  type="button"
                                  onClick={() => actualizarCantidadVariante(index, variante.cantidad + 1)}
                                  className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="py-2 text-xs font-mono text-gray-600">
                              {variante.codigoIdentificacion || 'Sin código'}
                            </td>                            <td className="py-2 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {variante.id ? (
                                  <button
                                    type="button"
                                    onClick={() => generarCodigoBarrasVariante(variante.id)}
                                    className="bg-green-500 hover:bg-green-600 text-white p-1 rounded text-xs shadow transition-all disabled:bg-gray-400 flex items-center"
                                    disabled={loading}
                                    title="Generar código de barras"
                                  >
                                    <Barcode className="w-3 h-3 mr-1" />
                                    <span>Barcode</span>
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400 italic px-2 py-1" title="Guarda el producto para generar el código">
                                    Pendiente
                                  </span>
                                )}
                                <button                                 
                                  type="button"
                                  onClick={() => eliminarVariante(index)}
                                  className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                                  title="Eliminar variante"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              </div>
                            </td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Pestaña: Precios */}
            {tabActiva === 'precios' && (
              <div className="bg-white rounded-xl border border-amber-200 shadow-sm">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4 text-amber-800 flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Configuración de Precios
                  </h3>
                  
                  <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-100">
                    <p className="text-sm text-amber-700">
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

            {/* Pestaña: Códigos de Barras */}
            {tabActiva === 'codigosBarras' && (              <div className="bg-white rounded-xl border border-purple-200 shadow-sm">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4 text-purple-800 flex items-center gap-2">
                    <Barcode className="w-5 h-5" />
                    Códigos de Barras
                  </h3>
                    {/* Mensaje informativo actualizado */}
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-2">🏷️ Sobre las etiquetas de código de barras</h4>                    <div className="text-sm text-blue-700 space-y-1">
                      <p><strong>Etiquetas de Variantes:</strong> Cada etiqueta incluye automáticamente toda la información necesaria</p>
                      <p className="text-xs italic">Formato: "Nombre del Producto [Código] - T/Talla - Color"</p>
                      <p className="text-xs italic">Ejemplo: "Boxer Americano [BA001] - T/M - Azul"</p>
                    </div>
                  </div>
                    <div className="grid grid-cols-1 gap-6">
                    <div>
                      <div className="bg-purple-50 p-5 rounded-lg border border-purple-200 h-full"><h4 className="font-medium text-purple-800 mb-3">
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
                                      <p className="text-green-700 font-semibold">"{formData.nombre} [{formData.codigoIdentificacion}] - T/{talla?.nombreTalla} - {color?.nombre}"</p>
                                      <p className="text-xs text-gray-500 mt-1">Código: {v.codigoIdentificacion}</p>
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                            
                            <div className="flex flex-col items-center justify-center bg-white p-4 rounded-lg border border-purple-200">
                              <img 
                                src={codigoBarrasPreview} 
                                alt="Código de barras de variante" 
                                className="max-w-full h-auto max-h-48 mb-3"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={descargarCodigoBarrasVariante}
                                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow transition-all flex items-center gap-2"
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
                        ) : (                          variantes.length > 0 ? (
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
                                      className="flex flex-col items-start gap-1 w-full p-3 mb-2 rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors text-left"
                                      disabled={loading}
                                    >
                                      <div className="flex items-center gap-2 w-full">
                                        <div className="w-3 h-3 rounded-full" style={{
                                          backgroundColor: color?.codigoHex || '#CCCCCC'
                                        }} />                                        <span className="font-medium flex-1">T/{talla?.nombreTalla} - {color?.nombre}</span>
                                        <Barcode className="w-4 h-4 text-purple-600" />
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
                                Las etiquetas de variantes incluirán automáticamente:<br/>
                                "Nombre del Producto [Código] - T/X - Color Y"
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

            {/* Botones de acción */}
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
                      className="px-5 py-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium text-sm transition-colors"
                    >
                      Continuar a Precios
                    </button>
                  )}
                </div>
              </div>
              
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl text-base font-semibold shadow-lg transition-all disabled:bg-gray-400 flex items-center gap-2 w-full sm:w-auto justify-center"
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
