import React, { useState, useEffect, useMemo } from 'react';
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
  nombresUnicosOrdenados,
} from '../../utils/varianteCatalogoHelpers';
import { validarJerarquiaPreciosProducto } from '../../utils/validarPreciosProducto';
import { getErrorMessage, getStatusCode } from '@/utils/errorUtils';
import { extractApiErrorMessage } from '@/utils/handleApiError';
import { AlertModal, MaterialIcon, ModalPortal, useModalBodyScrollLock, useModalMotion } from '@/shared/ui';
import { useAccesoAreaAlmacen } from '@/hooks/useAccesoAreaAlmacen';

// Subcomponentes especializados
import { InformacionTab } from './formulario/InformacionTab';
import { VariantesTab } from './formulario/VariantesTab';
import { PreciosTab } from './formulario/PreciosTab';
import { CodigosBarrasTab } from './formulario/CodigosBarrasTab';

export interface VarianteFormData {
  id?: number;
  nombreTalla: string;
  nombreColor: string;
  cantidad: number;
  stockAlmacen?: number;
  codigoIdentificacion: string;
}

interface FormularioProductoProps {
  producto?: Producto | null;
  categorias: Categoria[];
  proveedores: Proveedor[];
  onClose: () => void;
  onProductoGuardado: (productoGuardado?: Producto) => void;
}

type TabType = 'informacion' | 'variantes' | 'precios' | 'codigosBarras';
type ValueChangeEvent = { target: { value: string } };

const FormularioProducto: React.FC<FormularioProductoProps> = ({
  producto,
  categorias,
  proveedores,
  onClose,
  onProductoGuardado
}) => {
  
  // Acceso al área de almacén
  const {
    acceso: accesoAreaAlmacen,
    error: errorContextoInventario,
    idUbicacionAreaEntrada: idAreaAsignadaAlmacenero,
    etiquetaStock: etiquetaAreaStock,
  } = useAccesoAreaAlmacen(true);

  useModalBodyScrollLock(true);

  const [idAreaEntradaSupervisor, setIdAreaEntradaSupervisor] = useState<number | ''>('');
  
  // Estado de campos principales del producto
  const [formData, setFormData] = useState({
    codigoIdentificacion: '',
    codigoBarras: '',
    nombre: '',
    sexo: '',
    tipoPublico: '',
    categoriaId: '',
    subcategoriaId: '',
    subCategoria2Id: '',
    marca: '',
    proveedorId: '',
    precioUnitario: '',
    precioCuarto: '',
    precioMediaDocena: '',
    precioDocena: ''
  });

  // Estados de variantes y sugerencias
  const [variantes, setVariantes] = useState<VarianteFormData[]>([]);
  const [sugerenciasTallas, setSugerenciasTallas] = useState<string[]>([]);
  const [sugerenciasColores, setSugerenciasColores] = useState<string[]>([]);
  
  // Categorías de nivel 2 y 3 dinamizadas
  const [subcategorias, setSubcategorias] = useState<Categoria[]>([]);
  const [subCategorias2, setSubCategorias2] = useState<Categoria[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorPrecio, setErrorPrecio] = useState<string | null>(null);

  // Estados de validación de pasos y clonación
  const [pasosConError, setPasosConError] = useState<Record<string, boolean>>({
    informacion: false,
    variantes: false,
    precios: false,
  });
  const [crearSiguiente, setCrearSiguiente] = useState(false);

  // Nombres descriptivos de selecciones para el autocompletado persistido
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [subcategoriaSeleccionada, setSubcategoriaSeleccionada] = useState('');
  const [subcategoria2Seleccionada, setSubcategoria2Seleccionada] = useState('');
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState('');

  // Helpers de validación para el Stepper numerado
  const isInfoValido = useMemo(() => {
    const subcategoriaOk =
      subcategorias.length === 0 || !!formData.subcategoriaId.trim();
    return !!(
      formData.nombre.trim() &&
      formData.codigoIdentificacion.trim() &&
      formData.categoriaId &&
      formData.sexo &&
      formData.marca.trim() &&
      formData.tipoPublico &&
      formData.proveedorId &&
      subcategoriaOk
    );
  }, [formData, subcategorias.length]);

  const isAreaStockValido = useMemo(() => {
    if (errorContextoInventario) return false;
    if (!accesoAreaAlmacen) return true;
    if (!accesoAreaAlmacen.puedeElegirAreaEntrada) {
      return idAreaAsignadaAlmacenero != null && idAreaAsignadaAlmacenero > 0;
    }
    return idAreaEntradaSupervisor !== '';
  }, [
    accesoAreaAlmacen?.puedeElegirAreaEntrada,
    idAreaEntradaSupervisor,
    idAreaAsignadaAlmacenero,
    errorContextoInventario,
  ]);

  const isVariantesValido = useMemo(() => {
    return variantes.length > 0 && isAreaStockValido;
  }, [variantes, isAreaStockValido]);

  const isPreciosValido = useMemo(() => {
    const pu = parseFloat(formData.precioUnitario);
    const pc = parseFloat(formData.precioCuarto);
    const pmd = parseFloat(formData.precioMediaDocena);
    const pd = parseFloat(formData.precioDocena);
    
    return (
      !!formData.precioUnitario.trim() &&
      !isNaN(pu) &&
      !!formData.precioCuarto.trim() &&
      !isNaN(pc) &&
      !!formData.precioMediaDocena.trim() &&
      !isNaN(pmd) &&
      !!formData.precioDocena.trim() &&
      !isNaN(pd) &&
      !validarJerarquiaPreciosProducto(pu, pc, pmd, pd)
    );
  }, [formData]);

  // UI state
  const [tabActiva, setTabActiva] = useState<TabType>('informacion');
  const [codigoBarrasPreview, setCodigoBarrasPreview] = useState<string | null>(null);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<number | null>(null);
  const { overlayClass, panelClass, requestClose } = useModalMotion({ open: true });
  const [showFormularioVariante, setShowFormularioVariante] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    open: boolean;
    message: string;
    variant: 'error' | 'info' | 'success';
  }>({ open: false, message: '', variant: 'info' });

  const idUbicacionAreaParaStock = useMemo(() => {
    if (accesoAreaAlmacen?.puedeElegirAreaEntrada) {
      return idAreaEntradaSupervisor === '' ? null : Number(idAreaEntradaSupervisor);
    }
    return idAreaAsignadaAlmacenero;
  }, [accesoAreaAlmacen?.puedeElegirAreaEntrada, idAreaEntradaSupervisor, idAreaAsignadaAlmacenero]);

  const etiquetaStockActiva = useMemo(() => {
    if (accesoAreaAlmacen?.puedeElegirAreaEntrada && idAreaEntradaSupervisor !== '') {
      const ua = accesoAreaAlmacen.areasAlmacen.find(
        (a) => a.idUbicacionArea === Number(idAreaEntradaSupervisor)
      );
      if (ua) {
        return ua.descripcion ?? (ua.area ? `${ua.nombre} · ${ua.area}` : ua.nombre);
      }
    }
    return etiquetaAreaStock ?? 'área de almacén';
  }, [accesoAreaAlmacen, idAreaEntradaSupervisor, etiquetaAreaStock]);

  // Cargar datos iniciales
  useEffect(() => {
    cargarSugerenciasCatalogo();
  }, []);

  const handleClose = () => {
    requestClose(onClose);
  };

  // Inicializar en modo Edición
  useEffect(() => {
    if (producto) {
      const tieneCategoriaPadre = producto.categoriaPadre != null;
      const tieneCategoria = producto.categoria != null;
      
      let categoriaIdFormulario = '';
      let subcategoriaIdFormulario = '';
      
      if (tieneCategoriaPadre && tieneCategoria) {
        if (producto.categoria?.idCategoria === producto.categoriaPadre?.idCategoria) {
          categoriaIdFormulario = producto.categoriaPadre?.idCategoria?.toString() || '';
          subcategoriaIdFormulario = '';
        } else {
          categoriaIdFormulario = producto.categoriaPadre?.idCategoria?.toString() || '';
          subcategoriaIdFormulario = producto.categoria?.idCategoria?.toString() || '';
        }
      } else if (tieneCategoriaPadre) {
        categoriaIdFormulario = producto.categoriaPadre?.idCategoria?.toString() || '';
        subcategoriaIdFormulario = '';
      } else if (tieneCategoria) {
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
      
      if (producto.categoriaPadre) {
        if (categoriaIdFormulario) {
          setCategoriaSeleccionada(producto.categoriaPadre.nombre);
          const categoriaSeleccionadaObj = categorias.find(c => c.idCategoria?.toString() === categoriaIdFormulario);
          if (categoriaSeleccionadaObj?.subCategorias) {
            setSubcategorias(categoriaSeleccionadaObj.subCategorias);
          }
        }
      }
      
      if (producto.categoria && tieneCategoria && producto.categoriaPadre && 
          producto.categoria.idCategoria !== producto.categoriaPadre.idCategoria) {
        if (subcategoriaIdFormulario) {
          setSubcategoriaSeleccionada(producto.categoria.nombre);
          const catPadre = categorias.find(c => c.idCategoria?.toString() === categoriaIdFormulario);
          const subcategoriaSeleccionadaObj = catPadre?.subCategorias?.find(
            sc => sc.idCategoria?.toString() === subcategoriaIdFormulario
          );
          if (subcategoriaSeleccionadaObj?.subCategorias) {
            setSubCategorias2(subcategoriaSeleccionadaObj.subCategorias);
          }
        }
      }
      
      if (producto.subCategoria2) {
        setSubcategoria2Seleccionada(producto.subCategoria2.nombre);
      }
      
      if (producto.proveedor) {
        setProveedorSeleccionado(producto.proveedor.nombre);
      }
      
      cargarVariantesExistentes();
    }
  }, [producto, categorias]);

  useEffect(() => {
    if (producto?.idProducto && idUbicacionAreaParaStock != null) {
      cargarVariantesExistentes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idUbicacionAreaParaStock]);

  const cargarSugerenciasCatalogo = async () => {
    try {
      setLoading(true);
      const sugerencias = await ProductoVarianteService.obtenerSugerenciasCatalogo();
      setSugerenciasTallas(sugerencias.tallas);
      setSugerenciasColores(sugerencias.colores);
    } catch (err: any) {
      console.error('Error al cargar sugerencias de tallas y colores:', err);
      const status = getStatusCode(err);
      if (status === 401) {
        setError('Error de autorización: Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      } else if (status === 403) {
        setError('Error de permisos: No tienes autorización para acceder a esta información.');
      } else {
        setError('Error al cargar sugerencias: ' + getErrorMessage(err, 'Error de comunicación'));
      }
    } finally {
      setLoading(false);
    }
  };

  const cargarVariantesExistentes = async () => {
    if (!producto?.idProducto) return;
    
    try {
      setLoading(true);
      const variantesExistentes = await ProductoVarianteService.obtenerVariantesPorProducto(
        producto.idProducto,
        idUbicacionAreaParaStock
      );
      
      const variantesUnicas = Array.from(
        new Map(variantesExistentes.map(v => [v.idVariante, v])).values()
      );
      
      const variantesFormData: VarianteFormData[] = variantesUnicas.map(v => ({
        id: v.idProductoVariante || v.idVariante,
        nombreTalla: v.talla?.nombreTalla?.trim() ?? '',
        nombreColor: v.color?.nombre?.trim() ?? '',
        cantidad: v.cantidad,
        stockAlmacen: v.stockAlmacen ?? v.cantidad,
        codigoIdentificacion: v.codigoBarrasVariante || ''
      }));
      
      setVariantes(variantesFormData);

      setSugerenciasTallas((prev) =>
        nombresUnicosOrdenados([...prev, ...collectTallaNamesFromVariantes(variantesUnicas)])
      );
      setSugerenciasColores((prev) =>
        nombresUnicosOrdenados([...prev, ...collectColorNamesFromVariantes(variantesUnicas)])
      );
    } catch (err: any) {
      console.error('Error al cargar variantes existentes:', err);
      const status = getStatusCode(err);
      if (status === 401) {
        setError('Error de autorización: Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      } else if (status === 403) {
        setError('Error de permisos: No tienes autorización para acceder a esta información.');
      } else {
        setError('Error al cargar variantes: ' + getErrorMessage(err, 'Error de comunicación'));
      }
    } finally {
      setLoading(false);
    }
  };

  const cantidadTotal = variantes.reduce((total, variante) => total + (variante.stockAlmacen ?? variante.cantidad), 0);

  const eliminarVariante = (index: number) => {
    setVariantes(prev => prev.filter((_, i) => i !== index));
  };

  const actualizarCantidadVariante = (index: number, cantidad: number) => {
    if (cantidad < 1) return;
    setVariantes(prev => prev.map((variante, i) => 
      i === index ? { ...variante, stockAlmacen: cantidad } : variante
    ));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

      setFormData((prev) => ({ ...prev, [name]: value }));

      const errJer = validarJerarquiaPreciosProducto(
        Number.isFinite(pu) ? pu : NaN,
        Number.isFinite(pc) ? pc : NaN,
        Number.isFinite(pmd) ? pmd : NaN,
        Number.isFinite(pd) ? pd : NaN
      );
      setErrorPrecio(errJer);
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generarCodigoBarrasAutomatico = () => {
    const timestamp = Date.now();
    const codigoBase = formData.codigoIdentificacion || 'PROD';
    const codigoGenerado = `${codigoBase}-${timestamp}`;
    setFormData(prev => ({ ...prev, codigoBarras: codigoGenerado }));
  };

  const generarCodigoBarrasVariante = async (varianteId: number | undefined) => {
    if (!varianteId) {
      setError('No se puede generar código de barras: Guarda el producto primero.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const blob = await CodigoBarrasService.generarImagenVariante(varianteId);
      const url = window.URL.createObjectURL(blob);
      setCodigoBarrasPreview(url);
      setVarianteSeleccionada(varianteId);
      setTabActiva('codigosBarras');
    } catch (err: any) {
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

    setAlertModal({ open: true, message: 'Código de barras de variante descargado correctamente', variant: 'success' });
  };

  const handleCategoriaChange = (e: ValueChangeEvent) => {
    const categoriaId = e.target.value;
    setFormData(prev => ({
      ...prev,
      categoriaId,
      subcategoriaId: '',
      subCategoria2Id: ''
    }));
    setSubcategoriaSeleccionada('');
    setSubcategoria2Seleccionada('');
    setSubCategorias2([]);

    if (categoriaId) {
      const cat = categorias.find(c => c.idCategoria?.toString() === categoriaId);
      if (cat?.subCategorias) {
        setSubcategorias(cat.subCategorias);
        return;
      }
    }
    setSubcategorias([]);
  };

  const handleSubcategoriaChange = (e: ValueChangeEvent) => {
    const subcategoriaId = e.target.value;
    setFormData(prev => ({
      ...prev,
      subcategoriaId,
      subCategoria2Id: ''
    }));
    setSubcategoria2Seleccionada('');

    if (subcategoriaId) {
      const subcat = subcategorias.find(sc => sc.idCategoria?.toString() === subcategoriaId);
      if (subcat?.subCategorias) {
        setSubCategorias2(subcat.subCategorias);
        return;
      }
    }
    setSubCategorias2([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrorPrecio(null);

    // Reset error steps
    setPasosConError({
      informacion: false,
      variantes: false,
      precios: false,
    });

    // Validate
    let errorsExist = false;
    const nextPasosError = {
      informacion: false,
      variantes: false,
      precios: false,
    };

    const mensajesError: string[] = [];

    if (!isInfoValido) {
      nextPasosError.informacion = true;
      errorsExist = true;
      const faltantes: string[] = [];
      if (!formData.nombre.trim()) faltantes.push('nombre');
      if (!formData.codigoIdentificacion.trim()) faltantes.push('código de identificación');
      if (!formData.categoriaId) faltantes.push('categoría');
      if (subcategorias.length > 0 && !formData.subcategoriaId.trim()) faltantes.push('subcategoría');
      if (!formData.sexo) faltantes.push('sexo');
      if (!formData.marca.trim()) faltantes.push('marca');
      if (!formData.tipoPublico) faltantes.push('tipo de público');
      if (!formData.proveedorId) faltantes.push('proveedor');
      mensajesError.push(
        `Detalles básicos: complete ${faltantes.join(', ')}.`
      );
    }

    if (variantes.length === 0) {
      nextPasosError.variantes = true;
      errorsExist = true;
      mensajesError.push(
        'Tallas y colores: agregue al menos una combinación (cuadrícula → Confirmar combinaciones, o modo «Agregar una combinación»).'
      );
    } else if (!isAreaStockValido) {
      nextPasosError.variantes = true;
      errorsExist = true;
      if (errorContextoInventario) {
        mensajesError.push(`Tallas y colores: ${errorContextoInventario}`);
      } else if (accesoAreaAlmacen?.puedeElegirAreaEntrada) {
        mensajesError.push(
          'Tallas y colores: seleccione el sector de almacén (Damas, Caballeros o Niños) donde ingresará el stock.'
        );
      } else {
        mensajesError.push(
          'Tallas y colores: su usuario no tiene área de almacén asignada. Contacte al administrador.'
        );
      }
    }

    if (!isPreciosValido) {
      nextPasosError.precios = true;
      errorsExist = true;
      const pu = parseFloat(formData.precioUnitario);
      const pc = parseFloat(formData.precioCuarto);
      const pmd = parseFloat(formData.precioMediaDocena);
      const pd = parseFloat(formData.precioDocena);
      const errJer = validarJerarquiaPreciosProducto(
        Number.isFinite(pu) ? pu : NaN,
        Number.isFinite(pc) ? pc : NaN,
        Number.isFinite(pmd) ? pmd : NaN,
        Number.isFinite(pd) ? pd : NaN
      );
      if (!formData.precioUnitario.trim() || !formData.precioCuarto.trim() ||
          !formData.precioMediaDocena.trim() || !formData.precioDocena.trim()) {
        mensajesError.push('Costos y precios: complete los cuatro precios por volumen.');
      } else if (errJer) {
        mensajesError.push(`Costos y precios: ${errJer}`);
      } else {
        mensajesError.push('Costos y precios: revise los valores ingresados.');
      }
    }

    if (errorsExist) {
      setPasosConError(nextPasosError);
      if (nextPasosError.informacion) setTabActiva('informacion');
      else if (nextPasosError.variantes) setTabActiva('variantes');
      else if (nextPasosError.precios) setTabActiva('precios');

      setError(mensajesError.join(' '));
      setLoading(false);
      return;
    }

    try {
      const categoriaPadreSeleccionada = categorias.find(
        (c) => c.idCategoria?.toString() === formData.categoriaId
      );
      
      let categoriaSeleccionadaObj = categoriaPadreSeleccionada;
      if (formData.subcategoriaId) {
        const sub = subcategorias.find(
          (c) => c.idCategoria?.toString() === formData.subcategoriaId
        );
        if (sub) {
          categoriaSeleccionadaObj = sub;
        }
      }

      const proveedor = proveedores.find(
        (p) => p.idProveedor?.toString() === formData.proveedorId
      );

      if (!proveedor) throw new Error('Debe seleccionar un proveedor válido');

      let subCategoria2: Categoria | undefined = undefined;
      if (formData.subCategoria2Id) {
        subCategoria2 = subCategorias2.find(c => c.idCategoria?.toString() === formData.subCategoria2Id) ||
                        categorias.find(c => c.idCategoria?.toString() === formData.subCategoria2Id);
        if (!subCategoria2) throw new Error('Segunda subcategoría no válida');
      }

      const subCategoria2Final = subCategoria2?.idCategoria
        ? { ...subCategoria2, idCategoria: subCategoria2.idCategoria }
        : undefined;

      const productoData: Omit<Producto, 'idProducto'> = {
        codigoIdentificacion: formData.codigoIdentificacion,
        codigoBarras: formData.codigoBarras || undefined,
        nombre: formData.nombre,
        sexo: formData.sexo,
        tipoPublico: formData.tipoPublico,
        categoria: categoriaSeleccionadaObj,
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

      let productoGuardadoObj: Producto;

      if (producto?.idProducto) {
        productoGuardadoObj = await ProductoService.updateProducto(producto.idProducto, {
          ...productoData,
          idProducto: producto.idProducto
        });
      } else {
        productoGuardadoObj = await ProductoService.createProducto(productoData);
      }

      // Sincronizar variantes
      if (productoGuardadoObj.idProducto && variantes.length > 0) {
        const variantesEnBD = producto?.idProducto
          ? await ProductoVarianteService.obtenerVariantesPorProducto(producto.idProducto)
          : [];

        const mapaVariantesBD = new Map(variantesEnBD.map(v => [v.idProductoVariante, v]));
        
        const mapaVariantesFormulario = new Map<number, typeof variantes[0]>();
        for (const v of variantes) {
          if (v.id) {
            mapaVariantesFormulario.set(v.id, v);
          }
        }

        const variantesAEliminar = variantesEnBD.filter(vDB => !mapaVariantesFormulario.has(vDB.idProductoVariante!));
        const variantesAActualizar = variantes.filter(vForm => vForm.id && mapaVariantesBD.has(vForm.id));
        const variantesACrear = variantes.filter(vForm => !vForm.id);

        // 1. Eliminar
        for (const v of variantesAEliminar) {
          await ProductoVarianteService.eliminarVariante(v.idProductoVariante!);
        }

        // 2. Actualizar
        for (const v of variantesAActualizar) {
          const existente = mapaVariantesBD.get(v.id!);
          if (!existente) continue;

          const stockAlmacenForm = v.stockAlmacen ?? v.cantidad;
          const stockAlmacenBD = existente.stockAlmacen ?? existente.cantidad;
          const cantidadCambio = stockAlmacenForm !== stockAlmacenBD;
          const codigoCambio = existente.codigoBarrasVariante !== v.codigoIdentificacion;

          if (!cantidadCambio && !codigoCambio) continue;

          if (cantidadCambio) {
            await ProductoVarianteService.actualizarCantidad(v.id!, stockAlmacenForm, idUbicacionAreaParaStock);
          }
          if (codigoCambio) {
            const talla = tallaDesdeNombre(v.nombreTalla);
            const color = colorDesdeNombre(v.nombreColor);
            if (!v.nombreTalla.trim() || !v.nombreColor.trim()) continue;

            const data: Omit<ProductoVariante, 'idVariante'> = {
              producto: productoGuardadoObj,
              talla,
              color,
              cantidad: existente.cantidad,
              codigoBarrasVariante: v.codigoIdentificacion
            };
            await ProductoVarianteService.actualizarVariante(v.id!, {
              ...data,
              idProductoVariante: v.id
            });
          }
        }

        // 3. Crear
        for (const v of variantesACrear) {
          const talla = tallaDesdeNombre(v.nombreTalla);
          const color = colorDesdeNombre(v.nombreColor);
          if (!v.nombreTalla.trim() || !v.nombreColor.trim()) continue;

          const data: Omit<ProductoVariante, 'idVariante'> = {
            producto: productoGuardadoObj,
            talla,
            color,
            cantidad: v.stockAlmacen ?? v.cantidad,
            codigoBarrasVariante: v.codigoIdentificacion
          };
          try {
            await ProductoVarianteService.crearVariante(data, idUbicacionAreaParaStock);
          } catch (varianteErr: any) {
            const detalle = extractApiErrorMessage(
              varianteErr,
              getErrorMessage(varianteErr, 'Error al crear la variante')
            );
            throw new Error(
              `El producto se guardó, pero falló la combinación ${v.nombreTalla} / ${v.nombreColor}: ${detalle}`
            );
          }
        }
      }

      if (productoGuardadoObj.idProducto) {
        const variantesActualizadas = await ProductoVarianteService.obtenerVariantesPorProducto(
          productoGuardadoObj.idProducto,
          idUbicacionAreaParaStock
        );
        const cantidadTotalActualizada = variantesActualizadas.reduce((total, v) => total + (v.stockAlmacen ?? v.cantidad), 0);
        productoGuardadoObj = {
          ...productoGuardadoObj,
          cantidad: cantidadTotalActualizada
        };
      }

      onProductoGuardado(productoGuardadoObj);
      
      if (crearSiguiente && !producto) {
        // Continuous input: keep form open, reset only specific fields
        setFormData(prev => ({
          ...prev,
          nombre: '',
          codigoIdentificacion: '',
          codigoBarras: ''
        }));
        setVariantes([]);
        setTabActiva('informacion');
        setPasosConError({
          informacion: false,
          variantes: false,
          precios: false,
        });
        setAlertModal({
          open: true,
          message: 'Producto guardado con éxito. Puede continuar registrando el siguiente producto.',
          variant: 'success'
        });
        setCrearSiguiente(false);
      } else {
        handleClose();
      }
    } catch (err: any) {
      console.error('Error al guardar producto:', err);
      const msg = extractApiErrorMessage(err, getErrorMessage(err, 'Error al guardar el producto'));
      setError(msg);
      const msgLower = msg.toLowerCase();
      if (
        msgLower.includes('área de almacén') ||
        msgLower.includes('area de almacen') ||
        msgLower.includes('sector')
      ) {
        setPasosConError({ informacion: false, variantes: true, precios: false });
        setTabActiva('variantes');
      }
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      id: 'informacion' as TabType,
      label: 'Detalles básicos',
      number: '01',
      isValid: isInfoValido,
      hasError: pasosConError.informacion,
    },
    {
      id: 'variantes' as TabType,
      label: 'Tallas y colores',
      number: '02',
      isValid: isVariantesValido,
      hasError: pasosConError.variantes,
    },
    {
      id: 'precios' as TabType,
      label: 'Costos y precios',
      number: '03',
      isValid: isPreciosValido,
      hasError: pasosConError.precios,
    },
    {
      id: 'codigosBarras' as TabType,
      label: 'Generar código de barras',
      number: '04',
      isValid: producto ? true : false,
      hasError: false,
    }
  ];

  return (
    <ModalPortal>
    <div className={`app-modal-overlay fixed inset-0 bg-[#0c0c0e]/80 backdrop-blur-md flex items-center justify-center ${overlayClass}`}>
      <div className={`bg-app-surface rounded-[2.5rem] shadow-[0_32px_80px_rgba(0,0,0,0.25)] w-full max-w-6xl max-h-[92vh] overflow-hidden border border-app-border relative flex flex-col ${panelClass}`}>
        {/* Elegant Modal Header with Luxury Accents */}
        <div className="relative bg-app-surface border-b border-app-border px-10 py-7">
          {/* Subtle gold line accent for premium luxury look */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 via-neutral-900 to-amber-600" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-5">
              <div className="p-3 bg-app-accent rounded-2xl border border-app-border shadow-sm flex items-center justify-center">
                <MaterialIcon icon="edit" className="w-6 h-6 text-app-accent-fg" />
              </div>
              <div>
                <h2 className="text-[1.5rem] font-black tracking-tight text-app-text uppercase leading-none mb-1.5">
                  {producto ? 'Editar Producto' : 'Crear Nuevo Producto'}
                </h2>
                <p className="text-app-text-muted text-xs font-semibold uppercase tracking-widest">
                  {producto ? 'Modifica la información exclusiva de la prenda' : 'Registra una nueva prenda en el catálogo de moda'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 bg-app-input hover:bg-app-hover-overlay border border-app-border text-app-text-muted hover:text-app-text rounded-2xl flex items-center justify-center transition-all duration-200"
            >
              <MaterialIcon icon="close" className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable content container with luxury neutral background */}
        <div className="overflow-y-auto flex-1 bg-app-surface">
          <div className="px-10 py-8">
            {error && (
               <div className="mb-8 p-5 bg-rose-50 border border-rose-100/50 rounded-3xl flex items-start gap-4 shadow-sm">
                <MaterialIcon icon="error" className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-800 mb-1">Por favor revise los campos</h4>
                  <p className="text-xs font-semibold text-rose-600 leading-relaxed uppercase tracking-wider">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Premium Floating Stepper */}
              <div className="flex items-center gap-2 overflow-x-auto bg-app-surface p-2.5 rounded-3xl border border-app-border shadow-sm mb-10">
                {steps.map((step, idx) => {
                  const isActive = tabActiva === step.id;
                  const isCompleted = step.isValid;

                  return (
                    <React.Fragment key={step.id}>
                      <button
                        type="button"
                        onClick={() => setTabActiva(step.id)}
                        className={`shrink-0 flex items-center gap-3 px-5 py-3 rounded-2xl transition-all duration-300 ease-out text-left relative focus:outline-none min-w-[150px] md:min-w-0 md:flex-1 ${
                          isActive
                            ? 'bg-app-accent text-app-accent-fg shadow-lg translate-y-[-1px]'
                            : 'bg-app-surface hover:bg-app-hover-overlay text-app-text'
                        }`}
                      >
                        {/* Circle step indicator */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-all duration-300 ${
                          isActive 
                            ? 'bg-app-surface text-app-text' 
                            : isCompleted 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : 'bg-app-input text-app-text-muted'
                        }`}>
                          {isCompleted ? (
                            <MaterialIcon icon="check" className="w-4 h-4 font-bold" />
                          ) : (
                            step.number
                          )}
                          {step.hasError && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-white" />
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className={`block text-[9px] font-black tracking-[0.18em] uppercase leading-none mb-1 ${
                            isActive ? 'text-neutral-400' : 'text-neutral-400'
                          }`}>
                            FASE {step.number}
                          </span>
                          <span className="block text-xs font-bold tracking-wide truncate leading-none">
                            {step.label}
                          </span>
                        </div>
                      </button>
                      {idx < steps.length - 1 && (
                        <div className="hidden md:block h-0.5 w-6 bg-neutral-100 shrink" aria-hidden />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* RENDERIZADO DE PESTAÑAS COMPONENTIZADAS */}
              
              {tabActiva === 'informacion' && (
                <InformacionTab
                  formData={formData}
                  setFormData={setFormData}
                  handleInputChange={handleInputChange}
                  generarCodigoBarrasAutomatico={generarCodigoBarrasAutomatico}
                  categorias={categorias}
                  proveedores={proveedores}
                  subcategorias={subcategorias}
                  subCategorias2={subCategorias2}
                  handleCategoriaChange={handleCategoriaChange}
                  handleSubcategoriaChange={handleSubcategoriaChange}
                  categoriaSeleccionada={categoriaSeleccionada}
                  setCategoriaSeleccionada={setCategoriaSeleccionada}
                  subcategoriaSeleccionada={subcategoriaSeleccionada}
                  setSubcategoriaSeleccionada={setSubcategoriaSeleccionada}
                  subcategoria2Seleccionada={subcategoria2Seleccionada}
                  setSubcategoria2Seleccionada={setSubcategoria2Seleccionada}
                  proveedorSeleccionado={proveedorSeleccionado}
                  setProveedorSeleccionado={setProveedorSeleccionado}
                />
              )}

              {tabActiva === 'variantes' && (
                <VariantesTab
                  formData={formData}
                  variantes={variantes}
                  setVariantes={setVariantes}
                  accesoAreaAlmacen={accesoAreaAlmacen}
                  errorContextoInventario={errorContextoInventario}
                  etiquetaStockActiva={etiquetaStockActiva}
                  idAreaEntradaSupervisor={idAreaEntradaSupervisor}
                  setIdAreaEntradaSupervisor={setIdAreaEntradaSupervisor}
                  sugerenciasTallas={sugerenciasTallas}
                  setSugerenciasTallas={setSugerenciasTallas}
                  sugerenciasColores={sugerenciasColores}
                  setSugerenciasColores={setSugerenciasColores}
                  actualizarCantidadVariante={actualizarCantidadVariante}
                  eliminarVariante={eliminarVariante}
                  generarCodigoBarrasVariante={generarCodigoBarrasVariante}
                  setError={setError}
                  loading={loading}
                  showFormularioVariante={showFormularioVariante}
                  setShowFormularioVariante={setShowFormularioVariante}
                />
              )}

              {tabActiva === 'precios' && (
                <PreciosTab
                  formData={formData}
                  handleInputChange={handleInputChange}
                  errorPrecio={errorPrecio}
                />
              )}

              {tabActiva === 'codigosBarras' && (
                <CodigosBarrasTab
                  formData={formData}
                  variantes={variantes}
                  codigoBarrasPreview={codigoBarrasPreview}
                  setCodigoBarrasPreview={setCodigoBarrasPreview}
                  varianteSeleccionada={varianteSeleccionada}
                  setVarianteSeleccionada={setVarianteSeleccionada}
                  generarCodigoBarrasVariante={generarCodigoBarrasVariante}
                  descargarCodigoBarrasVariante={descargarCodigoBarrasVariante}
                  setTabActiva={setTabActiva}
                  setShowFormularioVariante={setShowFormularioVariante}
                  loading={loading}
                />
              )}

              {/* Premium Sticky Footer Glassmorphic */}
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-between items-center sticky bottom-0 bg-app-surface/90 backdrop-blur-md px-10 py-6 border-t border-app-border/85 z-25 shadow-[0_-12px_32px_rgba(0,0,0,0.03)] -mx-10 -mb-8">
                <div className="flex gap-3.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 sm:flex-initial px-6 py-3.5 rounded-2xl border border-app-border bg-app-surface text-app-text hover:bg-app-accent hover:text-app-accent-fg font-bold text-xs uppercase tracking-widest transition-all duration-300 ease-out"
                  >
                    Cancelar
                  </button>
                  
                  <div className="flex gap-2 flex-1 sm:flex-initial">
                    {tabActiva !== 'informacion' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (tabActiva === 'variantes') setTabActiva('informacion');
                          else if (tabActiva === 'precios') setTabActiva('variantes');
                          else if (tabActiva === 'codigosBarras') setTabActiva('precios');
                        }}
                        className="px-5 py-3.5 rounded-2xl border border-app-border bg-app-surface text-app-text hover:bg-app-hover-overlay font-bold text-xs uppercase tracking-widest transition-all duration-300 ease-out"
                      >
                        Anterior
                      </button>
                    )}
                    
                    {tabActiva === 'informacion' && (
                      <button
                        type="button"
                        onClick={() => setTabActiva('variantes')}
                        className="px-5 py-3.5 rounded-2xl border border-app-border bg-app-surface text-app-text hover:bg-app-hover-overlay font-bold text-xs uppercase tracking-widest transition-all duration-300 ease-out"
                      >
                        Siguiente
                      </button>
                    )}
                    
                    {tabActiva === 'variantes' && (
                      <button
                        type="button"
                        onClick={() => setTabActiva('precios')}
                        className="px-5 py-3.5 rounded-2xl border border-app-border bg-app-surface text-app-text hover:bg-app-hover-overlay font-bold text-xs uppercase tracking-widest transition-all duration-300 ease-out"
                      >
                        Siguiente
                      </button>
                    )}
                    
                    {tabActiva === 'precios' && (
                      <button
                        type="button"
                        onClick={() => setTabActiva('codigosBarras')}
                        className="px-5 py-3.5 rounded-2xl border border-app-border bg-app-surface text-app-text hover:bg-app-hover-overlay font-bold text-xs uppercase tracking-widest transition-all duration-300 ease-out"
                      >
                        Siguiente
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-3.5 w-full sm:w-auto">
                  {/* "Guardar y Siguiente" button: Only shown when creating a new product */}
                  {!producto && (
                    <button
                      type="submit"
                      onClick={() => setCrearSiguiente(true)}
                      className="flex-1 sm:flex-initial px-6 py-3.5 text-xs font-bold text-app-text border border-app-border bg-app-surface hover:bg-app-hover-overlay rounded-2xl transition-all duration-300 ease-out uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                      disabled={loading}
                    >
                      Guardar y Siguiente
                    </button>
                  )}

                  <button
                    type="submit"
                    onClick={() => setCrearSiguiente(false)}
                    className="flex-1 sm:flex-initial px-8 py-3.5 text-xs font-bold text-app-accent-fg bg-app-accent hover:opacity-90 rounded-2xl shadow-lg active:scale-[0.98] transition-all duration-300 ease-out uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    <MaterialIcon icon="save" className="w-4 h-4 text-amber-500" />
                    {loading ? 'Guardando...' : (producto ? 'Guardar Cambios' : 'Crear Producto')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      <AlertModal
        open={alertModal.open}
        message={alertModal.message}
        variant={alertModal.variant}
        onClose={() => setAlertModal({ open: false, message: '', variant: 'info' })}
      />
    </div>
    </ModalPortal>
  );
};

export default FormularioProducto;
