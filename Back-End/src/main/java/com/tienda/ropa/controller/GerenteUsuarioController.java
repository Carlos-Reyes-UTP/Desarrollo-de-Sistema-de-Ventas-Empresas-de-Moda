package com.tienda.ropa.controller;

import com.tienda.ropa.agregates.request.SignUpRequest;
import com.tienda.ropa.dto.UsuarioDTO;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.service.AuthenticationService;
import com.tienda.ropa.service.UsuarioRolPolicyService;
import com.tienda.ropa.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/gerente/user")
public class GerenteUsuarioController {

    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private AuthenticationService authenticationService;

    @Autowired
    private UsuarioRolPolicyService usuarioRolPolicyService;

    @PostMapping("/createUser")
    public ResponseEntity<?> signUpUser(@RequestBody @Valid SignUpRequest signUpRequest) {
        try {
            usuarioRolPolicyService.validarAltaGerente(signUpRequest);
            return new ResponseEntity<>(authenticationService.signUpUser(signUpRequest), HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            if (esPoliticaRol(e)) {
                return new ResponseEntity<>(e.getMessage(), HttpStatus.FORBIDDEN);
            }
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping
    public List<UsuarioDTO> obtenerUsuarios() {
        return usuarioService.obtenerUsuarios();
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarUsuario(@PathVariable Long id, @RequestBody UsuarioDTO usuarioDTO) {
        try {
            usuarioRolPolicyService.validarActualizacionGerente(id, usuarioDTO);
            UsuarioDTO usuarioActualizado = usuarioService.actualizarUsuario(id, usuarioDTO);
            return new ResponseEntity<>(usuarioActualizado, HttpStatus.OK);
        } catch (RuntimeException e) {
            if (esPoliticaRol(e)) {
                return new ResponseEntity<>(e.getMessage(), HttpStatus.FORBIDDEN);
            }
            if (esConflictoUltimoRol(e)) {
                return new ResponseEntity<>(e.getMessage(), HttpStatus.CONFLICT);
            }
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PutMapping("/deshabilitar/{id}")
    public ResponseEntity<?> deshabilitarUsuario(@PathVariable Long id) {
        try {
            usuarioRolPolicyService.validarDeshabilitarGerente(id);
            boolean result = usuarioService.deshabilitarUsuario(id);
            if (result) {
                return new ResponseEntity<>(HttpStatus.OK);
            }
            return new ResponseEntity<>("Usuario no encontrado", HttpStatus.NOT_FOUND);
        } catch (RuntimeException e) {
            if (esPoliticaRol(e)) {
                return new ResponseEntity<>(e.getMessage(), HttpStatus.FORBIDDEN);
            }
            if (esConflictoUltimoRol(e)) {
                return new ResponseEntity<>(e.getMessage(), HttpStatus.CONFLICT);
            }
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PutMapping("/habilitar/{id}")
    public ResponseEntity<?> habilitarUsuario(@PathVariable Long id) {
        try {
            usuarioRolPolicyService.validarHabilitarGerente(id);
        } catch (IllegalArgumentException e) {
            if (esPoliticaRol(e)) {
                return new ResponseEntity<>(e.getMessage(), HttpStatus.FORBIDDEN);
            }
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
        boolean isActive = usuarioService.habilitarUsuario(id);
        if (isActive) {
            return new ResponseEntity<>(HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
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

    private static boolean esPoliticaRol(RuntimeException e) {
        String msg = e.getMessage();
        if (msg == null) {
            return false;
        }
        return msg.contains("gerente no puede");
    }

    private static boolean esConflictoUltimoRol(RuntimeException e) {
        String msg = e.getMessage();
        if (msg == null) {
            return false;
        }
        return msg.contains("último usuario administrador")
                || msg.contains("último administrador")
                || msg.contains("último usuario gerente")
                || msg.contains("último gerente");
    }
}
