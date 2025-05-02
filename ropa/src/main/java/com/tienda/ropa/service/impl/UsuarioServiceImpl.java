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
import java.util.stream.Collectors;

@Service
public class UsuarioServiceImpl implements UsuarioService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    public UserDetailsService userDetailsService() {
        return new UserDetailsService() {
            @Override
            public UserDetails loadUserByUsername(String usuario) throws UsernameNotFoundException {
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
        usuario.setUsuario(usuarioDTO.getUsuario());
        usuario.setPassword(new BCryptPasswordEncoder().encode(usuarioDTO.getClave()));
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

}