package com.tienda.ropa.dto;

import java.math.BigDecimal;

public class CierreCajaDTO {

    private BigDecimal efectivoContado;
    private BigDecimal tarjetaContado;
    private BigDecimal yapeContado;
    private String observaciones;

    public CierreCajaDTO() {}

    public BigDecimal getEfectivoContado() { return efectivoContado; }
    public void setEfectivoContado(BigDecimal efectivoContado) { this.efectivoContado = efectivoContado; }

    public BigDecimal getTarjetaContado() { return tarjetaContado; }
    public void setTarjetaContado(BigDecimal tarjetaContado) { this.tarjetaContado = tarjetaContado; }

    public BigDecimal getYapeContado() { return yapeContado; }
    public void setYapeContado(BigDecimal yapeContado) { this.yapeContado = yapeContado; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }
}