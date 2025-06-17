package com.tienda.ropa.service;

import java.util.List;

import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

import com.tienda.ropa.dto.UsuarioDTO;

@Service
public interface UsuarioService {

    public UserDetailsService userDetailsService();

    public List<UsuarioDTO> obtenerUsuarios();

    public UsuarioDTO actualizarUsuario(Long id, UsuarioDTO usuarioDTO);

    public boolean deshabilitarUsuario(Long id);

    public boolean habilitarUsuario(Long id);

    public UsuarioDTO obtenerUsuarioConRoles(Long id);

    public List<UsuarioDTO> obtenerUsuariosConRoles();

    public boolean validarContrasenaSegura(String password);
    
    // Métodos para validar protección del último admin
    public boolean esUltimoAdministrador(Long usuarioId);
    
    public boolean validarCambioRoles(Long usuarioId, List<String> nuevosRoles);
}
