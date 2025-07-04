package com.tienda.ropa.entity;

import java.math.BigDecimal;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonManagedReference;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Entity
public class Producto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_producto")
    private Long idProducto;

    @NotNull
    @Column(name = "codigo_identificacion", unique = true, nullable = false)
    private String codigoIdentificacion;

    @Column(name = "codigo_barras", unique = true)
    private String codigoBarras;

    @NotNull
    @Column(name = "nombre", nullable = false)
    private String nombre;

    @NotNull
    @Column(name = "sexo", nullable = false)
    private String sexo;

    @NotNull
    @Column(name = "tipo_publico", nullable = false)
    private String tipoPublico;

    @ManyToOne
    @JoinColumn(name = "id_subcategoria", nullable = true)
    private Categoria categoria;

    @NotNull
    @ManyToOne
    @JoinColumn(name = "id_sub_categoria2", nullable = false)
    private Categoria subCategoria2;

    @ManyToOne
    @JoinColumn(name = "id_categoria_padre", nullable = false)
    private Categoria categoriaPadre;

    @NotNull
    @Column(name = "marca", nullable = false)
    private String marca;

    @NotNull
    @ManyToOne
    @JoinColumn(name = "id_proveedor", nullable = false)
    private Proveedores proveedor;

    @NotNull
    @Column(name = "precio_unitario", nullable = false)
    private BigDecimal precioUnitario;

    @Column(name = "precio_cuarto")
    private BigDecimal precioCuarto;

    @Column(name = "precio_media_docena")
    private BigDecimal precioMediaDocena;

    @Column(name = "precio_docena")
    private BigDecimal precioDocena;

    @JsonManagedReference
    @OneToMany(mappedBy = "producto", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ProductoVariante> variantes;

    @Column(name = "cantidad", nullable = false)
    private Integer cantidad = 0;

    // Método para calcular la cantidad total de producto disponible
    public int getCantidadTotal() {
        // Si el producto usa el sistema de variantes, suma las cantidades de todas las variantes
        if (variantes != null && !variantes.isEmpty()) {
            return variantes.stream()
                    .mapToInt(ProductoVariante::getCantidad)
                    .sum();
        }
        // Si no usa variantes, devuelve la cantidad del producto base
        return cantidad != null ? cantidad.intValue() : 0;
    }

    public Long getIdProducto() {
        return idProducto;
    }

    public void setIdProducto(Long idProducto) {
        this.idProducto = idProducto;
    }

    public String getCodigoIdentificacion() {
        return codigoIdentificacion;
    }

    public void setCodigoIdentificacion(String codigoIdentificacion) {
        this.codigoIdentificacion = codigoIdentificacion;
    }


    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public Categoria getCategoria() {
        return categoria;
    }

    public Proveedores getProveedor() {
        return proveedor;
    }

    public void setProveedor(Proveedores proveedor) {
        this.proveedor = proveedor;
    }

    public void setCategoria(Categoria categoria) {
        this.categoria = categoria;
    }

    public BigDecimal getPrecioUnitario() {
        return precioUnitario;
    }

    public void setPrecioUnitario(BigDecimal precioUnitario) {
        this.precioUnitario = precioUnitario;
    }

    public BigDecimal getPrecioCuarto() {
        return precioCuarto;
    }

    public void setPrecioCuarto(BigDecimal precioCuarto) {
        this.precioCuarto = precioCuarto;
    }

    public BigDecimal getPrecioMediaDocena() {
        return precioMediaDocena;
    }

    public void setPrecioMediaDocena(BigDecimal precioMediaDocena) {
        this.precioMediaDocena = precioMediaDocena;
    }

    public BigDecimal getPrecioDocena() {
        return precioDocena;
    }

    public void setPrecioDocena(BigDecimal precioDocena) {
        this.precioDocena = precioDocena;
    }

    // Getters y setters para los nuevos campos
    public String getMarca() {
        return marca;
    }

    public void setMarca(String marca) {
        this.marca = marca;
    }

    public String getSexo() {
        return sexo;
    }

    public void setSexo(String sexo) {
        this.sexo = sexo;
    }

    public String getTipoPublico() {
        return tipoPublico;
    }

    public void setTipoPublico(String tipoPublico) {
        this.tipoPublico = tipoPublico;
    }

    public Categoria getSubCategoria2() {
        return subCategoria2;
    }

    public void setSubCategoria2(Categoria subCategoria2) {
        this.subCategoria2 = subCategoria2;
    }

    public Categoria getCategoriaPadre() {
        return categoriaPadre;
    }

    public void setCategoriaPadre(Categoria categoriaPadre) {
        this.categoriaPadre = categoriaPadre;
    }

    public String getCodigoBarras() {
        return codigoBarras;
    }

    public void setCodigoBarras(String codigoBarras) {
        this.codigoBarras = codigoBarras;
    }

    public List<ProductoVariante> getVariantes() {
        return variantes;
    }

    public void setVariantes(List<ProductoVariante> variantes) {
        this.variantes = variantes;
    }
}
