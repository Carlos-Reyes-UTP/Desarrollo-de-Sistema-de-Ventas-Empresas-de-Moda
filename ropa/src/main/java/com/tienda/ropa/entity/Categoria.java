package com.tienda.ropa.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@Entity
public class Categoria {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idCategoria;

    private String nombre;
    @ManyToOne
    @JoinColumn(name = "categoria_padre_id", nullable = true)
    private Categoria categoriaPadre;

    @OneToMany(mappedBy = "categoriaPadre", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Categoria> subCategorias= new ArrayList<>();

    public Categoria() {
    }
    public void agregarSubCategoria(Categoria subCategoria) {
        subCategorias.add(subCategoria);
        subCategoria.setCategoriaPadre(this);
    }

    public void eliminarSubCategoria(Categoria subCategoria) {
        subCategorias.remove(subCategoria);
        subCategoria.setCategoriaPadre(null);
    }
    public List<Categoria> getSubCategorias() {
        return subCategorias;
    }

    public Categoria getCategoriaPadre() {
        return categoriaPadre;
    }

    public void setCategoriaPadre(Categoria categoriaPadre) {
        this.categoriaPadre = categoriaPadre;
    }



    // Método para verificar si es una categoría principal (no tiene padre)
    public boolean esCategoriaPrincipal() {
        return categoriaPadre == null;
    }


    public Long getIdCategoria() {
        return idCategoria;
    }

    public void setIdCategoria(Long idCategoria) {
        this.idCategoria = idCategoria;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }
    public boolean tieneSubcategorias() {
        return !subCategorias.isEmpty();
    }
}