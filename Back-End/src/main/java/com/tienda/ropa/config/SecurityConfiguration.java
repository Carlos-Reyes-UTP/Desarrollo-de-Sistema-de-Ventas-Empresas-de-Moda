package com.tienda.ropa.config;

import com.tienda.ropa.config.filter.JwtAuthenticationFilter;
import com.tienda.ropa.service.UsuarioService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.http.HttpMethod;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfiguration {

        private final JwtAuthenticationFilter jwtAuthenticationFilter;
        private final UsuarioService usuarioService;

        public SecurityConfiguration(
                        JwtAuthenticationFilter jwtAuthenticationFilter,
                        UsuarioService usuarioService) {
                this.jwtAuthenticationFilter = jwtAuthenticationFilter;
                this.usuarioService = usuarioService;
        }

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
                http
                                // 1. Deshabilitar CSRF: Esencial cuando se usa JWT y no sesiones.
                                .csrf(AbstractHttpConfigurer::disable)

                                // 2. Habilitar CORS: Usa el bean 'corsConfigurationSource' definido más abajo.
                                // Esta es la forma correcta y recomendada de integrar CORS con Spring Security.
                                .cors(cors -> cors.configurationSource(corsConfigurationSource())) // 3. Reglas de
                                                                                                   // Autorización de
                                                                                                   // Rutas
                                                                                                   // (Endpoints)
                                .authorizeHttpRequests(request -> request
                                                // Preflight CORS sin credenciales de rol (evita 403 en navegador antes
                                                // del GET/POST real).
                                                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                                                // La regla MÁS IMPORTANTE: Permitir acceso público a los endpoints de
                                                // autenticación.
                                                // Debe ir primero para que no sea sobreescrita por reglas más
                                                // restrictivas.
                                                .requestMatchers("/api/autenticacion/**").permitAll()

                                                // Permitir acceso al endpoint de WebSockets
                                                .requestMatchers("/ws/**").permitAll()

                                                // GERENTE: gestión de usuarios
                                                .requestMatchers("/api/gerente/user/**").hasRole("GERENTE")

                                                // GERENTE: estructura almacén (pisos, áreas, ubicaciones)
                                                .requestMatchers("/api/gerente/estructura-almacen/**").hasRole("GERENTE")

                                                // Reportes: ADMIN + GERENTE (antes de /api/admin/**)
                                                .requestMatchers(HttpMethod.GET, "/api/admin/reportes/**")
                                                .hasAnyRole("ADMIN", "GERENTE")

                                                // ADMIN: resto de /api/admin/** (mayoristas, etc.)
                                                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                                                // Permitir acceso a los nuevos endpoints de códigos de barras v1
                                                .requestMatchers("/api/v1/codigosbarras/**").permitAll()

                                                // Lectura de ventas para dashboards (ADMIN + GERENTE + operativos)
                                                .requestMatchers(HttpMethod.GET, "/api/cajero/ventas/**")
                                                .hasAnyRole("ADMIN", "GERENTE", "CAJERO", "ALMACENERO",
                                                                "SUPERVISOR_ALMACEN", "VENDEDOR")

                                                // Lectura del catálogo POS (productos/variantes): también vendedor de
                                                // piso (el front
                                                // reutiliza estas rutas; la regla general de /api/cajero/** sigue sin
                                                // incluir VENDEDOR ni ADMIN).
                                                .requestMatchers(HttpMethod.GET, "/api/cajero/productos/**")
                                                .hasAnyRole("CAJERO", "ALMACENERO", "SUPERVISOR_ALMACEN",
                                                                "VENDEDOR", "ADMIN", "GERENTE")

                                                // Clientes (búsqueda DNI/RUC) — ADMIN también necesita acceso (crear mayoristas)
                                                .requestMatchers("/api/cajero/clientes/**")
                                                .hasAnyRole("ADMIN", "CAJERO", "ALMACENERO",
                                                                "SUPERVISOR_ALMACEN", "VENDEDOR")

                                                // Cajero (ventas, catálogo POS). Sin ADMIN.
                                                .requestMatchers("/api/cajero/**")
                                                .hasAnyRole("CAJERO", "ALMACENERO", "SUPERVISOR_ALMACEN",
                                                                "VENDEDOR")

                                                // Caja. Sin ADMIN.
                                                .requestMatchers("/api/caja/**")
                                                .hasAnyRole("CAJERO", "ALMACENERO", "SUPERVISOR_ALMACEN",
                                                                "VENDEDOR")

                                                // Pisos/áreas: lectura para ADMIN y GERENTE
                                                .requestMatchers(HttpMethod.GET, "/api/almacenero/ubicaciones/**")
                                                .hasAnyRole("ADMIN", "ALMACENERO", "SUPERVISOR_ALMACEN", "VENDEDOR",
                                                                "GERENTE", "CAJERO")

                                                // Búsqueda paginada de productos (misma query que usa ProductoService
                                                // del front para varios roles).
                                                .requestMatchers(HttpMethod.GET, "/api/almacenero/productos/pagina")
                                                .hasAnyRole("ALMACENERO", "SUPERVISOR_ALMACEN", "VENDEDOR",
                                                                "CAJERO")

                                                // Catálogo ligero talla/color (formularios de inventario)
                                                .requestMatchers(HttpMethod.GET,
                                                                "/api/almacenero/variantes/sugerencias")
                                                .hasAnyRole("ALMACENERO", "SUPERVISOR_ALMACEN", "VENDEDOR",
                                                                "CAJERO")

                                                // Endpoints legacy de carga total (mantenimiento / migración)
                                                .requestMatchers(HttpMethod.GET, "/api/almacenero/variantes/todas")
                                                .hasAnyRole("SUPERVISOR_ALMACEN", "ADMIN", "GERENTE")
                                                .requestMatchers(HttpMethod.GET, "/api/cajero/productos/variantes")
                                                .hasAnyRole("SUPERVISOR_ALMACEN", "ADMIN", "GERENTE")
                                                .requestMatchers(HttpMethod.GET, "/api/almacenero/productos")
                                                .hasAnyRole("SUPERVISOR_ALMACEN", "ADMIN", "GERENTE")

                                                // Dashboard almacenero: escritura solo almacén (reposición manual, etc.)
                                                .requestMatchers(HttpMethod.POST, "/api/almacenero/dashboard/**")
                                                .hasAnyRole("ALMACENERO", "SUPERVISOR_ALMACEN", "ADMIN", "GERENTE")

                                                // Inventario (productos, categorías, proveedores, etc.) — sin ADMIN
                                                .requestMatchers("/api/almacenero/**")
                                                .hasAnyRole("ALMACENERO", "SUPERVISOR_ALMACEN", "VENDEDOR", "ADMIN", "GERENTE")

                                                // Catálogo y solicitudes a almacén (vendedor)
                                                .requestMatchers("/api/vendedor/**")
                                                .hasRole("VENDEDOR")

                                                // CUALQUIER OTRA RUTA que no coincida con las anteriores requiere
                                                // autenticación.
                                                .anyRequest().authenticated())

                                // 4. Gestión de Sesión: STATELESS (sin estado), ya que cada petición se valida
                                // con el token JWT.
                                .sessionManagement(manager -> manager
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                                .exceptionHandling(ex -> ex
                                                .accessDeniedHandler((request, response, accessDeniedException) -> {
                                                        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                                                        response.setContentType("application/json;charset=UTF-8");
                                                        response.getWriter().write(
                                                                        "{\"message\":\"No tienes permiso para esta acción\"}");
                                                }))

                                // 5. Proveedor de Autenticación: Usa nuestro servicio de usuario y el
                                // codificador de contraseñas.
                                .authenticationProvider(authenticationProvider())

                                // 6. Filtro JWT: Añade nuestro filtro personalizado para que se ejecute antes
                                // de la autenticación por defecto.
                                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();

                // Define los orígenes (URL de tu frontend de React) que tienen permitido hacer
                // peticiones.
                configuration.setAllowedOrigins(Arrays.asList(
                                "http://localhost:5173",
                                "http://localhost:3000",
                                "http://127.0.0.1:5173",
                                "http://127.0.0.1:3000",
                                "http://localhost:1420",
                                "http://localhost:4173"));

                // Define los métodos HTTP que se permitirán (GET, POST, etc.).
                configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));

                // Define las cabeceras que el frontend puede enviar. ESTO ES CRUCIAL.
                // Usar "*" permite todas las cabeceras necesarias
                configuration.setAllowedHeaders(Arrays.asList("*"));

                // Exponer cabeceras que el frontend puede leer
                configuration.setExposedHeaders(Arrays.asList("Authorization", "Content-Type"));

                // Permite que el navegador envíe credenciales (como cookies o tokens) en las
                // peticiones.
                configuration.setAllowCredentials(true);

                // Cache para peticiones preflight
                configuration.setMaxAge(3600L);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                // Aplica esta configuración a TODAS las rutas de tu API.
                source.registerCorsConfiguration("/**", configuration);

                return source;
        }

        @Bean
        public AuthenticationProvider authenticationProvider() {
                DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
                authProvider.setUserDetailsService(usuarioService.userDetailsService());
                authProvider.setPasswordEncoder(passwordEncoder());
                return authProvider;
        }

        @Bean
        public PasswordEncoder passwordEncoder() {
                return new BCryptPasswordEncoder();
        }

        @Bean
        public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
                return config.getAuthenticationManager();
        }
}