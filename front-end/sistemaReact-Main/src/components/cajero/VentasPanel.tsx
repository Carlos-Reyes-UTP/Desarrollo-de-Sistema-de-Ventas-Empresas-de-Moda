import { useEffect, useMemo, useState, useRef } from 'react';
import { Search, X, CreditCard, Smartphone, DollarSign, CheckCircle, Loader2, Users, AlertCircle } from 'lucide-react';
import { useProductoVarianteService } from '../../hooks/useProductoVarianteService';
import { useAuthReady } from '../../hooks/useAuthReady';
import { useAuth } from '../../context/AuthContext';
import { ClienteService } from '../../services/ClienteServices';
import { VentaService } from '../../services/VentaServices';
import { ProductoService } from '../../services/ProductoServices';
import { MayoristaService } from '../../services/MayoristaService';
import type { ProductoVenta } from '../../interfaces/Producto';
import type { ProductoVariante } from '../../interfaces/ProductoVariante';
import type { Cliente } from '../../interfaces/Cliente';
import type { VentaInput } from '../../interfaces/Venta';
import type { DetalleVentaInput } from '../../interfaces/DetalleVenta';
import { NotificationToast } from './ventas-panel/NotificationToast';
import { QrPaymentModal } from './ventas-panel/QrPaymentModal';
import { VentaCompletadaModal } from './ventas-panel/VentaCompletadaModal';
import { getErrorMessage } from './ventas-panel/errorUtils';
import { imprimirBoletaVenta } from './ventas-panel/printBoleta';
import type { DatosVentaBoleta, PrecioCalculado } from './ventas-panel/types';

const VentasPanel = () => {
  const { isReady, isAuthenticated } = useAuthReady();
  const { usuario } = useAuth();
  // Get role-aware product variante service methods
  const { getAllVariantes, disminuirCantidadVariante } = useProductoVarianteService(true);
  
  // --------------------------------------------------------------------------------------------
  // A. ESTADO DEL COMPONENTE
  // --------------------------------------------------------------------------------------------
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDebounce, setBusquedaDebounce] = useState('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tipoBusqueda, setTipoBusqueda] = useState<'nombre' | 'codigo'>('codigo');
  const [cliente, setCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [esMayorista, setEsMayorista] = useState(false);
  const [verificandoMayorista, setVerificandoMayorista] = useState(false);
  const [documentoCliente, setDocumentoCliente] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<'DNI' | 'RUC'>('DNI');
  
  const [variantesCargadas, setVariantesCargadas] = useState<ProductoVariante[]>([]);
  const [productosSeleccionadosVenta, setProductosSeleccionadosVenta] = useState<ProductoVenta[]>([]);
  const [variantesConPreciosCompletos, setVariantesConPreciosCompletos] = useState<Map<number, ProductoVariante>>(new Map());
  
  const [metodoPago, setMetodoPago] = useState('');
  
  const [cargandoProductosIniciales, setCargandoProductosIniciales] = useState(true);
  const [cargandoBusquedaAccion, setCargandoBusquedaAccion] = useState(false);
  const [cargandoProcesoVenta, setCargandoProcesoVenta] = useState(false);
  const [, setCargandoAgregarProducto] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);
  const [mensajeInfoVista, setMensajeInfoVista] = useState<string | null>(null);
  
  const [mostrarModalQR, setMostrarModalQR] = useState(false);
  const [qrDataModal, setQrDataModal] = useState({ url: '', tipo: '' });
  const [mostrarModalBoleta, setMostrarModalBoleta] = useState(false);
  const [datosVentaParaBoleta, setDatosVentaParaBoleta] = useState<DatosVentaBoleta | null>(null);
  
  // --- PaginaciÃ³n de productos ---
  const [paginaActual, setPaginaActual] = useState(1);
  const productosPorPagina = 9;

  // Load all variants on mount
  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }

    const cargarTodasLasVariantes = async () => {
      try {
        setCargandoProductosIniciales(true);
        setErrorGlobal(null);
        setMensajeInfoVista("Cargando variantes de productos...");
        const data = await getAllVariantes();
        setVariantesCargadas(data);
        if (data.length === 0) {
          setMensajeInfoVista("No hay variantes de productos disponibles o el servicio no estÃ¡ conectado.");
        } else {
          setMensajeInfoVista(null);
        }
      } catch (err: unknown) {
        console.error('Error en cargarTodasLasVariantes:', err);
        setErrorGlobal(getErrorMessage(err, 'No se pudieron cargar las variantes de productos.'));
        setMensajeInfoVista(null);
      } finally {
        setCargandoProductosIniciales(false);
      }
    };
    cargarTodasLasVariantes();
  }, [isReady, isAuthenticated, getAllVariantes]);

  // Debounce search input
  useEffect(() => {
    // Debounce: wait 150ms after last keystroke before filtering
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setBusquedaDebounce(busqueda);
    }, 150);
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, [busqueda]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, []);

  // Memoized filter computation (replaces useEffect-based filtering)
  const variantesFiltradas = useMemo(() => {
    if (!cargandoProductosIniciales && !cargandoBusquedaAccion && busquedaDebounce.trim() !== '') {
      const terminoLower = busquedaDebounce.toLowerCase();
      if (tipoBusqueda === 'nombre') {
        return variantesCargadas.filter(v =>
          v.producto.nombre.toLowerCase().includes(terminoLower)
        );
      } else {
        return variantesCargadas.filter(v =>
          (v.codigoBarrasVariante && v.codigoBarrasVariante.toLowerCase().includes(terminoLower)) ||
          (v.producto.codigoIdentificacion && v.producto.codigoIdentificacion.toLowerCase().includes(terminoLower))
        );
      }
    }
    return variantesCargadas;
  }, [busquedaDebounce, tipoBusqueda, variantesCargadas, cargandoProductosIniciales, cargandoBusquedaAccion]);

  // Pagination (must come after variantesFiltradas)
  const totalPaginas = useMemo(() => Math.ceil(variantesFiltradas.length / productosPorPagina), [variantesFiltradas.length]);
  const variantesPaginadas = useMemo(() => {
    const inicio = (paginaActual - 1) * productosPorPagina;
    return variantesFiltradas.slice(inicio, inicio + productosPorPagina);
  }, [variantesFiltradas, paginaActual]);
  useEffect(() => {
    setPaginaActual(1);
  }, [variantesFiltradas]);

  // Show/hide "no results" message based on filtered results
  useEffect(() => {
    if (cargandoProductosIniciales || cargandoBusquedaAccion) return;
    if (busquedaDebounce.trim() === '') {
      setMensajeInfoVista(null);
    } else if (variantesFiltradas.length === 0) {
      const tipoBusquedaTexto = tipoBusqueda === 'nombre' ? 'nombre' : 'cÃ³digo';
      setMensajeInfoVista(`No hay coincidencias locales para "${busquedaDebounce}" en ${tipoBusquedaTexto}. Prueba "Buscar DB".`);
    } else {
      setMensajeInfoVista(null);
    }
  }, [variantesFiltradas.length, busquedaDebounce, tipoBusqueda, cargandoProductosIniciales, cargandoBusquedaAccion]);

  // Efecto para recalcular precios del carrito cuando cambia el estado de mayorista
  useEffect(() => {
    if (productosSeleccionadosVenta.length > 0) {
      console.log('ðŸ”„ Recalculando precios del carrito - Cliente mayorista:', esMayorista);
      
      setProductosSeleccionadosVenta(prev => prev.map(item => {
        // Obtener la variante con precios completos
        const varianteCompleta = variantesConPreciosCompletos.get(item.idProductoVariante);
        
        if (varianteCompleta) {
          // Calcular nuevo precio segÃºn el estado de mayorista
          const { precio: nuevoPrecio } = calcularPrecioSegunCantidad(varianteCompleta, item.cantidad);
          
          return {
            ...item,
            precio: nuevoPrecio,
            total: item.cantidad * nuevoPrecio
          };
        }
        
        return item;
      }));
    }
  }, [esMayorista]); // Se ejecuta cuando cambia el estado de mayorista

  // --------------------------------------------------------------------------------------------
  // C. MANEJADORES DE LÃ“GICA DE PRODUCTOS Y VENTA
  // --------------------------------------------------------------------------------------------
  
  // FunciÃ³n para calcular el precio segÃºn la cantidad
  const calcularPrecioSegunCantidad = (
    variante: ProductoVariante | undefined,
    cantidad: number
  ): PrecioCalculado => {
    if (!variante?.producto) {
      return { precio: 0, precioOriginal: 0, tipoDescuento: null };
    }
    
    // Los precios estÃ¡n en la entidad Producto, no en ProductoVariante
    const producto = variante.producto;
    const precioUnitario = producto.precioUnitario ?? 0;
    const precioCuarto = producto.precioCuarto;
    const precioMediaDocena = producto.precioMediaDocena;
    const precioDocena = producto.precioDocena;
    
    // â­ LÃ“GICA ESPECIAL PARA MAYORISTAS
    // Si el cliente es mayorista, siempre usar precio de docena si existe
    if (esMayorista && precioDocena != null && precioDocena > 0) {
      return {
        precio: precioDocena,
        precioOriginal: precioUnitario,
        tipoDescuento: 'mayorista'
      };
    }
    
    // LÃ“GICA NORMAL PARA CLIENTES REGULARES
    // Si es 12 o mÃ¡s unidades y existe precio por docena
    if (cantidad >= 12 && precioDocena != null && precioDocena > 0) {
      return {
        precio: precioDocena,
        precioOriginal: precioUnitario,
        tipoDescuento: 'docena'
      };
    }
    
    // Si es 6 o mÃ¡s unidades y existe precio por media docena
    if (cantidad >= 6 && precioMediaDocena != null && precioMediaDocena > 0) {
      return {
        precio: precioMediaDocena,
        precioOriginal: precioUnitario,
        tipoDescuento: 'mediaDocena'
      };
    }
    
    // Si es 3 o mÃ¡s unidades y existe precio por cuarto
    if (cantidad >= 3 && precioCuarto != null && precioCuarto > 0) {
      return {
        precio: precioCuarto,
        precioOriginal: precioUnitario,
        tipoDescuento: 'cuarto'
      };
    }
    
    // Precio unitario para cantidades menores o cuando no hay otros precios
    return {
      precio: precioUnitario,
      precioOriginal: precioUnitario,
      tipoDescuento: null
    };
  };
  
  // FunciÃ³n para obtener el texto del tipo de descuento
  const obtenerTextoDescuento = (tipoDescuento: string | null, cantidad: number) => {
    switch (tipoDescuento) {
      case 'mayorista':
        return `Precio mayorista (${cantidad} unid.)`;
      case 'docena':
        return `Precio por docena (${cantidad} unid.)`;
      case 'mediaDocena':
        return `Precio por media docena (${cantidad} unid.)`;
      case 'cuarto':
        return `Precio por cuarto (${cantidad} unid.)`;
      default:
        return `Precio unitario`;
    }
  };
  const handleBuscarEnServicio = async () => {
    const terminoBusqueda = busqueda.trim();
    if (terminoBusqueda === '') {
      setMensajeInfoVista(null);
      return;
    }
    try {
      setCargandoBusquedaAccion(true);
      setErrorGlobal(null);
      setMensajeInfoVista(`Buscando "${terminoBusqueda}" en DB...`);

      const terminoLower = terminoBusqueda.toLowerCase();

      // Filtrar variantes que coincidan exactamente con el tÃ©rmino de bÃºsqueda
      const variantesExactas = variantesCargadas.filter(
        v =>
          v.codigoBarrasVariante === terminoBusqueda ||
          v.producto.codigoIdentificacion === terminoBusqueda ||
          v.producto.nombre.toLowerCase() === terminoLower ||
          v.color.nombre.toLowerCase() === terminoLower ||
          v.talla.nombreTalla.toLowerCase() === terminoLower ||
          (v.producto.tipoPublico && v.producto.tipoPublico.toLowerCase() === terminoLower)
      );

      if (variantesExactas.length > 0) {
        setMensajeInfoVista(null);
      } else {
        // Si no hay coincidencias exactas, mostrar todas las coincidencias parciales
        const variantesParciales = variantesCargadas.filter(
          v =>
            (v.codigoBarrasVariante && v.codigoBarrasVariante.includes(terminoBusqueda)) ||
            v.producto.codigoIdentificacion.includes(terminoBusqueda) ||
            v.producto.nombre.toLowerCase().includes(terminoLower) ||
            v.color.nombre.toLowerCase().includes(terminoLower) ||
            v.talla.nombreTalla.toLowerCase().includes(terminoLower) ||
            (v.producto.tipoPublico && v.producto.tipoPublico.toLowerCase().includes(terminoLower))
        );

        if (variantesParciales.length === 0) {
          setMensajeInfoVista(`No se encontraron variantes para "${terminoBusqueda}" en la base de datos.`);
        } else {
          setMensajeInfoVista(null);
        }
      }
    } catch (err: unknown) {
      console.error('Error en handleBuscarEnServicio:', err);
      setErrorGlobal(getErrorMessage(err, 'Error al buscar en la base de datos.'));
      setMensajeInfoVista(null);
    } finally {
      setCargandoBusquedaAccion(false);
    }
  };
    const handleBuscarPorCodigoExacto = async (codigoScaneado: string) => {
    if (!codigoScaneado.trim()) return;
    try {
      setCargandoBusquedaAccion(true);
      setErrorGlobal(null);
      setMensajeInfoVista(`Procesando cÃ³digo "${codigoScaneado}"...`);
      
      // Buscar la variante que coincida exactamente con el cÃ³digo de barras
      const codigoLimpio = codigoScaneado.trim();
      
      // Buscar por cÃ³digo de barras de variante o por cÃ³digo de identificaciÃ³n de producto
      const varianteEncontrada = variantesCargadas.find(v => 
        v.codigoBarrasVariante === codigoLimpio || 
        (v.producto && v.producto.codigoIdentificacion === codigoLimpio)
      );
      
      if (varianteEncontrada) {
        await agregarVarianteAVenta(varianteEncontrada);
        setBusqueda(''); 
        
        const nombreProducto = varianteEncontrada.producto?.nombre || 'Producto';
        const nombreColor = varianteEncontrada.color?.nombre || 'Sin color';
        const nombreTalla = varianteEncontrada.talla?.nombreTalla || 'Talla Ãºnica';
        
        setMensajeInfoVista(`${nombreProducto} - ${nombreColor} - ${nombreTalla} agregado.`);
        setTimeout(() => setMensajeInfoVista(null), 2000);
      } else {
        setErrorGlobal(`No se encontrÃ³ variante con cÃ³digo "${codigoScaneado}".`);
        setMensajeInfoVista(null);
      }
    } catch (err: unknown) {
      console.error('Error en handleBuscarPorCodigoExacto:', err);
      setErrorGlobal(
        getErrorMessage(err, `Error al procesar cÃ³digo "${codigoScaneado}".`)
      );
      setMensajeInfoVista(null);
    } finally {
      setCargandoBusquedaAccion(false);
    }  };
  
  // FunciÃ³n para verificar si un cliente es mayorista
  const verificarEsMayorista = async (numeroDocumento: string) => {
    setVerificandoMayorista(true);
    try {
      console.log('ðŸ” Verificando si el cliente es mayorista:', numeroDocumento);
      console.log('ðŸ‘¤ Rol del usuario actual:', usuario?.roles?.[0]?.nombreRol);
      
      const userRole = usuario?.roles?.[0]?.nombreRol;
      const resultado = await MayoristaService.esMayorista(numeroDocumento, userRole);
      setEsMayorista(resultado);
      
      if (resultado) {
        console.log('ðŸ‘‘ Cliente es MAYORISTA - Aplicando precios de docena');
        setMensajeInfoVista('âœ¨ Cliente mayorista detectado - Precios especiales aplicados');
        setTimeout(() => setMensajeInfoVista(null), 4000);
      } else {
        console.log('ðŸ‘¤ Cliente regular - Precios normales');
      }
    } catch (error) {
      console.warn('Error al verificar mayorista:', error);
      setEsMayorista(false);
    } finally {
      setVerificandoMayorista(false);
    }
  };
  
  const handleBuscarCliente = async () => {
    if (!documentoCliente.trim()) {
      setErrorGlobal("Ingrese un nÃºmero de documento para buscar al cliente.");
      return;
    }

    const numeroDocumento = documentoCliente.trim();
    
    // Validaciones segÃºn el tipo de documento
    if (tipoDocumento === 'DNI') {
      if (numeroDocumento.length !== 8) {
        setErrorGlobal("El DNI debe tener exactamente 8 dÃ­gitos.");
        return;
      }
      if (!/^\d+$/.test(numeroDocumento)) {
        setErrorGlobal("El DNI debe contener solo nÃºmeros.");
        return;
      }
    } else if (tipoDocumento === 'RUC') {
      if (numeroDocumento.length !== 11) {
        setErrorGlobal("El RUC debe tener exactamente 11 dÃ­gitos.");
        return;
      }
      if (!/^\d+$/.test(numeroDocumento)) {
        setErrorGlobal("El RUC debe contener solo nÃºmeros.");
        return;
      }
    }
    
    try {
      setCargandoBusquedaAccion(true);
      setErrorGlobal(null);
      
      let clienteEncontrado = null;
      
      if (tipoDocumento === 'DNI') {
        clienteEncontrado = await ClienteService.obtenerClientePorDNI(numeroDocumento);
      } else if (tipoDocumento === 'RUC') {
        clienteEncontrado = await ClienteService.obtenerClientePorRUC(numeroDocumento);
      }
      
      if (clienteEncontrado) {
        setClienteSeleccionado(clienteEncontrado);
        setCliente(clienteEncontrado.nombreCliente);
        setMensajeInfoVista(`Cliente encontrado: ${clienteEncontrado.nombreCliente}`);
        
        // Verificar si el cliente es mayorista
        await verificarEsMayorista(clienteEncontrado.numeroDocumento);
        
        setTimeout(() => setMensajeInfoVista(null), 3000);
      } else {
        setErrorGlobal("Cliente no encontrado. Â¿Desea registrarlo?");
        setClienteSeleccionado(null);
      }
    } catch (err: unknown) {
      console.error('Error al buscar cliente:', err);
      setErrorGlobal(getErrorMessage(err, "Error al buscar el cliente."));
      setClienteSeleccionado(null);
    } finally {
      setCargandoBusquedaAccion(false);
    }
  };

  const agregarVarianteAVenta = async (variante: ProductoVariante) => {
    setErrorGlobal(null);
    setCargandoAgregarProducto(true);
    
    try {
      // Verificar que hay un cliente vÃ¡lido (buscado o manual) antes de agregar productos
      if (!clienteValidoParaVenta) {
        setErrorGlobal('âš ï¸ Debe seleccionar o ingresar un cliente vÃ¡lido antes de agregar productos al carrito.');
        return;
      }

      // Asegurarnos que la variante tiene cantidad y no estÃ¡ agotada
      const cantidad = variante.cantidad || 0;
      if (cantidad <= 0) {
        const nombreProducto = variante.producto?.nombre || 'Sin nombre';
        setErrorGlobal(`La variante ${nombreProducto} estÃ¡ agotada.`);
        return;
      }

      // Asegurarse de que tenemos un ID de variante vÃ¡lido
      const idVariante = variante.idProductoVariante ?? variante.idVariante;
      if (!idVariante) {
        setErrorGlobal('Esta variante no tiene un identificador vÃ¡lido y no puede ser agregada a la venta.');
        return;
      }

      // Obtener el producto completo por su ID para tener acceso a todos los precios de volumen
      let productoCompleto = variante.producto;
      let varianteConPreciosCompletos = variante;
      
      try {
        if (variante.producto?.idProducto) {
          const userRole = usuario?.roles?.[0]?.nombreRol;
          productoCompleto = await ProductoService.getProductoById(variante.producto.idProducto, userRole);
          
          // Crear una nueva variante con los precios completos del producto
          varianteConPreciosCompletos = {
            ...variante,
            producto: productoCompleto
          };
          
          // Guardar la variante con precios completos en el estado
          setVariantesConPreciosCompletos(prev => new Map(prev.set(idVariante, varianteConPreciosCompletos)));
          
          console.log('âœ… Producto completo obtenido con precios de volumen:', {
            producto: productoCompleto.nombre,
            precioUnitario: productoCompleto.precioUnitario,
            precioCuarto: productoCompleto.precioCuarto,
            precioMediaDocena: productoCompleto.precioMediaDocena,
            precioDocena: productoCompleto.precioDocena
          });
        }
      } catch (error) {
        console.warn('No se pudo obtener el producto completo, usando datos existentes:', error);
        // Continuamos con los datos que ya tenemos
      }
      
      // Verificar nuevamente si ya existe en el carrito (por si cambiÃ³ durante la carga del producto)
      setProductosSeleccionadosVenta(prev => {
        const varianteExistente = prev.find(item => item.idProductoVariante === idVariante);
        
        if (varianteExistente) {
          if (varianteExistente.cantidad >= cantidad) {
            setErrorGlobal(`No hay mÃ¡s stock de ${varianteConPreciosCompletos.producto?.nombre || 'Producto'} - ${varianteConPreciosCompletos.color?.nombre || 'Sin color'} - ${varianteConPreciosCompletos.talla?.nombreTalla || 'Talla Ãºnica'}. Stock: ${cantidad}. En carrito: ${varianteExistente.cantidad}.`);
            return prev; // No cambiar el estado
          }
          
          // Calcular nuevo precio segÃºn la nueva cantidad
          const nuevaCantidad = varianteExistente.cantidad + 1;
          const { precio: nuevoPrecio } = calcularPrecioSegunCantidad(varianteConPreciosCompletos, nuevaCantidad);
          
          return prev.map(item => 
            item.idProductoVariante === idVariante 
              ? { 
                  ...item, 
                  cantidad: nuevaCantidad, 
                  precio: nuevoPrecio,
                  total: nuevaCantidad * nuevoPrecio 
                } 
              : item
          );
        } else {
          // Calcular precio para 1 unidad
          const { precio } = calcularPrecioSegunCantidad(varianteConPreciosCompletos, 1);
          
          return [...prev, {
            idProductoVariante: idVariante,
            idProducto: varianteConPreciosCompletos.producto?.idProducto ?? 0,
            codigo: varianteConPreciosCompletos.codigoBarrasVariante ?? varianteConPreciosCompletos.producto?.codigoBarras ?? varianteConPreciosCompletos.producto?.codigoIdentificacion ?? 'Sin cÃ³digo',
            descripcion: varianteConPreciosCompletos.producto?.nombre ?? 'Producto sin nombre',
            talla: varianteConPreciosCompletos.talla?.nombreTalla ?? 'Ãšnica',
            color: varianteConPreciosCompletos.color?.nombre ?? 'Sin color',
            tipoPublico: varianteConPreciosCompletos.producto?.tipoPublico ?? 'No especificado',
            cantidad: 1,
            precio: precio,
            total: precio
          }];
        }
      });
    } finally {
      setCargandoAgregarProducto(false);
    }
  };

  const handleSeleccionarVarianteDeLista = async (variante: ProductoVariante) => {
    // Usar el precio unitario del producto asociado a la variante
    await agregarVarianteAVenta(variante);
  };

  const handleEliminarProductoDeVenta = (idProductoVariante: number) => {
    setProductosSeleccionadosVenta(prev => prev.filter(item => item.idProductoVariante !== idProductoVariante));
    // TambiÃ©n limpiar la variante con precios completos
    setVariantesConPreciosCompletos(prev => {
      const nuevaMap = new Map(prev);
      nuevaMap.delete(idProductoVariante);
      return nuevaMap;
    });
  };

  const handleActualizarCantidadEnVenta = async (idProductoVariante: number, nuevaCantidad: number) => {
    const varianteOriginal = variantesCargadas.find(v => v.idProductoVariante === idProductoVariante);
      
    if (!varianteOriginal) {
      setErrorGlobal("Error crÃ­tico: Variante no encontrada para actualizar stock.");
      return;
    }
    
    if (nuevaCantidad <= 0) {
      handleEliminarProductoDeVenta(idProductoVariante);
      return;
    }
    
    if (nuevaCantidad > varianteOriginal.cantidad) {
      setErrorGlobal(`Stock mÃ¡ximo para ${varianteOriginal.producto.nombre} - ${varianteOriginal.color.nombre} - ${varianteOriginal.talla.nombreTalla} es ${varianteOriginal.cantidad}.`);
      return; 
    }
    
    setErrorGlobal(null);
    
    // Obtener el producto completo para tener acceso a todos los precios de volumen
    let varianteConPreciosCompletos = varianteOriginal;
    
    try {
      if (varianteOriginal.producto?.idProducto) {
        const userRole = usuario?.roles?.[0]?.nombreRol;
        const productoCompleto = await ProductoService.getProductoById(varianteOriginal.producto.idProducto, userRole);
        
        // Crear una nueva variante con los precios completos del producto
        varianteConPreciosCompletos = {
          ...varianteOriginal,
          producto: productoCompleto
        };
        
        // Guardar la variante con precios completos en el estado
        setVariantesConPreciosCompletos(prev => new Map(prev.set(idProductoVariante, varianteConPreciosCompletos)));
      }
    } catch (error) {
      console.warn('No se pudo obtener el producto completo para actualizar cantidad, usando datos existentes:', error);
      // Continuamos con los datos que ya tenemos
    }
    
    // Calcular nuevo precio segÃºn la nueva cantidad
    const { precio: nuevoPrecio } = calcularPrecioSegunCantidad(varianteConPreciosCompletos, nuevaCantidad);
    
    setProductosSeleccionadosVenta(prev => prev.map(item => 
      item.idProductoVariante === idProductoVariante 
        ? { 
            ...item, 
            cantidad: nuevaCantidad, 
            precio: nuevoPrecio,
            total: nuevaCantidad * nuevoPrecio 
          } 
        : item
    ));
  };

  const totalConIgvIncluido = productosSeleccionadosVenta.reduce((acc, item) => {
    // Para el cÃ¡lculo del total, usamos el precio ya calculado y guardado en el item
    // que ya incluye los descuentos por volumen aplicados cuando se agregÃ³ al carrito
    return acc + item.total;
  }, 0);
  // Los precios ya incluyen IGV, por lo que extraemos el IGV del total
  const subtotalVenta = totalConIgvIncluido / 1.18; // Monto sin IGV
  const igvVenta = totalConIgvIncluido - subtotalVenta; // IGV extraÃ­do (18% del subtotal)
  const totalGeneralVenta = totalConIgvIncluido; // Total original (ya incluye IGV)

  // --------------------------------------------------------------------------------------------
  // D. MANEJADORES DE LÃ“GICA DE PAGO Y FINALIZACIÃ“N
  // --------------------------------------------------------------------------------------------
  const handleProcesarVentaFinal = async () => {
    setErrorGlobal(null);
    
    if (!cliente.trim()) { 
      setErrorGlobal('Ingrese el nombre del cliente.'); 
      return; 
    }
    
    if (!metodoPago) { 
      setErrorGlobal('Seleccione un mÃ©todo de pago.'); 
      return; 
    }
    
    if (productosSeleccionadosVenta.length === 0) { 
      setErrorGlobal('Agregue productos a la venta.'); 
      return; 
    }

    setCargandoProcesoVenta(true);

    if (metodoPago === 'yape' || metodoPago === 'plin') {
      const qrContent = `TipoPago: ${metodoPago.toUpperCase()}\nMonto: S/${totalGeneralVenta.toFixed(2)}\nCliente: ${cliente}\nReferencia: VTA-${Date.now()}`;
      setQrDataModal({ url: qrContent, tipo: metodoPago.toUpperCase() });
      setMostrarModalQR(true);
      setCargandoProcesoVenta(false); 
    } else { 
      await ejecutarFinalizacionVenta();
    }
  };
  
  const ejecutarFinalizacionVenta = async () => {
    setMostrarModalQR(false); 
    setCargandoProcesoVenta(true); 
    setErrorGlobal(null);

    try {
      // Obtener el usuario actual desde el backend (ya no necesitamos el ID del token)
      const usuarioActual = await VentaService.obtenerUsuarioActual();
      console.log('Usuario actual obtenido:', usuarioActual);
      
      // Primero verificamos si el cliente ya estÃ¡ registrado
      let clienteId = clienteSeleccionado?.idCliente;
      
      // Si no hay cliente seleccionado pero tenemos nombre, intentamos crear uno nuevo
      if (!clienteId && cliente.trim()) {
        try {
          const numeroDocumento = documentoCliente.trim();
          let documentoValido = true;
          let valorDocumento = numeroDocumento;
          
          // ValidaciÃ³n del documento segÃºn tipo
          if (tipoDocumento === 'DNI') {
            if (numeroDocumento && (numeroDocumento.length !== 8 || !/^\d+$/.test(numeroDocumento))) {
              documentoValido = false;
              valorDocumento = '00000000'; // DNI por defecto
              console.warn('Se usarÃ¡ un DNI por defecto porque el valor ingresado no es vÃ¡lido');
            } else if (!numeroDocumento) {
              valorDocumento = '00000000'; // DNI por defecto
            }
          } else { // RUC
            if (numeroDocumento && (numeroDocumento.length !== 11 || !/^\d+$/.test(numeroDocumento))) {
              documentoValido = false;
              valorDocumento = '00000000000'; // RUC por defecto
              console.warn('Se usarÃ¡ un RUC por defecto porque el valor ingresado no es vÃ¡lido');
            } else if (!numeroDocumento) {
              valorDocumento = '00000000000'; // RUC por defecto
            }
          }
          
          // Crear cliente nuevo con datos bÃ¡sicos
          const nuevoCliente = await ClienteService.crearCliente({
            nombreCliente: cliente,
            tipoCliente: tipoDocumento === 'RUC' ? 'EMPRESA' : 'PERSONA',
            numeroDocumento: valorDocumento
          });
          
          clienteId = nuevoCliente.idCliente;
          
          if (!documentoValido) {
            console.warn('Se creÃ³ el cliente con un documento por defecto debido a formato invÃ¡lido');
          }
        } catch (err) {
          console.error('Error al crear cliente nuevo:', err);
          // Seguimos adelante con clienteId en null, el backend deberÃ¡ manejar este caso
        }
      }
      
      // Preparamos los detalles de la venta segÃºn la interfaz DetalleVentaInput actualizada
      const detallesVenta: DetalleVentaInput[] = productosSeleccionadosVenta.map(item => ({
        productoVariante: { idProductoVariante: item.idProductoVariante },
        cantidad: item.cantidad,
        precioUnitario: item.precio
      }));
      
      // Creamos el objeto de venta segÃºn la interfaz VentaInput actualizada
      // El usuario se obtiene automÃ¡ticamente del contexto de seguridad en el backend
      const ventaParaEnviar: VentaInput = {
        cliente: { idCliente: clienteId || 1 }, // Usamos el ID obtenido o uno por defecto
        metodoPago: { idMetodoPago: obtenerIdMetodoPago(metodoPago) },
        tipoComprobante: 'BOLETA', // Por defecto
        fechaVenta: new Date().toISOString(), // Formato ISO completo: YYYY-MM-DDTHH:mm:ss.sssZ
        detalles: detallesVenta
      };
      
      console.log('Enviando datos de venta final al backend:', ventaParaEnviar);
      console.log('Usuario actual que realizarÃ¡ la venta:', usuarioActual);
      
      // Registrar la venta usando el servicio
      const ventaRegistrada = await VentaService.crearVenta(ventaParaEnviar);
      console.log('Venta registrada exitosamente:', ventaRegistrada);
      
      // Actualizar el stock de las variantes usando el nuevo mÃ©todo
      console.log('ðŸ”„ Iniciando actualizaciÃ³n de stock para productos vendidos:', productosSeleccionadosVenta);
      
      for (const item of productosSeleccionadosVenta) {
        console.log(`ðŸ“¦ Procesando item: ID variante ${item.idProductoVariante}, cantidad ${item.cantidad}`);
        
        if (item.idProductoVariante) {
          try {
            console.log(`â¬‡ï¸ Disminuyendo stock de variante ${item.idProductoVariante} en ${item.cantidad} unidades`);
            const varianteActualizada = await disminuirCantidadVariante(item.idProductoVariante, item.cantidad);
            console.log(`âœ… Stock de variante actualizado:`, varianteActualizada);
          } catch (error) {
            console.error(`âŒ Error al actualizar stock de variante ${item.idProductoVariante}:`, error);
          }
        }
      }
      
      // Actualizar el stock local de las variantes
      const variantesActualizadas = variantesCargadas.map(v => {
        const vendido = productosSeleccionadosVenta.find(ps => ps.idProductoVariante === v.idProductoVariante);
        return vendido ? { ...v, cantidad: v.cantidad - vendido.cantidad } : v;
      });
      setVariantesCargadas(variantesActualizadas);
      
      // Preparamos datos para la boleta con informaciÃ³n de descuentos
      const datosBoletaVista = {
        cliente,
        metodoPago,
        usuarioVendedor: usuarioActual.usuario, // Incluimos el usuario que realizÃ³ la venta
        productos: productosSeleccionadosVenta.map(item => {
          // Obtener informaciÃ³n de descuentos para cada producto
          const varianteConPrecios = variantesConPreciosCompletos.get(item.idProductoVariante);
          const preciosInfo = varianteConPrecios ? calcularPrecioSegunCantidad(varianteConPrecios, item.cantidad) : null;
          
          return {
            idProductoVariante: item.idProductoVariante,
            idProducto: item.idProducto,
            descripcion: `${item.descripcion} - ${item.color} - ${item.talla}` + (item.tipoPublico ? ` - ${item.tipoPublico}` : ''),
            cantidad: item.cantidad,
            precioUnitarioAplicado: item.precio,
            precioOriginal: preciosInfo?.precioOriginal || item.precio,
            tipoDescuento: preciosInfo?.tipoDescuento || null,
            totalParcial: item.total,
            // Calcular ahorro correctamente: diferencia entre precio original y precio aplicado por cantidad
            ahorro: preciosInfo?.tipoDescuento && preciosInfo.precioOriginal > preciosInfo.precio ? 
              (preciosInfo.precioOriginal - preciosInfo.precio) * item.cantidad : 0
          };
        }),
        subtotal: subtotalVenta,
        igv: igvVenta,
        totalGeneral: totalGeneralVenta,
        fechaHora: new Date().toISOString()
      };
      
      setDatosVentaParaBoleta(datosBoletaVista);
      setMostrarModalBoleta(true);
      
      // Limpiamos el formulario
      resetearFormulario();
      
    } catch (err: unknown) {
      console.error('Error al ejecutar finalizaciÃ³n de venta:', err);
      setErrorGlobal(
        getErrorMessage(err, 'Error crÃ­tico al registrar la venta. Contacte a soporte.')
      );
    } finally {
      setCargandoProcesoVenta(false);
    }
  };
  
  const resetearFormulario = () => {
    setCliente('');
    setDocumentoCliente('');
    setClienteSeleccionado(null);
    setEsMayorista(false);
    setVerificandoMayorista(false);
    setBusqueda('');
    setProductosSeleccionadosVenta([]);
    setMetodoPago('');
    setVariantesConPreciosCompletos(new Map());
  };

  // FunciÃ³n para limpiar solo el cliente y carrito (mantener bÃºsqueda de productos)
  const limpiarCliente = () => {
    setCliente('');
    setDocumentoCliente('');
    setClienteSeleccionado(null);
    setEsMayorista(false);
    setVerificandoMayorista(false);
    setProductosSeleccionadosVenta([]);
    setVariantesConPreciosCompletos(new Map());
    setErrorGlobal(null);
    setMensajeInfoVista('Cliente y carrito limpiados correctamente');
    setTimeout(() => setMensajeInfoVista(null), 3000);
  };
  
  // FunciÃ³n auxiliar para obtener el ID de mÃ©todo de pago basado en el string
  const obtenerIdMetodoPago = (metodo: string): number => {
    switch (metodo) {
      case 'efectivo': return 1;
      case 'tarjeta': return 2;
      case 'yape': return 3;
      case 'plin': return 4;
      default: return 1; // Efectivo por defecto
    }
  };
  const handleImprimirBoleta = () => {
    if (!datosVentaParaBoleta) return;

    imprimirBoletaVenta(datosVentaParaBoleta);
    setMostrarModalBoleta(false);
  };

  // --------------------------------------------------------------------------------------------
  // E. DEFINICIÃ“N DE MÃ‰TODOS DE PAGO (Para la UI)
  // --------------------------------------------------------------------------------------------
  const paymentMethods = [
    { 
      id: 'efectivo', 
      name: 'Efectivo', 
      icon: (isSelected: boolean) => (
        <span className={`font-bold text-lg mr-1 ${isSelected ? "text-white" : "text-gray-600"}`}>S/</span>
      )
    },
    { 
      id: 'tarjeta', 
      name: 'Tarjeta', 
      icon: (isSelected: boolean) => (
        <CreditCard size={18} className={isSelected ? "text-white" : "text-gray-600"} />
      )
    },
    { 
      id: 'yape', 
      name: 'Yape', 
      icon: (isSelected: boolean) => (
        <Smartphone size={18} className={isSelected ? "text-white" : "text-gray-600"} />
      )
    },
    { 
      id: 'plin', 
      name: 'Plin', 
      icon: (isSelected: boolean) => (
        <Smartphone size={18} className={isSelected ? "text-white" : "text-gray-600"} />
      )
    },
  ];

  // --------------------------------------------------------------------------------------------
  // F. RENDERIZADO DEL COMPONENTE (JSX)
  // --------------------------------------------------------------------------------------------
  // Variable para habilitar selecciÃ³n de productos por bÃºsqueda o ingreso manual
const clienteValidoParaVenta = useMemo(() => {
  if (clienteSeleccionado) return true;
  const docValido =
    (tipoDocumento === 'DNI' && documentoCliente.length === 8 && /^\d+$/.test(documentoCliente)) ||
    (tipoDocumento === 'RUC' && documentoCliente.length === 11 && /^\d+$/.test(documentoCliente));
  const nombreValido = cliente.trim().length > 0;
  return docValido && nombreValido;
}, [clienteSeleccionado, documentoCliente, tipoDocumento, cliente]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Cabecera del Panel de Ventas */}
        <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 pl-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sistema de Ventas</h1>
                <p className="text-sm text-gray-600 mt-1">Gestiona las ventas y procesa pagos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NotificaciÃ³n Global de Errores */}
            {errorGlobal && (
        <NotificationToast
          title="Error"
          message={errorGlobal}
          variant="error"
          topClassName="top-4"
          onClose={() => setErrorGlobal(null)}
        />
      )}

      {mensajeInfoVista && (
        <NotificationToast
          title="Información"
          message={mensajeInfoVista}
          variant="info"
          topClassName="top-20"
          onClose={() => setMensajeInfoVista(null)}
        />
      )}

      <QrPaymentModal
        open={mostrarModalQR}
        tipo={qrDataModal.tipo}
        qrUrl={qrDataModal.url}
        total={totalGeneralVenta}
        loading={cargandoProcesoVenta}
        onCancel={() => setMostrarModalQR(false)}
        onConfirm={ejecutarFinalizacionVenta}
      />

      <VentaCompletadaModal
        open={mostrarModalBoleta}
        datos={datosVentaParaBoleta}
        onPrint={handleImprimirBoleta}
        onClose={() => setMostrarModalBoleta(false)}
      />

      {/* LAYOUT PRINCIPAL DE LA PÁGINA */}
      {/* SecciÃ³n de InformaciÃ³n del Cliente */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">InformaciÃ³n del Cliente</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label htmlFor="documentoClienteInput" className="block mb-2 text-sm font-medium text-gray-700">
                Documento del Cliente:
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                <select 
                  className="px-4 py-3 border border-gray-300 sm:border-r-0 rounded-lg sm:rounded-l-lg sm:rounded-r-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 font-medium text-gray-700 min-w-0"
                  value={tipoDocumento}
                  onChange={(e) => {
                    setTipoDocumento(e.target.value as 'DNI' | 'RUC');
                    setDocumentoCliente('');
                    setErrorGlobal(null);
                  }}
                >
                  <option value="DNI">DNI</option>
                  <option value="RUC">RUC</option>
                </select>
                <input 
                  id="documentoClienteInput" 
                  type="text" 
                  className={`flex-1 min-w-0 px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colores rounded-lg sm:rounded-l-none sm:rounded-r-none ${
                    documentoCliente && 
                    ((tipoDocumento === 'DNI' && (documentoCliente.length !== 8 || !/^\d+$/.test(documentoCliente))) || 
                     (tipoDocumento === 'RUC' && (documentoCliente.length !== 11 || !/^\d+$/.test(documentoCliente)))) 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                    : ''
                  }`}
                  value={documentoCliente} 
                  onChange={(e) => {
                    const value = e.target.value;
                    
                    if (value === '' || /^\d+$/.test(value)) {
                      setDocumentoCliente(value);
                      
                      if (value === '' || 
                          (tipoDocumento === 'DNI' && value.length === 8) || 
                          (tipoDocumento === 'RUC' && value.length === 11)) {
                        setErrorGlobal(null);
                      }
                    }
                  }}
                  placeholder={tipoDocumento === 'DNI' ? "Ingrese DNI (8 dÃ­gitos)" : "Ingrese RUC (11 dÃ­gitos)"} 
                  maxLength={tipoDocumento === 'DNI' ? 8 : 11}
                />
                <button 
                  onClick={handleBuscarCliente}
                  disabled={cargandoBusquedaAccion || 
                           !documentoCliente.trim() || 
                           (tipoDocumento === 'DNI' && documentoCliente.length !== 8) || 
                           (tipoDocumento === 'RUC' && documentoCliente.length !== 11)} 
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg sm:rounded-l-none sm:rounded-r-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colores font-medium flex items-center justify-center gap-2 min-w-0"
                >
                  {cargandoBusquedaAccion && documentoCliente ? (
                    <Loader2 className="animate-spin" size={18}/>
                  ) : (
                    <Search size={18}/>
                  )}
                  <span className="hidden sm:inline">Buscar</span>
                </button>
              </div>
              
              {documentoCliente && (
                (tipoDocumento === 'DNI' && documentoCliente.length !== 8) || 
                (tipoDocumento === 'RUC' && documentoCliente.length !== 11) ? (
                  <p className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                    <span className="font-medium">Formato incorrecto:</span> {tipoDocumento === 'DNI' 
                      ? `El DNI debe tener exactamente 8 dÃ­gitos (Actual: ${documentoCliente.length})` 
                      : `El RUC debe tener exactamente 11 dÃ­gitos (Actual: ${documentoCliente.length})`}
                  </p>
                ) : null
              )}
            </div>
            
            <div>
              <label htmlFor="clienteInput" className="block mb-2 text-sm font-medium text-gray-700">
                Nombre del Cliente:
              </label>
              <input 
                id="clienteInput" 
                type="text" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colores"
                value={cliente} 
                onChange={(e) => setCliente(e.target.value)} 
                placeholder="Ingrese el nombre del cliente..." 
              />
            </div>
          </div>
          
          {clienteSeleccionado && (
            <div className={`mt-4 p-4 rounded-lg border ${
              esMayorista 
                ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200' 
                : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded-full ${
                    esMayorista ? 'bg-purple-100' : 'bg-green-100'
                  }`}>
                    <CheckCircle className={`h-4 w-4 ${
                      esMayorista ? 'text-purple-600' : 'text-green-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${
                      esMayorista ? 'text-purple-900' : 'text-green-900'
                    }`}>
                      Cliente encontrado
                      {verificandoMayorista && (
                        <Loader2 className="inline ml-2 animate-spin h-3 w-3" />
                      )}
                    </p>
                    <p className={`text-sm ${
                      esMayorista ? 'text-purple-700' : 'text-green-700'
                    }`}>
                      {clienteSeleccionado.nombreCliente} - Tipo: {
                        clienteSeleccionado.idCliente
                          ? clienteSeleccionado.tipoCliente
                          : (tipoDocumento === 'DNI' ? 'PERSONA' : 'EMPRESA')
                      }
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {esMayorista && (
                    <div className="flex items-center gap-2 bg-purple-100 px-3 py-1 rounded-full">
                      <Users className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-semibold text-purple-700">MAYORISTA</span>
                      <span className="text-xs text-purple-600">Precios especiales</span>
                    </div>
                  )}
                  
                  {/* BotÃ³n para limpiar cliente */}
                  <button
                    onClick={limpiarCliente}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colores duration-200"
                    title="Limpiar cliente y carrito"
                  >
                    <X className="h-4 w-4" />
                    <span className="hidden sm:inline">Limpiar</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Panel de BÃºsqueda de Productos */}
          <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col relative" style={{ minHeight: 600 }}>
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Search className="h-5 w-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Buscar Productos</h2>
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col pb-20">
              {/* Selector de tipo de bÃºsqueda */}
              <div className="mb-4">
                <label htmlFor="tipoBusqueda" className="block text-sm font-medium text-gray-700 mb-3">
                  Buscar por:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTipoBusqueda('nombre')}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      tipoBusqueda === 'nombre'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    ðŸ“ Nombre del producto
                  </button>
                  <button
                    onClick={() => setTipoBusqueda('codigo')}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      tipoBusqueda === 'codigo'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    ðŸ” CÃ³digo de barras
                  </button>
                </div>
              </div>
              
              {/* Barra de bÃºsqueda mejorada */}
              <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search size={20} className="text-gray-400" />
                </div>
                <input 
                  type="text" 
                  className="w-full pl-12 pr-28 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colores text-gray-900 placeholder-gray-500"
                  placeholder={tipoBusqueda === 'nombre' ? "Buscar por nombre del producto..." : "Escanear o escribir cÃ³digo de barras..."} 
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && busqueda.trim()) {
                      const esPosibleCodigo = tipoBusqueda === 'codigo' || 
                        (/^[A-Za-z0-9-_]{6,}$/.test(busqueda.trim()) && !busqueda.trim().includes(" "));
                      
                      if (esPosibleCodigo) {
                          handleBuscarPorCodigoExacto(busqueda.trim());
                      } else {
                          handleBuscarEnServicio();
                      }
                    }
                  }} 
                />
                
                <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                  {busqueda && (
                    <button
                      className="mr-2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colores"
                      onClick={() => {
                        setBusqueda('');
                        setMensajeInfoVista(null);
                      }}
                      title="Limpiar bÃºsqueda"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <button 
                    className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colores"
                    onClick={handleBuscarEnServicio} 
                    disabled={cargandoBusquedaAccion || !busqueda.trim()}
                  >
                    {cargandoBusquedaAccion && busqueda ? (
                      <Loader2 className="animate-spin" size={16}/>
                    ) : (
                      'Buscar DB'
                    )}
                  </button>
                </div>
              </div>
              
              {/* Mensaje de advertencia cuando no hay cliente seleccionado */}
              {!clienteValidoParaVenta && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-full">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-amber-900">Cliente requerido</h3>
                      <p className="text-sm text-amber-700">
                        Debe seleccionar un cliente antes de agregar productos al carrito.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Lista de productos con diseÃ±o mejorado */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 min-h-[400px] max-h-[520px] overflow-y-auto">
                {cargandoProductosIniciales ? (
                  <div className="flex flex-col justify-center items-center h-64 text-gray-500">
                    <Loader2 className="animate-spin text-blue-600 mb-4" size={32}/>
                    <p className="font-medium">Cargando productos...</p>
                    <p className="text-sm text-gray-400">Por favor espere</p>
                  </div>
                ) : cargandoBusquedaAccion ? (
                   <div className="flex flex-col justify-center items-center h-64 text-gray-500">
                    <Loader2 className="animate-spin text-blue-600 mb-4" size={32}/>
                    <p className="font-medium">{mensajeInfoVista || "Buscando..."}</p>
                  </div>
                ) : variantesFiltradas.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {variantesPaginadas.map(v => (
                      <div
                        key={v.idProductoVariante} 
                        className={`bg-white border border-gray-200 rounded-lg p-4 transition-all ${
                          clienteValidoParaVenta
                            ? 'cursor-pointer hover:shadow-lg hover:border-blue-300 group transform hover:scale-105' 
                            : 'cursor-not-allowed opacity-60 bg-gray-50'
                        }`}
                        onClick={() => {
                          if (clienteValidoParaVenta) {
                            handleSeleccionarVarianteDeLista(v);
                          }
                        }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className={`font-semibold text-sm mb-1 transition-colores line-clamp-2 ${
                              clienteValidoParaVenta 
                                ? 'text-gray-900 group-hover:text-blue-600' 
                                : 'text-gray-500'
                            }`} title={v.producto?.nombre ?? 'Producto sin nombre'}>
                              {v.producto?.nombre ?? 'Producto sin nombre'}
                            </h3>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className={`px-2 py-1 rounded-full ${
                                clienteValidoParaVenta 
                                  ? 'bg-gray-100 text-gray-700' 
                                  : 'bg-gray-200 text-gray-500'
                              }`}>
                                {v.color?.nombre ?? 'Sin color'}
                              </span>
                              <span className={`px-2 py-1 rounded-full ${
                                clienteValidoParaVenta 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-gray-200 text-gray-500'
                              }`}>
                                Talla {v.talla?.nombreTalla ?? 'Ãšnica'}
                              </span>
                              <span className={`px-2 py-1 rounded-full ${
                                clienteValidoParaVenta 
                                  ? 'bg-purple-100 text-purple-700' 
                                  : 'bg-gray-200 text-gray-500'
                              }`}>
                                {v.producto?.tipoPublico ?? 'General'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <p className={`text-xs font-mono ${
                            clienteValidoParaVenta ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            {v.codigoBarrasVariante ?? v.producto?.codigoIdentificacion ?? 'Sin cÃ³digo'}
                          </p>
                          
                          <div className="flex justify-between items-center">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              !clienteValidoParaVenta 
                                ? 'bg-gray-200 text-gray-500'
                                : v.cantidad > 5 
                                  ? 'bg-green-100 text-green-700' 
                                  : v.cantidad > 0 
                                    ? 'bg-yellow-100 text-yellow-700' 
                                    : 'bg-red-100 text-red-700'
                            }`}>
                              Stock: {v.cantidad ?? 0}
                            </span>
                            
                            <span className={`text-sm font-bold ${
                              clienteValidoParaVenta ? 'text-blue-600' : 'text-gray-400'
                            }`}>
                              S/{(v.producto?.precioUnitario ?? 0).toFixed(2)}

                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className={`flex items-center justify-center text-xs font-medium ${
                            clienteValidoParaVenta 
                              ? 'text-blue-600 group-hover:text-blue-700' 
                              : 'text-gray-400'
                          }`}>
                            <span className="mr-1 font-bold">S/</span>
                            {clienteValidoParaVenta ? 'Agregar al carrito' : 'Selecciona un cliente primero'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col justify-center items-center h-64 text-center">
                    <div className="bg-gray-100 rounded-full p-4 mb-4">
                      <Search className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">No se encontraron productos</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {mensajeInfoVista || "No hay productos que coincidan con tu bÃºsqueda"}
                    </p>
                    <button
                      onClick={() => {
                        setBusqueda('');
                        setMensajeInfoVista(null);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Limpiar filtros
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* PAGINACIÃ“N DE PRODUCTOS - Responsiva */}
            {totalPaginas > 1 && (
              <div className="absolute left-0 right-0 bottom-0 bg-white border-t border-gray-200 rounded-b-xl shadow-sm z-10">
                {/* VersiÃ³n mÃ³vil y tablet hasta 1279px */}
                <div className="block xl:hidden px-3 py-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                      disabled={paginaActual === 1}
                      className={`flex items-center px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md ${
                        paginaActual === 1 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      â† Anterior
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      <span className="text-sm text-gray-700 font-medium">
                        {paginaActual} de {totalPaginas}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                      disabled={paginaActual === totalPaginas}
                      className={`flex items-center px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md ${
                        paginaActual === totalPaginas 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Siguiente â†’
                    </button>
                  </div>
                </div>

                {/* VersiÃ³n desktop para 1280px y arriba */}
                <div className="hidden xl:flex items-center justify-between px-4 py-3" style={{ minHeight: 64 }}>
                  <div className="flex-1" />
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                      disabled={paginaActual === 1}
                      className={`px-3 py-1 border border-gray-300 bg-gray-100 text-gray-700 rounded-md hover:bg-blue-100 transition-colores font-medium ${paginaActual === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Anterior
                    </button>
                    {(() => {
                      let pages: (number | string)[] = [];
                      if (totalPaginas <= 5) {
                        // Mostrar todas las pÃ¡ginas si son 5 o menos
                        pages = Array.from({ length: totalPaginas }, (_, i) => i + 1);
                      } else {
                        // Siempre mostrar la primera pÃ¡gina
                        pages.push(1);
                        // Determinar el rango central
                        let rangeStart = Math.max(2, paginaActual - 2);
                        let rangeEnd = Math.min(totalPaginas - 1, paginaActual + 2);
                        // Ajustar si estamos cerca de los extremos
                        if (paginaActual <= 3) {
                          rangeStart = 2;
                          rangeEnd = 5;
                        } else if (paginaActual >= totalPaginas - 2) {
                          rangeStart = totalPaginas - 4;
                          rangeEnd = totalPaginas - 1;
                        }
                        // Puntos suspensivos si hay salto entre 1 y el rango
                        if (rangeStart > 2) pages.push('...');
                        // PÃ¡ginas centrales
                        for (let i = rangeStart; i <= rangeEnd; i++) {
                          pages.push(i);
                        }
                        // Puntos suspensivos si hay salto entre el rango y la Ãºltima
                        if (rangeEnd < totalPaginas - 1) pages.push('...');
                        // Siempre mostrar la Ãºltima pÃ¡gina
                        pages.push(totalPaginas);
                      }
                      return pages.map((num, idx) =>
                        typeof num === 'number' ? (
                          <button
                            key={num}
                            onClick={() => setPaginaActual(num)}
                            className={`px-3 py-1 border font-medium rounded-md transition-colores ${
                              paginaActual === num
                                ? 'bg-blue-600 text-white border-blue-600 shadow font-bold'
                                : 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-blue-100'
                            }`}
                          >
                            {num}
                          </button>
                        ) : (
                          <span key={`ellipsis-${num}-${idx}`} className="px-2 text-gray-400 select-none">...</span>
                        )
                      );
                    })()}
                    <button
                      onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                      disabled={paginaActual === totalPaginas}
                      className={`px-3 py-1 border border-gray-300 bg-gray-100 text-gray-700 rounded-md hover:bg-blue-100 transition-colores font-medium ${paginaActual === totalPaginas ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Siguiente
                    </button>
                  </div>
                  <div className="flex-1" />
                </div>
              </div>
            )}
          </div>

          {/* Panel del Carrito de Ventas */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Carrito de Ventas</h2>
                    <p className="text-sm text-gray-600">
                      {productosSeleccionadosVenta.length} productos agregados
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 flex flex-col flex-grow">
                {/* Lista de productos en el carrito */}
                <div className="flex-grow overflow-auto mb-6">
                  {productosSeleccionadosVenta.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2 carrito-scroll">
                      {productosSeleccionadosVenta.map((p, index) => {
                        const varianteConPrecios = variantesConPreciosCompletos.get(p.idProductoVariante);
                        const varianteAUsar = varianteConPrecios || variantesCargadas.find(v => v.idProductoVariante === p.idProductoVariante);
                        const preciosInfo = calcularPrecioSegunCantidad(varianteAUsar, p.cantidad);
                        
                        return (
                          <div key={`${p.idProductoVariante}-${index}`} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colores">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate" title={p.descripcion}>
                                  {p.descripcion}
                                </h3>
                                <div className="flex flex-wrap gap-2 text-xs">
                                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                    {p.color}
                                  </span>
                                  <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                    Talla {p.talla}
                                  </span>
                                  {p.tipoPublico && (
                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                      {p.tipoPublico}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button 
                                onClick={() => handleEliminarProductoDeVenta(p.idProductoVariante)}
                                className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colores"
                                title="Eliminar producto"
                              >
                                <X size={16} />
                              </button>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center bg-white border border-gray-300 rounded-lg">
                                  <button 
                                    onClick={() => handleActualizarCantidadEnVenta(p.idProductoVariante, p.cantidad - 1)}
                                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-l-lg transition-colores"
                                  >
                                    -
                                  </button>
                                  <span className="px-3 py-2 font-medium text-gray-900 min-w-[3rem] text-center">
                                    {p.cantidad}
                                  </span>
                                  <button 
                                    onClick={() => handleActualizarCantidadEnVenta(p.idProductoVariante, p.cantidad + 1)}
                                    className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-r-lg transition-colores"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                {preciosInfo.tipoDescuento ? (
                                  <div>
                                    <div className="text-xs text-gray-500 line-through">
                                      S/{preciosInfo.precioOriginal.toFixed(2)} c/u
                                    </div>
                                    <div className="font-bold text-green-600">
                                      S/{preciosInfo.precio.toFixed(2)} c/u
                                    </div>
                                    <div className="text-xs text-green-600 font-medium">
                                      {obtenerTextoDescuento(preciosInfo.tipoDescuento, p.cantidad)}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="font-bold text-gray-900">
                                    S/{preciosInfo.precio.toFixed(2)} c/u
                                  </div>
                                )}
                                <div className="text-sm text-gray-600 mt-1">
                                  Total: <span className="font-semibold">S/{(preciosInfo.precio * p.cantidad).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col justify-center items-center h-48 text-center">
                      <div className="bg-gray-100 rounded-full p-4 mb-4">
                        <DollarSign className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="font-medium text-gray-900 mb-2">Carrito vacÃ­o</h3>
                      <p className="text-sm text-gray-500">
                        Agrega productos desde el panel de bÃºsqueda
                      </p>
                    </div>
                  )}
                </div>
                {/* Resumen de totales */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Resumen del Pedido</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">S/{subtotalVenta.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">IGV (18%):</span>
                        <span className="font-medium">S/{igvVenta.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-gray-300 pt-2 mt-3">
                        <div className="flex justify-between">
                          <span className="font-bold text-lg text-gray-900">Total General:</span>
                          <span className="font-bold text-lg text-blue-600">S/{totalGeneralVenta.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* MÃ©todos de pago */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">MÃ©todo de Pago</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {paymentMethods.map(method => (
                        <button key={method.id}
                          className={`flex items-center justify-center text-sm px-4 py-3 border rounded-lg transition-all duration-200 font-medium ${
                            metodoPago === method.id 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-lg transform scale-105' 
                              : 'bg-white border-gray-300 text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                          onClick={() => setMetodoPago(method.id)}
                        >
                          <div className="mr-2">
                            {method.icon(metodoPago === method.id)}
                          </div>
                          {method.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* BotÃ³n de finalizar venta */}
                  <button 
                    onClick={handleProcesarVentaFinal}
                    disabled={cargandoProcesoVenta || !metodoPago || !cliente.trim() || productosSeleccionadosVenta.length === 0}
                    className="w-full py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                  >
                    {cargandoProcesoVenta ? (
                      <>
                        <Loader2 className="animate-spin" size={24}/>
                        Procesando Venta...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={24}/>
                        Procesar y Finalizar Venta
                      </>
                    )}
                  </button>
                  
                  {/* InformaciÃ³n adicional */}
                  {(!metodoPago || !cliente.trim() || productosSeleccionadosVenta.length === 0) && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        {!cliente.trim() && "â€¢ Ingrese el nombre del cliente"}
                        {!metodoPago && !cliente.trim() && <br />}
                        {!metodoPago && "â€¢ Seleccione un mÃ©todo de pago"}
                        {productosSeleccionadosVenta.length === 0 && (!metodoPago || !cliente.trim()) && <br />}
                        {productosSeleccionadosVenta.length === 0 && "â€¢ Agregue productos al carrito"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VentasPanel;


