package com.tienda.ropa.config.filter;

import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.tienda.ropa.service.UsuarioService;
import com.tienda.ropa.util.JwtUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@AllArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;
    private final UsuarioService usuarioService;

    @Override
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

                    // Cargar la entidad Usuario (implementa UserDetails) para que @AuthenticationPrincipal Usuario
                    // funcione en VendedorController, SolicitudController, etc.
                    UserDetails principal;
                    try {
                        principal = usuarioService.userDetailsService().loadUserByUsername(username);
                    } catch (UsernameNotFoundException e) {
                        log.warn("JWT válido pero usuario no encontrado: {}", username);
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        response.setContentType("application/json");
                        response.getWriter().write("{\"error\":\"Usuario no encontrado\"}");
                        return;
                    } catch (RuntimeException e) {
                        if (e.getMessage() != null && e.getMessage().contains("deshabilitado")) {
                            log.warn("JWT válido pero usuario deshabilitado: {}", username);
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"error\":\"Usuario deshabilitado\"}");
                            return;
                        }
                        throw e;
                    }

                    log.info("JWT válido para usuario: {} (principal tipo {})", username, principal.getClass().getSimpleName());
                    log.info("URI solicitada: " + request.getRequestURI());

                    SecurityContext context = SecurityContextHolder.getContext();
                    Authentication authentication = new UsernamePasswordAuthenticationToken(
                            principal, null, principal.getAuthorities());
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
