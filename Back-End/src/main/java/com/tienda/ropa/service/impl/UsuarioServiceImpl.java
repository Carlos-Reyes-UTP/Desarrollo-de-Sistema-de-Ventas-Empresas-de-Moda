package com.tienda.ropa.service.impl;

import com.tienda.ropa.dto.UsuarioDTO;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.entity.Rol;
import com.tienda.ropa.entity.Role;
import com.tienda.ropa.repository.UsuarioRepository;
import com.tienda.ropa.repository.RolRepository;
import com.tienda.ropa.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UsuarioServiceImpl implements UsuarioService {    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    public UserDetailsService userDetailsService() {
        return new UserDetailsService() {
            @Override
            public UserDetails loadUserByUsername(String usuario) throws UsernameNotFoundException {
                Usuario usuarioEntity = usuarioRepository.findByUsuario(usuario)
                        .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));

                if (!usuarioEntity.isActivo()) {
                    throw new RuntimeException("El usuario está deshabilitado");
                }
                return usuarioRepository.findByUsuario(usuario)
                        .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
            }
        };
    }

    public List<UsuarioDTO> obtenerUsuarios() {
        return usuarioRepository.findAll().stream().map(usuario -> {
            UsuarioDTO dto = new UsuarioDTO();
            dto.setId(usuario.getId());
            dto.setUsuario(usuario.getUsuario());
            dto.setClave(usuario.getPassword());
            dto.setActivo(usuario.isActivo());

            return dto;
        }).collect(Collectors.toList());
    }    
    
    public UsuarioDTO actualizarUsuario(Long id, UsuarioDTO usuarioDTO) {
        Usuario usuario = usuarioRepository.findById(id).orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        System.out.println("Actualizando usuario con ID: " + id);
        System.out.println("Roles recibidos: " + usuarioDTO.getRoles());
        
        // Validar si es el último administrador y se intenta cambiar sus roles
        if (usuarioDTO.getRoles() != null) {
            if (!validarCambioRoles(id, usuarioDTO.getRoles().stream().collect(Collectors.toList()))) {
                throw new RuntimeException("No se puede quitar el rol de administrador al último usuario administrador del sistema");
            }
        }
        
        // Actualizar nombre de usuario
        usuario.setUsuario(usuarioDTO.getUsuario());
        
        // Actualizar estado activo
        usuario.setActivo(usuarioDTO.isActivo());
        
        // Si se proporciona una nueva contraseña, validarla y encriptarla
        if (usuarioDTO.getClave() != null && !usuarioDTO.getClave().trim().isEmpty()) {
            if (!validarContrasenaSegura(usuarioDTO.getClave())) {
                throw new RuntimeException("La contraseña no cumple con los requisitos de seguridad");
            }
            usuario.setPassword(new BCryptPasswordEncoder().encode(usuarioDTO.getClave()));
        }
        
        // Actualizar roles si se proporcionan
        if (usuarioDTO.getRoles() != null && !usuarioDTO.getRoles().isEmpty()) {
            System.out.println("Actualizando roles...");
            usuario.getRoles().clear(); // Limpiar roles existentes
            
            for (String rolNombre : usuarioDTO.getRoles()) {
                System.out.println("Procesando rol: " + rolNombre);
                // Convertir string a enum Role (remover prefijo ROLE_ si existe)
                String nombreRolSinPrefijo = rolNombre.replace("ROLE_", "");
                Role roleEnum;
                try {
                    roleEnum = Role.valueOf(nombreRolSinPrefijo);
                } catch (IllegalArgumentException e) {
                    throw new RuntimeException("Rol no válido: " + rolNombre);
                }
                
                // Buscar el rol en la base de datos
                Rol rol = rolRepository.findByNombreRol(roleEnum)
                        .orElseThrow(() -> new RuntimeException("Rol no encontrado: " + roleEnum));
                
                usuario.getRoles().add(rol);
                System.out.println("Rol agregado: " + rol.getNombreRol());
            }
        }
        
        usuarioRepository.save(usuario);
        System.out.println("Usuario guardado con roles: " + usuario.getRoles().size());

        // Devolver el DTO actualizado con roles
        return convertirADTOConRoles(usuario);
    }

    public boolean deshabilitarUsuario(Long id) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(id);
        if (usuarioOpt.isPresent()) {
            Usuario usuario = usuarioOpt.get();
            
            // Validar si es el último administrador activo
            if (esUltimoAdministrador(id)) {
                throw new RuntimeException("No se puede deshabilitar al último usuario administrador del sistema");
            }
            
            usuario.setActivo(false);
            usuarioRepository.save(usuario);
            return true;
        }
        return false;
    }

    @Override
    public boolean habilitarUsuario(Long id) {
        Optional<Usuario> usuario = usuarioRepository.findById(id);
        if (usuario.isPresent()) {
            usuario.get().setActivo(true);
            usuarioRepository.save(usuario.get());
            return true;
        }
        return true;
    }

    @Override
    public UsuarioDTO obtenerUsuarioConRoles(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + id));

        return convertirADTOConRoles(usuario);


    }
    public List<UsuarioDTO> obtenerUsuariosConRoles() {
        return usuarioRepository.findAll().stream()
                .map(this::convertirADTOConRoles)
                .collect(Collectors.toList());
    }

    private UsuarioDTO convertirADTOConRoles(Usuario usuario) {
        UsuarioDTO dto = new UsuarioDTO();
        dto.setId(usuario.getId());
        dto.setUsuario(usuario.getUsuario());
        dto.setClave(usuario.getPassword());
        dto.setActivo(usuario.isActivo());

        // Agregar los roles
        Set<String> roles = usuario.getRoles().stream()
                .map(rol -> rol.getNombreRol().name())
                .collect(Collectors.toSet());

        dto.setRoles(roles);

        return dto;
    }

    @Override
    public boolean validarContrasenaSegura(String password) {
        if (password == null || password.isEmpty()) {
            return false;
        }

        // Validar longitud mínima
        if (password.length() < 8) {
            return false;
        }

        // Validar letra minúscula
        if (!password.matches(".*[a-z].*")) {
            return false;
        }

        // Validar letra mayúscula
        if (!password.matches(".*[A-Z].*")) {
            return false;
        }

        // Validar número
        if (!password.matches(".*[0-9].*")) {
            return false;
        }

        // Validar símbolo especial
        if (!password.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?].*")) {
            return false;
        }

        return true;
    }
    
    @Override
    public boolean esUltimoAdministrador(Long usuarioId) {
        // Obtener todos los usuarios activos
        List<Usuario> usuariosActivos = usuarioRepository.findAll().stream()
                .filter(Usuario::isActivo)
                .collect(Collectors.toList());
        
        // Contar cuántos administradores activos hay
        long cantidadAdminsActivos = usuariosActivos.stream()
                .filter(usuario -> usuario.getRoles().stream()
                        .anyMatch(rol -> rol.getNombreRol() == Role.ADMIN))
                .count();
        
        // Verificar si el usuario actual es administrador
        Usuario usuarioActual = usuarioRepository.findById(usuarioId).orElse(null);
        if (usuarioActual == null) {
            return false;
        }
        
        boolean esAdmin = usuarioActual.getRoles().stream()
                .anyMatch(rol -> rol.getNombreRol() == Role.ADMIN);
        
        // Es el último admin si:
        // 1. Es administrador
        // 2. Solo hay 1 administrador activo en total
        return esAdmin && cantidadAdminsActivos == 1;
    }
    
    @Override
    public boolean validarCambioRoles(Long usuarioId, List<String> nuevosRoles) {
        // Si es el último administrador, debe mantener su rol de admin
        if (esUltimoAdministrador(usuarioId)) {
            // Verificar si los nuevos roles incluyen ADMIN
            boolean tieneRolAdmin = nuevosRoles.stream()
                    .anyMatch(rol -> {
                        String rolSinPrefijo = rol.replace("ROLE_", "");
                        return "ADMIN".equals(rolSinPrefijo);
                    });
            
            if (!tieneRolAdmin) {
                return false; // No se permite quitar el rol de admin al último administrador
            }
        }
        
        return true; // Cambio permitido
    }

}