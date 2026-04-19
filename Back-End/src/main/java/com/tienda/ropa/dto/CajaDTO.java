package com.tienda.ropa.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class CajaDTO {

    private Long idCaja;
    private String usuario;
    private Long idUsuario;
    private LocalDateTime fechaApertura;
    private BigDecimal montoApertura;
    private LocalDateTime fechaCierre;
    private BigDecimal montoCierre;
    private BigDecimal montoVentasEfectivo;
    private BigDecimal montoVentasTarjeta;
    private BigDecimal montoVentasYape;
    private BigDecimal montoEsperado;
    private BigDecimal discrepancia;
    private String observaciones;
    private String estado;
    private String numeroOperacion;
    private List<MovimientoCajaDTO> movimientos;
    private BigDecimal totalVentas;
    private BigDecimal efectivoEsperado;

    public CajaDTO() {}

    public Long getIdCaja() { return idCaja; }
    public void setIdCaja(Long idCaja) { this.idCaja = idCaja; }

    public String getUsuario() { return usuario; }
    public void setUsuario(String usuario) { this.usuario = usuario; }

    public Long getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Long idUsuario) { this.idUsuario = idUsuario; }

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

    public List<MovimientoCajaDTO> getMovimientos() { return movimientos; }
    public void setMovimientos(List<MovimientoCajaDTO> movimientos) { this.movimientos = movimientos; }

    public BigDecimal getTotalVentas() { return totalVentas; }
    public void setTotalVentas(BigDecimal totalVentas) { this.totalVentas = totalVentas; }

    public BigDecimal getEfectivoEsperado() { return efectivoEsperado; }
    public void setEfectivoEsperado(BigDecimal efectivoEsperado) { this.efectivoEsperado = efectivoEsperado; }
}