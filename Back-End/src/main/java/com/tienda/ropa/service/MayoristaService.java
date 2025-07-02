package com.tienda.ropa.service;

import java.util.List;
import java.util.Optional;
import java.util.Random;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tienda.ropa.dto.MayoristaDTO;
import com.tienda.ropa.entity.Cliente;
import com.tienda.ropa.entity.Mayorista;
import com.tienda.ropa.repository.ClienteRepository;
import com.tienda.ropa.repository.MayoristaRepository;

@Service
public class MayoristaService {

    private final MayoristaRepository mayoristaRepository;
    private final ClienteRepository clienteRepository;
    private final Random random = new Random();

    public MayoristaService(MayoristaRepository mayoristaRepository, ClienteRepository clienteRepository) {
        this.mayoristaRepository = mayoristaRepository;
        this.clienteRepository = clienteRepository;
    }

    /**
     * Obtiene todos los mayoristas
     */
    public List<MayoristaDTO> obtenerMayoristas() {
        return mayoristaRepository.findAll().stream()
                .map(this::convertirADTO)
                .toList();
    }

    /**
     * Obtiene un mayorista por ID
     */
    public Optional<MayoristaDTO> obtenerMayoristaPorId(Long id) {
        return mayoristaRepository.findById(id)
                .map(this::convertirADTO);
    }

    /**
     * Obtiene un mayorista por código
     */
    public Optional<MayoristaDTO> obtenerMayoristaPorCodigo(String codigo) {
        return mayoristaRepository.findByCodigoMayorista(codigo)
                .map(this::convertirADTO);
    }

    /**
     * Obtiene un mayorista por número de documento del cliente
     */
    public Optional<MayoristaDTO> obtenerMayoristaPorDocumento(String numeroDocumento) {
        return mayoristaRepository.findByClienteNumeroDocumento(numeroDocumento)
                .map(this::convertirADTO);
    }

    /**
     * Crea un nuevo mayorista a partir de un cliente existente
     */
    @Transactional
    public MayoristaDTO crearMayorista(Long idCliente) {
        // Verificar que el cliente existe
        Cliente cliente = clienteRepository.findById(idCliente)
                .orElseThrow(() -> new IllegalArgumentException("Cliente no encontrado con ID: " + idCliente));

        // Verificar que no existe ya un mayorista para este cliente
        if (mayoristaRepository.existsByCliente(cliente)) {
            throw new IllegalArgumentException("Ya existe un mayorista para este cliente");
        }

        // Crear el mayorista
        Mayorista mayorista = new Mayorista();
        mayorista.setCliente(cliente);
        mayorista.setCodigoMayorista(generarCodigoMayorista(cliente.getNombreCliente()));

        // Guardar en la base de datos
        Mayorista mayoristaGuardado = mayoristaRepository.save(mayorista);

        return convertirADTO(mayoristaGuardado);
    }

    /**
     * Crea un mayorista desde un DTO completo (cliente + mayorista)
     */
    @Transactional
    public MayoristaDTO crearMayoristaCompleto(MayoristaDTO mayoristaDTO) {
        // Verificar si el cliente ya existe por número de documento
        Optional<Cliente> clienteExistente = clienteRepository.findByNumeroDocumento(mayoristaDTO.getNumeroDocumento());
        
        Cliente cliente;
        if (clienteExistente.isPresent()) {
            cliente = clienteExistente.get();
            
            // Verificar que no existe ya un mayorista para este cliente
            if (mayoristaRepository.existsByCliente(cliente)) {
                throw new IllegalArgumentException("Ya existe un mayorista para este cliente");
            }
        } else {
            // Crear nuevo cliente
            cliente = new Cliente();
            cliente.setNombreCliente(mayoristaDTO.getNombreCliente());
            cliente.setTipoCliente(mayoristaDTO.getTipoCliente());
            cliente.setNumeroDocumento(mayoristaDTO.getNumeroDocumento());
            cliente = clienteRepository.save(cliente);
        }

        // Crear el mayorista
        Mayorista mayorista = new Mayorista();
        mayorista.setCliente(cliente);
        mayorista.setCodigoMayorista(generarCodigoMayorista(cliente.getNombreCliente()));

        // Guardar en la base de datos
        Mayorista mayoristaGuardado = mayoristaRepository.save(mayorista);

        return convertirADTO(mayoristaGuardado);
    }

    /**
     * Actualiza los datos de un mayorista
     */
    @Transactional
    public MayoristaDTO actualizarMayorista(Long id, MayoristaDTO mayoristaDTO) {
        Mayorista mayorista = mayoristaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Mayorista no encontrado con ID: " + id));

        // Actualizar datos del cliente asociado
        Cliente cliente = mayorista.getCliente();
        if (mayoristaDTO.getNombreCliente() != null) {
            cliente.setNombreCliente(mayoristaDTO.getNombreCliente());
        }
        if (mayoristaDTO.getTipoCliente() != null) {
            cliente.setTipoCliente(mayoristaDTO.getTipoCliente());
        }
        if (mayoristaDTO.getNumeroDocumento() != null) {
            cliente.setNumeroDocumento(mayoristaDTO.getNumeroDocumento());
        }

        // Guardar cliente actualizado
        clienteRepository.save(cliente);

        // Si se cambió el nombre del cliente, regenerar el código mayorista
        if (mayoristaDTO.getNombreCliente() != null && 
            !mayoristaDTO.getNombreCliente().equals(cliente.getNombreCliente())) {
            mayorista.setCodigoMayorista(generarCodigoMayorista(mayoristaDTO.getNombreCliente()));
            mayoristaRepository.save(mayorista);
        }

        return convertirADTO(mayorista);
    }

    /**
     * Elimina un mayorista
     */
    @Transactional
    public boolean eliminarMayorista(Long id) {
        if (mayoristaRepository.existsById(id)) {
            mayoristaRepository.deleteById(id);
            return true;
        }
        return false;
    }

    /**
     * Genera un código único para el mayorista
     * Formato: [iniciales del cliente]-[5 números aleatorios]
     * Ejemplo: CAR-19238
     */
    private String generarCodigoMayorista(String nombreCliente) {
        // Obtener las iniciales del nombre del cliente
        String iniciales = obtenerIniciales(nombreCliente);
        
        // Generar código único
        String codigo;
        int intentos = 0;
        do {
            // Generar 5 números aleatorios
            String numeros = String.format("%05d", random.nextInt(100000));
            codigo = iniciales + "-" + numeros;
            intentos++;
            
            // Evitar bucle infinito
            if (intentos > 1000) {
                throw new IllegalStateException("No se pudo generar un código único para el mayorista");
            }
        } while (mayoristaRepository.existsByCodigoMayorista(codigo));
        
        return codigo;
    }

    /**
     * Extrae las iniciales del nombre del cliente
     */
    private String obtenerIniciales(String nombreCompleto) {
        if (nombreCompleto == null || nombreCompleto.trim().isEmpty()) {
            return "CLI";
        }
        
        String[] palabras = nombreCompleto.trim().toUpperCase().split("\\s+");
        StringBuilder iniciales = new StringBuilder();
        
        // Tomar máximo 3 iniciales
        int maxIniciales = Math.min(3, palabras.length);
        for (int i = 0; i < maxIniciales; i++) {
            if (!palabras[i].isEmpty()) {
                iniciales.append(palabras[i].charAt(0));
            }
        }
        
        // Si no hay suficientes iniciales, completar con "CLI"
        String resultado = iniciales.toString();
        if (resultado.length() < 3) {
            resultado = (resultado + "CLI").substring(0, 3);
        }
        
        return resultado;
    }

    /**
     * Convierte una entidad Mayorista a DTO
     */
    private MayoristaDTO convertirADTO(Mayorista mayorista) {
        MayoristaDTO dto = new MayoristaDTO();
        dto.setIdCliente(mayorista.getIdCliente());
        dto.setCodigoMayorista(mayorista.getCodigoMayorista());
        
        // Datos del cliente
        Cliente cliente = mayorista.getCliente();
        if (cliente != null) {
            dto.setNombreCliente(cliente.getNombreCliente());
            dto.setTipoCliente(cliente.getTipoCliente());
            dto.setNumeroDocumento(cliente.getNumeroDocumento());
        }
        
        return dto;
    }
}
