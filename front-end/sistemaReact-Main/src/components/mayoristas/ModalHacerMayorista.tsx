import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  X, 
  User, 
  FileText, 
  Crown,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  UserPlus
} from 'lucide-react';

// Importar servicios
import { ClienteService } from '../../services/ClienteService';
import { MayoristaService } from '../../services/MayoristaService';

// Importar tipos
import type { Cliente } from '../../types/Cliente';
import type { MayoristaDTO, CrearMayoristaCompletoDTO } from '../../types/MayoristaDTO';

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
  const [, setAnimacionBotonConvertir] = useState('');

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

    } catch (error: unknown) {
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

    } catch (error: unknown) {
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

    } catch (error: unknown) {
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

    } catch (error: unknown) {
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
  const renderPantallaExito = () => {
    console.log('🎉 Renderizando pantalla de éxito con código:', codigoMayorista);
    
    return (
    <div className="text-center py-8">
      <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {modo === 'crear' ? '¡Nuevo mayorista creado exitosamente!' : '¡Cliente convertido a mayorista exitosamente!'}
      </h3>
      <p className="text-gray-600 mb-4">
        {modo === 'crear' 
          ? `${nuevoCliente.nombreCliente || 'El cliente'} ha sido registrado como mayorista`
          : `${clienteSeleccionado?.nombreCliente} ahora es un cliente mayorista`
        }
      </p>
      
      {/* Código del mayorista destacado */}
      <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-center mb-2">
          <Crown className="w-5 h-5 text-green-600 mr-2" />
          <span className="text-sm font-medium text-green-700">Código de Mayorista</span>
        </div>
        <div className="text-2xl font-bold text-green-800 bg-white px-4 py-2 rounded-md border border-green-300 inline-block">
          {codigoMayorista ?? 'N/A'}
        </div>
        <p className="text-xs text-green-600 mt-2">Guarde este código para futuras referencias</p>
      </div>
      
      <div className="flex justify-center">
        <button
          onClick={(e) => {
            console.log('🎯 Usuario cerrando modal - ejecutando callback si existe');
            // Agregar animación de éxito al botón
            const button = e.currentTarget as HTMLButtonElement;
            button.classList.add('animate-success-pulse');
            setTimeout(() => button.classList.remove('animate-success-pulse'), 300);
            
            // Ejecutar callback con el mayorista antes de cerrar
            if (onSuccess && mayoristaCreadoOConvertido) {
              console.log('📞 Ejecutando callback onSuccess con:', mayoristaCreadoOConvertido);
              onSuccess(mayoristaCreadoOConvertido);
            }
            
            setTimeout(() => cerrarModalConAnimacion(), 200); // Pequeño delay para ver la animación
          }}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center shadow-lg hover:shadow-xl"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Cerrar
        </button>
      </div>
    </div>
    );
  };

  // Renderizar pantalla de confirmación de eliminación
  const renderPantallaEliminacion = () => (
    <div className="text-center py-8">
      <div className="mx-auto flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
        <Trash2 className="w-8 h-8 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        ¡Mayorista eliminado exitosamente!
      </h3>
      <p className="text-gray-600 mb-4">
        {clienteSeleccionado?.nombreCliente} ya no es un cliente mayorista
      </p>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-red-700">
          El estatus de mayorista ha sido removido correctamente
        </p>
      </div>
      <div className="flex justify-center">
        <button
          onClick={(e) => {
            // Agregar animación al botón
            const button = e.currentTarget as HTMLButtonElement;
            button.classList.add('animate-success-pulse');
            setTimeout(() => button.classList.remove('animate-success-pulse'), 300);
            
            // Ejecutar callback con un objeto vacío para indicar eliminación
            if (onSuccess) {
              onSuccess({} as MayoristaDTO);
            }
            
            setTimeout(() => cerrarModalConAnimacion(), 200); // Pequeño delay para ver la animación
          }}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center shadow-lg hover:shadow-xl"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Cerrar
        </button>
      </div>
    </div>
  );

  // Renderizar modal de confirmación para eliminar mayorista
  const renderModalConfirmacionEliminar = () => (
    <div className="text-center py-8">
      <div className="mx-auto flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        ¿Está seguro de eliminar el estatus de mayorista?
      </h3>
      <p className="text-gray-600 mb-6">
        Esta acción eliminará el estatus de mayorista de <strong>{clienteSeleccionado?.nombreCliente}</strong>. 
        El cliente volverá a ser un cliente regular y perderá todos los beneficios de mayorista.
      </p>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-700">
            <p className="font-medium mb-1">Advertencia:</p>
            <p>Esta acción no se puede deshacer. El cliente tendrá que ser promovido a mayorista nuevamente si es necesario.</p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => setMostrarModalConfirmacionEliminar(false)}
          disabled={eliminandoMayorista}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          onClick={eliminarMayorista}
          disabled={eliminandoMayorista}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {eliminandoMayorista ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Eliminando...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-2" />
              Sí, eliminar
            </>
          )}
        </button>
      </div>
    </div>
  );

  // Renderizar toggle de modo
  const renderToggleModo = () => {
    if (clientePreseleccionado || mostrarConfirmacionExito || mostrarConfirmacionEliminacion || mostrarModalConfirmacionEliminar) {
      return null;
    }

    return (
      <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-200/50">
        <div className="flex items-center justify-center space-x-1 bg-white rounded-lg p-1 shadow-sm">
          <button
            onClick={() => cambiarModo('buscar')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              modo === 'buscar'
                ? 'bg-green-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <Search size={16} />
            <span>Buscar Cliente</span>
          </button>
          <button
            onClick={() => cambiarModo('crear')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              modo === 'crear'
                ? 'bg-green-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <UserPlus size={16} />
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
      <div className="mb-6">
        <label htmlFor="buscar-cliente" className="block text-sm font-medium text-gray-700 mb-2">
          Buscar Cliente Existente
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
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
            placeholder="Buscar por nombre o número de documento..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all duration-200"
            autoFocus
          />
          {buscandoClientes && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Loader2 className="animate-spin text-gray-400" size={20} />
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
      <div className="mb-6 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} encontrado{clientes.length !== 1 ? 's' : ''}
          </h3>
        </div>
        <div className="max-h-60 overflow-y-auto">
          {clientes.map((cliente) => (
            <button
              key={cliente.idCliente}
              onClick={() => seleccionarCliente(cliente)}
              className="w-full px-4 py-3 text-left hover:bg-green-50 border-b border-gray-100 last:border-b-0 transition-colors duration-150 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                      <User className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{cliente.nombreCliente}</p>
                    <p className="text-xs text-gray-500">{cliente.tipoCliente}: {cliente.numeroDocumento}</p>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  Seleccionar
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
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Crear Nuevo Cliente Mayorista</h3>
        <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm p-6">
          
          {/* Documento del Cliente */}
          <div className="mb-4">
            <label htmlFor="documento-mayorista" className="block text-sm font-medium text-gray-700 mb-2">
              Documento del Cliente <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <select
                value={tipoDocumento}
                onChange={(e) => {
                  const nuevoTipo = e.target.value as 'DNI' | 'RUC';
                  setTipoDocumento(nuevoTipo);
                  // Actualizar tipoCliente basado en el tipo de documento seleccionado
                  const nuevoTipoCliente = nuevoTipo === 'DNI' ? 'PERSONA' : 'EMPRESA';
                  manejarCambioNuevoCliente('tipoCliente', nuevoTipoCliente);
                  // Limpiar número de documento y nombre al cambiar tipo
                  manejarCambioNuevoCliente('numeroDocumento', '');
                  manejarCambioNuevoCliente('nombreCliente', '');
                  setDatosEncontrados(false);
                  setError(null);
                }}
                className="px-3 py-3 border border-gray-300 border-r-0 rounded-l-lg bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="DNI">DNI</option>
                <option value="RUC">RUC</option>
              </select>
              <input 
                id="documento-mayorista" 
                type="text" 
                className={`flex-1 px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  nuevoCliente.numeroDocumento && 
                  ((tipoDocumento === 'DNI' && (nuevoCliente.numeroDocumento.length !== 8 || !/^\d+$/.test(nuevoCliente.numeroDocumento))) || 
                   (tipoDocumento === 'RUC' && (nuevoCliente.numeroDocumento.length !== 11 || !/^\d+$/.test(nuevoCliente.numeroDocumento)))) 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                  : ''
                }`}
                value={nuevoCliente.numeroDocumento} 
                onChange={(e) => {
                  const valor = e.target.value.replace(/\D/g, ''); // Solo números
                  manejarCambioNuevoCliente('numeroDocumento', valor);
                  // Limpiar nombre si se modifica el documento
                  if (datosEncontrados) {
                    manejarCambioNuevoCliente('nombreCliente', '');
                    setDatosEncontrados(false);
                  }
                }}
                placeholder={tipoDocumento === 'DNI' ? "Ingrese DNI (8 dígitos)" : "Ingrese RUC (11 dígitos)"} 
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
                className="px-4 py-3 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-500 border-l-0 flex items-center space-x-2 transition-all duration-200"
              >
                {buscandoDatosExternos ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span className="hidden sm:inline">Buscando...</span>
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    <span className="hidden sm:inline">Buscar</span>
                  </>
                )}
              </button>
            </div>
            
            {/* Validación y ayuda */}
            {nuevoCliente.numeroDocumento && (
              <div className="mt-1">
                {((tipoDocumento === 'DNI' && (nuevoCliente.numeroDocumento.length !== 8 || !/^\d+$/.test(nuevoCliente.numeroDocumento))) || 
                  (tipoDocumento === 'RUC' && (nuevoCliente.numeroDocumento.length !== 11 || !/^\d+$/.test(nuevoCliente.numeroDocumento)))) && (
                  <p className="text-xs text-red-600">
                    {tipoDocumento === 'DNI' 
                      ? 'El DNI debe tener exactamente 8 dígitos numéricos' 
                      : 'El RUC debe tener exactamente 11 dígitos numéricos'
                    }
                  </p>
                )}
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-1">
              Seleccione el tipo de documento, ingrese el número y presione "Buscar" para obtener el nombre automáticamente
            </p>
          </div>

          {/* Mensajes de estado de búsqueda */}
          {buscandoDatosExternos && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-600">
                <Loader2 className="animate-spin" size={16} />
                <span className="text-sm font-medium">
                  Consultando {tipoDocumento === 'DNI' ? 'RENIEC' : 'SUNAT'}...
                </span>
              </div>
            </div>
          )}

          {datosEncontrados && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle size={16} />
                <span className="text-sm font-medium">
                  ¡Datos encontrados! Nombre obtenido automáticamente.
                </span>
              </div>
            </div>
          )}

          {/* Nombre del cliente */}
          <div className="mb-4">
            <label htmlFor="nombre-cliente" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre {tipoDocumento === 'RUC' ? 'de la Empresa' : 'del Cliente'} <span className="text-red-500">*</span>
            </label>
            <input
              id="nombre-cliente"
              type="text"
              value={nuevoCliente.nombreCliente}
              onChange={(e) => manejarCambioNuevoCliente('nombreCliente', e.target.value)}
              placeholder={obtenerPlaceholderNombre()}
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                datosEncontrados ? 'bg-green-50 border-green-300' : ''
              }`}
            />
            {!datosEncontrados && (
              <p className="text-xs text-gray-500 mt-1">
                {nuevoCliente.numeroDocumento ? 
                  'Si no se encontraron datos automáticamente, puede ingresar el nombre manualmente' :
                  'Primero ingrese el número de documento y presione "Buscar"'
                }
              </p>
            )}
          </div>

          {/* Información adicional */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <FileText className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Proceso automático:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Se creará el cliente automáticamente como {tipoDocumento === 'DNI' ? 'persona natural' : 'empresa'}</li>
                  <li>Se generará su código de mayorista inmediatamente</li>
                </ul>
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
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-4">
          {clientePreseleccionado ? 'Cliente a Convertir' : 'Cliente Seleccionado'}
        </p>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 border border-gray-200/60 shadow-lg">
          {verificandoMayorista ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="animate-spin text-green-500 mr-2" size={20} />
              <span className="text-gray-600">Verificando estado del cliente...</span>
            </div>
          ) : (
            <>
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center space-x-3">
                  <User className="text-gray-500" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Nombre</p>
                    <p className="font-medium text-gray-900">{clienteSeleccionado.nombreCliente}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <FileText className="text-gray-500" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Documento</p>
                    <p className="font-medium text-gray-900">
                      {clienteSeleccionado.tipoCliente}: {clienteSeleccionado.numeroDocumento}
                    </p>
                  </div>
                </div>
                
                {/* Mostrar código de mayorista si es mayorista */}
                {esMayorista && codigoMayoristaCliente && (
                  <div className="flex items-center space-x-3 md:col-span-2">
                    <Crown className="text-green-600" size={20} />
                    <div>
                      <p className="text-sm text-gray-500">Código de Mayorista</p>
                      <p className="font-medium text-green-800 bg-green-100 px-2 py-1 rounded text-sm inline-block">
                        {codigoMayoristaCliente}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Estado del mayorista */}
              <div className="border-t border-gray-200 pt-4">
                {esMayorista ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-orange-600 bg-orange-50 p-3 rounded-lg">
                      <AlertCircle size={20} />
                      <span className="font-medium">Este cliente ya es mayorista</span>
                    </div>
                    <button
                      onClick={mostrarConfirmacionEliminacionMayorista}
                      disabled={eliminandoMayorista || verificandoMayorista}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-500/90 hover:bg-red-600 backdrop-blur-sm text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                    >
                      {eliminandoMayorista ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          <span>Eliminando...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 size={16} />
                          <span>Eliminar Estatus de Mayorista</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
                    <CheckCircle size={20} />
                    <span className="font-medium">Cliente listo para ser promovido a mayorista</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Renderizar mensajes de error y éxito
  const renderMensajes = () => (
    <>
      {error && (
        <div className="mb-4 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-lg shadow-sm">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle size={20} />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {exito && !mostrarConfirmacionExito && (
        <div className="mb-4 p-4 bg-green-50/80 backdrop-blur-sm border border-green-200/50 rounded-lg shadow-sm">
          <div className="flex items-center space-x-2 text-green-600 mb-2">
            <CheckCircle size={20} />
            <span className="font-medium">{exito}</span>
          </div>
          {codigoMayorista && (
            <div className="mt-3 p-3 bg-white border border-green-300 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-700">Código de Mayorista:</span>
                <span className="text-lg font-bold text-green-800 bg-green-100 px-3 py-1 rounded">
                  {codigoMayorista}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  // Renderizar botones de acción
  const renderBotonesAccion = () => (
    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200/50 bg-white/30 backdrop-blur-sm rounded-lg p-4 mt-6">
      <button
        onClick={cerrarModalConAnimacion}
        className="px-6 py-3 border border-gray-300/70 bg-white/70 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white/90 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
        disabled={convirtiendoMayorista || eliminandoMayorista || creandoMayorista}
      >
        Cancelar
      </button>
      
      {/* Botón para modo BUSCAR */}
      {modo === 'buscar' && (
        <button
          onClick={convertirAMayorista}
          disabled={!clienteSeleccionado || esMayorista || convirtiendoMayorista || eliminandoMayorista || !!exito}
          className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg hover:shadow-xl backdrop-blur-sm"
        >
          {convirtiendoMayorista ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span>Convirtiendo...</span>
            </>
          ) : (
            <>
              <Crown size={18} />
              <span>Hacer Mayorista</span>
            </>
          )}
        </button>
      )}

      {/* Botón para modo CREAR */}
      {modo === 'crear' && (
        <button
          onClick={crearNuevoMayorista}
          disabled={!nuevoCliente.nombreCliente || !nuevoCliente.numeroDocumento || creandoMayorista || !!exito}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg hover:shadow-xl backdrop-blur-sm"
        >
          {creandoMayorista ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span>Creando...</span>
            </>
          ) : (
            <>
              <UserPlus size={18} />
              <span>Crear Mayorista</span>
            </>
          )}
        </button>
      )}
    </div>
  );

  // Renderizar contenido principal del modal
  const renderContenidoPrincipal = () => {
    console.log('🔄 Renderizando contenido principal:', {
      mostrarConfirmacionExito,
      mostrarConfirmacionEliminacion,
      mostrarModalConfirmacionEliminar,
      codigoMayorista,
      exito
    });
    
    if (mostrarModalConfirmacionEliminar) {
      console.log('⚠️ Mostrando modal de confirmación de eliminación');
      return renderModalConfirmacionEliminar();
    }
    
    if (mostrarConfirmacionExito) {
      console.log('✅ Mostrando pantalla de éxito');
      return renderPantallaExito();
    }
    
    if (mostrarConfirmacionEliminacion) {
      console.log('🗑️ Mostrando pantalla de eliminación');
      return renderPantallaEliminacion();
    }

    console.log('📝 Mostrando formulario principal');
    return (
      <>
        {renderModoBuscar()}
        {renderFormularioNuevoCliente()}
        {renderInfoClienteSeleccionado()}
        {renderMensajes()}
        {renderBotonesAccion()}
      </>
    );
  };

  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 ${cerrandoModal ? 'animate-fadeOut' : 'animate-fadeIn'}`}>
      <div className={`bg-white/95 backdrop-blur-md rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden ${cerrandoModal ? 'animate-scaleOut' : 'animate-scaleIn'}`}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500/90 to-green-600/90 backdrop-blur-sm px-6 py-4 flex justify-between items-center border-b border-white/10">
          <div className="flex items-center space-x-3">
            <Crown className="text-white drop-shadow-md" size={24} />
            <h2 className="text-xl font-bold text-white drop-shadow-sm">Gestionar Cliente Mayorista</h2>
          </div>
          <button
            onClick={cerrarModalConAnimacion}
            className="text-white hover:text-gray-200 hover:bg-black hover:bg-opacity-20 rounded-full p-2 transition-all duration-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Toggle de Modo */}
        {renderToggleModo()}

        {/* Contenido */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] bg-gradient-to-br from-white/50 to-gray-50/50 backdrop-blur-sm">
          {renderContenidoPrincipal()}
        </div>
      </div>
    </div>
  );
};

export default ModalHacerMayorista;
