package com.tienda.ropa.config.filter;

import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        
        // Saltarse el filtro JWT para rutas de autenticación públicas
        String requestURI = request.getRequestURI();
        if (requestURI.startsWith("/api/autenticacion/")) {
            filterChain.doFilter(request, response);
            return;
        }
        
        try {
            String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
            
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String jwtToken = authHeader.substring(7);
                
                try {
                    DecodedJWT decodedJWT = jwtUtils.validateToken(jwtToken);
                    String username = jwtUtils.extractEmail(decodedJWT);
                    String stringAuthorities = jwtUtils.getEspecificClaim(decodedJWT, "authorities").asString();

                    // Agregar prefijo ROLE_ a cada autoridad si no lo tiene
                    String authoritiesWithPrefix = stringAuthorities;
                    if (stringAuthorities != null && !stringAuthorities.isEmpty()) {
                        String[] authorityArray = stringAuthorities.split(",");
                        StringBuilder sb = new StringBuilder();
                        for (int i = 0; i < authorityArray.length; i++) {
                            String auth = authorityArray[i].trim();
                            if (!auth.startsWith("ROLE_")) {
                                auth = "ROLE_" + auth;
                            }
                            if (i > 0) sb.append(",");
                            sb.append(auth);
                        }
                        authoritiesWithPrefix = sb.toString();
                    }

                    log.info("JWT válido para usuario: " + username + " con autoridades: " + authoritiesWithPrefix);
                    log.info("URI solicitada: " + request.getRequestURI());

                    Collection<? extends GrantedAuthority> authorities = AuthorityUtils.commaSeparatedStringToAuthorityList(authoritiesWithPrefix);
                    
                    // IMPORTANTE: Para que @AuthenticationPrincipal funcione con UserDetails en los controladores,
                    // el principal debe ser un objeto que implemente UserDetails, no solo un String.
                    org.springframework.security.core.userdetails.User userDetails = 
                        new org.springframework.security.core.userdetails.User(username, "", authorities);

                    SecurityContext context = SecurityContextHolder.getContext();
                    Authentication authentication = new UsernamePasswordAuthenticationToken(userDetails, null, authorities);
                    context.setAuthentication(authentication);
                    SecurityContextHolder.setContext(context);
                } catch (JWTVerificationException e) {
                    log.error("Token JWT inválido: " + e.getMessage() + " para URI: " + request.getRequestURI());
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Token inválido o expirado\",\"message\":\"" + e.getMessage() + "\"}");
                    return;
                }
            } else if (authHeader == null) {
                log.error("No se proporcionó token JWT para URI: " + request.getRequestURI());
            }
        } catch (Exception e) {
            log.error("Error procesando el token JWT: " + e.getMessage() + " para URI: " + request.getRequestURI());
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Error procesando la autenticación\",\"message\":\"" + e.getMessage() + "\"}");
            return;
        }
        
        filterChain.doFilter(request, response);
    }
}
