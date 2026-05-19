package com.tienda.ropa.config;

import com.tienda.ropa.config.filter.JwtAuthenticationFilter;
import com.tienda.ropa.service.UsuarioService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
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
@RequiredArgsConstructor
public class SecurityConfiguration {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final UsuarioService usuarioService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // 1. Deshabilitar CSRF: Esencial cuando se usa JWT y no sesiones.
                .csrf(AbstractHttpConfigurer::disable)

                // 2. Habilitar CORS: Usa el bean 'corsConfigurationSource' definido más abajo.
                // Esta es la forma correcta y recomendada de integrar CORS con Spring Security.
                .cors(cors -> cors.configurationSource(corsConfigurationSource())) // 3. Reglas de Autorización de Rutas
                                                                                   // (Endpoints)
                .authorizeHttpRequests(request -> request
                        // Preflight CORS sin credenciales de rol (evita 403 en navegador antes del GET/POST real).
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // La regla MÁS IMPORTANTE: Permitir acceso público a los endpoints de
                        // autenticación.
                        // Debe ir primero para que no sea sobreescrita por reglas más restrictivas.
                        .requestMatchers("/api/autenticacion/**").permitAll()

                        // Proteger las rutas de administrador. Solo ADMIN puede acceder.
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        // Permitir acceso a los nuevos endpoints de códigos de barras v1
                        .requestMatchers("/api/v1/codigosbarras/**").permitAll()

                        // Lectura del catálogo POS (productos/variantes): también vendedor de piso (el front
                        // reutiliza estas rutas; la regla general de /api/cajero/** sigue sin incluir VENDEDOR).
                        .requestMatchers(HttpMethod.GET, "/api/cajero/productos/**")
                                .hasAnyRole("ADMIN", "CAJERO", "ALMACENERO", "SUPERVISOR_ALMACEN", "VENDEDOR")

                        // Cajero (ventas, catálogo POS). ALMACENERO comparte flujos de producto/variantes con el front.
                        .requestMatchers("/api/cajero/**")
                                .hasAnyRole("ADMIN", "CAJERO", "ALMACENERO", "SUPERVISOR_ALMACEN", "VENDEDOR")

                        // Proteger las rutas de caja. ADMIN, CAJERO y ALMACENERO pueden acceder.
                        .requestMatchers("/api/caja/**")
                                .hasAnyRole("ADMIN", "CAJERO", "ALMACENERO", "SUPERVISOR_ALMACEN", "VENDEDOR")

                        // Búsqueda paginada de productos (misma query que usa ProductoService del front para varios roles).
                        .requestMatchers(HttpMethod.GET, "/api/almacenero/productos/pagina")
                                .hasAnyRole("ADMIN", "ALMACENERO", "SUPERVISOR_ALMACEN", "VENDEDOR", "CAJERO")

                        // Proteger las rutas de almacenero (inventario, productos, categorías, etc.)
                        .requestMatchers("/api/almacenero/**")
                                .hasAnyRole("ADMIN", "ALMACENERO", "SUPERVISOR_ALMACEN", "VENDEDOR")

                        // Vendedor / admin: catálogo y solicitudes a almacén (mismo contrato API)
                        .requestMatchers("/api/vendedor/**")
                                .hasAnyRole("VENDEDOR", "ADMIN")

                        // CUALQUIER OTRA RUTA que no coincida con las anteriores requiere
                        // autenticación.
                        .anyRequest().authenticated())

                // 4. Gestión de Sesión: STATELESS (sin estado), ya que cada petición se valida
                // con el token JWT.
                .sessionManagement(manager -> manager.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

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
                "http://localhost:1420"));

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