import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  X, 
  User, 
  FileText, 
  Phone, 
  Calendar,
  Crown,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

// Importar servicios
import { ClienteService } from '../../services/ClienteServices';
import { MayoristaService } from '../../services/MayoristaService';

// Importar tipos
import type { Cliente } from '../../interfaces/Cliente';
import type { MayoristaDTO } from '../../interfaces/MayoristaDTO';

interface ModalHacerMayoristaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (mayorista: MayoristaDTO) => void;
}

const ModalHacerMayorista: React.FC<ModalHacerMayoristaProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  // Estados principales
  const [searchTerm, setSearchTerm] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [esMayorista, setEsMayorista] = useState<boolean>(false);
  
  // Estados de carga y procesos
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [verificandoMayorista, setVerificandoMayorista] = useState(false);
  const [convirtiendoMayorista, setConvirtiendoMayorista] = useState(false);
  
  // Estados de resultado
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  // Función para buscar clientes
  const buscarClientes = useCallback(async (termino: string) => {
    if (!termino.trim()) {
      setClientes([]);
      return;
    }

    setBuscandoClientes(true);
    setError(null);

    try {
      // Buscar por documento primero
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
    try {
      const esMayoristaResult = await MayoristaService.esMayorista(cliente.numeroDocumento);
      setEsMayorista(esMayoristaResult);
    } catch (error) {
      console.error('Error al verificar mayorista:', error);
      setEsMayorista(false);
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
    if (!clienteSeleccionado || clienteSeleccionado.idCliente === undefined) return;

    setConvirtiendoMayorista(true);
    setError(null);
    setExito(null);

    try {
      const nuevoMayorista = await MayoristaService.crearMayoristaDeClienteExistente(clienteSeleccionado.idCliente);
      setExito(`¡Cliente convertido a mayorista exitosamente! Código: ${nuevoMayorista.codigoMayorista}`);
      setEsMayorista(true);
      
      // Ejecutar callback de éxito si existe
      if (onSuccess) {
        onSuccess(nuevoMayorista);
      }

      // Cerrar modal después de 3 segundos
      setTimeout(() => {
        resetModal();
        onClose();
      }, 3000);

    } catch (error: any) {
      console.error('Error al convertir a mayorista:', error);
      if (error.response?.status === 400) {
        setError('El cliente ya es mayorista o hay un error en los datos.');
      } else {
        setError('Error al convertir cliente a mayorista. Intente nuevamente.');
      }
    } finally {
      setConvirtiendoMayorista(false);
    }
  };

  // Función para resetear el modal
  const resetModal = () => {
    setSearchTerm('');
    setClientes([]);
    setClienteSeleccionado(null);
    setEsMayorista(false);
    setError(null);
    setExito(null);
    setBuscandoClientes(false);
    setVerificandoMayorista(false);
    setConvirtiendoMayorista(false);
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

  // Efecto para resetear cuando se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      resetModal();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Crown className="text-white" size={24} />
            <h2 className="text-xl font-bold text-white">Hacer Cliente Mayorista</h2>
          </div>
          <button
            onClick={() => {
              resetModal();
              onClose();
            }}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          
          {/* Barra de búsqueda */}
          <div className="mb-6">
            <label htmlFor="buscar-cliente" className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Cliente
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
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    onClose();
                  }
                }}
                placeholder="Buscar por nombre o número de documento..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              />
              {buscandoClientes && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 animate-spin" size={20} />
              )}
            </div>
          </div>

          {/* Resultados de búsqueda */}
          {clientes.length > 0 && !clienteSeleccionado && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Resultados encontrados ({clientes.length})
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {clientes.map((cliente) => (
                  <button
                    key={cliente.idCliente}
                    onClick={() => seleccionarCliente(cliente)}
                    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 focus:bg-gray-50 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{cliente.nombreCliente}</p>
                        <p className="text-sm text-gray-500">
                          {cliente.tipoCliente}: {cliente.numeroDocumento}
                        </p>
                      </div>
                      <User className="text-gray-400" size={20} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Información del cliente seleccionado */}
          {clienteSeleccionado && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-4">Cliente Seleccionado</p>
              
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
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
                    </div>

                    {/* Estado del mayorista */}
                    <div className="border-t border-gray-200 pt-4">
                      {esMayorista ? (
                        <div className="flex items-center space-x-2 text-orange-600 bg-orange-50 p-3 rounded-lg">
                          <AlertCircle size={20} />
                          <span className="font-medium">Este cliente ya es mayorista</span>
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
          )}

          {/* Mensajes de error y éxito */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle size={20} />
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          {exito && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle size={20} />
                <span className="font-medium">{exito}</span>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                resetModal();
                onClose();
              }}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={convirtiendoMayorista}
            >
              Cancelar
            </button>
            
            <button
              onClick={convertirAMayorista}
              disabled={!clienteSeleccionado || esMayorista || convirtiendoMayorista || !!exito}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalHacerMayorista;
