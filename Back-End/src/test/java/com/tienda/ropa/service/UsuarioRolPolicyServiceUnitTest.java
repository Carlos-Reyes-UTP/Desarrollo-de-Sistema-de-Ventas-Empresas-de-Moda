package com.tienda.ropa.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.Collections;
import java.util.Set;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.tienda.ropa.agregates.request.SignUpRequest;
import com.tienda.ropa.dto.UsuarioDTO;
import com.tienda.ropa.entity.Role;
import com.tienda.ropa.entity.Rol;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.repository.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class UsuarioRolPolicyServiceUnitTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private UsuarioRolPolicyService policyService;

    @Test
    void testValidarAltaGerente_NoPermiteAdmin() {
        SignUpRequest request = new SignUpRequest("crojas", "SecurePass123!", "ROLE_ADMIN", true, null);
        
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> 
            policyService.validarAltaGerente(request)
        );
        assertEquals("Un gerente no puede crear usuarios con rol de administrador", ex.getMessage());
    }

    @Test
    void testValidarAltaGerente_PermiteAlmacenero() {
        SignUpRequest request = new SignUpRequest("crojas", "SecurePass123!", "ROLE_ALMACENERO", true, 1L);
        
        assertDoesNotThrow(() -> 
            policyService.validarAltaGerente(request)
        );
    }

    @Test
    void testValidarActualizacionGerente_NoPermiteAsignarAdmin() {
        UsuarioDTO dto = new UsuarioDTO();
        dto.setRoles(Set.of("ROLE_ADMIN"));
        
        Usuario user = new Usuario();
        user.setId(2L);
        user.setRoles(Collections.emptySet());
        when(usuarioRepository.findById(2L)).thenReturn(Optional.of(user));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> 
            policyService.validarActualizacionGerente(2L, dto)
        );
        assertEquals("Un gerente no puede asignar el rol de administrador", ex.getMessage());
    }

    @Test
    void testValidarActualizacionGerente_NoPermiteModificarUsuarioAdminExistente() {
        UsuarioDTO dto = new UsuarioDTO();
        dto.setRoles(Set.of("ROLE_ALMACENERO"));
        
        Usuario admin = new Usuario();
        admin.setId(10L);
        
        Rol rolAdmin = new Rol();
        rolAdmin.setNombreRol(Role.ADMIN);
        admin.setRoles(Set.of(rolAdmin));

        when(usuarioRepository.findById(10L)).thenReturn(Optional.of(admin));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> 
            policyService.validarActualizacionGerente(10L, dto)
        );
        assertEquals("Un gerente no puede modificar usuarios administradores", ex.getMessage());
    }
}