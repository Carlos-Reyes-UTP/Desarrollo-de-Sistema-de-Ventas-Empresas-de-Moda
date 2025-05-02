package com.tienda.ropa.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import com.tienda.ropa.agregates.request.SignInRequest;
import com.tienda.ropa.agregates.request.SignUpRequest;
import com.tienda.ropa.agregates.response.AuthenticationResponse;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.service.AuthenticationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/api/v1/autenticacion")
@RequiredArgsConstructor
public class AuthenticationController {
    private final AuthenticationService authenticationService;

    // Crear admin sin autenticacion
    @PostMapping("/signup/createAdmin")
    public ResponseEntity<Usuario> signUpAdmin(@RequestBody @Valid SignUpRequest signUpRequest) {
        return new ResponseEntity<>(authenticationService.signUpAdmin(signUpRequest), HttpStatus.CREATED);
    }

    // Iniciar Sesion
    @PostMapping("/signin")
    public ResponseEntity<AuthenticationResponse> signin(@RequestBody @Valid SignInRequest signInRequest) {
        return new ResponseEntity<>(authenticationService.signin(signInRequest), HttpStatus.OK);
    }

}
