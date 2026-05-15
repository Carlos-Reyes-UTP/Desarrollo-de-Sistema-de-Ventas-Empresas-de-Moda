package com.tienda.ropa.util;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.Claim;
import com.auth0.jwt.interfaces.DecodedJWT;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.Date;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class JwtUtils {

    @Value("${security.jwt.key}")
    private String privateKey;

    @Value("${security.jwt.user.generator}")
    private String userGenerator;

    /**
     * Orden estable de roles en el claim {@code authorities}. Si un usuario tiene varios roles
     * (p. ej. CAJERO + ALMACENERO), el orden del {@code Set} en Hibernate era arbitrario y el
     * primero podía ser CAJERO, haciendo que el cliente interpretara mal el perfil para inventario.
     */
    private static int authoritySortKey(String authority) {
        if (authority == null) {
            return 99;
        }
        String a = authority.toUpperCase();
        if (a.contains("ADMIN")) {
            return 0;
        }
        if (a.contains("ALMACENERO")) {
            return 1;
        }
        if (a.contains("VENDEDOR")) {
            return 3;
        }
        if (a.contains("CAJERO")) {
            return 4;
        }
        return 50;
    }

    public String createToken(Authentication authentication){

        Algorithm algorithm = Algorithm.HMAC256(this.privateKey);

        String username = authentication.getName();

        String authorities = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .sorted(Comparator.comparingInt(JwtUtils::authoritySortKey).thenComparing(a -> a))
                .collect(Collectors.joining(","));


        String jwtToken = JWT.create()
                .withIssuer(userGenerator)
                .withSubject(username)
                .withClaim("authorities",authorities)
                .withIssuedAt(new Date())
                .withExpiresAt(new Date(System.currentTimeMillis() + 7200000)) // 2 horas en lugar de 30 minutos
                .withJWTId(UUID.randomUUID().toString())
                // Ligeramente en el pasado evita rechazos por desfase de reloj al validar nbf justo al emitir el token
                .withNotBefore(new Date(System.currentTimeMillis() - 2000))
                .sign(algorithm);

        return jwtToken;
    }

    public DecodedJWT validateToken(String jwtToken){
        try {

            Algorithm algorithm = Algorithm.HMAC256(this.privateKey);
            JWTVerifier verifier =JWT.require(algorithm)
                    .withIssuer(userGenerator)
                    .build();

            DecodedJWT decodedJWT = verifier.verify(jwtToken);
            return  decodedJWT;

        } catch (JWTVerificationException e) {
            throw new JWTVerificationException("Token inválido, no autorizado. ", e);
        }
    }

    public String extractEmail(DecodedJWT decodedJWT){
        return decodedJWT.getSubject();
    }

    public Claim getEspecificClaim(DecodedJWT decodedJWT, String claimName){
        return decodedJWT.getClaim(claimName);
    }

    public Map<String, Claim> getAllClaims(DecodedJWT decodedJWT){
        return decodedJWT.getClaims();
    }

}
