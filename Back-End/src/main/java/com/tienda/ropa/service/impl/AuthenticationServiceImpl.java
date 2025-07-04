package com.tienda.ropa.service.impl;

import java.util.HashSet;
import java.util.Set;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.tienda.ropa.agregates.request.SignUpRequest;
import com.tienda.ropa.agregates.response.AuthenticationResponse;
import com.tienda.ropa.entity.Rol;
import com.tienda.ropa.entity.Role;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.repository.RolRepository;
import com.tienda.ropa.repository.UsuarioRepository;
import com.tienda.ropa.service.AuthenticationService;
import com.tienda.ropa.service.UsuarioService;
import com.tienda.ropa.util.JwtUtils;

import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Service
public class AuthenticationServiceImpl implements AuthenticationService {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final UsuarioService usuarioService;
    private final JwtUtils jwtUtils;
    private final PasswordEncoder passwordEncoder;

    @Override
    public Usuario signUpAdmin(SignUpRequest signUpRequest) {
        String username = signUpRequest.usuario();
        String password = signUpRequest.clave();
        Set<Rol> roles = new HashSet<>();
        Rol userRol = rolRepository.findByNombreRol(Role.ADMIN).orElseGet(() -> rolRepository.save(new Rol(null, Role.ADMIN)));
        roles.add(userRol);

        Usuario user = Usuario.builder()
                .usuario(username)
                .password(new BCryptPasswordEncoder().encode(password))
                .roles(roles)
                .activo(true)
                .build();

        Usuario userCreated = usuarioRepository.save(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(userCreated,password, userCreated.getAuthorities());
        return userCreated;
    }

    @Override
    public Usuario signUpUser(SignUpRequest signUpRequest) {
        String username = signUpRequest.usuario();
        String password = signUpRequest.clave();
        String roleName = signUpRequest.rol();
        Set<Rol> roles = new HashSet<>();

        // Verifica que el nombre de usuario no esté en uso
        if (usuarioRepository.findByUsuario(username).isPresent()) {
            throw new IllegalArgumentException("El nombre de usuario ya está en uso: " + username);
        }

        // Remover el prefijo ROLE_ si existe
        if (roleName.startsWith("ROLE_")) {
            roleName = roleName.substring(5);
        }

        // Verifica que el rol proporcionado sea válido
        Role validRole;
        try {
            validRole = Role.valueOf(roleName.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Rol no válido: " + roleName);
        }

        // Verifica que exista en la base de datos, si no existe, lo crea
        Rol role = rolRepository.findByNombreRol(validRole)
                .orElseGet(() -> rolRepository.save(new Rol(null, validRole)));
        roles.add(role);

        Usuario user = Usuario.builder()
                .usuario(username)
                .password(passwordEncoder.encode(password))
                .roles(roles)
                .activo(signUpRequest.activo() != null ? signUpRequest.activo() : true) // Usar el valor del request o true por defecto
                .build();

        Usuario userCreated = usuarioRepository.save(user);

        // Crear autenticación para el usuario recién creado
        Authentication authentication = new UsernamePasswordAuthenticationToken(
            userCreated,
            password,
            userCreated.getAuthorities()
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);

        return userCreated;
    }

    @Override
    public AuthenticationResponse signin(com.tienda.ropa.agregates.request.SignInRequest signInRequest) {
        String username = signInRequest.usuario();
        String password = signInRequest.clave();

        Authentication authentication = this.authenticate(username,password);
        SecurityContextHolder.getContext().setAuthentication(authentication);

        String accessToken = jwtUtils.createToken(authentication);
        AuthenticationResponse authenticationResponse = new AuthenticationResponse(username,"User loged successfully",accessToken,true);
        return authenticationResponse;
    }


    private Authentication authenticate(String username, String password) {
        UserDetails userDetails = usuarioService.userDetailsService().loadUserByUsername(username);
        if (userDetails == null) {
            throw new BadCredentialsException("Usuario o contraseña incorrectos");
        }
        if (!passwordEncoder.matches(password, userDetails.getPassword())) {
            throw new BadCredentialsException("Usuario o contraseña incorrectos");
        }
        return new UsernamePasswordAuthenticationToken(username, userDetails.getPassword(), userDetails.getAuthorities());
    }

    public record SignInRequest(
            @NotBlank(message = "El nombre de usuario no puede estar vacío") String usuario,
            @NotBlank(message = "La contraseña no puede estar vacía") String clave
    ) {}
}
