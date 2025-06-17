package com.tienda.ropa.service.impl;

import com.tienda.ropa.dto.UsuarioDTO;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.repository.UsuarioRepository;
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
public class UsuarioServiceImpl implements UsuarioService {

    @Autowired
    private UsuarioRepository usuarioRepository;

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
    }    public UsuarioDTO actualizarUsuario(Long id, UsuarioDTO usuarioDTO) {
        Usuario usuario = usuarioRepository.findById(id).orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        usuario.setUsuario(usuarioDTO.getUsuario());
        
        // Si se proporciona una nueva contraseña, validarla y encriptarla
        if (usuarioDTO.getClave() != null && !usuarioDTO.getClave().isEmpty()) {
            if (!validarContrasenaSegura(usuarioDTO.getClave())) {
                throw new RuntimeException("La contraseña no cumple con los requisitos de seguridad");
            }
            usuario.setPassword(new BCryptPasswordEncoder().encode(usuarioDTO.getClave()));
        }
        
        usuarioRepository.save(usuario);

        return usuarioDTO;
    }

    public boolean deshabilitarUsuario(Long id) {
        Optional<Usuario> usuario = usuarioRepository.findById(id);
        if (usuario.isPresent()) {
            usuario.get().setActivo(false);
            usuarioRepository.save(usuario.get());
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

}