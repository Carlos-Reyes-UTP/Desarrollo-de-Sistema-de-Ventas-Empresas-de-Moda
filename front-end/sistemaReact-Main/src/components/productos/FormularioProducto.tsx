import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Package2, AlertCircle, Layers, Tag, Barcode } from 'lucide-react';
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
import { AlertModal } from '@/shared/ui';
import { useAuth } from '@/context/AuthContext';
import { resolveInventarioUserRole } from '@/hooks/useProductoVarianteService';
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
  const { usuario } = useAuth();
  
  // Acceso al área de almacén
  const {
    acceso: accesoAreaAlmacen,
    error: errorContextoInventario,
    idUbicacionAreaEntrada: idAreaAsignadaAlmacenero,
    etiquetaStock: etiquetaAreaStock,
  } = useAccesoAreaAlmacen(true);

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

  // Nombres descriptivos de selecciones para el autocompletado persistido
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [subcategoriaSeleccionada, setSubcategoriaSeleccionada] = useState('');
  const [subcategoria2Seleccionada, setSubcategoria2Seleccionada] = useState('');
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState('');

  // UI state
  const [tabActiva, setTabActiva] = useState<TabType>('informacion');
  const [codigoBarrasPreview, setCodigoBarrasPreview] = useState<string | null>(null);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<number | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
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
    setIsModalVisible(true);
    cargarSugerenciasCatalogo();
  }, []);

  const handleClose = () => {
    setIsModalVisible(false);
    setTimeout(onClose, 300);
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
          const subcategoriaSeleccionadaObj = producto.categoriaPadre.subCategorias?.find(
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
    } catch (err: unknown) {
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

    if (categoriaId) {
      const catObj = categorias.find(c => c.idCategoria?.toString() === categoriaId);
      if (catObj?.subCategorias) {
        setSubcategorias(catObj.subCategorias);
      } else {
        setSubcategorias([]);
      }
    } else {
      setSubcategorias([]);
    }
    setSubCategorias2([]);
  };

  const handleSubcategoriaChange = (e: ValueChangeEvent) => {
    const subcategoriaId = e.target.value;
    setFormData(prev => ({ 
      ...prev, 
      subcategoriaId,
      subCategoria2Id: ''
    }));

    if (subcategoriaId) {
      const subcatObj = subcategorias.find(c => c.idCategoria?.toString() === subcategoriaId);
      if (subcatObj?.subCategorias) {
        setSubCategorias2(subcatObj.subCategorias);
      } else {
        setSubCategorias2([]);
      }
    } else {
      setSubCategorias2([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrorPrecio(null);

    try {
      if (!formData.nombre.trim()) throw new Error('El nombre del producto es requerido');
      if (!formData.codigoIdentificacion.trim()) throw new Error('El código de identificación es requerido');
      if (!formData.categoriaId) throw new Error('Debe seleccionar una categoría principal');
      if (!formData.sexo) throw new Error('Debe seleccionar el sexo del producto');
      if (!formData.marca.trim()) throw new Error('La marca es requerida');

      if (accesoAreaAlmacen && !accesoAreaAlmacen.puedeElegirAreaEntrada && !idUbicacionAreaParaStock) {
        throw new Error(
          errorContextoInventario ??
            'No tiene área de almacén asignada. Contacte al administrador antes de registrar stock.'
        );
      }
      if (accesoAreaAlmacen?.puedeElegirAreaEntrada && variantes.length > 0 && !idUbicacionAreaParaStock) {
        setTabActiva('variantes');
        setLoading(false);
        throw new Error('Seleccione el área de almacén donde ingresa la mercadería.');
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
        setErrorPrecio('Para guardar hace falta indicar el total para 3, 6 y 12 unidades.');
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

      let categoriaSeleccionadaObj: Categoria | undefined = undefined;
      let categoriaPadreSeleccionada: Categoria | undefined = undefined;

      if (formData.subcategoriaId) {
        categoriaSeleccionadaObj = subcategorias.find(c => c.idCategoria?.toString() === formData.subcategoriaId);
        categoriaPadreSeleccionada = categorias.find(c => c.idCategoria?.toString() === formData.categoriaId);
      } else {
        const categoriaPrincipal = categorias.find(c => c.idCategoria?.toString() === formData.categoriaId)!;
        if (!categoriaPrincipal) throw new Error('Debe seleccionar una categoría válida');
        
        if (categoriaPrincipal.subCategorias && categoriaPrincipal.subCategorias.length > 0) {
          throw new Error('Debe seleccionar una subcategoría para esta categoría principal');
        } else {
          categoriaSeleccionadaObj = undefined;
          categoriaPadreSeleccionada = categoriaPrincipal;
        }
      }

      if (!formData.tipoPublico) throw new Error('Debe seleccionar el tipo de público (niño o adulto)');
      if (subCategorias2.length > 0 && !formData.subCategoria2Id) {
        throw new Error('Debe seleccionar la segunda subcategoría (Nivel 3)');
      }
      if (!formData.proveedorId) throw new Error('Debe seleccionar un proveedor');

      const proveedor = proveedores.find(p => p.idProveedor?.toString() === formData.proveedorId);
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
          await ProductoVarianteService.crearVariante(data, idUbicacionAreaParaStock);
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
      handleClose();
    } catch (err: unknown) {
      console.error('Error al guardar producto:', err);
      setError(extractApiErrorMessage(err, getErrorMessage(err, 'Error al guardar el producto')));
    } finally {
      setLoading(false);
    }
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
              <div className="mb-6 p-4 bg-rose-50/60 border border-rose-100 rounded-2xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                <p className="text-xs font-black uppercase tracking-widest text-rose-700">{error}</p>
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

              {/* Botones de acción inferiores */}
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-between items-center sticky bottom-0 bg-white px-8 py-6 border-t border-gray-100 rounded-b-[2rem]">
                <div className="flex gap-3">
                  <button
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
                        onClick={() => {
                          if (tabActiva === 'variantes') setTabActiva('informacion');
                          else if (tabActiva === 'precios') setTabActiva('variantes');
                          else if (tabActiva === 'codigosBarras') setTabActiva('precios');
                        }}
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

      <AlertModal
        open={alertModal.open}
        message={alertModal.message}
        variant={alertModal.variant}
        onClose={() => setAlertModal({ open: false, message: '', variant: 'info' })}
      />
    </div>
  );
};

export default FormularioProducto;
