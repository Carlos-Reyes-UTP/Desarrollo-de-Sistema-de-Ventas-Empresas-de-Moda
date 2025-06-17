package com.tienda.ropa.config.filter;

import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import com.tienda.ropa.util.JwtUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collection;

@Component
@AllArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        try {
            String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
            
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String jwtToken = authHeader.substring(7);
                
                try {
                    DecodedJWT decodedJWT = jwtUtils.validateToken(jwtToken);
                    String username = jwtUtils.extractEmail(decodedJWT);
                    String stringAuthorities = jwtUtils.getEspecificClaim(decodedJWT, "authorities").asString();

                    Collection<? extends GrantedAuthority> authorities = AuthorityUtils.commaSeparatedStringToAuthorityList(stringAuthorities);
                    SecurityContext context = SecurityContextHolder.getContext();
                    Authentication authentication = new UsernamePasswordAuthenticationToken(username, null, authorities);
                    context.setAuthentication(authentication);
                    SecurityContextHolder.setContext(context);
                } catch (JWTVerificationException e) {
                    logger.error("Token JWT inválido: " + e.getMessage());
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.getWriter().write("Token inválido o expirado");
                    return;
                }
            }
        } catch (Exception e) {
            logger.error("Error procesando el token JWT: " + e.getMessage());
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().write("Error procesando la autenticación");
            return;
        }
        
        filterChain.doFilter(request, response);
    }
}
