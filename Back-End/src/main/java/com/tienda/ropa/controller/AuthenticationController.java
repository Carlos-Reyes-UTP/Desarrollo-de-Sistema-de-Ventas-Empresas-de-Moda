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
@RequestMapping("/api/autenticacion")
@RequiredArgsConstructor
public class AuthenticationController {
    private final AuthenticationService authenticationService;



    // Iniciar Sesion
    @PostMapping("/signin")
    public ResponseEntity<AuthenticationResponse> signin(@RequestBody @Valid SignInRequest signInRequest) {
        return new ResponseEntity<>(authenticationService.signin(signInRequest), HttpStatus.OK);
    }

}
