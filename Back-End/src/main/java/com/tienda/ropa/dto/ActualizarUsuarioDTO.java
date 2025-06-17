package com.tienda.ropa.dto;

import com.tienda.ropa.agregates.validation.ContrasenaSegura;
import jakarta.validation.constraints.NotBlank;

public class ActualizarUsuarioDTO {
    private Long id;
    
    @NotBlank(message = "El nombre de usuario no puede estar vacío")
    private String usuario;
    
    // La contraseña es opcional en actualizaciones, pero si se proporciona debe ser segura
    @ContrasenaSegura
    private String clave;
    
    private boolean activo;

    // Constructores
    public ActualizarUsuarioDTO() {}

    public ActualizarUsuarioDTO(Long id, String usuario, String clave, boolean activo) {
        this.id = id;
        this.usuario = usuario;
        this.clave = clave;
        this.activo = activo;
    }

    // Getters y setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsuario() {
        return usuario;
    }

    public void setUsuario(String usuario) {
        this.usuario = usuario;
    }

    public String getClave() {
        return clave;
    }

    public void setClave(String clave) {
        this.clave = clave;
    }

    public boolean isActivo() {
        return activo;
    }

    public void setActivo(boolean activo) {
        this.activo = activo;
    }
}
