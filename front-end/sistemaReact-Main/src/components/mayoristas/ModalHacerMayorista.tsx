import React, { useState, useEffect, useCallback } from 'react';
import { MaterialIcon } from '@/shared/ui';

// Importar servicios
import { ClienteService } from '../../services/ClienteService';
import { MayoristaService } from '../../services/MayoristaService';

// Importar tipos
import type { Cliente } from '../../types/Cliente';
import type { MayoristaDTO, CrearMayoristaCompletoDTO } from '../../types/MayoristaDTO';
import { AppModal, ConfirmModal } from '@/shared/ui';

// Estilos CSS para las animaciones del modal
const modalStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  
  @keyframes scaleIn {
    from { 
      opacity: 0; 
      transform: scale(0.9); 
    }
    to { 
      opacity: 1; 
      transform: scale(1); 
    }
  }
  
  @keyframes scaleOut {
    from { 
      opacity: 1; 
      transform: scale(1); 
    }
    to { 
      opacity: 0; 
      transform: scale(0.9); 
    }
  }
  
  @keyframes bounce {
    0%, 20%, 53%, 80%, 100% {
      transform: translate3d(0,0,0);
    }
    40%, 43% {
      transform: translate3d(0, -8px, 0);
    }
    70% {
      transform: translate3d(0, -4px, 0);
    }
    90% {
      transform: translate3d(0, -2px, 0);
    }
  }
  
  @keyframes pulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
    }
  }
  
  @keyframes shake {
    0%, 100% {
      transform: translateX(0);
    }
    10%, 30%, 50%, 70%, 90% {
      transform: translateX(-4px);
    }
    20%, 40%, 60%, 80% {
      transform: translateX(4px);
    }
  }
  
  @keyframes successPulse {
    0% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
    }
    70% {
      transform: scale(1.02);
      box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
    }
  }
  
  .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
  .animate-fadeOut { animation: fadeOut 0.3s ease-out; }
  .animate-scaleIn { animation: scaleIn 0.3s ease-out; }
  .animate-scaleOut { animation: scaleOut 0.3s ease-out; }
  .animate-bounce { animation: bounce 0.6s ease-in-out; }
  .animate-pulse-custom { animation: pulse 1s ease-in-out infinite; }
  .animate-shake { animation: shake 0.5s ease-in-out; }
  .animate-success-pulse { animation: successPulse 0.8s ease-out; }
`;

// Inyectar estilos si no existen
if (typeof document !== 'undefined' && !document.getElementById('modal-animations-mayorista')) {
  const style = document.createElement('style');
  style.id = 'modal-animations-mayorista';
  style.textContent = modalStyles;
  document.head.appendChild(style);
}

// Tipos para el modal
type ModoModal = 'buscar' | 'crear';

interface ModalHacerMayoristaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (mayorista: MayoristaDTO) => void;
  clientePreseleccionado?: Cliente | null; // Cliente ya seleccionado desde fuera
}

const getStatusCode = (error: unknown): number | undefined => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: unknown }).response !== null &&
    'status' in ((error as { response?: { status?: unknown } }).response ?? {})
  ) {
    const status = (error as { response?: { status?: unknown } }).response?.status;
    return typeof status === 'number' ? status : undefined;
  }

  return undefined;
};

const ModalHacerMayorista: React.FC<ModalHacerMayoristaProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  clientePreseleccionado = null
}) => {
  // Estado del modo actual del modal
  const [modo, setModo] = useState<ModoModal>('buscar');

  // Estados principales para buscar clientes existentes
  const [searchTerm, setSearchTerm] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [esMayorista, setEsMayorista] = useState<boolean>(false);
  const [codigoMayoristaCliente, setCodigoMayoristaCliente] = useState<string | null>(null);

  // Estados para crear nuevo cliente
  const [nuevoCliente, setNuevoCliente] = useState<CrearMayoristaCompletoDTO>({
    nombreCliente: '',
    tipoCliente: 'PERSONA', // Será PERSONA para DNI o EMPRESA para RUC
    numeroDocumento: ''
  });
  const [tipoDocumento, setTipoDocumento] = useState<'DNI' | 'RUC'>('DNI');
  const [buscandoDatosExternos, setBuscandoDatosExternos] = useState(false);
  const [datosEncontrados, setDatosEncontrados] = useState(false);
  
  // Estados de carga y procesos
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [verificandoMayorista, setVerificandoMayorista] = useState(false);
  const [convirtiendoMayorista, setConvirtiendoMayorista] = useState(false);
  const [eliminandoMayorista, setEliminandoMayorista] = useState(false);
  const [creandoMayorista, setCreandoMayorista] = useState(false);
  
  // Estados de resultado
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [codigoMayorista, setCodigoMayorista] = useState<string | null>(null);
  const [mayoristaCreadoOConvertido, setMayoristaCreadoOConvertido] = useState<MayoristaDTO | null>(null);
  const [mostrarConfirmacionExito, setMostrarConfirmacionExito] = useState(false);
  const [mostrarConfirmacionEliminacion, setMostrarConfirmacionEliminacion] = useState(false);
  const [mostrarModalConfirmacionEliminar, setMostrarModalConfirmacionEliminar] = useState(false);
  
  // Estado para animación de cierre
  const [cerrandoModal, setCerrandoModal] = useState(false);
  
  // Estados para animaciones de botones
  const [animacionBotonConvertir, setAnimacionBotonConvertir] = useState('');

  // Mensaje para el modal de confirmación de eliminación
  const mensajeConfirmacionEliminar = clienteSeleccionado 
    ? `¿Estás seguro de que deseas revocar el estatus de mayorista a ${clienteSeleccionado.nombreCliente}? Esta acción suspenderá sus beneficios actuales.`
    : '¿Estás seguro de que deseas revocar el estatus de mayorista?';

  // Función para cerrar modal con animación
  const cerrarModalConAnimacion = () => {
    setCerrandoModal(true);
    setTimeout(() => {
      resetModal(); // Resetear el modal DESPUÉS de la animación
      onClose();
      setCerrandoModal(false);
    }, 300); // Duración de la animación
  };

  // Función para buscar clientes
  const buscarClientes = useCallback(async (termino: string) => {
    if (!termino.trim()) {
      setClientes([]);
      return;
    }

    setBuscandoClientes(true);
    setError(null);

    try {
      // Buscar por documento primero (silencioso si no encuentra)
      const clientePorDocumento = await ClienteService.obtenerClientePorDocumento(termino);
      
      if (clientePorDocumento) {
        setClientes([clientePorDocumento]);
      } else {
        // Si no encuentra por documento, cargar todos y filtrar por nombre
        const todosClientes = await ClienteService.obtenerTodosClientes();
        const clientesFiltrados = todosClientes.filter(cliente =>
          cliente.nombreCliente.toLowerCase().includes(termino.toLowerCase()) ||
          cliente.numeroDocumento.includes(termino)
        );
        setClientes(clientesFiltrados);
      }
    } catch (error) {
      console.error('Error al buscar clientes:', error);
      setError('Error al buscar clientes. Intente nuevamente.');
      setClientes([]);
    } finally {
      setBuscandoClientes(false);
    }
  }, []);

  // Función para verificar si el cliente ya es mayorista
  const verificarMayorista = useCallback(async (cliente: Cliente) => {
    setVerificandoMayorista(true);
    setError(null);
    setCodigoMayoristaCliente(null);
    
    try {
      console.log('🔍 Verificando mayorista para cliente:', {
        id: cliente.idCliente,
        nombre: cliente.nombreCliente,
        documento: cliente.numeroDocumento,
        tipoCliente: cliente.tipoCliente
      });
      
      const esMayoristaResult = await MayoristaService.esMayorista(cliente.numeroDocumento);
      console.log('📋 Resultado de verificación:', esMayoristaResult);
      
      setEsMayorista(esMayoristaResult);
      
      // Si es mayorista, obtener su código
      if (esMayoristaResult) {
        try {
          const mayorista = await MayoristaService.obtenerMayoristaPorDocumento(cliente.numeroDocumento);
          if (mayorista?.codigoMayorista) {
            setCodigoMayoristaCliente(mayorista.codigoMayorista);
            console.log('👑 Código de mayorista obtenido:', mayorista.codigoMayorista);
          }
        } catch (error) {
          console.warn('⚠️ Error al obtener código de mayorista:', error);
        }
      }
    } catch (error) {
      console.warn('❌ Error al verificar el estado de mayorista:', error);
      // Si hay un error, asumimos que no es mayorista
      setEsMayorista(false);
      setCodigoMayoristaCliente(null);
    } finally {
      setVerificandoMayorista(false);
    }
  }, []);

  // Función para seleccionar un cliente
  const seleccionarCliente = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setClientes([]); // Limpiar resultados de búsqueda
    setSearchTerm(cliente.nombreCliente); // Mostrar nombre en el input
    verificarMayorista(cliente);
  };

  // Función para convertir a mayorista
  const convertirAMayorista = async () => {
    if (!clienteSeleccionado?.idCliente) return;

    // Animación de procesamiento
    setAnimacionBotonConvertir('animate-pulse-custom');
    setConvirtiendoMayorista(true);
    setError(null);
    setExito(null);

    try {
      const nuevoMayorista = await MayoristaService.crearMayoristaDeClienteExistente(clienteSeleccionado.idCliente);
      setCodigoMayorista(nuevoMayorista.codigoMayorista);
      setExito(`¡Cliente convertido a mayorista exitosamente! Código: ${nuevoMayorista.codigoMayorista}`);
      setMayoristaCreadoOConvertido(nuevoMayorista);
      setEsMayorista(true);
      setMostrarConfirmacionExito(true);
      
      // Animación de éxito
      setAnimacionBotonConvertir('animate-success-pulse');
      setTimeout(() => setAnimacionBotonConvertir(''), 800);
      
      console.log('✅ Cliente convertido - mostrando confirmación de éxito');
      
      // NO ejecutar callback automáticamente para evitar cierre del modal
      // El callback se ejecutará cuando el usuario cierre manualmente el modal

      // NO cerrar automáticamente - dejar que el usuario vea el código y cierre manualmente

    } catch (error: any) {
      console.error('Error al convertir a mayorista:', error);
      const status = getStatusCode(error);
      if (status === 400) {
        setError('El cliente ya es mayorista o hay un error en los datos.');
      } else {
        setError('Error al convertir cliente a mayorista. Intente nuevamente.');
      }
    } finally {
      setConvirtiendoMayorista(false);
    }
  };

  // Función para mostrar confirmación de eliminación
  const mostrarConfirmacionEliminacionMayorista = () => {
    setMostrarModalConfirmacionEliminar(true);
    setError(null);
  };

  // Función para eliminar mayorista
  const eliminarMayorista = async () => {
    if (!clienteSeleccionado?.idCliente) return;

    // NO cerrar modal de confirmación aquí - mantenerlo abierto durante el proceso
    setEliminandoMayorista(true);
    setError(null);
    setExito(null);

    try {
      // Primero obtener el mayorista por documento para conseguir su ID
      const mayorista = await MayoristaService.obtenerMayoristaPorDocumento(clienteSeleccionado.numeroDocumento);
      
      if (!mayorista) {
        setError('No se encontró el mayorista para eliminar.');
        return;
      }

      // Eliminar el mayorista
      const eliminado = await MayoristaService.eliminarMayorista(mayorista.idMayorista ?? mayorista.idCliente);
      
      if (eliminado) {
        setExito(`¡Mayorista eliminado exitosamente! ${clienteSeleccionado.nombreCliente} ya no es mayorista.`);
        setEsMayorista(false);
        setCodigoMayoristaCliente(null); // Limpiar el código al eliminar
        
        // Cerrar modal de confirmación y mostrar resultado
        setMostrarModalConfirmacionEliminar(false);
        setMostrarConfirmacionEliminacion(true);
        
        // NO ejecutar callback automáticamente para evitar cierre del modal
        // El callback se ejecutará cuando el usuario cierre manualmente el modal

        // NO cerrar automáticamente - dejar que el usuario vea la confirmación y cierre manualmente
      } else {
        setError('No se pudo eliminar el mayorista. Intente nuevamente.');
      }

    } catch (error: any) {
      console.error('Error al eliminar mayorista:', error);
      const status = getStatusCode(error);
      if (status === 404) {
        setError('No se encontró el mayorista para eliminar.');
      } else {
        setError('Error al eliminar mayorista. Intente nuevamente.');
      }
    } finally {
      setEliminandoMayorista(false);
    }
  };

  // Función para crear un nuevo cliente y convertirlo directamente a mayorista
  const crearNuevoMayorista = async () => {
    // Validaciones
    if (!nuevoCliente.nombreCliente.trim()) {
      setError('El nombre del cliente es obligatorio.');
      return;
    }
    
    if (!nuevoCliente.numeroDocumento.trim()) {
      setError('El número de documento es obligatorio.');
      return;
    }

    // Validar formato según tipo de documento
    if (tipoDocumento === 'DNI' && nuevoCliente.numeroDocumento.length !== 8) {
      setError('El DNI debe tener 8 dígitos.');
      return;
    }
    
    if (tipoDocumento === 'RUC' && nuevoCliente.numeroDocumento.length !== 11) {
      setError('El RUC debe tener 11 dígitos.');
      return;
    }

    setCreandoMayorista(true);
    setError(null);
    setExito(null);

    try {
      // Primero verificar si ya existe un cliente con ese documento
      const clienteExistente = await ClienteService.obtenerClientePorDocumento(nuevoCliente.numeroDocumento);
      
      if (clienteExistente) {
        setError('Ya existe un cliente con ese número de documento. Usa el modo "Buscar Cliente" para convertirlo.');
        return;
      }

      // Crear el mayorista completo (cliente + mayorista)
      const mayorista = await MayoristaService.crearMayoristaCompleto(nuevoCliente);
      
      console.log('🎉 Mayorista creado exitosamente:', mayorista);
      
      setCodigoMayorista(mayorista.codigoMayorista);
      setExito(`¡Nuevo mayorista creado exitosamente! Cliente: ${mayorista.nombreCliente}, Código: ${mayorista.codigoMayorista}`);
      setMayoristaCreadoOConvertido(mayorista);
      setMostrarConfirmacionExito(true);
      
      console.log('✅ Estados actualizados - mostrando confirmación de éxito');
      
      // NO ejecutar callback automáticamente para evitar cierre del modal
      // El callback se ejecutará cuando el usuario cierre manualmente el modal

      // NO cerrar automáticamente - dejar que el usuario vea el código y cierre manualmente

    } catch (error: any) {
      console.error('Error al crear nuevo mayorista:', error);
      const status = getStatusCode(error);
      if (status === 400) {
        setError('Error en los datos proporcionados. Verifique la información.');
      } else if (status === 409) {
        setError('Ya existe un cliente con ese documento.');
      } else {
        setError('Error al crear el nuevo mayorista. Intente nuevamente.');
      }
    } finally {
      setCreandoMayorista(false);
    }
  };

  // Función para cambiar modo del modal
  const cambiarModo = (nuevoModo: ModoModal) => {
    setModo(nuevoModo);
    setError(null);
    setExito(null);
    
    // Limpiar estados específicos del modo anterior
    if (nuevoModo === 'buscar') {
      setNuevoCliente({
        nombreCliente: '',
        tipoCliente: 'PERSONA',
        numeroDocumento: ''
      });
      setTipoDocumento('DNI');
      setBuscandoDatosExternos(false);
      setDatosEncontrados(false);
    } else {
      setSearchTerm('');
      setClientes([]);
      setClienteSeleccionado(null);
      setEsMayorista(false);
      setCodigoMayoristaCliente(null);
    }
  };

  // Función para manejar cambios en el formulario de nuevo cliente
  const manejarCambioNuevoCliente = (campo: keyof CrearMayoristaCompletoDTO, valor: string) => {
    setNuevoCliente(prev => ({
      ...prev,
      [campo]: valor
    }));
    setError(null); // Limpiar errores al escribir
  };

  // Función para resetear el modal
  const resetModal = () => {
    setModo('buscar');
    setSearchTerm('');
    setClientes([]);
    setClienteSeleccionado(null);
    setEsMayorista(false);
    setCodigoMayoristaCliente(null);
    setNuevoCliente({
      nombreCliente: '',
      tipoCliente: 'PERSONA',
      numeroDocumento: ''
    });
    setTipoDocumento('DNI');
    setBuscandoDatosExternos(false);
    setDatosEncontrados(false);
    setError(null);
    setExito(null);
    setCodigoMayorista(null);
    setMayoristaCreadoOConvertido(null);
    setMostrarConfirmacionExito(false);
    setMostrarConfirmacionEliminacion(false);
    setMostrarModalConfirmacionEliminar(false);
    setBuscandoClientes(false);
    setVerificandoMayorista(false);
    setConvirtiendoMayorista(false);
    setEliminandoMayorista(false);
    setCreandoMayorista(false);
  };

  // Función helper para obtener el placeholder del nombre
  const obtenerPlaceholderNombre = () => {
    if (datosEncontrados) {
      return "Nombre obtenido automáticamente";
    }
    
    const tipoNombre = tipoDocumento === 'RUC' ? 'de la empresa' : 'completo del cliente';
    return `Ingrese el nombre ${tipoNombre}`;
  };

  // Función para buscar datos del cliente en APIs externas
  const buscarDatosExternos = async (tipoDoc: string, numeroDoc: string) => {
    setBuscandoDatosExternos(true);
    setError(null);
    setDatosEncontrados(false);

    try {
      // Validar formato del documento
      if (tipoDoc === 'DNI' && numeroDoc.length !== 8) {
        setError('El DNI debe tener exactamente 8 dígitos.');
        return;
      }
      
      if (tipoDoc === 'RUC' && numeroDoc.length !== 11) {
        setError('El RUC debe tener exactamente 11 dígitos.');
        return;
      }

      // Verificar si ya existe un cliente con ese documento
      const clienteExistente = await ClienteService.obtenerClientePorDocumento(numeroDoc);
      
      if (clienteExistente) {
        setError('Ya existe un cliente registrado con este documento. Usa el modo "Buscar Cliente" para convertirlo a mayorista.');
        return;
      }

      // Buscar datos usando los mismos métodos que el sistema de ventas
      let clienteEncontrado = null;
      
      if (tipoDoc === 'DNI') {
        clienteEncontrado = await ClienteService.obtenerClientePorDNI(numeroDoc);
      } else if (tipoDoc === 'RUC') {
        clienteEncontrado = await ClienteService.obtenerClientePorRUC(numeroDoc);
      }

      if (clienteEncontrado) {
        // Si encontramos datos en las APIs externas, usar el nombre obtenido
        setNuevoCliente(prev => ({
          ...prev,
          nombreCliente: clienteEncontrado.nombreCliente
        }));
        setDatosEncontrados(true);
        setError(null);
      } else {
        // Si no se encuentran datos, permitir ingreso manual
        setError(`No se encontraron datos para el ${tipoDoc} ingresado en las bases de datos externas. Puede ingresar el nombre manualmente.`);
        setDatosEncontrados(false);
      }

    } catch (error: any) {
      console.error('Error al buscar datos externos:', error);
      const status = getStatusCode(error);
      
      // Manejo específico de errores según el código de respuesta
      if (status === 404) {
        setError(`No se encontraron datos para el ${tipoDoc} ingresado. Puede ingresar el nombre manualmente.`);
      } else if (status === 400) {
        setError(`El formato del ${tipoDoc} no es válido. Verifique el número ingresado.`);
      } else if (typeof status === 'number' && status >= 500) {
        setError('Error en el servidor de consultas externas. Puede ingresar el nombre manualmente.');
      } else {
        setError('Error al consultar las bases de datos externas. Puede ingresar el nombre manualmente.');
      }
      
      setDatosEncontrados(false);
    } finally {
      setBuscandoDatosExternos(false);
    }
  };

  // Efecto para buscar clientes cuando cambia el término de búsqueda
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm && !clienteSeleccionado) {
        buscarClientes(searchTerm);
      }
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [searchTerm, clienteSeleccionado, buscarClientes]);

  // Efecto para resetear cuando se abre el modal por primera vez
  useEffect(() => {
    if (isOpen) {
      // Solo resetear si realmente se está abriendo el modal por primera vez
      // Verificamos si no estamos en medio de una operación
      if (!mostrarModalConfirmacionEliminar && !mostrarConfirmacionExito && !mostrarConfirmacionEliminacion) {
        resetModal();
        // Si hay un cliente preseleccionado, configurarlo
        if (clientePreseleccionado) {
          setClienteSeleccionado(clientePreseleccionado);
          setSearchTerm(clientePreseleccionado.nombreCliente);
          verificarMayorista(clientePreseleccionado);
        }
      }
    }
  }, [isOpen, clientePreseleccionado, verificarMayorista, mostrarModalConfirmacionEliminar, mostrarConfirmacionExito, mostrarConfirmacionEliminacion]);

  if (!isOpen) return null;

  // Renderizar pantalla de confirmación de éxito
  const renderPantallaExito = () => (
    <div className="text-center py-10 px-4 animate-fadeIn">
      <div className="mx-auto flex items-center justify-center w-20 h-20 bg-app-accent rounded-[2rem] mb-8 shadow-[0_20px_40px_rgba(0,0,0,0.2)]">
        <MaterialIcon icon="check_circle" className="w-10 h-10 text-app-accent-fg" />
      </div>
      <h3 className="text-2xl font-black text-black mb-3 tracking-tight">
        {modo === 'crear' ? 'Registro Exitoso' : 'Conversión Exitosa'}
      </h3>
      <p className="text-gray-400 font-medium mb-10 max-w-xs mx-auto text-sm">
        {modo === 'crear' 
          ? `El cliente ${nuevoCliente.nombreCliente} ha sido integrado al sistema mayorista.`
          : `Los privilegios de mayorista para ${clienteSeleccionado?.nombreCliente} han sido activados.`
        }
      </p>
      
      <div className="bg-app-surface rounded-[2.5rem] p-8 mb-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
          <MaterialIcon icon="crown" className="w-[100px] h-[100px]" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <MaterialIcon icon="crown" className="w-4 h-4 text-black opacity-40" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">
              Código de Membresía
            </span>
          </div>
          <div className="text-4xl font-black text-black tracking-tighter">{codigoMayorista ?? 'N/A'}</div>
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mt-4">Válido para todas las sucursales</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          if (onSuccess && mayoristaCreadoOConvertido) {
            onSuccess(mayoristaCreadoOConvertido);
          }
          cerrarModalConAnimacion();
        }}
        className="w-full py-5 bg-app-accent text-app-accent-fg rounded-[2rem] text-[11px] font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.15)] active:scale-[0.98] flex items-center justify-center gap-3"
      >
        <MaterialIcon icon="check_circle" className="w-4 h-4" />
        <span>Finalizar Proceso</span>
      </button>
    </div>
  );

  const renderPantallaEliminacion = () => (
    <div className="text-center py-10 px-4 animate-fadeIn">
      <div className="mx-auto flex items-center justify-center w-20 h-20 bg-red-50 rounded-[2rem] mb-8">
        <MaterialIcon icon="delete" className="w-10 h-10 text-red-500" />
      </div>
      <h3 className="text-2xl font-black text-black mb-3 tracking-tight">Estatus Revocado</h3>
      <p className="text-gray-400 font-medium mb-10 max-w-xs mx-auto text-sm">
        {clienteSeleccionado?.nombreCliente} ha dejado de ser mayorista y sus beneficios han sido suspendidos.
      </p>
      <div className="bg-red-50/50 rounded-[2rem] p-6 mb-10 border border-red-100/50">
        <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Sincronización de Base de Datos Completada</p>
      </div>
      <button
        type="button"
        onClick={() => {
          if (onSuccess) {
            onSuccess({} as MayoristaDTO);
          }
          cerrarModalConAnimacion();
        }}
        className="w-full py-5 bg-app-accent text-app-accent-fg rounded-[2rem] text-[11px] font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.15)] active:scale-[0.98] flex items-center justify-center gap-3"
      >
        <MaterialIcon icon="check_circle" className="w-4 h-4" />
        <span>Confirmar y Salir</span>
      </button>
    </div>
  );

  // Renderizar toggle de modo
  const renderToggleModo = () => {
    if (clientePreseleccionado || mostrarConfirmacionExito || mostrarConfirmacionEliminacion) {
      return null;
    }

    return (
      <div className="px-8 py-5 bg-[#fafafa]/50 backdrop-blur-sm">
        <div className="flex items-center justify-center bg-app-surface/80 backdrop-blur-md rounded-2xl p-1.5 shadow-sm max-w-[400px] mx-auto">
          <button
            onClick={() => cambiarModo('buscar')}
            className={`flex-1 flex items-center justify-center space-x-2.5 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
              modo === 'buscar'
                ? 'bg-app-accent text-app-accent-fg shadow-[0_4px_12px_rgba(0,0,0,0.12)]'
                : 'text-app-text-muted hover:text-app-text hover:bg-app-hover-overlay'
            }`}
          >
            <MaterialIcon icon="search" className="w-3.5 h-3.5" />
            <span>Buscar Cliente</span>
          </button>
          <button
            onClick={() => cambiarModo('crear')}
            className={`flex-1 flex items-center justify-center space-x-2.5 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
              modo === 'crear'
                ? 'bg-app-accent text-app-accent-fg shadow-[0_4px_12px_rgba(0,0,0,0.12)]'
                : 'text-app-text-muted hover:text-app-text hover:bg-app-hover-overlay'
            }`}
          >
            <MaterialIcon icon="person_add" className="w-3.5 h-3.5" />
            <span>Crear Nuevo</span>
          </button>
        </div>
      </div>
    );
  };

  // Renderizar barra de búsqueda
  const renderBarraBusqueda = () => {
    if (clientePreseleccionado) return null;

    return (
      <div className="mb-8">
        <label htmlFor="buscar-cliente" className="block text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase mb-3 px-1">
          Búsqueda de Identidad
        </label>
        <div className="relative group">
          <MaterialIcon icon="search" className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors w-[18px] h-[18px]" />
          <input
            id="buscar-cliente"
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (clienteSeleccionado) {
                setClienteSeleccionado(null);
                setEsMayorista(false);
                setCodigoMayoristaCliente(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                cerrarModalConAnimacion();
              }
            }}
            placeholder="DNI, RUC o Nombre del Cliente..."
            className="w-full pl-12 pr-12 py-4 bg-app-input border-transparent rounded-[1.25rem] text-sm font-medium focus:bg-app-surface focus:ring-2 focus:ring-app-ring transition-all duration-300 placeholder:text-app-text-muted"
            autoFocus
          />
          {buscandoClientes && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <MaterialIcon icon="progress_activity" className="animate-spin text-black w-[18px] h-[18px]" />
            </div>
          )}
        </div>
      </div>
    );
  };

  // Renderizar resultados de búsqueda
  const renderResultadosBusqueda = () => {
    if (clientes.length === 0 || clienteSeleccionado) return null;

    return (
      <div className="mb-8 bg-app-surface rounded-[1.5rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden animate-fadeIn">
        <div className="px-6 py-3 bg-gray-50/50 flex justify-between items-center">
          <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">
            Coincidencias ({clientes.length})
          </h3>
        </div>
        <div className="max-h-56 overflow-y-auto">
          {clientes.map((cliente) => (
            <button
              key={cliente.idCliente}
              onClick={() => seleccionarCliente(cliente)}
              className="w-full px-6 py-4 text-left hover:bg-app-hover-overlay transition-colors duration-200 flex items-center justify-between group"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-app-bg-muted rounded-xl flex items-center justify-center group-hover:bg-app-surface group-hover:shadow-sm transition-all">
                  <MaterialIcon icon="person" className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-bold text-app-text">{cliente.nombreCliente}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded uppercase">
                      {cliente.tipoCliente}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">{cliente.numeroDocumento}</span>
                  </div>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-8 h-8 bg-app-accent rounded-lg flex items-center justify-center">
                  <MaterialIcon icon="check_circle" className="w-4 h-4 text-app-accent-fg" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Renderizar modo buscar
  const renderModoBuscar = () => {
    if (modo !== 'buscar') return null;

    return (
      <>
        {renderBarraBusqueda()}
        {renderResultadosBusqueda()}
      </>
    );
  };

  // Renderizar formulario de nuevo cliente
  const renderFormularioNuevoCliente = () => {
    if (modo !== 'crear') return null;

    return (
      <div className="mb-8 animate-fadeIn">
        <div className="space-y-6">
          {/* Documento del Cliente */}
          <div className="relative">
            <label htmlFor="documento-mayorista" className="block text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase mb-3 px-1">
              Documentación Oficial
            </label>
            <div className="flex gap-2">
              <select
                value={tipoDocumento}
                onChange={(e) => {
                  const nuevoTipo = e.target.value as 'DNI' | 'RUC';
                  setTipoDocumento(nuevoTipo);
                  const nuevoTipoCliente = nuevoTipo === 'DNI' ? 'PERSONA' : 'EMPRESA';
                  manejarCambioNuevoCliente('tipoCliente', nuevoTipoCliente);
                  manejarCambioNuevoCliente('numeroDocumento', '');
                  manejarCambioNuevoCliente('nombreCliente', '');
                  setDatosEncontrados(false);
                  setError(null);
                }}
                className="w-24 px-4 py-4 bg-app-input border-transparent rounded-[1.25rem] text-xs font-bold focus:bg-app-surface focus:ring-2 focus:ring-app-ring transition-all appearance-none cursor-pointer"
              >
                <option value="DNI">DNI</option>
                <option value="RUC">RUC</option>
              </select>
              <div className="relative flex-1">
                <input 
                  id="documento-mayorista" 
                  type="text" 
                  className={`w-full px-5 py-4 bg-app-input border-transparent rounded-[1.25rem] text-sm font-medium focus:bg-app-surface focus:ring-2 focus:ring-app-ring transition-all ${
                    nuevoCliente.numeroDocumento && 
                    ((tipoDocumento === 'DNI' && (nuevoCliente.numeroDocumento.length !== 8 || !/^\d+$/.test(nuevoCliente.numeroDocumento))) || 
                     (tipoDocumento === 'RUC' && (nuevoCliente.numeroDocumento.length !== 11 || !/^\d+$/.test(nuevoCliente.numeroDocumento)))) 
                    ? 'ring-2 ring-red-100 !bg-red-50/30' 
                    : ''
                  }`}
                  value={nuevoCliente.numeroDocumento} 
                  onChange={(e) => {
                    const valor = e.target.value.replace(/\D/g, '');
                    manejarCambioNuevoCliente('numeroDocumento', valor);
                    if (datosEncontrados) {
                      manejarCambioNuevoCliente('nombreCliente', '');
                      setDatosEncontrados(false);
                    }
                  }}
                  placeholder={tipoDocumento === 'DNI' ? "DNI (8 dígitos)" : "RUC (11 dígitos)"} 
                  maxLength={tipoDocumento === 'DNI' ? 8 : 11}
                />
                <button
                  type="button"
                  onClick={() => buscarDatosExternos(tipoDocumento, nuevoCliente.numeroDocumento)}
                  disabled={
                    buscandoDatosExternos || 
                    !nuevoCliente.numeroDocumento || 
                    (tipoDocumento === 'DNI' && nuevoCliente.numeroDocumento.length !== 8) ||
                    (tipoDocumento === 'RUC' && nuevoCliente.numeroDocumento.length !== 11)
                  }
                  className="absolute right-2 top-2 bottom-2 px-4 bg-app-accent text-app-accent-fg rounded-xl hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-[0.98]"
                >
                  {buscandoDatosExternos ? (
                    <MaterialIcon icon="progress_activity" className="animate-spin w-4 h-4" />
                  ) : (
                    <MaterialIcon icon="search" className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            
            {nuevoCliente.numeroDocumento && ((tipoDocumento === 'DNI' && (nuevoCliente.numeroDocumento.length !== 8 || !/^\d+$/.test(nuevoCliente.numeroDocumento))) || 
              (tipoDocumento === 'RUC' && (nuevoCliente.numeroDocumento.length !== 11 || !/^\d+$/.test(nuevoCliente.numeroDocumento)))) && (
              <p className="mt-2 ml-4 text-[10px] font-bold text-red-500 uppercase tracking-wider">
                Formato Inválido: requiere {tipoDocumento === 'DNI' ? '8' : '11'} dígitos
              </p>
            )}
          </div>
          {/* Mensajes de estado de búsqueda */}
          {buscandoDatosExternos && (
            <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 animate-pulse">
              <div className="flex items-center gap-3 text-gray-400">
                <MaterialIcon icon="progress_activity" className="animate-spin w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                  Conectando con {tipoDocumento === 'DNI' ? 'RENIEC' : 'SUNAT'}...
                </span>
              </div>
            </div>
          )}

          {datosEncontrados && (
            <div className="mb-6 p-4 bg-[#10b981]/5 rounded-2xl border border-[#10b981]/10 animate-fadeIn">
              <div className="flex items-center gap-3 text-[#10b981]">
                <MaterialIcon icon="check_circle" className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                  Sincronización Exitosa
                </span>
              </div>
            </div>
          )}

          {/* Nombre del cliente */}
          <div className="mb-8">
            <label htmlFor="nombre-cliente" className="block text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase mb-3 px-1">
              Nombre o Razón Social
            </label>
            <div className="relative group">
              <MaterialIcon icon="person" className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300 group-focus-within:text-black transition-colors w-[18px] h-[18px]" />
              <input
                id="nombre-cliente"
                type="text"
                value={nuevoCliente.nombreCliente}
                onChange={(e) => manejarCambioNuevoCliente('nombreCliente', e.target.value)}
                placeholder={obtenerPlaceholderNombre()}
                className={`w-full pl-12 pr-4 py-4 bg-app-input border-transparent rounded-[1.25rem] text-sm font-medium focus:bg-app-surface focus:ring-2 focus:ring-app-ring transition-all duration-300 ${
                  datosEncontrados ? 'ring-2 ring-[#10b981]/10 !bg-[#10b981]/5' : ''
                }`}
              />
            </div>
            {!datosEncontrados && (
              <p className="mt-3 ml-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                {nuevoCliente.numeroDocumento ? 
                  'Habilitado para ingreso manual' :
                  'Pendiente de validación de documento'
                }
              </p>
            )}
          </div>

          {/* Información adicional decorativa */}
          <div className="bg-app-surface-elevated rounded-[1.5rem] p-5">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-app-surface rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
                <MaterialIcon icon="description" className="w-4 h-4 text-app-text-muted" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-black uppercase tracking-wider mb-1">Automatización de Registro</p>
                <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                  Al confirmar, el sistema generará las credenciales de mayorista y vinculará los beneficios fiscales correspondientes de forma inmediata.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar información del cliente seleccionado
  const renderInfoClienteSeleccionado = () => {
    if (modo !== 'buscar' || !clienteSeleccionado) return null;

    return (
      <div className="mb-8 animate-fadeIn">
        <label className="block text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase mb-4 px-1">
          {clientePreseleccionado ? 'Objetivo de Conversión' : 'Ficha del Cliente'}
        </label>
        
        <div className="bg-app-surface rounded-[2rem] p-8 relative overflow-hidden group">
          {/* Fondo decorativo sutil */}
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
            <MaterialIcon icon="crown" className="w-[120px] h-[120px]" />
          </div>

          {verificandoMayorista ? (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <MaterialIcon icon="progress_activity" className="animate-spin text-black w-8 h-8" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Verificando estatus...</span>
            </div>
          ) : (
            <div className="relative z-10">
              {/* Información principal */}
              <div className="flex items-start gap-6 mb-8">
                <div className="w-16 h-16 bg-app-surface rounded-2xl shadow-sm flex items-center justify-center flex-shrink-0">
                  <MaterialIcon icon="person" className="w-8 h-8 text-app-text" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xl font-black text-black leading-tight mb-2 truncate">
                    {clienteSeleccionado.nombreCliente}
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <MaterialIcon icon="description" className="opacity-40 w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold tracking-wider uppercase">{clienteSeleccionado.tipoCliente}:</span>
                      <span className="text-[11px] font-mono font-medium">{clienteSeleccionado.numeroDocumento}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Bloque de código si ya es mayorista */}
              {esMayorista && (
                <div className="bg-app-surface/60 backdrop-blur-sm rounded-2xl p-5 mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-app-accent rounded-xl flex items-center justify-center shadow-lg">
                      <MaterialIcon icon="crown" className="text-app-accent-fg w-[18px] h-[18px]" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Identificador Mayorista</p>
                      <p className="text-sm font-black text-black tracking-tight">
                        {codigoMayoristaCliente || "SIN CÓDIGO"}
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-gray-100 rounded-full text-[9px] font-bold tracking-wider uppercase text-gray-500">
                    Vigente
                  </div>
                </div>
              )}

              {/* Estado y Acción */}
              <div className="pt-2">
                {esMayorista ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-[#f59e0b] bg-amber-50/50 px-5 py-3 rounded-2xl">
                      <MaterialIcon icon="error" className="w-[18px] h-[18px]" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Membresía activa registrada</span>
                    </div>
                    <button
                      onClick={mostrarConfirmacionEliminacionMayorista}
                      disabled={eliminandoMayorista || verificandoMayorista}
                      className="w-full group/btn flex items-center justify-center gap-3 px-6 py-4 bg-app-surface border border-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-[1.5rem] transition-all duration-300 disabled:opacity-50 active:scale-[0.98]"
                    >
                      {eliminandoMayorista ? (
                        <MaterialIcon icon="progress_activity" className="animate-spin w-[18px] h-[18px]" />
                      ) : (
                        <>
                          <MaterialIcon icon="delete" className="group-hover/btn:scale-110 transition-transform w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Revocar Privilegios</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 bg-[#10b981]/5 px-6 py-4 rounded-2xl">
                    <div className="w-8 h-8 bg-[#10b981] rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(16,185,129,0.3)]">
                      <MaterialIcon icon="check_circle" className="text-white w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#10b981]">Criterios de promoción cumplidos</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Renderizar mensajes de error y éxito
  const renderMensajes = () => (
    <>
      {error && (
        <div className="mb-6 p-5 bg-red-50/50 backdrop-blur-sm rounded-2xl animate-shake">
          <div className="flex items-center gap-3 text-red-500">
            <MaterialIcon icon="error" className="w-[18px] h-[18px]" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{error}</span>
          </div>
        </div>
      )}

      {exito && !mostrarConfirmacionExito && (
        <div className="mb-6 p-5 bg-green-50/50 backdrop-blur-sm rounded-2xl animate-fadeIn">
          <div className="flex items-center gap-3 text-green-600">
            <MaterialIcon icon="check_circle" className="w-[18px] h-[18px]" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{exito}</span>
          </div>
        </div>
      )}
    </>
  );

  // Renderizar botones de acción
  const renderBotonesAccion = () => (
    <div className="flex gap-4 p-2">
      <button
        onClick={cerrarModalConAnimacion}
        className="flex-1 py-4 bg-app-bg-muted rounded-[1.5rem] text-[10px] font-bold uppercase tracking-[0.2em] text-app-text-muted hover:text-app-text hover:bg-app-hover-overlay transition-all active:scale-[0.98]"
        disabled={convirtiendoMayorista || eliminandoMayorista || creandoMayorista}
      >
        Cancelar
      </button>
      
      {/* Botón para modo BUSCAR */}
      {modo === 'buscar' && (
        <button
          onClick={convertirAMayorista}
          disabled={!clienteSeleccionado || esMayorista || convirtiendoMayorista || eliminandoMayorista || !!exito}
          className={`flex-[1.5] py-4 bg-app-accent text-app-accent-fg rounded-[1.5rem] text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.15)] active:scale-[0.97] ${animacionBotonConvertir}`}
        >
          {convirtiendoMayorista ? (
            <MaterialIcon icon="progress_activity" className="animate-spin w-4 h-4" />
          ) : (
            <>
              <MaterialIcon icon="crown" className="w-4 h-4" />
              <span>Elevar a Mayorista</span>
            </>
          )}
        </button>
      )}

      {/* Botón para modo CREAR */}
      {modo === 'crear' && (
        <button
          onClick={crearNuevoMayorista}
          disabled={!nuevoCliente.nombreCliente || !nuevoCliente.numeroDocumento || creandoMayorista || !!exito}
          className="flex-[1.5] py-4 bg-app-accent text-app-accent-fg rounded-[1.5rem] text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.15)] active:scale-[0.97]"
        >
          {creandoMayorista ? (
            <MaterialIcon icon="progress_activity" className="animate-spin w-4 h-4" />
          ) : (
            <>
              <MaterialIcon icon="person_add" className="w-4 h-4" />
              <span>Registrar Mayorista</span>
            </>
          )}
        </button>
      )}
    </div>
  );

  const mostrarFooterAcciones =
    !mostrarConfirmacionExito && !mostrarConfirmacionEliminacion;

  // Renderizar contenido principal del modal
  const renderContenidoPrincipal = () => {
    
    if (mostrarConfirmacionExito) {
      return renderPantallaExito();
    }
    
    if (mostrarConfirmacionEliminacion) {
      return renderPantallaEliminacion();
    }
    return (
      <div className="px-2">
        {renderModoBuscar()}
        {renderFormularioNuevoCliente()}
        {renderInfoClienteSeleccionado()}
        {renderMensajes()}
      </div>
    );
  };

  return (
    <>
      <AppModal
        open={isOpen}
        closing={cerrandoModal}
        onClose={cerrarModalConAnimacion}
        title="Gestión de Membresías"
        subtitle="Conversión y Registro de Clientes Mayoristas"
        icon={<MaterialIcon icon="crown" className="w-5 h-5 text-white" />}
        maxWidth="2xl"
        belowHeader={renderToggleModo()}
        footer={mostrarFooterAcciones ? renderBotonesAccion() : undefined}
        zIndex={150}
      >
        <div className="py-2">
          {renderContenidoPrincipal()}
        </div>
      </AppModal>
      <ConfirmModal
        open={mostrarModalConfirmacionEliminar}
        title="Revocar Estatus Mayorista"
        message={mensajeConfirmacionEliminar}
        onConfirm={eliminarMayorista}
        onCancel={() => setMostrarModalConfirmacionEliminar(false)}
        confirmText="Confirmar Revocación"
        cancelText="Descartar"
        variant="danger"
      />
    </>
  );
};

export default ModalHacerMayorista;
