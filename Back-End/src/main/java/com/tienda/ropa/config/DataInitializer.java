package com.tienda.ropa.config;

import com.tienda.ropa.entity.Rol;
import com.tienda.ropa.entity.Role;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.repository.RolRepository;
import com.tienda.ropa.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

@Configuration
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // 1. Asegurar que todos los roles existan en la BD
        for (Role roleName : Role.values()) {
            if (rolRepository.findByNombreRol(roleName).isEmpty()) {
                rolRepository.save(new Rol(null, roleName));
            }
        }

        // 2. Crear usuario vendedor de prueba si no existe
        if (usuarioRepository.findByUsuario("vendedor").isEmpty()) {
            Set<Rol> roles = new HashSet<>();
            // Buscar el rol DENTRO de la misma transacción para que esté "managed"
            Rol vendedorRol = rolRepository.findByNombreRol(Role.VENDEDOR).orElseThrow();
            roles.add(vendedorRol);

            Usuario vendedor = Usuario.builder()
                    .usuario("vendedor")
                    .password(passwordEncoder.encode("Vendedor123*"))
                    .roles(roles)
                    .activo(true)
                    .build();

            usuarioRepository.save(vendedor);
            System.out.println("[DK-SYSTEM] Usuario 'vendedor' creado exitosamente con rol VENDEDOR.");
        }
    }
}
