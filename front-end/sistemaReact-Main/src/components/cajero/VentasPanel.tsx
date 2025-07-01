import { useState, useEffect } from 'react';
import { Search, X, AlertCircle, Printer, CreditCard, Smartphone, DollarSign, CheckCircle, Loader2 } from 'lucide-react';
import { useProductoVarianteService } from '../../hooks/useProductoVarianteService';
import { useAuthReady } from '../../hooks/useAuthReady';
import { ClienteService } from '../../services/ClienteServices';
import type { ProductoVenta } from '../../interfaces/Producto';
import type { ProductoVariante } from '../../interfaces/ProductoVariante';
import type { Cliente } from '../../interfaces/Cliente';
import type { VentaInput } from '../../interfaces/Venta';
import type { DetalleVentaInput } from '../../interfaces/DetalleVenta';

const VentasPanel = () => {
  const { isReady, isAuthenticated } = useAuthReady();
  // Get role-aware product variante service methods
  const { getAllVariantes, obtenerVariantesPorProducto, obtenerVariantePorId } = useProductoVarianteService();
  
  // --------------------------------------------------------------------------------------------
  // A. ESTADO DEL COMPONENTE
  // --------------------------------------------------------------------------------------------
  const [busqueda, setBusqueda] = useState('');
  const [cliente, setCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [documentoCliente, setDocumentoCliente] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<'DNI' | 'RUC'>('DNI');
  
  const [variantesCargadas, setVariantesCargadas] = useState<ProductoVariante[]>([]);
  const [variantesFiltradas, setVariantesFiltradas] = useState<ProductoVariante[]>([]);
  const [productosSeleccionadosVenta, setProductosSeleccionadosVenta] = useState<ProductoVenta[]>([]);
  
  const [metodoPago, setMetodoPago] = useState('');
  
  const [cargandoProductosIniciales, setCargandoProductosIniciales] = useState(true);
  const [cargandoBusquedaAccion, setCargandoBusquedaAccion] = useState(false);
  const [cargandoProcesoVenta, setCargandoProcesoVenta] = useState(false);
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
        setErrorGlobal(err.message || 'No se pudieron cargar las variantes de productos.');
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
        const filtrados = variantesCargadas.filter(
          v => 
            v.producto.nombre.toLowerCase().includes(terminoLower) ||
            (v.codigoBarrasVariante && v.codigoBarrasVariante.toLowerCase().includes(terminoLower)) ||
            (v.talla.nombreTalla && v.talla.nombreTalla.toLowerCase().includes(terminoLower)) ||
            (v.color.nombre && v.color.nombre.toLowerCase().includes(terminoLower))
        );
        setVariantesFiltradas(filtrados);
        
        if (filtrados.length === 0 && busqueda.trim() !== '') { 
            setMensajeInfoVista(`No hay coincidencias locales para "${busqueda}". Prueba "Buscar DB".`);
        } else if (filtrados.length > 0 || busqueda.trim() === '') { 
            setMensajeInfoVista(null);
        }
      }
    }
  }, [busqueda, variantesCargadas, cargandoProductosIniciales, cargandoBusquedaAccion]);

  // --------------------------------------------------------------------------------------------
  // C. MANEJADORES DE LÓGICA DE PRODUCTOS Y VENTA
  // --------------------------------------------------------------------------------------------
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
          v.talla.nombreTalla.toLowerCase() === terminoLower
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
            v.talla.nombreTalla.toLowerCase().includes(terminoLower)
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
      setErrorGlobal(err.message || 'Error al buscar en la base de datos.');
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
        agregarVarianteAVenta(varianteEncontrada);
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
      setErrorGlobal(err.message || `Error al procesar código "${codigoScaneado}".`);
      setMensajeInfoVista(null);
    } finally {
      setCargandoBusquedaAccion(false);
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

  const agregarVarianteAVenta = (variante: ProductoVariante) => {
    setErrorGlobal(null);
    
    // Asegurarnos que la variante tiene cantidad y no está agotada
    const cantidad = variante.cantidad || 0;
    if (cantidad <= 0) {
      setErrorGlobal(`La variante ${variante.producto?.nombre || 'Sin nombre'} - ${variante.color?.nombre || 'Sin color'} - ${variante.talla?.nombreTalla || 'Talla única'} está agotada.`);
      return;
    }

    // Asegurarse de que tenemos un ID de variante válido
    const idVariante = variante.idProductoVariante || variante.idVariante;
    if (!idVariante) {
      setErrorGlobal('Esta variante no tiene un identificador válido y no puede ser agregada a la venta.');
      return;
    }

    const varianteExistente = productosSeleccionadosVenta.find(item => 
      item.idProductoVariante === idVariante
    );
    
    if (varianteExistente) {
      if (varianteExistente.cantidad >= cantidad) {
        setErrorGlobal(`No hay más stock de ${variante.producto?.nombre || 'Producto'} - ${variante.color?.nombre || 'Sin color'} - ${variante.talla?.nombreTalla || 'Talla única'}. Stock: ${cantidad}. En carrito: ${varianteExistente.cantidad}.`);
        return;
      }
      setProductosSeleccionadosVenta(prev => prev.map(item => 
        item.idProductoVariante === idVariante 
          ? { ...item, cantidad: item.cantidad + 1, total: (item.cantidad + 1) * item.precio } 
          : item
      ));
    } else {
      // Precio unitario del producto o valor por defecto si no existe
      const precioUnitario = variante.producto?.precioUnitario || 0;
      
      setProductosSeleccionadosVenta(prev => [...prev, {
        idProductoVariante: idVariante,
        idProducto: variante.producto?.idProducto || 0,
        codigo: variante.codigoBarrasVariante || (variante.producto?.codigoIdentificacion || 'Sin código'),
        descripcion: variante.producto?.nombre || 'Producto sin nombre',
        talla: variante.talla?.nombreTalla || 'Única',
        color: variante.color?.nombre || 'Sin color',
        cantidad: 1,
        precio: precioUnitario,
        total: precioUnitario
      }]);
    }
  };

  const handleSeleccionarVarianteDeLista = (variante: ProductoVariante) => {
    // Usar el precio unitario del producto asociado a la variante
    agregarVarianteAVenta(variante);
  };

  const handleEliminarProductoDeVenta = (idProductoVariante: number) => {
    setProductosSeleccionadosVenta(prev => prev.filter(item => item.idProductoVariante !== idProductoVariante));
  };

  const handleActualizarCantidadEnVenta = (idProductoVariante: number, nuevaCantidad: number) => {
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
    setProductosSeleccionadosVenta(prev => prev.map(item => 
      item.idProductoVariante === idProductoVariante 
        ? { ...item, cantidad: nuevaCantidad, total: nuevaCantidad * item.precio } 
        : item
    ));
  };

  const subtotalVenta = productosSeleccionadosVenta.reduce((acc, item) => acc + item.total, 0);
  const igvVenta = subtotalVenta * 0.18; 
  const totalGeneralVenta = subtotalVenta + igvVenta;

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
      
      // Creamos el objeto de venta según la interfaz VentaInput
      const ventaParaEnviar: VentaInput = {
        usuario: { id: 1 }, // ID del usuario actual (podría venir del contexto de autenticación)
        cliente: { idCliente: clienteId || 1 }, // Usamos el ID obtenido o uno por defecto
        metodoPago: { idMetodoPago: obtenerIdMetodoPago(metodoPago) },
        tipoComprobante: 'BOLETA', // Por defecto
        fechaVenta: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
        detalles: detallesVenta
      };
      
      console.log('Enviando datos de venta final al backend:', ventaParaEnviar);
      
      // Registrar la venta usando el servicio
      // Comentado porque puede requerir ajustes según tu backend
      // const ventaRegistrada = await VentaService.crearVenta(ventaParaEnviar);
      
      // Simulamos envío (quitar en producción)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Actualizamos el stock local
      const variantesActualizadas = variantesCargadas.map(v => {
        const vendido = productosSeleccionadosVenta.find(ps => ps.idProductoVariante === v.idProductoVariante);
        return vendido ? { ...v, cantidad: v.cantidad - vendido.cantidad } : v;
      });
      setVariantesCargadas(variantesActualizadas);
      
      // Preparamos datos para la boleta
      const datosBoletaVista = {
        cliente,
        metodoPago,
        productos: productosSeleccionadosVenta.map(item => ({
          idProductoVariante: item.idProductoVariante,
          idProducto: item.idProducto,
          descripcion: `${item.descripcion} - ${item.color} - ${item.talla}`,
          cantidad: item.cantidad,
          precioUnitarioAplicado: item.precio,
          totalParcial: item.total,
        })),
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
    setBusqueda('');
    setProductosSeleccionadosVenta([]);
    setMetodoPago('');
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
    const { cliente, productos: productosBoleta, subtotal, totalGeneral, fechaHora, metodoPago: mp } = datosVentaParaBoleta;
    const fechaFormateada = new Date(fechaHora).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short'});
    
    let itemsHtml = productosBoleta.map((p: any) => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 5px; font-size:10px;">${p.cantidad}</td>
        <td style="border: 1px solid #ddd; padding: 5px; font-size:10px;">${p.descripcion}</td>
        <td style="border: 1px solid #ddd; padding: 5px; text-align: right; font-size:10px;">S/${p.precioUnitarioAplicado.toFixed(2)}</td>
        <td style="border: 1px solid #ddd; padding: 5px; text-align: right; font-size:10px;">S/${p.totalParcial.toFixed(2)}</td>
      </tr>`).join('');

    const boletaHtml = `
      <html><head><title>Boleta de Venta</title><style>
        body { font-family: 'Arial Narrow', Arial, sans-serif; margin: 0; padding:10px; font-size: 11px; width: 280px; }
        .container { border: 1px solid #555; padding: 10px; }
        h2 { text-align: center; margin: 0 0 8px 0; font-size: 14px; }
        p { margin: 3px 0; } strong { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; }
        th, td { text-align: left; padding: 3px; font-size: 10px;}
        .text-right { text-align: right; }
        .total-row td { font-weight: bold; border-top: 1px dashed #333; padding-top: 4px;}
        hr { border: none; border-top: 1px dashed #777; margin: 8px 0; }
      </style></head><body><div class="container">
        <h2>BOLETA DE VENTA</h2>
        <p><strong>Fecha:</strong> ${fechaFormateada}</p>
        <p><strong>Cliente:</strong> ${cliente || 'Varios'}</p>
        <p><strong>Método Pago:</strong> ${mp.charAt(0).toUpperCase() + mp.slice(1)}</p>
        <hr/>
        <table><thead><tr>
          <th>Cant.</th><th>Descripción</th><th class="text-right">P.U.</th><th class="text-right">Total</th>
        </tr></thead><tbody>${itemsHtml}</tbody></table>
        <hr/>
        <table>
          <tr><td>Subtotal:</td><td class="text-right">S/${subtotal.toFixed(2)}</td></tr>
          <tr><td>IGV (18%):</td><td class="text-right">S/${igvVenta.toFixed(2)}</td></tr>
          <tr class="total-row"><td>TOTAL:</td><td class="text-right">S/${totalGeneral.toFixed(2)}</td></tr>
        </table>
        <p style="text-align:center; font-size:9px; margin-top:10px;">¡Gracias por su compra!</p>
      </div><script>setTimeout(() => { window.print(); }, 200);</script></body></html>`;
    
    const boletaWindow = window.open('', '_blank', 'width=320,height=500,scrollbars=yes,resizable=yes');
    boletaWindow?.document.write(boletaHtml);
    boletaWindow?.document.close();
    setMostrarModalBoleta(false);
  };

  // --------------------------------------------------------------------------------------------
  // E. DEFINICIÓN DE MÉTODOS DE PAGO (Para la UI)
  // --------------------------------------------------------------------------------------------
  const paymentMethods = [
    { id: 'efectivo', name: 'Efectivo', icon: <DollarSign size={18} className="mr-1 sm:mr-2"/> },
    { id: 'tarjeta', name: 'Tarjeta', icon: <CreditCard size={18} className="mr-1 sm:mr-2"/> },
    { id: 'yape', name: 'Yape', icon: <Smartphone size={18} className="mr-1 sm:mr-2"/> },
    { id: 'plin', name: 'Plin', icon: <Smartphone size={18} className="mr-1 sm:mr-2"/> },
  ];

  // --------------------------------------------------------------------------------------------
  // F. RENDERIZADO DEL COMPONENTE (JSX)
  // --------------------------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4">
      {/* Notificación Global de Errores */}
      {errorGlobal && (
        <div className="fixed top-4 right-4 z-[100] mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 text-sm shadow-lg rounded-md w-auto max-w-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-red-500 flex-shrink-0" />
            <span className="flex-grow">{errorGlobal}</span>
            <button onClick={() => setErrorGlobal(null)} className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0">
              <X size={18} />
            </button>
          </div>
        </div>
      )}
      
      {/* Notificación Global de Información */}
      {mensajeInfoVista && ( 
         <div className="fixed top-16 right-4 z-[100] mb-4 p-3 bg-blue-100 border-l-4 border-blue-500 text-blue-700 text-sm shadow-lg rounded-md w-auto max-w-md animate-pulse">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0" /> 
            <span className="flex-grow">{mensajeInfoVista}</span>
            <button onClick={() => setMensajeInfoVista(null)} className="ml-2 text-blue-500 hover:text-blue-700 flex-shrink-0">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* MODALES */}
      {mostrarModalQR && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl text-center max-w-sm w-full">
            <h3 className="text-xl font-semibold mb-2">Pagar con {qrDataModal.tipo}</h3>
            <p className="text-gray-600 mb-4">Escanee el código QR para pagar <span className="font-bold">S/{totalGeneralVenta.toFixed(2)}</span>.</p>
            <div className="flex justify-center my-4">
              {/* Usando la librería estándar de QR (necesitarás importar la correcta) */}
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrDataModal.url)}`} 
                alt="QR Code"
                className="border rounded"
              />
            </div>
            <p className="text-xs text-gray-500 mb-4">Escanee con la aplicación {qrDataModal.tipo}.</p>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setMostrarModalQR(false)} className="w-1/2 py-2 px-4 border rounded-md hover:bg-gray-100">Cancelar</button>
              <button 
                onClick={ejecutarFinalizacionVenta} 
                disabled={cargandoProcesoVenta}
                className="w-1/2 py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center">
                {cargandoProcesoVenta ? <Loader2 className="animate-spin mr-2"/> : <CheckCircle className="mr-2"/>} Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarModalBoleta && datosVentaParaBoleta && (
         <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                <div className="text-center">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-semibold text-gray-800 mb-2">¡Venta Registrada Exitosamente!</h3>
                    <p className="text-gray-600 mb-1">Cliente: <span className="font-medium">{datosVentaParaBoleta.cliente}</span></p>
                    <p className="text-gray-600 mb-4">Total Pagado: <span className="font-bold text-lg">S/{datosVentaParaBoleta.totalGeneral.toFixed(2)}</span></p>
                </div>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <button onClick={() => setMostrarModalBoleta(false)} className="w-full sm:w-1/2 py-2.5 px-4 border rounded-md hover:bg-gray-100">Cerrar</button>
                    <button onClick={handleImprimirBoleta} className="w-full sm:w-1/2 py-2.5 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center">
                        <Printer size={18} className="mr-2"/> Imprimir Boleta
                    </button>
                </div>
            </div>
        </div>
      )}
      
      {/* LAYOUT PRINCIPAL DE LA PÁGINA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5 p-3 sm:p-4 bg-white rounded-lg shadow">
        <div>
          <label htmlFor="clienteInput" className="block mb-1 text-sm font-medium text-gray-700">Cliente:</label>
          <input 
            id="clienteInput" 
            type="text" 
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            value={cliente} 
            onChange={(e) => setCliente(e.target.value)} 
            placeholder="Nombre del cliente (Ej: Juan Pérez)" 
          />
        </div>
        <div className="flex items-end">
          <div className="flex-grow">
            <label htmlFor="documentoClienteInput" className="block mb-1 text-sm font-medium text-gray-700">Documento Cliente:</label>
            <div className="flex">
              <select 
                className="px-2 py-2 border border-gray-300 border-r-0 rounded-l-md focus:ring-indigo-500 focus:border-indigo-500"
                value={tipoDocumento}
                onChange={(e) => {
                  setTipoDocumento(e.target.value as 'DNI' | 'RUC');
                  setDocumentoCliente(''); // Limpiar el documento al cambiar el tipo
                  setErrorGlobal(null);
                }}
              >
                <option value="DNI">DNI</option>
                <option value="RUC">RUC</option>
              </select>
              <input 
                id="documentoClienteInput" 
                type="text" 
                className={`w-full px-3 py-2 border border-gray-300 rounded-none focus:ring-indigo-500 focus:border-indigo-500 ${
                  documentoCliente && 
                  ((tipoDocumento === 'DNI' && (documentoCliente.length !== 8 || !/^\d+$/.test(documentoCliente))) || 
                   (tipoDocumento === 'RUC' && (documentoCliente.length !== 11 || !/^\d+$/.test(documentoCliente)))) 
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                  : ''
                }`}
                value={documentoCliente} 
                onChange={(e) => {
                  const value = e.target.value;
                  
                  // Solo permitir números en el input
                  if (value === '' || /^\d+$/.test(value)) {
                    setDocumentoCliente(value);
                    
                    // Limpiar error si el formato es correcto o si está vacío
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
                className="px-3 py-2 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700 h-[42px] flex items-center justify-center disabled:bg-gray-400"
              >
                {cargandoBusquedaAccion && documentoCliente ? <Loader2 className="animate-spin" size={20}/> : <Search size={18}/>}
                <span className="ml-1 hidden sm:inline">Buscar</span>
              </button>
            </div>
            {documentoCliente && (
              (tipoDocumento === 'DNI' && documentoCliente.length !== 8) || 
              (tipoDocumento === 'RUC' && documentoCliente.length !== 11) ? (
                <p className="mt-1 text-xs text-red-500">
                  {tipoDocumento === 'DNI' 
                    ? `El DNI debe tener exactamente 8 dígitos (Actual: ${documentoCliente.length})` 
                    : `El RUC debe tener exactamente 11 dígitos (Actual: ${documentoCliente.length})`}
                </p>
              ) : null
            )}
          </div>
        </div>
        {clienteSeleccionado && (
          <div className="lg:col-span-2 mt-2 text-sm p-2 rounded-md bg-green-100 text-green-700">
            Cliente encontrado: {clienteSeleccionado.nombreCliente} - Tipo: {clienteSeleccionado.tipoCliente}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        <div className="lg:col-span-7 bg-white rounded-lg shadow-md">
          <div className="p-3 sm:p-4 border-b"><h2 className="text-lg sm:text-xl font-semibold text-gray-800">Buscar Productos</h2></div>
          <div className="p-3 sm:p-4">
            <div className="relative mb-4">
              <input 
                type="text" 
                className="w-full pl-10 pr-24 sm:pr-28 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Nombre, código o escanear..." 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && busqueda.trim()) {
                    if (/^[A-Za-z0-9-]{4,}$/.test(busqueda.trim()) && !busqueda.trim().includes(" ")) {
                        handleBuscarPorCodigoExacto(busqueda.trim());
                    } else {
                        handleBuscarEnServicio();
                    }
                  }
                }} 
              />
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <button 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm px-2.5 sm:px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:bg-gray-300"
                onClick={handleBuscarEnServicio} 
                disabled={cargandoBusquedaAccion || !busqueda.trim()}
              >
                {cargandoBusquedaAccion && busqueda ? <Loader2 className="animate-spin" size={16}/> : 'Buscar DB'}
              </button>
            </div>
            <div className="overflow-y-auto max-h-72 sm:max-h-96 border border-gray-200 rounded-md p-2 bg-gray-50 min-h-[200px] flex flex-col">
              {cargandoProductosIniciales ? (
                <div className="flex-grow flex justify-center items-center text-gray-500"><Loader2 className="animate-spin text-indigo-500 mr-2" size={24}/>Cargando lista inicial...</div>
              ) : cargandoBusquedaAccion ? (
                 <div className="flex-grow flex justify-center items-center text-gray-500"><Loader2 className="animate-spin text-indigo-500 mr-2" size={24}/>{mensajeInfoVista || "Buscando..."}</div>
              ) : variantesFiltradas.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  {variantesFiltradas.map(v => (
                    <div 
                      key={v.idProductoVariante} 
                      className="border bg-white rounded-md p-2 sm:p-3 cursor-pointer hover:shadow-lg hover:border-indigo-500 transition-all"
                      onClick={() => handleSeleccionarVarianteDeLista(v)}
                    >
                      <p className="font-medium text-xs sm:text-sm truncate" title={v.producto?.nombre || 'Producto sin nombre'}>{v.producto?.nombre || 'Producto sin nombre'}</p>
                      <div className="flex justify-between text-[10px] sm:text-xs">
                        <span className="text-gray-600">{v.color?.nombre || 'Sin color'}</span>
                        <span className="text-gray-600">Talla: {v.talla?.nombreTalla || 'Única'}</span>
                      </div>
                      <p className="text-[10px] sm:text-xs text-gray-500">
                        {v.codigoBarrasVariante || (v.producto && v.producto.codigoIdentificacion) || 'Sin código'}
                      </p>
                      <p className={`text-[10px] sm:text-xs font-semibold ${v.cantidad > 5 ? 'text-green-600' : v.cantidad > 0 ? 'text-orange-500' : 'text-red-600'}`}>
                        Stock: {v.cantidad || 0}
                      </p>
                      <p className="text-sm font-semibold text-indigo-600 mt-1">S/{(v.producto?.precioUnitario || 0).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-grow flex justify-center items-center text-center text-gray-500 p-4">
                    {mensajeInfoVista || "No se encontraron variantes de productos. Intente otra búsqueda o verifique la conexión."}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-white rounded-lg shadow-md flex-1 flex flex-col">
            <div className="p-3 sm:p-4 border-b"><h2 className="text-lg sm:text-xl font-semibold text-gray-800">Resumen de Venta</h2></div>
            <div className="p-3 sm:p-4 flex flex-col flex-grow justify-between">
              <div className="overflow-auto max-h-60 sm:max-h-[calc(100vh-580px)] min-h-[150px]"> 
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10"><tr>
                    <th className="px-2 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">Descripción</th>
                    <th className="px-1 py-2 text-center text-[10px] sm:text-xs font-medium text-gray-500 uppercase">Cant.</th>
                    <th className="px-2 py-2 text-right text-[10px] sm:text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-1 py-2 text-center text-[10px] sm:text-xs font-medium text-gray-500 uppercase"></th>
                  </tr></thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {productosSeleccionadosVenta.map(p => (
                      <tr key={p.idProductoVariante} className="hover:bg-gray-50">
                        <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-700 max-w-[100px] sm:max-w-[150px] truncate" title={`${p.descripcion} - ${p.color} - ${p.talla}`}>
                          <div>
                            <span className="font-medium">{p.descripcion}</span>
                            <div className="text-[9px] text-gray-500">Talla: {p.talla} - Color: {p.color}</div>
                          </div>
                        </td>
                        <td className="px-1 py-1.5 whitespace-nowrap text-xs text-center">
                          <div className="flex items-center justify-center">
                            <button className="text-red-600 hover:text-red-800 p-0.5" onClick={() => handleActualizarCantidadEnVenta(p.idProductoVariante, p.cantidad - 1)}>-</button>
                            <span className="mx-1.5 w-5 text-center font-medium">{p.cantidad}</span>
                            <button className="text-green-600 hover:text-green-800 p-0.5" onClick={() => handleActualizarCantidadEnVenta(p.idProductoVariante, p.cantidad + 1)}>+</button>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-xs text-right font-medium">S/{p.total.toFixed(2)}</td>
                        <td className="px-1 py-1.5 whitespace-nowrap text-xs text-center">
                          <button className="text-red-500 hover:text-red-700" onClick={() => handleEliminarProductoDeVenta(p.idProductoVariante)}><X size={14} /></button>
                        </td>
                      </tr>
                    ))}
                    {productosSeleccionadosVenta.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">Agregue productos a la venta.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="mt-auto pt-3 sm:pt-4"> 
                <div className="border-t border-gray-200 pt-3 sm:pt-4">
                  <div className="flex justify-between mb-1 text-xs sm:text-sm"><span className="font-medium text-gray-600">Subtotal:</span><span className="font-medium">S/{subtotalVenta.toFixed(2)}</span></div>
                  <div className="flex justify-between mb-1 text-xs sm:text-sm"><span className="font-medium text-gray-600">IGV (18%):</span><span className="font-medium">S/{igvVenta.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-base sm:text-lg mt-1.5"><span className="text-gray-800">Total General:</span><span className="text-indigo-600">S/{totalGeneralVenta.toFixed(2)}</span></div>
                </div>
                <div className="mt-3 sm:mt-4">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Métodos de pago</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                    {paymentMethods.map(method => (
                      <button key={method.id}
                        className={`flex items-center justify-center text-[10px] sm:text-xs px-1.5 py-1.5 sm:px-2 sm:py-2 border rounded-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 ${metodoPago === method.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg transform scale-105' : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 focus:ring-indigo-500'}`}
                        onClick={() => setMetodoPago(method.id)}>
                        {method.icon} {method.name}
                      </button>
                    ))}
                  </div>
                  <button onClick={handleProcesarVentaFinal}
                    disabled={cargandoProcesoVenta || !metodoPago || !cliente.trim() || productosSeleccionadosVenta.length === 0}
                    className="w-full py-2.5 sm:py-3 rounded-md font-semibold text-sm sm:text-base bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center">
                    {cargandoProcesoVenta ? <Loader2 className="animate-spin mr-2" size={20}/> : null}
                    {cargandoProcesoVenta ? 'Procesando Venta...' : 'Procesar y Finalizar Venta'}
                  </button>
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