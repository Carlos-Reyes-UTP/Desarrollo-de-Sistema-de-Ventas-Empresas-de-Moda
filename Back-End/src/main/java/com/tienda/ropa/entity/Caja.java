package com.tienda.ropa.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "caja")
public class Caja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_caja")
    private Long id;

    @ManyToOne
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @Column(name = "fecha_apertura", nullable = false)
    private LocalDateTime fechaApertura;

    @Column(name = "monto_apertura", nullable = false, precision = 10, scale = 2)
    private BigDecimal montoApertura;

    @Column(name = "fecha_cierre")
    private LocalDateTime fechaCierre;

    @Column(name = "monto_cierre", precision = 10, scale = 2)
    private BigDecimal montoCierre;

    @Column(name = "monto_ventas_efectivo", precision = 10, scale = 2)
    private BigDecimal montoVentasEfectivo = BigDecimal.ZERO;

    @Column(name = "monto_ventas_tarjeta", precision = 10, scale = 2)
    private BigDecimal montoVentasTarjeta = BigDecimal.ZERO;

    @Column(name = "monto_ventas_yape", precision = 10, scale = 2)
    private BigDecimal montoVentasYape = BigDecimal.ZERO;

    @Column(name = "monto_esperado", precision = 10, scale = 2)
    private BigDecimal montoEsperado;

    @Column(name = "discrepancia", precision = 10, scale = 2)
    private BigDecimal discrepancia;

    @Column(name = "observaciones", columnDefinition = "TEXT")
    private String observaciones;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado = "ABIERTA";

    @Column(name = "numero_operacion", unique = true, length = 50)
    private String numeroOperacion;

    @OneToMany(mappedBy = "caja", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<MovimientoCaja> movimientos = new ArrayList<>();

    public Caja() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }

    public LocalDateTime getFechaApertura() { return fechaApertura; }
    public void setFechaApertura(LocalDateTime fechaApertura) { this.fechaApertura = fechaApertura; }

    public BigDecimal getMontoApertura() { return montoApertura; }
    public void setMontoApertura(BigDecimal montoApertura) { this.montoApertura = montoApertura; }

    public LocalDateTime getFechaCierre() { return fechaCierre; }
    public void setFechaCierre(LocalDateTime fechaCierre) { this.fechaCierre = fechaCierre; }

    public BigDecimal getMontoCierre() { return montoCierre; }
    public void setMontoCierre(BigDecimal montoCierre) { this.montoCierre = montoCierre; }

    public BigDecimal getMontoVentasEfectivo() { return montoVentasEfectivo; }
    public void setMontoVentasEfectivo(BigDecimal montoVentasEfectivo) { this.montoVentasEfectivo = montoVentasEfectivo; }

    public BigDecimal getMontoVentasTarjeta() { return montoVentasTarjeta; }
    public void setMontoVentasTarjeta(BigDecimal montoVentasTarjeta) { this.montoVentasTarjeta = montoVentasTarjeta; }

    public BigDecimal getMontoVentasYape() { return montoVentasYape; }
    public void setMontoVentasYape(BigDecimal montoVentasYape) { this.montoVentasYape = montoVentasYape; }

    public BigDecimal getMontoEsperado() { return montoEsperado; }
    public void setMontoEsperado(BigDecimal montoEsperado) { this.montoEsperado = montoEsperado; }

    public BigDecimal getDiscrepancia() { return discrepancia; }
    public void setDiscrepancia(BigDecimal discrepancia) { this.discrepancia = discrepancia; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getNumeroOperacion() { return numeroOperacion; }
    public void setNumeroOperacion(String numeroOperacion) { this.numeroOperacion = numeroOperacion; }

    public List<MovimientoCaja> getMovimientos() { return movimientos; }
    public void setMovimientos(List<MovimientoCaja> movimientos) { this.movimientos = movimientos; }

    public BigDecimal getTotalVentas() {
        return montoVentasEfectivo.add(montoVentasTarjeta).add(montoVentasYape);
    }

    public BigDecimal getEfectivoEsperado() {
        return montoApertura.add(montoVentasEfectivo);
    }
}