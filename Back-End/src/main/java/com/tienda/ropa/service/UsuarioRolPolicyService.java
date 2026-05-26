package com.tienda.ropa.service;

import com.tienda.ropa.agregates.request.SignUpRequest;
import com.tienda.ropa.dto.UsuarioDTO;
import com.tienda.ropa.entity.Role;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collection;

@Service
@RequiredArgsConstructor
public class UsuarioRolPolicyService {

    private final UsuarioRepository usuarioRepository;

    public void validarAltaGerente(SignUpRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Datos de alta requeridos");
        }
        if (contieneRolAdmin(request.rol())) {
            throw new IllegalArgumentException(
                    "Un gerente no puede crear usuarios con rol de administrador");
        }
        if (contieneRolSupervisorAlmacen(request.rol())) {
            throw new IllegalArgumentException(
                    "Un gerente no puede crear usuarios supervisor de almacén");
        }
    }

    public void validarActualizacionGerente(Long usuarioId, UsuarioDTO dto) {
        assertGerenteNoTocaAdministrador(usuarioId);
        if (dto != null && dto.getRoles() != null && rolesContienenAdmin(dto.getRoles())) {
            throw new IllegalArgumentException(
                    "Un gerente no puede asignar el rol de administrador");
        }
        if (dto != null && dto.getRoles() != null && rolesContienenSupervisorAlmacen(dto.getRoles())) {
            throw new IllegalArgumentException(
                    "Un gerente no puede asignar el rol supervisor de almacén");
        }
    }

    public void validarDeshabilitarGerente(Long usuarioId) {
        assertGerenteNoTocaAdministrador(usuarioId);
    }

    public void validarHabilitarGerente(Long usuarioId) {
        assertGerenteNoTocaAdministrador(usuarioId);
    }

    private void assertGerenteNoTocaAdministrador(Long usuarioId) {
        Usuario objetivo = usuarioRepository.findById(usuarioId).orElse(null);
        if (objetivo == null) {
            return;
        }
        boolean esAdmin = objetivo.getRoles().stream()
                .anyMatch(rol -> rol.getNombreRol() == Role.ADMIN);
        if (esAdmin) {
            throw new IllegalArgumentException(
                    "Un gerente no puede modificar usuarios administradores");
        }
    }

    private static boolean contieneRolAdmin(String rol) {
        if (rol == null || rol.isBlank()) {
            return false;
        }
        String normalizado = rol.replace("ROLE_", "").trim().toUpperCase();
        return Role.ADMIN.name().equals(normalizado);
    }

    private static boolean rolesContienenAdmin(Collection<String> roles) {
        if (roles == null || roles.isEmpty()) {
            return false;
        }
        return roles.stream().anyMatch(UsuarioRolPolicyService::contieneRolAdmin);
    }

    private static boolean contieneRolSupervisorAlmacen(String rol) {
        if (rol == null || rol.isBlank()) {
            return false;
        }
        String normalizado = rol.replace("ROLE_", "").trim().toUpperCase();
        return Role.SUPERVISOR_ALMACEN.name().equals(normalizado);
    }

    private static boolean rolesContienenSupervisorAlmacen(Collection<String> roles) {
        if (roles == null || roles.isEmpty()) {
            return false;
        }
        return roles.stream().anyMatch(UsuarioRolPolicyService::contieneRolSupervisorAlmacen);
    }
}
