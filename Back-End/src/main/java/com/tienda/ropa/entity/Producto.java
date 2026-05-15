package com.tienda.ropa.entity;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Entity
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
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

    @Column(name = "descripcion", columnDefinition = "TEXT")
    private String descripcion;

    @NotNull
    @Column(name = "sexo", nullable = false)
    private String sexo;

    @NotNull
    @Column(name = "tipo_publico", nullable = false)
    private String tipoPublico;

    @ManyToOne
    @JoinColumn(name = "id_subcategoria", nullable = true)
    private Categoria categoria;

    @ManyToOne
    @JoinColumn(name = "id_sub_categoria2", nullable = true)
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

    public Integer getCantidad() {
        return cantidad;
    }

    public void setCantidad(Integer cantidad) {
        this.cantidad = cantidad;
    }

    // Método para calcular la cantidad total de producto disponible
    public int getCantidadTotal() {
        // Si el producto usa el sistema de variantes, suma las cantidades de todas las
        // variantes
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

    // Métodos de validación para precios por volumen
    @PrePersist
    @PreUpdate
    private void validarPreciosPorVolumen() {
        if (precioUnitario == null || precioCuarto == null ||
                precioMediaDocena == null || precioDocena == null) {
            throw new IllegalArgumentException("Todos los precios por volumen son obligatorios");
        }

        // Calcular precios unitarios para cada volumen
        BigDecimal precioUnitarioIndividual = precioUnitario;
        BigDecimal precioUnitarioCuarto = precioCuarto.divide(new BigDecimal("3"), 2, RoundingMode.HALF_UP);
        BigDecimal precioUnitarioMediaDocena = precioMediaDocena.divide(new BigDecimal("6"), 2, RoundingMode.HALF_UP);
        BigDecimal precioUnitarioDocenaCompleta = precioDocena.divide(new BigDecimal("12"), 2, RoundingMode.HALF_UP);

        // Validar que los precios unitarios disminuyan con el volumen
        if (precioUnitarioIndividual.compareTo(precioUnitarioCuarto) < 0) {
            throw new IllegalArgumentException(
                    "El precio unitario del cuarto (S/." + precioUnitarioCuarto +
                            ") no puede ser mayor al precio individual (S/." + precioUnitarioIndividual + ")");
        }

        if (precioUnitarioCuarto.compareTo(precioUnitarioMediaDocena) < 0) {
            throw new IllegalArgumentException(
                    "El precio unitario de la media docena (S/." + precioUnitarioMediaDocena +
                            ") no puede ser mayor al precio unitario del cuarto (S/." + precioUnitarioCuarto + ")");
        }

        if (precioUnitarioMediaDocena.compareTo(precioUnitarioDocenaCompleta) < 0) {
            throw new IllegalArgumentException(
                    "El precio unitario de la docena (S/." + precioUnitarioDocenaCompleta +
                            ") no puede ser mayor al precio unitario de la media docena (S/."
                            + precioUnitarioMediaDocena + ")");
        }
    }

    // Método auxiliar para calcular precios unitarios
    public BigDecimal getPrecioUnitarioPorVolumen(int cantidad) {
        if (cantidad == 1) {
            return precioUnitario;
        } else if (cantidad <= 3) {
            return precioCuarto.divide(new BigDecimal("3"), 2, RoundingMode.HALF_UP);
        } else if (cantidad <= 6) {
            return precioMediaDocena.divide(new BigDecimal("6"), 2, RoundingMode.HALF_UP);
        } else {
            return precioDocena.divide(new BigDecimal("12"), 2, RoundingMode.HALF_UP);
        }
    }
}
