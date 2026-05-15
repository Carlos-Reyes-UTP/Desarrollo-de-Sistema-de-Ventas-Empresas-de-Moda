package com.tienda.ropa.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "inventario_ubicacion",
        uniqueConstraints = @UniqueConstraint(columnNames = {"id_variante", "id_ubicacion"})
)
public class InventarioUbicacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_inventario_ubicacion")
    private Long idInventarioUbicacion;

    @JsonIgnore
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_variante", referencedColumnName = "id_producto_variante", nullable = false)
    private ProductoVariante variante;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_ubicacion", nullable = false)
    private Ubicacion ubicacion;

    @NotNull
    @Column(name = "stock_actual", nullable = false)
    private Integer stockActual = 0;

    @NotNull
    @Column(name = "stock_minimo", nullable = false)
    private Integer stockMinimo = 0;

    @Column(name = "stock_maximo")
    private Integer stockMaximo;
}
