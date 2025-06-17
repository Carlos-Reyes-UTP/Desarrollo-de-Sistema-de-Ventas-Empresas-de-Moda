package com.tienda.ropa.controller;

import jakarta.validation.Valid;
import com.tienda.ropa.agregates.request.SignUpRequest;
import com.tienda.ropa.dto.UsuarioDTO;
import com.tienda.ropa.dto.ActualizarUsuarioDTO;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.service.AuthenticationService;
import com.tienda.ropa.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/admin/user")
public class UsuarioController {
    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private AuthenticationService authenticationService;

    @PostMapping("/createUser")
    public ResponseEntity<Usuario> signUpUser(@RequestBody @Valid SignUpRequest signUpRequest) {
        return new ResponseEntity<>(authenticationService.signUpUser(signUpRequest), HttpStatus.CREATED);
    }

    @GetMapping
    public List<UsuarioDTO> obtenerUsuarios() {
        return usuarioService.obtenerUsuarios();
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarUsuario(@PathVariable Long id, @RequestBody UsuarioDTO usuarioDTO) {
        try {
            UsuarioDTO usuarioActualizado = usuarioService.actualizarUsuario(id, usuarioDTO);
            return new ResponseEntity<>(usuarioActualizado, HttpStatus.OK);
        } catch (RuntimeException e) {
            // Manejar validaciones de último administrador
            if (e.getMessage().contains("último usuario administrador") || 
                e.getMessage().contains("último administrador")) {
                return new ResponseEntity<>(e.getMessage(), HttpStatus.CONFLICT);
            }
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PutMapping("/deshabilitar/{id}")
    public ResponseEntity<?> deshabilitarUsuario(@PathVariable Long id) {
        try {
            boolean result = usuarioService.deshabilitarUsuario(id);
            if (result) {
                return new ResponseEntity<>(HttpStatus.OK);
            } else {
                return new ResponseEntity<>("Usuario no encontrado", HttpStatus.NOT_FOUND);
            }
        } catch (RuntimeException e) {
            // Manejar validación de último administrador
            if (e.getMessage().contains("último usuario administrador") || 
                e.getMessage().contains("último administrador")) {
                return new ResponseEntity<>(e.getMessage(), HttpStatus.CONFLICT);
            }
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PutMapping("/habilitar/{id}")
    public ResponseEntity<Void> habilitarUsuario(@PathVariable Long id) {
        boolean isActive = usuarioService.habilitarUsuario(id);
        if (isActive) {
            return new ResponseEntity<>(HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/with-roles")
    public ResponseEntity<List<UsuarioDTO>> obtenerUsuariosConRoles() {
        List<UsuarioDTO> usuarios = usuarioService.obtenerUsuariosConRoles();
        return new ResponseEntity<>(usuarios, HttpStatus.OK);
    }

    @GetMapping("/{id}/with-roles")
    public ResponseEntity<UsuarioDTO> obtenerUsuarioConRoles(@PathVariable Long id) {
        try {
            UsuarioDTO usuario = usuarioService.obtenerUsuarioConRoles(id);
            return new ResponseEntity<>(usuario, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }
}