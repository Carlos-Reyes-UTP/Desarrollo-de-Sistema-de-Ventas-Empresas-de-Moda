// ProveedoresService.java - asegurar coherencia
package com.tienda.ropa.service;

import com.tienda.ropa.dto.SunatResponseDTO;
import com.tienda.ropa.entity.Proveedores;
import com.tienda.ropa.repository.ProveedoresRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ProveedoresService {

    @Autowired
    private ProveedoresRepository proveedoresRepository;

    @Autowired
    private ApiExternoService apiExternoService;

    public Proveedores crearProveedor(Proveedores proveedor) {
        return proveedoresRepository.save(proveedor);
    }

    public Proveedores editarProveedor(Long id, Proveedores proveedorActualizado) {
        return proveedoresRepository.findById(id).map(proveedor -> {
            proveedor.setNombre(proveedorActualizado.getNombre());
            proveedor.setRuc(proveedorActualizado.getRuc());
            return proveedoresRepository.save(proveedor);
        }).orElseThrow(() -> new IllegalArgumentException("Proveedor no encontrado con el ID: " + id));
    }

    public void eliminarProveedor(Long id) {
        if (proveedoresRepository.existsById(id)) {
            proveedoresRepository.deleteById(id);
        } else {
            throw new IllegalArgumentException("Proveedor no encontrado con el ID: " + id);
        }
    }

    public List<Proveedores> obtenerProveedores() {
        return proveedoresRepository.findAll();
    }

    public Optional<Proveedores> obtenerProveedorPorNombre(String nombre) {
        return proveedoresRepository.findByNombre(nombre);
    }

    public Optional<Proveedores> obtenerProveedorPorId(Long id) {
        return proveedoresRepository.findById(id);
    }

    /**
     * Busca un proveedor por RUC en la base de datos local.
     * Si no lo encuentra, consulta a la API de SUNAT.
     */
    public Optional<Proveedores> buscarProveedorPorRuc(String ruc) {
        // Primero buscamos en la base de datos local
        Optional<Proveedores> proveedorOptional = proveedoresRepository.findByRuc(ruc);

        // Si no lo encontramos, consultamos a la API de SUNAT
        if (proveedorOptional.isEmpty()) {
            try {
                // Consultamos a la API de SUNAT
                SunatResponseDTO sunatResponse = apiExternoService.consultarRuc(ruc).block();

                if (sunatResponse != null) {
                    // Creamos un nuevo proveedor con la información obtenida
                    Proveedores nuevoProveedor = new Proveedores();
                    nuevoProveedor.setRuc(sunatResponse.getNumeroDocumento());
                    nuevoProveedor.setNombre(sunatResponse.getRazonSocial());

                    // No guardamos el proveedor automáticamente en la base de datos
                    // Solo lo devolvemos como resultado de la búsqueda
                    return Optional.of(nuevoProveedor);
                }
            } catch (Exception e) {
                // En caso de error, lo registramos y continuamos
                System.err.println("Error al consultar SUNAT: " + e.getMessage());
            }
        }

        return proveedorOptional;
    }
}