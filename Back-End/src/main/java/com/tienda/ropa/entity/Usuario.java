package com.tienda.ropa.entity;

import com.tienda.ropa.agregates.validation.ContrasenaSegura;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "usuario")
public class Usuario implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Long id;


    @NotBlank(message = "El nombre de usuario no puede estar vacío")
    @Column(name = "usuario")
    private String usuario;    @NotBlank(message = "La contraseña no puede estar vacía")
    @ContrasenaSegura
    @Column(name = "password")
    private String password;

    @Column(name = "activo")
    private boolean activo;

    @ManyToMany(fetch = FetchType.EAGER, targetEntity = Rol.class, cascade = CascadeType.ALL)
    @JoinTable(name = "usuario_rol",
    joinColumns = @JoinColumn(name = "id_usuario"),
    inverseJoinColumns = @JoinColumn(name = "id_rol"))
    private Set<Rol> roles = new HashSet<>();

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream()
                .map(rol -> new SimpleGrantedAuthority("ROLE_".concat(rol.getNombreRol().name())))
                .collect(Collectors.toSet());
    }

    @Override
    public String getUsername() {
        return usuario;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    @OneToMany(mappedBy = "usuario")
    @JsonIgnore  // Evita la referencia circular en la serialización JSON
    private Collection<Venta> venta;

    public Collection<Venta> getVenta() {
        return venta;
    }

    public void setVenta(Collection<Venta> venta) {
        this.venta = venta;
    }
}
