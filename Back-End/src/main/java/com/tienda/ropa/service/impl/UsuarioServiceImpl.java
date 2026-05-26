package com.tienda.ropa.service.impl;

import com.tienda.ropa.dto.UsuarioDTO;
import com.tienda.ropa.entity.UbicacionArea;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.entity.Rol;
import com.tienda.ropa.entity.Role;
import com.tienda.ropa.repository.UbicacionAreaRepository;
import com.tienda.ropa.repository.UsuarioRepository;
import com.tienda.ropa.repository.RolRepository;
import com.tienda.ropa.service.InventarioService;
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

    @Autowired
    private UbicacionAreaRepository ubicacionAreaRepository;

    @Autowired
    private InventarioService inventarioService;

    public UserDetailsService userDetailsService() {
        return new UserDetailsService() {
            @Override
            public UserDetails loadUserByUsername(String usuario) throws UsernameNotFoundException {
                Usuario usuarioEntity = usuarioRepository.findByUsuarioWithAreaAsignada(usuario)
                        .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));

                if (!usuarioEntity.isActivo()) {
                    throw new RuntimeException("El usuario está deshabilitado");
                }
                return usuarioEntity;
            }
        };
    }

    public List<UsuarioDTO> obtenerUsuarios() {
        return usuarioRepository.findAll().stream().map(usuario -> {
            UsuarioDTO dto = new UsuarioDTO();
            dto.setId(usuario.getId());
            dto.setUsuario(usuario.getUsuario());
            dto.setActivo(usuario.isActivo());

            return dto;
        }).collect(Collectors.toList());
    }    
    
    public UsuarioDTO actualizarUsuario(Long id, UsuarioDTO usuarioDTO) {
        Usuario usuario = usuarioRepository.findById(id).orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        // Validar si es el último administrador o gerente y se intenta cambiar sus roles
        if (usuarioDTO.getRoles() != null) {
            List<String> nuevosRoles = usuarioDTO.getRoles().stream().collect(Collectors.toList());
            if (!validarCambioRoles(id, nuevosRoles)) {
                if (esUltimoAdministrador(id)) {
                    throw new RuntimeException(
                            "No se puede quitar el rol de administrador al último usuario administrador del sistema");
                }
                if (esUltimoGerente(id)) {
                    throw new RuntimeException(
                            "No se puede quitar el rol de gerente al último usuario gerente del sistema");
                }
            }
        }
        
        // Actualizar nombre de usuario (todo minúsculas)
        usuario.setUsuario(usuarioDTO.getUsuario().toLowerCase());
        
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
            usuario.getRoles().clear(); // Limpiar roles existentes
            
            for (String rolNombre : usuarioDTO.getRoles()) {
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
            }
        }

        aplicarAreaAsignadaDesdeDto(usuario, usuarioDTO);
        
        usuarioRepository.save(usuario);

        // Devolver el DTO actualizado con roles
        return convertirADTOConRoles(usuario);
    }

    public boolean deshabilitarUsuario(Long id) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(id);
        if (usuarioOpt.isPresent()) {
            Usuario usuario = usuarioOpt.get();
            
            if (esUltimoAdministrador(id)) {
                throw new RuntimeException("No se puede deshabilitar al último usuario administrador del sistema");
            }
            if (esUltimoGerente(id)) {
                throw new RuntimeException("No se puede deshabilitar al último usuario gerente del sistema");
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
        return false;
    }

    @Override
    public UsuarioDTO obtenerUsuarioConRoles(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + id));

        return convertirADTOConRoles(usuario);


    }
    public List<UsuarioDTO> obtenerUsuariosConRoles() {
        return usuarioRepository.findAllWithRolesAndArea().stream()
                .map(this::convertirADTOConRoles)
                .collect(Collectors.toList());
    }

    private UsuarioDTO convertirADTOConRoles(Usuario usuario) {
        UsuarioDTO dto = new UsuarioDTO();
        dto.setId(usuario.getId());
        dto.setUsuario(usuario.getUsuario());
        dto.setActivo(usuario.isActivo());

        // Agregar los roles
        Set<String> roles = usuario.getRoles().stream()
                .map(rol -> rol.getNombreRol().name())
                .collect(Collectors.toSet());

        dto.setRoles(roles);

        if (usuario.getAreaAsignado() != null) {
            dto.setIdUbicacionAreaAsignada(usuario.getAreaAsignado().getIdUbicacionArea());
            dto.setEtiquetaAreaAsignada(InventarioService.etiquetaUbicacionArea(usuario.getAreaAsignado()));
        }

        return dto;
    }

    private void aplicarAreaAsignadaDesdeDto(Usuario usuario, UsuarioDTO dto) {
        boolean esAlmacenero = usuario.getRoles().stream()
                .anyMatch(r -> r.getNombreRol() == Role.ALMACENERO);

        if (!esAlmacenero) {
            usuario.setAreaAsignado(null);
            return;
        }

        Long idArea = dto.getIdUbicacionAreaAsignada();
        if (idArea == null) {
            if (usuario.getAreaAsignado() == null) {
                throw new RuntimeException(
                        "Debe asignar un área de almacén al usuario con rol ALMACENERO.");
            }
            return;
        }

        UbicacionArea ua = ubicacionAreaRepository.findByIdWithUbicacionYArea(idArea)
                .orElseThrow(() -> new RuntimeException("Área de almacén no encontrada: " + idArea));
        if (!inventarioService.esUbicacionAlmacen(ua)) {
            throw new RuntimeException(
                    "La ubicación-área seleccionada no pertenece al piso de almacén.");
        }
        usuario.setAreaAsignado(ua);
    }

    @Override
    public boolean validarContrasenaSegura(String password) {
        if (password == null || password.length() < 8) {
            return false;
        }

        boolean tieneMinuscula = false;
        boolean tieneMayuscula = false;
        boolean tieneDigito = false;
        boolean tieneEspecial = false;

        for (int i = 0; i < password.length(); i++) {
            char c = password.charAt(i);
            if (Character.isLowerCase(c)) tieneMinuscula = true;
            else if (Character.isUpperCase(c)) tieneMayuscula = true;
            else if (Character.isDigit(c)) tieneDigito = true;
            else tieneEspecial = true;
        }

        return tieneMinuscula && tieneMayuscula && tieneDigito && tieneEspecial;
    }
    
    @Override
    public boolean esUltimoAdministrador(Long usuarioId) {
        Usuario usuarioActual = usuarioRepository.findById(usuarioId).orElse(null);
        if (usuarioActual == null) {
            return false;
        }

        boolean esAdmin = usuarioActual.getRoles().stream()
                .anyMatch(rol -> rol.getNombreRol() == Role.ADMIN);
        if (!esAdmin) {
            return false;
        }

        long cantidadAdminsActivos = usuarioRepository.countActiveAdmins();
        return cantidadAdminsActivos == 1;
    }
    
    @Override
    public boolean esUltimoGerente(Long usuarioId) {
        Usuario usuarioActual = usuarioRepository.findById(usuarioId).orElse(null);
        if (usuarioActual == null) {
            return false;
        }

        boolean esGerente = usuarioActual.getRoles().stream()
                .anyMatch(rol -> rol.getNombreRol() == Role.GERENTE);
        if (!esGerente) {
            return false;
        }

        long cantidadGerentesActivos = usuarioRepository.countActiveGerentes();
        return cantidadGerentesActivos == 1;
    }

    @Override
    public boolean validarCambioRoles(Long usuarioId, List<String> nuevosRoles) {
        if (esUltimoAdministrador(usuarioId)) {
            boolean tieneRolAdmin = nuevosRoles.stream()
                    .anyMatch(rol -> "ADMIN".equals(rol.replace("ROLE_", "")));
            if (!tieneRolAdmin) {
                return false;
            }
        }

        if (esUltimoGerente(usuarioId)) {
            boolean tieneRolGerente = nuevosRoles.stream()
                    .anyMatch(rol -> "GERENTE".equals(rol.replace("ROLE_", "")));
            if (!tieneRolGerente) {
                return false;
            }
        }

        return true;
    }

}