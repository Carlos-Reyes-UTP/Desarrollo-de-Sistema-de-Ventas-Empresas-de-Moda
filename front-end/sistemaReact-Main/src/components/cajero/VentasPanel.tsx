import { useState, useEffect } from 'react';
import { Search, X, AlertCircle, Printer, CreditCard, Smartphone, DollarSign, CheckCircle, Loader2, Users } from 'lucide-react';
import { useProductoVarianteService } from '../../hooks/useProductoVarianteService';
import { useProductoService } from '../../hooks/useProductoService';
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

const VentasPanel = () => {
  const { isReady, isAuthenticated } = useAuthReady();
  const { usuario } = useAuth();
  // Get role-aware product variante service methods
  const { getAllVariantes, disminuirCantidadVariante } = useProductoVarianteService(true);
  const { disminuirCantidadProducto } = useProductoService();
  
  // --------------------------------------------------------------------------------------------
  // A. ESTADO DEL COMPONENTE
  // --------------------------------------------------------------------------------------------
  const [busqueda, setBusqueda] = useState('');
  const [tipoBusqueda, setTipoBusqueda] = useState<'nombre' | 'codigo'>('codigo');
  const [cliente, setCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [esMayorista, setEsMayorista] = useState(false);
  const [verificandoMayorista, setVerificandoMayorista] = useState(false);
  const [documentoCliente, setDocumentoCliente] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<'DNI' | 'RUC'>('DNI');
  
  const [variantesCargadas, setVariantesCargadas] = useState<ProductoVariante[]>([]);
  const [variantesFiltradas, setVariantesFiltradas] = useState<ProductoVariante[]>([]);
  const [productosSeleccionadosVenta, setProductosSeleccionadosVenta] = useState<ProductoVenta[]>([]);
  const [variantesConPreciosCompletos, setVariantesConPreciosCompletos] = useState<Map<number, ProductoVariante>>(new Map());
  
  const [metodoPago, setMetodoPago] = useState('');
  
  const [cargandoProductosIniciales, setCargandoProductosIniciales] = useState(true);
  const [cargandoBusquedaAccion, setCargandoBusquedaAccion] = useState(false);
  const [cargandoProcesoVenta, setCargandoProcesoVenta] = useState(false);
  const [cargandoAgregarProducto, setCargandoAgregarProducto] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);
  const [mensajeInfoVista, setMensajeInfoVista] = useState<string | null>(null);

  const [mostrarModalQR, setMostrarModalQR] = useState(false);
  const [qrDataModal, setQrDataModal] = useState({ url: '', tipo: '' });
  const [mostrarModalBoleta, setMostrarModalBoleta] = useState(false);
  const [datosVentaParaBoleta, setDatosVentaParaBoleta] = useState<any>(null);
  // --------------------------------------------------------------------------------------------
  // B. EFECTOS (useEffect)
  // --------------------------------------------------------------------------------------------
  
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
        
        // Usar el hook personalizado que maneja roles automáticamente
        const data = await getAllVariantes();
        setVariantesCargadas(data);
        setVariantesFiltradas(data);
        
        if (data.length === 0) { 
          setMensajeInfoVista("No hay variantes de productos disponibles o el servicio no está conectado.");
        } else {
          setMensajeInfoVista(null);
        }
      } catch (err: any) {
        console.error('Error en cargarTodasLasVariantes:', err);
        setErrorGlobal(err.message ?? 'No se pudieron cargar las variantes de productos.');
        setMensajeInfoVista(null);
      } finally {
        setCargandoProductosIniciales(false);
      }
    };
    cargarTodasLasVariantes();
  }, [isReady, isAuthenticated, getAllVariantes]);

  useEffect(() => {
    if (!cargandoProductosIniciales && !cargandoBusquedaAccion) { 
      if (busqueda.trim() === '') {
        setVariantesFiltradas(variantesCargadas); 
        setMensajeInfoVista(null);
      } else {
        const terminoLower = busqueda.toLowerCase();
        let filtrados: ProductoVariante[] = [];
        
        if (tipoBusqueda === 'nombre') {
          // Buscar por nombre del producto
          filtrados = variantesCargadas.filter(v => 
            v.producto.nombre.toLowerCase().includes(terminoLower)
          );
        } else if (tipoBusqueda === 'codigo') {
          // Buscar por código de barras de variante o código de identificación del producto
          filtrados = variantesCargadas.filter(v => 
            (v.codigoBarrasVariante && v.codigoBarrasVariante.toLowerCase().includes(terminoLower)) ||
            (v.producto.codigoIdentificacion && v.producto.codigoIdentificacion.toLowerCase().includes(terminoLower))
          );
        }
        
        setVariantesFiltradas(filtrados);
        
        if (filtrados.length === 0 && busqueda.trim() !== '') { 
            const tipoBusquedaTexto = tipoBusqueda === 'nombre' ? 'nombre' : 'código';
            setMensajeInfoVista(`No hay coincidencias locales para "${busqueda}" en ${tipoBusquedaTexto}. Prueba "Buscar DB".`);
        } else if (filtrados.length > 0 || busqueda.trim() === '') { 
            setMensajeInfoVista(null);
        }
      }
    }
  }, [busqueda, tipoBusqueda, variantesCargadas, cargandoProductosIniciales, cargandoBusquedaAccion]);

  // Efecto para recalcular precios del carrito cuando cambia el estado de mayorista
  useEffect(() => {
    if (productosSeleccionadosVenta.length > 0) {
      console.log('🔄 Recalculando precios del carrito - Cliente mayorista:', esMayorista);
      
      setProductosSeleccionadosVenta(prev => prev.map(item => {
        // Obtener la variante con precios completos
        const varianteCompleta = variantesConPreciosCompletos.get(item.idProductoVariante);
        
        if (varianteCompleta) {
          // Calcular nuevo precio según el estado de mayorista
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
  // C. MANEJADORES DE LÓGICA DE PRODUCTOS Y VENTA
  // --------------------------------------------------------------------------------------------
  
  // Función para calcular el precio según la cantidad
  const calcularPrecioSegunCantidad = (variante: any, cantidad: number) => {
    if (!variante?.producto) {
      return { precio: 0, precioOriginal: 0, tipoDescuento: null };
    }
    
    // Los precios están en la entidad Producto, no en ProductoVariante
    const producto = variante.producto;
    const precioUnitario = producto.precioUnitario ?? 0;
    const precioCuarto = producto.precioCuarto;
    const precioMediaDocena = producto.precioMediaDocena;
    const precioDocena = producto.precioDocena;
    
    // ⭐ LÓGICA ESPECIAL PARA MAYORISTAS
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
      setVariantesFiltradas(variantesCargadas); 
      setMensajeInfoVista(null);
      return;
    }
    try {
      setCargandoBusquedaAccion(true);
      setErrorGlobal(null);
      setMensajeInfoVista(`Buscando "${terminoBusqueda}" en DB...`);
      
      // En este caso, ya tenemos todas las variantes cargadas previamente
      // así que simplemente volvemos a filtrar con un criterio más estricto
      const terminoLower = terminoBusqueda.toLowerCase();
      
      // Filtrar variantes que coincidan exactamente con el término de búsqueda
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
        setVariantesFiltradas(variantesExactas);
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
        
        setVariantesFiltradas(variantesParciales);
        
        if (variantesParciales.length === 0) {
          setMensajeInfoVista(`No se encontraron variantes para "${terminoBusqueda}" en la base de datos.`);
        } else {
          setMensajeInfoVista(null);
        }
      }
    } catch (err: any) {
      console.error('Error en handleBuscarEnServicio:', err);
      setErrorGlobal(err.message ?? 'Error al buscar en la base de datos.');
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
      
      // Buscar la variante que coincida exactamente con el código de barras
      const codigoLimpio = codigoScaneado.trim();
      
      // Buscar por código de barras de variante o por código de identificación de producto
      const varianteEncontrada = variantesCargadas.find(v => 
        v.codigoBarrasVariante === codigoLimpio || 
        (v.producto && v.producto.codigoIdentificacion === codigoLimpio)
      );
      
      if (varianteEncontrada) {
        await agregarVarianteAVenta(varianteEncontrada);
        setBusqueda(''); 
        
        const nombreProducto = varianteEncontrada.producto?.nombre || 'Producto';
        const nombreColor = varianteEncontrada.color?.nombre || 'Sin color';
        const nombreTalla = varianteEncontrada.talla?.nombreTalla || 'Talla única';
        
        setMensajeInfoVista(`${nombreProducto} - ${nombreColor} - ${nombreTalla} agregado.`);
        setTimeout(() => setMensajeInfoVista(null), 2000);
      } else {
        setErrorGlobal(`No se encontró variante con código "${codigoScaneado}".`);
        setMensajeInfoVista(null);
      }
    } catch (err: any) {
      console.error('Error en handleBuscarPorCodigoExacto:', err);
      setErrorGlobal(err.message ?? `Error al procesar código "${codigoScaneado}".`);
      setMensajeInfoVista(null);
    } finally {
      setCargandoBusquedaAccion(false);
    }  };
  
  // Función para verificar si un cliente es mayorista
  const verificarEsMayorista = async (numeroDocumento: string) => {
    setVerificandoMayorista(true);
    try {
      console.log('🔍 Verificando si el cliente es mayorista:', numeroDocumento);
      console.log('👤 Rol del usuario actual:', usuario?.roles?.[0]?.nombreRol);
      
      const userRole = usuario?.roles?.[0]?.nombreRol;
      const resultado = await MayoristaService.esMayorista(numeroDocumento, userRole);
      setEsMayorista(resultado);
      
      if (resultado) {
        console.log('👑 Cliente es MAYORISTA - Aplicando precios de docena');
        setMensajeInfoVista('✨ Cliente mayorista detectado - Precios especiales aplicados');
        setTimeout(() => setMensajeInfoVista(null), 4000);
      } else {
        console.log('👤 Cliente regular - Precios normales');
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
      setErrorGlobal("Ingrese un número de documento para buscar al cliente.");
      return;
    }

    const numeroDocumento = documentoCliente.trim();
    
    // Validaciones según el tipo de documento
    if (tipoDocumento === 'DNI') {
      if (numeroDocumento.length !== 8) {
        setErrorGlobal("El DNI debe tener exactamente 8 dígitos.");
        return;
      }
      if (!/^\d+$/.test(numeroDocumento)) {
        setErrorGlobal("El DNI debe contener solo números.");
        return;
      }
    } else if (tipoDocumento === 'RUC') {
      if (numeroDocumento.length !== 11) {
        setErrorGlobal("El RUC debe tener exactamente 11 dígitos.");
        return;
      }
      if (!/^\d+$/.test(numeroDocumento)) {
        setErrorGlobal("El RUC debe contener solo números.");
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
        setErrorGlobal("Cliente no encontrado. ¿Desea registrarlo?");
        setClienteSeleccionado(null);
      }
    } catch (err: any) {
      console.error('Error al buscar cliente:', err);
      setErrorGlobal(err.message || "Error al buscar el cliente.");
      setClienteSeleccionado(null);
    } finally {
      setCargandoBusquedaAccion(false);
    }
  };

  const agregarVarianteAVenta = async (variante: ProductoVariante) => {
    setErrorGlobal(null);
    setCargandoAgregarProducto(true);
    
    try {
      // Verificar que hay un cliente seleccionado antes de agregar productos
      if (!clienteSeleccionado) {
        setErrorGlobal('⚠️ Debe seleccionar un cliente antes de agregar productos al carrito.');
        return;
      }

      // Asegurarnos que la variante tiene cantidad y no está agotada
      const cantidad = variante.cantidad || 0;
      if (cantidad <= 0) {
        const nombreProducto = (variante as any).nombre || variante.producto?.nombre || 'Sin nombre';
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
          
          // Crear una nueva variante con los precios completos del producto
          varianteConPreciosCompletos = {
            ...variante,
            producto: productoCompleto
          };
          
          // Guardar la variante con precios completos en el estado
          setVariantesConPreciosCompletos(prev => new Map(prev.set(idVariante, varianteConPreciosCompletos)));
          
          console.log('✅ Producto completo obtenido con precios de volumen:', {
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
    const varianteOriginal = variantesCargadas.find(v => v.idProductoVariante === idProductoVariante);
      
    if (!varianteOriginal) {
      setErrorGlobal("Error crítico: Variante no encontrada para actualizar stock.");
      return;
    }
    
    if (nuevaCantidad <= 0) {
      handleEliminarProductoDeVenta(idProductoVariante);
      return;
    }
    
    if (nuevaCantidad > varianteOriginal.cantidad) {
      setErrorGlobal(`Stock máximo para ${varianteOriginal.producto.nombre} - ${varianteOriginal.color.nombre} - ${varianteOriginal.talla.nombreTalla} es ${varianteOriginal.cantidad}.`);
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
    
    // Calcular nuevo precio según la nueva cantidad
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
    // Para el cálculo del total, usamos el precio ya calculado y guardado en el item
    // que ya incluye los descuentos por volumen aplicados cuando se agregó al carrito
    return acc + item.total;
  }, 0);
  // Los precios ya incluyen IGV, por lo que extraemos el IGV del total
  const subtotalVenta = totalConIgvIncluido / 1.18; // Monto sin IGV
  const igvVenta = totalConIgvIncluido - subtotalVenta; // IGV extraído (18% del subtotal)
  const totalGeneralVenta = totalConIgvIncluido; // Total original (ya incluye IGV)

  // --------------------------------------------------------------------------------------------
  // D. MANEJADORES DE LÓGICA DE PAGO Y FINALIZACIÓN
  // --------------------------------------------------------------------------------------------
  const handleProcesarVentaFinal = async () => {
    setErrorGlobal(null);
    
    if (!cliente.trim()) { 
      setErrorGlobal('Ingrese el nombre del cliente.'); 
      return; 
    }
    
    if (!metodoPago) { 
      setErrorGlobal('Seleccione un método de pago.'); 
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
      
      // Primero verificamos si el cliente ya está registrado
      let clienteId = clienteSeleccionado?.idCliente;
      
      // Si no hay cliente seleccionado pero tenemos nombre, intentamos crear uno nuevo
      if (!clienteId && cliente.trim()) {
        try {
          const numeroDocumento = documentoCliente.trim();
          let documentoValido = true;
          let valorDocumento = numeroDocumento;
          
          // Validación del documento según tipo
          if (tipoDocumento === 'DNI') {
            if (numeroDocumento && (numeroDocumento.length !== 8 || !/^\d+$/.test(numeroDocumento))) {
              documentoValido = false;
              valorDocumento = '00000000'; // DNI por defecto
              console.warn('Se usará un DNI por defecto porque el valor ingresado no es válido');
            } else if (!numeroDocumento) {
              valorDocumento = '00000000'; // DNI por defecto
            }
          } else { // RUC
            if (numeroDocumento && (numeroDocumento.length !== 11 || !/^\d+$/.test(numeroDocumento))) {
              documentoValido = false;
              valorDocumento = '00000000000'; // RUC por defecto
              console.warn('Se usará un RUC por defecto porque el valor ingresado no es válido');
            } else if (!numeroDocumento) {
              valorDocumento = '00000000000'; // RUC por defecto
            }
          }
          
          // Crear cliente nuevo con datos básicos
          const nuevoCliente = await ClienteService.crearCliente({
            nombreCliente: cliente,
            tipoCliente: tipoDocumento === 'RUC' ? 'EMPRESA' : 'PERSONA',
            numeroDocumento: valorDocumento
          });
          
          clienteId = nuevoCliente.idCliente;
          
          if (!documentoValido) {
            console.warn('Se creó el cliente con un documento por defecto debido a formato inválido');
          }
        } catch (err) {
          console.error('Error al crear cliente nuevo:', err);
          // Seguimos adelante con clienteId en null, el backend deberá manejar este caso
        }
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
        cliente: { idCliente: clienteId || 1 }, // Usamos el ID obtenido o uno por defecto
        metodoPago: { idMetodoPago: obtenerIdMetodoPago(metodoPago) },
        tipoComprobante: 'BOLETA', // Por defecto
        fechaVenta: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
        detalles: detallesVenta
      };
      
      console.log('Enviando datos de venta final al backend:', ventaParaEnviar);
      console.log('Usuario actual que realizará la venta:', usuarioActual);
      
      // Registrar la venta usando el servicio
      const ventaRegistrada = await VentaService.crearVenta(ventaParaEnviar);
      console.log('Venta registrada exitosamente:', ventaRegistrada);
      
      // Actualizar el stock de las variantes usando el nuevo método
      console.log('🔄 Iniciando actualización de stock para productos vendidos:', productosSeleccionadosVenta);
      
      for (const item of productosSeleccionadosVenta) {
        console.log(`📦 Procesando item: ID variante ${item.idProductoVariante}, cantidad ${item.cantidad}`);
        
        if (item.idProductoVariante) {
          try {
            console.log(`⬇️ Disminuyendo stock de variante ${item.idProductoVariante} en ${item.cantidad} unidades`);
            const varianteActualizada = await disminuirCantidadVariante(item.idProductoVariante, item.cantidad);
            console.log(`✅ Stock de variante actualizado:`, varianteActualizada);
          } catch (error) {
            console.error(`❌ Error al actualizar stock de variante ${item.idProductoVariante}:`, error);
          }
        }
        
        // También disminuir el stock del producto general
        if (item.idProducto) {
          try {
            console.log(`⬇️ Disminuyendo stock de producto ${item.idProducto} en ${item.cantidad} unidades`);
            const productoActualizado = await disminuirCantidadProducto(item.idProducto, item.cantidad);
            console.log(`✅ Stock de producto actualizado:`, productoActualizado);
          } catch (error) {
            console.error(`❌ Error al actualizar stock de producto ${item.idProducto}:`, error);
          }
        }
      }
      
      // Actualizar el stock local de las variantes
      const variantesActualizadas = variantesCargadas.map(v => {
        const vendido = productosSeleccionadosVenta.find(ps => ps.idProductoVariante === v.idProductoVariante);
        return vendido ? { ...v, cantidad: v.cantidad - vendido.cantidad } : v;
      });
      setVariantesCargadas(variantesActualizadas);
      setVariantesFiltradas(variantesActualizadas);
      
      // Preparamos datos para la boleta con información de descuentos
      const datosBoletaVista = {
        cliente,
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
      console.error('Error al ejecutar finalización de venta:', err);
      setErrorGlobal(err.message || 'Error crítico al registrar la venta. Contacte a soporte.');
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

  // Función para limpiar solo el cliente y carrito (mantener búsqueda de productos)
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
  
  // Función auxiliar para obtener el ID de método de pago basado en el string
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
    const { cliente, productos: productosBoleta, totalGeneral, fechaHora, metodoPago: mp } = datosVentaParaBoleta;
    const fechaFormateada = new Date(fechaHora).toLocaleString('es-PE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    });
    
    let itemsHtml = productosBoleta.map((p: any, index: number) => {
      // Determinar si hay descuento aplicado de manera simple
      const hayDescuento = p.tipoDescuento && p.precioOriginal > p.precioUnitarioAplicado;
      
      return `
      <div class="item">
        <div class="item-header">
          <span class="item-name">${p.descripcion}</span>
          <span class="item-total">S/${p.totalParcial.toFixed(2)}</span>
        </div>
        <div class="item-details">
          <span class="item-quantity">Cant: ${p.cantidad}</span>
          <span class="item-price">@ S/${p.precioUnitarioAplicado.toFixed(2)}</span>
          ${hayDescuento ? '<span class="discount-applied">*Descuento aplicado</span>' : ''}
        </div>
        ${index < productosBoleta.length - 1 ? '<div class="item-separator"></div>' : ''}
      </div>
    `;
    }).join('');

    // Recalcular valores para asegurar consistencia en la boleta
    const subtotalCalculado = totalGeneral / 1.18; // Subtotal sin IGV
    const igvCalculado = totalGeneral - subtotalCalculado; // IGV del total

    const boletaHtml = `
      <html>
        <head>
          <title>Boleta de Venta - ${cliente}</title>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: 'Arial', sans-serif; 
              margin: 0; 
              padding: 20px; 
              font-size: 12px; 
              line-height: 1.4;
              color: #000;
              background: #fff;
            }
            .receipt { 
              background: white;
              max-width: 300px; 
              margin: 0 auto;
              padding: 20px;
              border: 1px solid #000;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 16px;
              margin-bottom: 16px;
            }
            .company-name {
              font-size: 16px;
              font-weight: bold;
              color: #000;
              margin-bottom: 4px;
            }
            .receipt-title {
              font-size: 12px;
              color: #000;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .info-section {
              margin-bottom: 16px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
              font-size: 10px;
            }
            .info-label {
              color: #000;
              font-weight: normal;
            }
            .info-value {
              color: #000;
              font-weight: bold;
            }
            .products-section {
              margin-bottom: 16px;
            }
            .section-title {
              font-size: 11px;
              font-weight: bold;
              color: #000;
              margin-bottom: 10px;
              text-transform: uppercase;
              border-bottom: 1px solid #000;
              padding-bottom: 2px;
            }
            .item {
              margin-bottom: 10px;
              padding-bottom: 8px;
            }
            .item-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 4px;
            }
            .item-name {
              font-weight: bold;
              color: #000;
              font-size: 10px;
              flex: 1;
              margin-right: 8px;
              line-height: 1.2;
            }
            .item-total {
              font-weight: bold;
              color: #000;
              font-size: 11px;
              white-space: nowrap;
            }
            .item-details {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 9px;
              color: #333;
            }
            .item-quantity {
              font-weight: normal;
            }
            .item-price {
              font-weight: normal;
            }
            .discount-applied {
              font-size: 8px;
              color: #666;
              font-style: italic;
            }
            .item-separator {
              height: 1px;
              background: #ccc;
              margin: 6px 0;
            }
            .totals-section {
              border-top: 2px solid #000;
              padding-top: 12px;
              margin-bottom: 16px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
              font-size: 10px;
            }
            .total-label {
              color: #000;
              font-weight: normal;
            }
            .total-value {
              font-weight: bold;
              color: #000;
            }
            .final-total {
              border-top: 1px dashed #000;
              padding-top: 6px;
              margin-top: 6px;
            }
            .final-total .total-label {
              font-size: 12px;
              font-weight: bold;
              color: #000;
            }
            .final-total .total-value {
              font-size: 14px;
              font-weight: bold;
              color: #000;
            }
            .footer {
              text-align: center;
              color: #333;
              font-size: 9px;
              border-top: 1px solid #ccc;
              padding-top: 12px;
              line-height: 1.4;
            }
            .thank-you {
              font-weight: bold;
              color: #000;
              margin-bottom: 6px;
            }
            @media print {
              body { 
                background: white;
                padding: 0;
              }
              .receipt {
                border: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="company-name">SISTEMA DE VENTAS</div>
              <div class="receipt-title">Boleta de Venta</div>
            </div>
            
            <div class="info-section">
              <div class="info-row">
                <span class="info-label">Fecha y Hora:</span>
                <span class="info-value">${fechaFormateada}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Cliente:</span>
                <span class="info-value">${cliente ?? 'Público General'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Método de Pago:</span>
                <span class="info-value">${mp.charAt(0).toUpperCase() + mp.slice(1)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Atendido por:</span>
                <span class="info-value">${datosVentaParaBoleta.usuarioVendedor}</span>
              </div>
            </div>
            
            <div class="products-section">
              <div class="section-title">Productos</div>
              ${itemsHtml}
            </div>
            
            <div class="totals-section">
              <div class="total-row">
                <span class="total-label">Subtotal (sin IGV):</span>
                <span class="total-value">S/${subtotalCalculado.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span class="total-label">IGV (18%):</span>
                <span class="total-value">S/${igvCalculado.toFixed(2)}</span>
              </div>
              <div class="total-row final-total">
                <span class="total-label">TOTAL A PAGAR:</span>
                <span class="total-value">S/${totalGeneral.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="footer">
              <div class="thank-you">¡Gracias por su compra!</div>
              <div>Conserve este comprobante</div>
              <div>para cualquier reclamo o garantía</div>
            </div>
          </div>
          
          <script>
            setTimeout(() => { 
              window.print(); 
            }, 500);
          </script>
        </body>
      </html>`;
    
    const boletaWindow = window.open('', '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes,left=' + (screen.width/2 - 200) + ',top=' + (screen.height/2 - 300));
    if (boletaWindow) {
      boletaWindow.document.write(boletaHtml);
      boletaWindow.document.close();
    }
    setMostrarModalBoleta(false);
  };

  // --------------------------------------------------------------------------------------------
  // E. DEFINICIÓN DE MÉTODOS DE PAGO (Para la UI)
  // --------------------------------------------------------------------------------------------
  const paymentMethods = [
    { 
      id: 'efectivo', 
      name: 'Efectivo', 
      icon: (isSelected: boolean) => (
        <DollarSign size={18} className={isSelected ? "text-white" : "text-gray-600"} />
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
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Cabecera del Panel de Ventas */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sistema de Ventas</h1>
                <p className="text-sm text-gray-600 mt-1">Gestiona las ventas y procesa pagos</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Cajero Activo
            </span>
          </div>
        </div>
      </div>

      {/* Notificación Global de Errores */}
      {errorGlobal && (
        <div className="fixed top-4 right-4 z-[100] mb-4 p-4 bg-red-50 bg-opacity-95 backdrop-blur-sm border border-red-200 text-red-800 text-sm shadow-xl rounded-xl w-auto max-w-md animate-fadeIn">
          <div className="flex items-start">
            <div className="p-1 bg-red-100 rounded-lg mr-3 flex-shrink-0">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
            <div className="flex-grow">
              <h4 className="font-medium text-red-900 mb-1">Error</h4>
              <span className="text-red-700">{errorGlobal}</span>
            </div>
            <button onClick={() => setErrorGlobal(null)} className="ml-2 text-red-400 hover:text-red-600 flex-shrink-0 p-1 rounded-lg hover:bg-red-100 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      
      {/* Notificación Global de Información */}
      {mensajeInfoVista && ( 
         <div className="fixed top-20 right-4 z-[100] mb-4 p-4 bg-blue-50 bg-opacity-95 backdrop-blur-sm border border-blue-200 text-blue-800 text-sm shadow-xl rounded-xl w-auto max-w-md animate-fadeIn">
          <div className="flex items-start">
            <div className="p-1 bg-blue-100 rounded-lg mr-3 flex-shrink-0">
              <AlertCircle className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-grow">
              <h4 className="font-medium text-blue-900 mb-1">Información</h4>
              <span className="text-blue-700">{mensajeInfoVista}</span>
            </div>
            <button onClick={() => setMensajeInfoVista(null)} className="ml-2 text-blue-400 hover:text-blue-600 flex-shrink-0 p-1 rounded-lg hover:bg-blue-100 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* MODALES MEJORADOS */}
      {mostrarModalQR && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full animate-scaleIn">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Smartphone className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Pagar con {qrDataModal.tipo}</h3>
              <p className="text-gray-600">Escanea el código QR para pagar</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">S/{totalGeneralVenta.toFixed(2)}</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl border-2 border-gray-100 mb-6">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrDataModal.url)}`} 
                alt="QR Code"
                className="w-full h-auto rounded-lg"
              />
            </div>
            
            <p className="text-sm text-gray-500 mb-6">
              Abre la aplicación {qrDataModal.tipo} y escanea el código
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setMostrarModalQR(false)} 
                className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={ejecutarFinalizacionVenta} 
                disabled={cargandoProcesoVenta}
                className="flex-1 py-3 px-4 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-gray-400 transition-colors font-medium flex items-center justify-center gap-2"
              >
                {cargandoProcesoVenta ? (
                  <Loader2 className="animate-spin w-5 h-5"/>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5"/>
                    Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarModalBoleta && datosVentaParaBoleta && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full animate-scaleIn">
                <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">¡Venta Completada!</h3>
                    
                    <div className="bg-gray-50 rounded-xl p-4 mb-6">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cliente:</span>
                          <span className="font-medium text-gray-900">{datosVentaParaBoleta.cliente}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Método de pago:</span>
                          <span className="font-medium text-gray-900 capitalize">{datosVentaParaBoleta.metodoPago}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Vendedor:</span>
                          <span className="font-medium text-gray-900">{datosVentaParaBoleta.usuarioVendedor}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-2 mt-3">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-900">Total Pagado:</span>
                            <span className="text-2xl font-bold text-green-600">S/{datosVentaParaBoleta.totalGeneral.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                </div>
                
                <div className="flex flex-col gap-3">
                    <button 
                      onClick={handleImprimirBoleta} 
                      className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                        <Printer className="w-5 h-5"/>
                        Imprimir Boleta
                    </button>
                    <button 
                      onClick={() => setMostrarModalBoleta(false)} 
                      className="w-full py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
      )}
      
      {/* LAYOUT PRINCIPAL DE LA PÁGINA */}
      <div className="max-w-7xl mx-auto">
        {/* Sección de Información del Cliente */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Información del Cliente</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label htmlFor="documentoClienteInput" className="block mb-2 text-sm font-medium text-gray-700">
                Documento del Cliente:
              </label>
              <div className="flex">
                <select 
                  className="px-4 py-3 border border-gray-300 border-r-0 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 font-medium text-gray-700"
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
                  className={`flex-1 px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
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
                  placeholder={tipoDocumento === 'DNI' ? "Ingrese DNI (8 dígitos)" : "Ingrese RUC (11 dígitos)"} 
                  maxLength={tipoDocumento === 'DNI' ? 8 : 11}
                />
                <button 
                  onClick={handleBuscarCliente}
                  disabled={cargandoBusquedaAccion || 
                           !documentoCliente.trim() || 
                           (tipoDocumento === 'DNI' && documentoCliente.length !== 8) || 
                           (tipoDocumento === 'RUC' && documentoCliente.length !== 11)} 
                  className="px-4 py-3 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
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
                      ? `El DNI debe tener exactamente 8 dígitos (Actual: ${documentoCliente.length})` 
                      : `El RUC debe tener exactamente 11 dígitos (Actual: ${documentoCliente.length})`}
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                      {clienteSeleccionado.nombreCliente} - Tipo: {clienteSeleccionado.tipoCliente}
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
                  
                  {/* Botón para limpiar cliente */}
                  <button
                    onClick={limpiarCliente}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors duration-200"
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
          {/* Panel de Búsqueda de Productos */}
          <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Search className="h-5 w-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Buscar Productos</h2>
              </div>
            </div>
            
            <div className="p-6">
              {/* Selector de tipo de búsqueda */}
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
                    📝 Nombre del producto
                  </button>
                  <button
                    onClick={() => setTipoBusqueda('codigo')}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      tipoBusqueda === 'codigo'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    🔍 Código de barras
                  </button>
                </div>
              </div>
              
              {/* Barra de búsqueda mejorada */}
              <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search size={20} className="text-gray-400" />
                </div>
                <input 
                  type="text" 
                  className="w-full pl-12 pr-28 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-500"
                  placeholder={tipoBusqueda === 'nombre' ? "Buscar por nombre del producto..." : "Escanear o escribir código de barras..."} 
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
                      className="mr-2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      onClick={() => {
                        setBusqueda('');
                        setVariantesFiltradas(variantesCargadas);
                        setMensajeInfoVista(null);
                      }}
                      title="Limpiar búsqueda"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <button 
                    className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
              {!clienteSeleccionado && (
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
              
              {/* Lista de productos con diseño mejorado */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 min-h-[300px] max-h-96 overflow-y-auto">
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
                    {variantesFiltradas.map(v => (
                      <div
                        key={v.idProductoVariante} 
                        className={`bg-white border border-gray-200 rounded-lg p-4 transition-all ${
                          clienteSeleccionado 
                            ? 'cursor-pointer hover:shadow-lg hover:border-blue-300 group transform hover:scale-105' 
                            : 'cursor-not-allowed opacity-60 bg-gray-50'
                        }`}
                        onClick={() => {
                          if (clienteSeleccionado) {
                            handleSeleccionarVarianteDeLista(v);
                          }
                        }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className={`font-semibold text-sm mb-1 transition-colors line-clamp-2 ${
                              clienteSeleccionado 
                                ? 'text-gray-900 group-hover:text-blue-600' 
                                : 'text-gray-500'
                            }`} title={v.producto?.nombre ?? 'Producto sin nombre'}>
                              {v.producto?.nombre ?? 'Producto sin nombre'}
                            </h3>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className={`px-2 py-1 rounded-full ${
                                clienteSeleccionado 
                                  ? 'bg-gray-100 text-gray-700' 
                                  : 'bg-gray-200 text-gray-500'
                              }`}>
                                {v.color?.nombre ?? 'Sin color'}
                              </span>
                              <span className={`px-2 py-1 rounded-full ${
                                clienteSeleccionado 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-gray-200 text-gray-500'
                              }`}>
                                Talla {v.talla?.nombreTalla ?? 'Única'}
                              </span>
                              <span className={`px-2 py-1 rounded-full ${
                                clienteSeleccionado 
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
                            clienteSeleccionado ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            {v.codigoBarrasVariante ?? v.producto?.codigoIdentificacion ?? 'Sin código'}
                          </p>
                          
                          <div className="flex justify-between items-center">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              !clienteSeleccionado 
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
                              clienteSeleccionado ? 'text-blue-600' : 'text-gray-400'
                            }`}>
                              S/{(v.producto?.precioUnitario ?? 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className={`flex items-center justify-center text-xs font-medium ${
                            clienteSeleccionado 
                              ? 'text-blue-600 group-hover:text-blue-700' 
                              : 'text-gray-400'
                          }`}>
                            <DollarSign size={14} className="mr-1" />
                            {clienteSeleccionado ? 'Agregar al carrito' : 'Selecciona un cliente primero'}
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
                      {mensajeInfoVista || "No hay productos que coincidan con tu búsqueda"}
                    </p>
                    <button 
                      onClick={() => {
                        setBusqueda('');
                        setVariantesFiltradas(variantesCargadas);
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
                          <div key={`${p.idProductoVariante}-${index}`} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors">
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
                                className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
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
                                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-l-lg transition-colors"
                                  >
                                    -
                                  </button>
                                  <span className="px-3 py-2 font-medium text-gray-900 min-w-[3rem] text-center">
                                    {p.cantidad}
                                  </span>
                                  <button 
                                    onClick={() => handleActualizarCantidadEnVenta(p.idProductoVariante, p.cantidad + 1)}
                                    className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-r-lg transition-colors"
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
                      <h3 className="font-medium text-gray-900 mb-2">Carrito vacío</h3>
                      <p className="text-sm text-gray-500">
                        Agrega productos desde el panel de búsqueda
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
                  
                  {/* Métodos de pago */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Método de Pago</h3>
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
                  
                  {/* Botón de finalizar venta */}
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
                  
                  {/* Información adicional */}
                  {(!metodoPago || !cliente.trim() || productosSeleccionadosVenta.length === 0) && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        {!cliente.trim() && "• Ingrese el nombre del cliente"}
                        {!metodoPago && !cliente.trim() && <br />}
                        {!metodoPago && "• Seleccione un método de pago"}
                        {productosSeleccionadosVenta.length === 0 && (!metodoPago || !cliente.trim()) && <br />}
                        {productosSeleccionadosVenta.length === 0 && "• Agregue productos al carrito"}
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