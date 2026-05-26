package com.tienda.ropa.service;

import com.tienda.ropa.agregates.request.SignInRequest;
import com.tienda.ropa.agregates.request.SignUpRequest;
import com.tienda.ropa.agregates.response.AuthenticationResponse;
import com.tienda.ropa.entity.Usuario;

public interface AuthenticationService {

    Usuario signUpAdmin(SignUpRequest signUpRequest);
    Usuario signUpUser(SignUpRequest signUpRequest);
    AuthenticationResponse signin(SignInRequest signInRequest);

}
    