package com.tienda.ropa.controller;

import jakarta.validation.Valid;
import com.tienda.ropa.agregates.request.SignUpRequest;
import com.tienda.ropa.dto.UsuarioDTO;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.service.AuthenticationService;
import com.tienda.ropa.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/v1/user")
public class UsuarioController {
    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private AuthenticationService authenticationService;

    @PostMapping("/createUser")
    public ResponseEntity<Usuario> signUpUser(@RequestBody @Valid SignUpRequest signUpRequest){
        return new ResponseEntity<>(authenticationService.signUpUser(signUpRequest), HttpStatus.CREATED);
    }

    @GetMapping
    public List<UsuarioDTO> obtenerUsuarios() {
        return usuarioService.obtenerUsuarios();
    }

    @PutMapping("/{id}")
    public ResponseEntity<UsuarioDTO> actualizarUsuario(@PathVariable Long id, @RequestBody UsuarioDTO usuarioDTO) {
        UsuarioDTO usuarioActualizado = usuarioService.actualizarUsuario(id, usuarioDTO);
        return new ResponseEntity<>(usuarioActualizado, HttpStatus.OK);
    }

    @PutMapping("/deshabilitar/{id}")
    public ResponseEntity<Void> deshabilitarUsuario(@PathVariable Long id) {
        boolean isActive = usuarioService.deshabilitarUsuario(id);
        if (isActive) {
            return new ResponseEntity<>(HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
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
}