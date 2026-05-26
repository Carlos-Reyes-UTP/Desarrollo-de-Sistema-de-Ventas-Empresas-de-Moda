import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useAutoSync } from '../../../hooks/useAutoSync';
import { useAuthReady } from '../../../hooks/useAuthReady';
import { useAuth } from '@/context/AuthContext';
import { ClienteService } from '../../../services/ClienteService';
import { VentaService } from '../../../services/VentaService';
import { ProductoService } from '../../../services/ProductoService';
import { MayoristaService } from '../../../services/MayoristaService';
import { ProductoVarianteService } from '../../../services/ProductoVarianteService';
import type { ProductoVenta } from '../../../types/Producto';
import type { ProductoVariante } from '../../../types/ProductoVariante';
import type { Cliente } from '../../../types/Cliente';
import type { VentaInput } from '../../../types/Venta';
import type { DetalleVentaInput } from '../../../types/DetalleVenta';
import { getErrorMessage } from '../../../utils/errorUtils';
import { logger } from '../../../utils/logger';
import { imprimirBoletaVenta } from './printBoleta';
import type { DatosVentaBoleta, PrecioCalculado } from './types';
import { FACTOR_IGV } from '../../../shared/constants/impuestos';
import { METODO_PAGO_ID, METODOS_PAGO_QR } from '../../../shared/constants/metodosPago';
import {
  evaluarIdentificacionCliente,
  esDniValido,
  esRucValido,
  generarDocumentoAnonimo,
  UMBRAL_DNI_OBLIGATORIO,
} from '../../../utils/validarIdentificacionCliente';

export const useVentas = () => {
const { isReady, isAuthenticated } = useAuthReady();
  const { usuario } = useAuth();

  // --------------------------------------------------------------------------------------------
  // A. ESTADO DEL COMPONENTE
  // --------------------------------------------------------------------------------------------
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDebounce, setBusquedaDebounce] = useState('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tipoBusqueda, setTipoBusqueda] = useState<'nombre' | 'codigo'>('codigo');
  const [cliente, setCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [inputNombreDebeParpadear, setInputNombreDebeParpadear] = useState(false);
  const [inputDocumentoDebeParpadear, setInputDocumentoDebeParpadear] = useState(false);
  const [clienteCreadoManualmente, setClienteCreadoManualmente] = useState(false);
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
  const [cargandoBusquedaCliente, setCargandoBusquedaCliente] = useState(false);
  const [cargandoProcesoVenta, setCargandoProcesoVenta] = useState(false);
  const [, setCargandoAgregarProducto] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);
  const [errorBusquedaCliente, setErrorBusquedaCliente] = useState<string | null>(null);
  const [mensajeInfoVista, setMensajeInfoVista] = useState<string | null>(null);
  
  const [mostrarModalQR, setMostrarModalQR] = useState(false);
  const [qrDataModal, setQrDataModal] = useState({ url: '', tipo: '' });
  const [mostrarModalBoleta, setMostrarModalBoleta] = useState(false);
  const [datosVentaParaBoleta, setDatosVentaParaBoleta] = useState<DatosVentaBoleta | null>(null);
  
  // --- Paginación SERVER-SIDE ---
  const [paginaActual, setPaginaActual] = useState(0); // 0-indexed para el backend
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [totalElementos, setTotalElementos] = useState(0);
  const productosPorPagina = 30;

  // Función para cargar variantes desde el servidor (paginado + búsqueda)
  const cargarVariantesPaginadas = useCallback(async (page: number, searchTerm?: string) => {
    try {
      setCargandoProductosIniciales(true);
      setErrorGlobal(null);
      
      const resultado = await ProductoVarianteService.obtenerVariantesPaginadas(
        page, productosPorPagina, searchTerm
      );
      
      setVariantesCargadas(resultado.content);
      setTotalPaginas(resultado.totalPages);
      setTotalElementos(resultado.totalElements);
      setPaginaActual(resultado.pageNumber);
      
      if (resultado.content.length === 0 && searchTerm) {
        setMensajeInfoVista(`No se encontraron productos para "${searchTerm}".`);
      } else {
        setMensajeInfoVista(null);
      }
    } catch (err: any) {
      logger.error('Error al cargar variantes paginadas:', err);
      setErrorGlobal(getErrorMessage(err, 'No se pudieron cargar los productos.'));
      setMensajeInfoVista(null);
    } finally {
      setCargandoProductosIniciales(false);
    }
  }, []);

  // Carga inicial al montar el componente
  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    cargarVariantesPaginadas(0);
  }, [isReady, isAuthenticated, cargarVariantesPaginadas]);

  const refrescarStock = useCallback(() => {
    const searchTerm = busquedaDebounce.trim() || undefined;
    cargarVariantesPaginadas(paginaActual, searchTerm);
  }, [busquedaDebounce, paginaActual, cargarVariantesPaginadas]);

  useAutoSync(refrescarStock, ['NUEVA_VENTA', 'SOLICITUD_ATENDIDA'], 3000);

  // Debounce de búsqueda — 400ms para server-side
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setBusquedaDebounce(busqueda);
    }, 400);
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, [busqueda]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, []);

  // Cuando cambia el término de búsqueda debounced, buscar en el servidor
  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    cargarVariantesPaginadas(0, busquedaDebounce.trim() || undefined);
  }, [busquedaDebounce, isReady, isAuthenticated, cargarVariantesPaginadas]);

  // Ahora las variantes vienen ya paginadas del servidor
  const variantesFiltradas = variantesCargadas;
  const variantesPaginadas = variantesCargadas; // Ya vienen paginadas del server

  // Efecto para recalcular precios del carrito cuando cambia el estado de mayorista
  useEffect(() => {
    if (productosSeleccionadosVenta.length > 0) {
      logger.info('Recalculando precios del carrito - cliente mayorista:', esMayorista);
      
      setProductosSeleccionadosVenta(prev => prev.map(item => {
        const varianteCompleta = variantesConPreciosCompletos.get(item.idProductoVariante);
        
        if (varianteCompleta) {
          const { precio: nuevoPrecio } = calcularPrecioSegunCantidad(varianteCompleta, item.cantidad);
          return { ...item, precio: nuevoPrecio, total: item.cantidad * nuevoPrecio };
        }
        return item;
      }));
    }
  }, [esMayorista]); // eslint-disable-line react-hooks/exhaustive-deps

  // --------------------------------------------------------------------------------------------
  // C. MANEJADORES DE LÓGICA DE PRODUCTOS Y VENTA
  // --------------------------------------------------------------------------------------------
  
  // Función para calcular el precio según la cantidad
  const calcularPrecioSegunCantidad = (
    variante: ProductoVariante | undefined,
    cantidad: number
  ): PrecioCalculado => {
    if (!variante?.producto) {
      return { precio: 0, precioOriginal: 0, tipoDescuento: null };
    }
    
    // Los precios están en la entidad Producto, no en ProductoVariante
    const producto = variante.producto;
    const precioUnitario = producto.precioUnitario ?? 0;
    const precioCuarto = producto.precioCuarto;
    const precioMediaDocena = producto.precioMediaDocena;
    const precioDocena = producto.precioDocena;
    
    // LÓGICA ESPECIAL PARA MAYORISTAS
    // Si el cliente es mayorista, siempre usar precio de docena si existe
    if (esMayorista && precioDocena != null && precioDocena > 0) {
      return {
        precio: precioDocena,
        precioOriginal: precioUnitario,
        tipoDescuento: 'mayorista'
      };
    }
    
    // LÓGICA NORMAL PARA CLIENTES REGULARES
    // Si es 12 o más unidades y existe precio por docena
    if (cantidad >= 12 && precioDocena != null && precioDocena > 0) {
      return {
        precio: precioDocena,
        precioOriginal: precioUnitario,
        tipoDescuento: 'docena'
      };
    }
    
    // Si es 6 o más unidades y existe precio por media docena
    if (cantidad >= 6 && precioMediaDocena != null && precioMediaDocena > 0) {
      return {
        precio: precioMediaDocena,
        precioOriginal: precioUnitario,
        tipoDescuento: 'mediaDocena'
      };
    }
    
    // Si es 3 o más unidades y existe precio por cuarto
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
  
  // Función para obtener el texto del tipo de descuento
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
      cargarVariantesPaginadas(0);
      return;
    }
    
    try {
      setCargandoBusquedaAccion(true);
      setErrorGlobal(null);
      setMensajeInfoVista(`Buscando "${terminoBusqueda}" en base de datos...`);
      await cargarVariantesPaginadas(0, terminoBusqueda);
    } catch (err: any) {
      logger.error('Error en handleBuscarEnServicio:', err);
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
      setMensajeInfoVista(`Procesando código "${codigoScaneado}"...`);
      
      const codigoLimpio = codigoScaneado.trim();
      const resultado = await ProductoVarianteService.obtenerVariantesPaginadas(0, 5, codigoLimpio);
      
      const varianteEncontrada = resultado.content.find(v => 
        v.codigoBarrasVariante === codigoLimpio || 
        (v.producto && (v.producto.codigoIdentificacion === codigoLimpio || v.producto.codigoBarras === codigoLimpio))
      ) || (resultado.content.length > 0 ? resultado.content[0] : null);
      
      if (varianteEncontrada) {
        await agregarVarianteAVenta(varianteEncontrada);
        setBusqueda(''); 
        
        const nombreProducto = varianteEncontrada.producto?.nombre || 'Producto';
        const nombreColor = varianteEncontrada.color?.nombre || 'Sin color';
        const nombreTalla = varianteEncontrada.talla?.nombreTalla || 'Talla única';
        
        setMensajeInfoVista(`${nombreProducto} - ${nombreColor} - ${nombreTalla} agregado.`);
        setTimeout(() => setMensajeInfoVista(null), 2000);
      } else {
        setErrorGlobal(`No se encontró variante con código "${codigoScaneado}" en el servidor.`);
        setMensajeInfoVista(null);
      }
    } catch (err: any) {
      logger.error('Error en handleBuscarPorCodigoExacto:', err);
      setErrorGlobal(getErrorMessage(err, `Error al procesar código "${codigoScaneado}".`));
      setMensajeInfoVista(null);
    } finally {
      setCargandoBusquedaAccion(false);
    }  
  };
  
  // Función para verificar si un cliente es mayorista
  const verificarEsMayorista = async (numeroDocumento: string) => {
    setVerificandoMayorista(true);
    try {
      logger.debug('Verificando si el cliente es mayorista:', numeroDocumento);
      const userRole = usuario?.roles?.[0]?.nombreRol;
      const resultado = await MayoristaService.esMayorista(numeroDocumento, userRole);
      setEsMayorista(resultado);
      
      if (resultado) {
        logger.info('Cliente MAYORISTA detectado - Aplicando precios de docena');
        setMensajeInfoVista('Cliente mayorista detectado - Precios especiales aplicados');
        setTimeout(() => setMensajeInfoVista(null), 4000);
      }
    } catch (error) {
      logger.warn('Error al verificar mayorista:', error);
      setEsMayorista(false);
    } finally {
      setVerificandoMayorista(false);
    }
  };
  
  const handleBuscarCliente = async () => {
    if (!documentoCliente.trim()) {
      setErrorBusquedaCliente("Ingrese un número de documento para buscar al cliente.");
      return;
    }

    const numeroDocumento = documentoCliente.trim();
    
    // Validaciones según el tipo de documento
    if (tipoDocumento === 'DNI') {
      if (numeroDocumento.length !== 8) {
        setErrorBusquedaCliente("El DNI debe tener exactamente 8 dígitos.");
        return;
      }
      if (!/^\d+$/.test(numeroDocumento)) {
        setErrorBusquedaCliente("El DNI debe contener solo números.");
        return;
      }
    } else if (tipoDocumento === 'RUC') {
      if (numeroDocumento.length !== 11) {
        setErrorBusquedaCliente("El RUC debe tener exactamente 11 dígitos.");
        return;
      }
      if (!/^\d+$/.test(numeroDocumento)) {
        setErrorBusquedaCliente("El RUC debe contener solo números.");
        return;
      }
    }
    
    // Limpiar información del cliente anterior para evitar mezclar nombres
    setCliente('');
    setClienteSeleccionado(null);
    setClienteCreadoManualmente(false);
    setInputNombreDebeParpadear(false);

    try {
      setCargandoBusquedaCliente(true);
      setErrorBusquedaCliente(null);
      
      let clienteEncontrado = null;
      
      if (tipoDocumento === 'DNI') {
        clienteEncontrado = await ClienteService.obtenerClientePorDNI(numeroDocumento);
      } else if (tipoDocumento === 'RUC') {
        clienteEncontrado = await ClienteService.obtenerClientePorRUC(numeroDocumento);
      }
      
      if (clienteEncontrado) {
        setClienteSeleccionado(clienteEncontrado);
        setCliente(clienteEncontrado.nombreCliente);
        setClienteCreadoManualmente(false);
        
        // Verificar si el cliente es mayorista
        await verificarEsMayorista(clienteEncontrado.numeroDocumento);
      } else {
        setErrorBusquedaCliente("Cliente no encontrado. ¿Desea registrarlo?");
        setClienteSeleccionado(null);
        setClienteCreadoManualmente(false);
        // Indicar visualmente que debe escribir el nombre parpadeando el input
        setInputNombreDebeParpadear(true);
      }
    } catch (err: any) {
      console.error('Error al buscar cliente:', err);
      setErrorBusquedaCliente(getErrorMessage(err, "Error al buscar el cliente."));
      setClienteSeleccionado(null);
      setClienteCreadoManualmente(false);
    } finally {
      setCargandoBusquedaCliente(false);
    }
  };

  const handleRegistrarClienteRapido = async () => {
    if (!documentoCliente.trim()) {
      setErrorBusquedaCliente("Ingrese un número de documento para registrar al cliente.");
      return;
    }
    if (!cliente.trim()) {
      setErrorBusquedaCliente("Ingrese el Nombre del Cliente para poder registrarlo.");
      setInputNombreDebeParpadear(true);
      return;
    }
    
    const numeroDocumento = documentoCliente.trim();
    
    // Validaciones de documento antes de registrar
    if (tipoDocumento === 'DNI' && numeroDocumento.length !== 8) {
      setErrorBusquedaCliente("El DNI debe tener exactamente 8 dígitos.");
      return;
    }
    if (tipoDocumento === 'RUC' && numeroDocumento.length !== 11) {
      setErrorBusquedaCliente("El RUC debe tener exactamente 11 dígitos.");
      return;
    }
    
    try {
      setCargandoBusquedaCliente(true);
      setErrorBusquedaCliente(null);
      
      const nuevoCliente = await ClienteService.crearCliente({
        nombreCliente: cliente.trim().toUpperCase(),
        tipoCliente: tipoDocumento === 'RUC' ? 'EMPRESA' : 'PERSONA',
        numeroDocumento: numeroDocumento
      });
      
      if (nuevoCliente) {
        setClienteSeleccionado(nuevoCliente);
        setCliente(nuevoCliente.nombreCliente);
        setClienteCreadoManualmente(true);
        setErrorBusquedaCliente(null);
        
        // Verificar si el cliente es mayorista
        await verificarEsMayorista(nuevoCliente.numeroDocumento);
      }
    } catch (err: any) {
      console.error('Error al registrar cliente rápido:', err);
      setErrorBusquedaCliente(getErrorMessage(err, "No se pudo registrar el cliente."));
    } finally {
      setCargandoBusquedaCliente(false);
    }
  };

  const handleActualizarClienteNombre = async (nuevoNombre: string) => {
    if (!clienteSeleccionado || !clienteSeleccionado.idCliente) {
      setErrorBusquedaCliente("No hay un cliente seleccionado para editar.");
      return;
    }
    
    const nombreFormateado = nuevoNombre.trim().toUpperCase();
    if (!nombreFormateado) {
      setErrorBusquedaCliente("El nombre del cliente no puede estar vacío.");
      setInputNombreDebeParpadear(true);
      return;
    }

    try {
      setCargandoBusquedaCliente(true);
      setErrorBusquedaCliente(null);
      
      const clienteActualizado = await ClienteService.actualizarCliente(
        clienteSeleccionado.idCliente,
        {
          ...clienteSeleccionado,
          nombreCliente: nombreFormateado
        }
      );
      
      if (clienteActualizado) {
        setClienteSeleccionado(clienteActualizado);
        setCliente(clienteActualizado.nombreCliente);
        setMensajeInfoVista("Cliente actualizado exitosamente.");
        setTimeout(() => setMensajeInfoVista(null), 3000);
      }
    } catch (err: any) {
      console.error('Error al actualizar cliente:', err);
      setErrorBusquedaCliente(getErrorMessage(err, "No se pudo actualizar el cliente."));
    } finally {
      setCargandoBusquedaCliente(false);
    }
  };

  const agregarVarianteAVenta = async (variante: ProductoVariante) => {
    setErrorGlobal(null);
    setCargandoAgregarProducto(true);
    
    try {
      // Asegurarnos que la variante tiene cantidad y no está agotada
      const cantidad = variante.cantidad || 0;
      if (cantidad <= 0) {
        const nombreProducto = variante.producto?.nombre || 'Sin nombre';
        setErrorGlobal(`La variante ${nombreProducto} está agotada.`);
        return;
      }

      // Asegurarse de que tenemos un ID de variante válido
      const idVariante = variante.idProductoVariante ?? variante.idVariante;
      if (!idVariante) {
        setErrorGlobal('Esta variante no tiene un identificador válido y no puede ser agregada a la venta.');
        return;
      }

      // Obtener el producto completo por su ID para tener acceso a todos los precios de volumen
      let productoCompleto = variante.producto;
      let varianteConPreciosCompletos = variante;
      
      try {
        if (variante.producto?.idProducto) {
          const userRole = usuario?.roles?.[0]?.nombreRol;
          productoCompleto = await ProductoService.getProductoById(variante.producto.idProducto, userRole);
          
          varianteConPreciosCompletos = { ...variante, producto: productoCompleto };
          setVariantesConPreciosCompletos(prev => new Map(prev.set(idVariante, varianteConPreciosCompletos)));
          
          logger.debug('Producto completo obtenido con precios de volumen:', {
            producto: productoCompleto.nombre,
            precioUnitario: productoCompleto.precioUnitario,
            precioCuarto: productoCompleto.precioCuarto,
            precioMediaDocena: productoCompleto.precioMediaDocena,
            precioDocena: productoCompleto.precioDocena,
          });
        }
      } catch (error) {
        logger.warn('No se pudo obtener el producto completo, usando datos existentes:', error);
      }
      
      // Verificar nuevamente si ya existe en el carrito (por si cambió durante la carga del producto)
      setProductosSeleccionadosVenta(prev => {
        const varianteExistente = prev.find(item => item.idProductoVariante === idVariante);
        
        if (varianteExistente) {
          if (varianteExistente.cantidad >= cantidad) {
            setErrorGlobal(`No hay más stock de ${varianteConPreciosCompletos.producto?.nombre || 'Producto'} - ${varianteConPreciosCompletos.color?.nombre || 'Sin color'} - ${varianteConPreciosCompletos.talla?.nombreTalla || 'Talla única'}. Stock: ${cantidad}. En carrito: ${varianteExistente.cantidad}.`);
            return prev; // No cambiar el estado
          }
          
          // Calcular nuevo precio según la nueva cantidad
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
            codigo: varianteConPreciosCompletos.codigoBarrasVariante ?? varianteConPreciosCompletos.producto?.codigoBarras ?? varianteConPreciosCompletos.producto?.codigoIdentificacion ?? 'Sin código',
            descripcion: varianteConPreciosCompletos.producto?.nombre ?? 'Producto sin nombre',
            talla: varianteConPreciosCompletos.talla?.nombreTalla ?? 'Única',
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
    // También limpiar la variante con precios completos
    setVariantesConPreciosCompletos(prev => {
      const nuevaMap = new Map(prev);
      nuevaMap.delete(idProductoVariante);
      return nuevaMap;
    });
  };

  const handleActualizarCantidadEnVenta = async (idProductoVariante: number, nuevaCantidad: number) => {
    const varianteOriginal = variantesCargadas.find(v => v.idProductoVariante === idProductoVariante)
      ?? variantesConPreciosCompletos.get(idProductoVariante);

    if (nuevaCantidad <= 0) {
      handleEliminarProductoDeVenta(idProductoVariante);
      return;
    }

    if (varianteOriginal && nuevaCantidad > varianteOriginal.cantidad) {
      const nombre = varianteOriginal.producto?.nombre || 'Producto';
      const color = varianteOriginal.color?.nombre || '';
      const talla = varianteOriginal.talla?.nombreTalla || '';
      setErrorGlobal(`Stock máximo para ${nombre} - ${color} - ${talla} es ${varianteOriginal.cantidad}.`);
      return;
    }

    setErrorGlobal(null);

    let varianteParaPrecios: ProductoVariante | undefined = varianteOriginal;

    try {
      if (varianteOriginal?.producto?.idProducto) {
        const userRole = usuario?.roles?.[0]?.nombreRol;
        const productoCompleto = await ProductoService.getProductoById(varianteOriginal.producto.idProducto, userRole);
        varianteParaPrecios = { ...varianteOriginal, producto: productoCompleto };
        setVariantesConPreciosCompletos(prev => new Map(prev.set(idProductoVariante, varianteParaPrecios!)));
      }
    } catch {
      // Continuamos con los datos que ya tenemos
    }

    const { precio: nuevoPrecio } = calcularPrecioSegunCantidad(varianteParaPrecios, nuevaCantidad);
    
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

  const totalConIgvIncluido = productosSeleccionadosVenta.reduce((acc, item) => acc + item.total, 0);
  // Los precios ya incluyen IGV — extraemos el componente neto y el IGV
  const subtotalVenta = totalConIgvIncluido / FACTOR_IGV;
  const igvVenta = totalConIgvIncluido - subtotalVenta;
  const totalGeneralVenta = totalConIgvIncluido;

  const identificacionEval = useMemo(
    () =>
      evaluarIdentificacionCliente({
        totalVenta: totalGeneralVenta,
        tipoDocumento,
        documento: documentoCliente,
        nombre: cliente,
        clienteSeleccionado,
        metodoPago,
      }),
    [
      totalGeneralVenta,
      tipoDocumento,
      documentoCliente,
      cliente,
      clienteSeleccionado,
    ]
  );

  const clienteValidoParaVenta = identificacionEval.valido;
  const requiereDocumentoCliente = identificacionEval.requiereDocumento;

  const metodoPagoAnteriorRef = useRef('');
  useEffect(() => {
    if (metodoPago === 'tarjeta' && metodoPagoAnteriorRef.current !== 'tarjeta') {
      if (
        productosSeleccionadosVenta.length > 0 &&
        totalGeneralVenta >= UMBRAL_DNI_OBLIGATORIO &&
        !identificacionEval.docValido
      ) {
        setInputDocumentoDebeParpadear(true);
        setMensajeInfoVista(
          `Pago con tarjeta desde S/ ${UMBRAL_DNI_OBLIGATORIO}. Ingrese DNI o RUC del cliente.`
        );
        setTimeout(() => setMensajeInfoVista(null), 5000);
        document
          .getElementById('pos-cliente-cobro')
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    if (metodoPago !== 'tarjeta' && metodoPagoAnteriorRef.current === 'tarjeta') {
      setMensajeInfoVista(null);
      setInputDocumentoDebeParpadear(false);
    }
    metodoPagoAnteriorRef.current = metodoPago;
  }, [metodoPago, totalGeneralVenta, identificacionEval.docValido, productosSeleccionadosVenta.length]);

  const totalAnteriorRef = useRef(0);
  useEffect(() => {
    const cruzoUmbral =
      totalGeneralVenta >= UMBRAL_DNI_OBLIGATORIO &&
      totalAnteriorRef.current < UMBRAL_DNI_OBLIGATORIO;
    if (
      productosSeleccionadosVenta.length > 0 &&
      cruzoUmbral &&
      metodoPago === 'tarjeta' &&
      !identificacionEval.docValido
    ) {
      setInputDocumentoDebeParpadear(true);
      setMensajeInfoVista(
        `Pago con tarjeta y total superó S/ ${UMBRAL_DNI_OBLIGATORIO}. Ingrese DNI o RUC del cliente.`
      );
      setTimeout(() => setMensajeInfoVista(null), 5000);
      document
        .getElementById('pos-cliente-cobro')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    totalAnteriorRef.current = totalGeneralVenta;
  }, [
    totalGeneralVenta,
    identificacionEval.docValido,
    productosSeleccionadosVenta.length,
    metodoPago,
  ]);

  const resolverDocumentoBoleta = (): string | null => {
    const doc =
      clienteSeleccionado?.numeroDocumento ?? documentoCliente.trim();
    if (!doc) return null;
    if (esDniValido(doc) || esRucValido(doc)) return doc;
    return null;
  };

  // --------------------------------------------------------------------------------------------
  // D. MANEJADORES DE LÓGICA DE PAGO Y FINALIZACIÓN
  // --------------------------------------------------------------------------------------------
  const handleProcesarVentaFinal = async () => {
    setErrorGlobal(null);

    if (!metodoPago) { 
      setErrorGlobal('Seleccione un método de pago.'); 
      return; 
    }
    
    if (productosSeleccionadosVenta.length === 0) { 
      setErrorGlobal('Agregue productos a la venta.'); 
      return; 
    }

    if (!clienteValidoParaVenta) {
      setErrorGlobal(
        identificacionEval.mensaje ??
          'Complete los datos del cliente según el monto de la venta.'
      );
      if (identificacionEval.requiereDocumento && !identificacionEval.docValido) {
        setInputDocumentoDebeParpadear(true);
      } else {
        setInputNombreDebeParpadear(true);
      }
      document
        .getElementById('pos-cliente-cobro')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    setCargandoProcesoVenta(true);

    if (METODOS_PAGO_QR.includes(metodoPago)) {
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
      logger.debug('Usuario actual obtenido:', usuarioActual.usuario);
      
      if (!clienteValidoParaVenta) {
        setErrorGlobal(
          identificacionEval.mensaje ??
            'Complete los datos del cliente antes de registrar la venta.'
        );
        return;
      }

      let clienteId = clienteSeleccionado?.idCliente;

      if (!clienteId && cliente.trim()) {
        const numeroDocumento = documentoCliente.trim();
        const docValido =
          (tipoDocumento === 'DNI' && esDniValido(numeroDocumento)) ||
          (tipoDocumento === 'RUC' && esRucValido(numeroDocumento));

        const valorDocumento = docValido
          ? numeroDocumento
          : generarDocumentoAnonimo();

        const nuevoCliente = await ClienteService.crearCliente({
          nombreCliente: cliente.trim().toUpperCase(),
          tipoCliente: tipoDocumento === 'RUC' ? 'EMPRESA' : 'PERSONA',
          numeroDocumento: valorDocumento,
        });

        clienteId = nuevoCliente.idCliente;
        setClienteSeleccionado(nuevoCliente);
      }

      if (!clienteId) {
        setErrorGlobal(
          'No se pudo asociar un cliente a la venta. Verifique los datos ingresados.'
        );
        return;
      }
      
      // Preparamos los detalles de la venta según la interfaz DetalleVentaInput actualizada
      const detallesVenta: DetalleVentaInput[] = productosSeleccionadosVenta.map(item => ({
        productoVariante: { idProductoVariante: item.idProductoVariante },
        cantidad: item.cantidad,
        precioUnitario: item.precio
      }));
      
      // Creamos el objeto de venta según la interfaz VentaInput actualizada
      // El usuario se obtiene automáticamente del contexto de seguridad en el backend
      const ventaParaEnviar: VentaInput = {
        cliente: { idCliente: clienteId },
        metodoPago: { idMetodoPago: obtenerIdMetodoPago(metodoPago) },
        tipoComprobante: 'BOLETA', // Por defecto
        fechaVenta: new Date().toISOString(), // Formato ISO completo: YYYY-MM-DDTHH:mm:ss.sssZ
        detalles: detallesVenta
      };
      
      logger.debug('Enviando venta al backend:', { cliente, metodoPago, totalGeneralVenta });
      const ventaRegistrada = await VentaService.crearVenta(ventaParaEnviar);
      logger.info('Venta registrada exitosamente. ID:', ventaRegistrada);

      // Actualizar el stock local de las variantes
      const variantesActualizadas = variantesCargadas.map(v => {
        const vendido = productosSeleccionadosVenta.find(ps => ps.idProductoVariante === v.idProductoVariante);
        return vendido ? { ...v, cantidad: v.cantidad - vendido.cantidad } : v;
      });
      setVariantesCargadas(variantesActualizadas);
      
      // Preparamos datos para la boleta con información de descuentos
      const datosBoletaVista = {
        cliente: cliente.trim().toUpperCase(),
        documentoCliente: resolverDocumentoBoleta(),
        metodoPago,
        usuarioVendedor: usuarioActual.usuario, // Incluimos el usuario que realizó la venta
        productos: productosSeleccionadosVenta.map(item => {
          // Obtener información de descuentos para cada producto
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
      
    } catch (err: any) {
      logger.error('Error al ejecutar finalización de venta:', err);
      setErrorGlobal(getErrorMessage(err, 'Error crítico al registrar la venta. Contacte a soporte.'));
    } finally {
      setCargandoProcesoVenta(false);
    }
  };
  
  const resetearFormulario = () => {
    setCliente('');
    setDocumentoCliente('');
    setClienteSeleccionado(null);
    setClienteCreadoManualmente(false);
    setEsMayorista(false);
    setVerificandoMayorista(false);
    setBusqueda('');
    setProductosSeleccionadosVenta([]);
    setMetodoPago('');
    setVariantesConPreciosCompletos(new Map());
    setErrorBusquedaCliente(null);
    setCargandoBusquedaCliente(false);
    setInputNombreDebeParpadear(false);
    setInputDocumentoDebeParpadear(false);
  };

  // Función para limpiar solo el cliente y carrito (mantener búsqueda de productos)
  const limpiarCliente = () => {
    setCliente('');
    setDocumentoCliente('');
    setClienteSeleccionado(null);
    setClienteCreadoManualmente(false);
    setEsMayorista(false);
    setVerificandoMayorista(false);
    setProductosSeleccionadosVenta([]);
    setVariantesConPreciosCompletos(new Map());
    setErrorGlobal(null);
    setErrorBusquedaCliente(null);
    setCargandoBusquedaCliente(false);
    setInputNombreDebeParpadear(false);
    setInputDocumentoDebeParpadear(false);
    setMensajeInfoVista('Cliente y carrito limpiados correctamente');
    setTimeout(() => setMensajeInfoVista(null), 3000);
  };
  
  // Función auxiliar para obtener el ID de método de pago basado en el string
  const obtenerIdMetodoPago = (metodo: string): number => {
    const key = metodo.toUpperCase() as keyof typeof METODO_PAGO_ID;
    return METODO_PAGO_ID[key] ?? METODO_PAGO_ID.EFECTIVO;
  };
  const handleImprimirBoleta = () => {
    if (!datosVentaParaBoleta) return;

    imprimirBoletaVenta(datosVentaParaBoleta);
    setMostrarModalBoleta(false);
  };

  // Handler para cambiar de página (server-side)
  const handleCambiarPagina = useCallback((nuevaPagina: number) => {
    const searchTerm = busquedaDebounce.trim() || undefined;
    cargarVariantesPaginadas(nuevaPagina, searchTerm);
  }, [busquedaDebounce, cargarVariantesPaginadas]);

  return {
    // State
    busqueda, setBusqueda,
    busquedaDebounce,
    tipoBusqueda, setTipoBusqueda,
    cliente, setCliente,
    clienteSeleccionado, setClienteSeleccionado,
    esMayorista,
    verificandoMayorista,
    documentoCliente, setDocumentoCliente,
    tipoDocumento, setTipoDocumento,
    variantesCargadas,
    productosSeleccionadosVenta, setProductosSeleccionadosVenta,
    variantesConPreciosCompletos,
    metodoPago, setMetodoPago,
    cargandoProductosIniciales,
    cargandoBusquedaAccion,
    cargandoBusquedaCliente,
    cargandoProcesoVenta,
    inputNombreDebeParpadear,
    setInputNombreDebeParpadear,
    inputDocumentoDebeParpadear,
    setInputDocumentoDebeParpadear,
    clienteCreadoManualmente,
    requiereDocumentoCliente,
    identificacionMensaje: identificacionEval.mensaje,
    errorGlobal, setErrorGlobal,
    errorBusquedaCliente, setErrorBusquedaCliente,
    mensajeInfoVista, setMensajeInfoVista,
    mostrarModalQR, setMostrarModalQR,
    qrDataModal, setQrDataModal,
    mostrarModalBoleta, setMostrarModalBoleta,
    datosVentaParaBoleta,
    paginaActual,
    totalElementos,

    // Computed
    variantesFiltradas,
    totalPaginas,
    variantesPaginadas,
    subtotalVenta,
    igvVenta,
    totalGeneralVenta,
    clienteValidoParaVenta,

    // Handlers
    handleBuscarEnServicio,
    handleBuscarPorCodigoExacto,
    handleBuscarCliente,
    handleRegistrarClienteRapido,
    handleActualizarClienteNombre,
    agregarVarianteAVenta,
    handleSeleccionarVarianteDeLista,
    handleEliminarProductoDeVenta,
    handleActualizarCantidadEnVenta,
    handleProcesarVentaFinal,
    ejecutarFinalizacionVenta,
    resetearFormulario,
    limpiarCliente,
    handleImprimirBoleta,
    calcularPrecioSegunCantidad,
    obtenerTextoDescuento,
    handleCambiarPagina
  };
};

