package com.tienda.ropa.service;

import com.tienda.ropa.dto.*;
import com.tienda.ropa.entity.Caja;
import com.tienda.ropa.entity.MovimientoCaja;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.entity.Venta;
import com.tienda.ropa.repository.CajaRepository;
import com.tienda.ropa.repository.MovimientoCajaRepository;
import com.tienda.ropa.repository.UsuarioRepository;
import com.tienda.ropa.repository.VentaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CajaService {

    @Autowired
    private CajaRepository cajaRepository;

    @Autowired
    private MovimientoCajaRepository movimientoCajaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private VentaRepository ventaRepository;

    @Transactional
    public CajaDTO abrirCaja(Long idUsuario, AperturaCajaDTO aperturaDTO) {
        Optional<Caja> cajaAbierta = cajaRepository.findByUsuarioIdAndEstado(idUsuario, "ABIERTA");
        if (cajaAbierta.isPresent()) {
            throw new RuntimeException("Ya existe una caja abierta para este usuario");
        }

        Optional<Usuario> usuarioOpt = usuarioRepository.findById(idUsuario);
        if (usuarioOpt.isEmpty()) {
            throw new RuntimeException("Usuario no encontrado");
        }

        Usuario usuario = usuarioOpt.get();
        String numeroOperacion = "APT-" + System.currentTimeMillis();

        Caja caja = new Caja();
        caja.setUsuario(usuario);
        caja.setFechaApertura(LocalDateTime.now());
        caja.setMontoApertura(aperturaDTO.getMontoApertura());
        caja.setEstado("ABIERTA");
        caja.setNumeroOperacion(numeroOperacion);
        caja.setMontoVentasEfectivo(BigDecimal.ZERO);
        caja.setMontoVentasTarjeta(BigDecimal.ZERO);
        caja.setMontoVentasYape(BigDecimal.ZERO);

        caja = cajaRepository.save(caja);

        MovimientoCaja movimiento = new MovimientoCaja();
        movimiento.setCaja(caja);
        movimiento.setTipoMovimiento("APERTURA");
        movimiento.setMonto(aperturaDTO.getMontoApertura());
        movimiento.setMetodoPago("EFECTIVO");
        movimiento.setDescripcion("Apertura de caja");
        movimiento.setFechaMovimiento(LocalDateTime.now());

        movimientoCajaRepository.save(movimiento);

        return convertirADTO(caja);
    }

    @Transactional
    public CajaDTO cerrarCaja(Long idCaja, CierreCajaDTO cierreDTO) {
        Optional<Caja> cajaOpt = cajaRepository.findById(idCaja);
        if (cajaOpt.isEmpty()) {
            throw new RuntimeException("Caja no encontrada");
        }

        Caja caja = cajaOpt.get();
        final Long idUsuarioCaja = caja.getUsuario().getId();

        if (!"ABIERTA".equals(caja.getEstado())) {
            throw new RuntimeException("La caja ya está cerrada");
        }

        LocalDateTime fechaApertura = caja.getFechaApertura();
        LocalDate fechaSolo = fechaApertura.toLocalDate();
        LocalDateTime inicioDia = fechaSolo.atStartOfDay();
        LocalDateTime finDia = fechaSolo.plusDays(1).atStartOfDay();

        List<Venta> ventasDelDia = ventaRepository.findByUsuarioIdAndFechaVentaBetween(
                idUsuarioCaja, inicioDia, finDia);

        BigDecimal ventasEfectivo = BigDecimal.ZERO;
        BigDecimal ventasTarjeta = BigDecimal.ZERO;
        BigDecimal ventasYape = BigDecimal.ZERO;

        for (Venta venta : ventasDelDia) {
            BigDecimal monto = venta.getTotalVentas();
            String metodoPago = venta.getMetodoPago().toUpperCase();

            if (metodoPago.contains("EFECTIVO") || metodoPago.contains("CASH")) {
                ventasEfectivo = ventasEfectivo.add(monto);
            } else if (metodoPago.contains("TARJETA") || metodoPago.contains("VISA") || metodoPago.contains("CARD")) {
                ventasTarjeta = ventasTarjeta.add(monto);
            } else if (metodoPago.contains("YAPE") || metodoPago.contains("PLIN")) {
                ventasYape = ventasYape.add(monto);
            } else {
                ventasEfectivo = ventasEfectivo.add(monto);
            }
        }

        caja.setMontoVentasEfectivo(ventasEfectivo);
        caja.setMontoVentasTarjeta(ventasTarjeta);
        caja.setMontoVentasYape(ventasYape);

        BigDecimal montoCierreTotal = cierreDTO.getEfectivoContado()
                .add(cierreDTO.getTarjetaContado())
                .add(cierreDTO.getYapeContado());

        BigDecimal montoEsperado = caja.getMontoApertura().add(ventasEfectivo);
        BigDecimal discrepancia = cierreDTO.getEfectivoContado().subtract(montoEsperado);

        caja.setFechaCierre(LocalDateTime.now());
        caja.setMontoCierre(montoCierreTotal);
        caja.setMontoEsperado(montoEsperado);
        caja.setDiscrepancia(discrepancia);
        caja.setObservaciones(cierreDTO.getObservaciones());
        caja.setEstado("CERRADA");

        caja = cajaRepository.save(caja);

        MovimientoCaja movimientoCierre = new MovimientoCaja();
        movimientoCierre.setCaja(caja);
        movimientoCierre.setTipoMovimiento("CIERRE");
        movimientoCierre.setMonto(montoCierreTotal);
        movimientoCierre.setMetodoPago("TODOS");
        movimientoCierre.setDescripcion("Cierre de caja - Discrepancia: " + discrepancia);
        movimientoCierre.setFechaMovimiento(LocalDateTime.now());

        movimientoCajaRepository.save(movimientoCierre);

        return convertirADTO(caja);
    }

    @Transactional(readOnly = true)
    public Optional<CajaDTO> obtenerCajaAbierta(Long idUsuario) {
        return cajaRepository.findByUsuarioIdAndEstado(idUsuario, "ABIERTA")
                .map(this::convertirADTO);
    }

    @Transactional(readOnly = true)
    public Optional<CajaDTO> obtenerCajaPorId(Long idCaja) {
        return cajaRepository.findById(idCaja)
                .map(this::convertirADTO);
    }

    @Transactional(readOnly = true)
    public List<CajaDTO> obtenerHistorialCajas(Long idUsuario) {
        return cajaRepository.findByUsuarioIdOrderByFechaAperturaDesc(idUsuario).stream()
                .map(caja -> convertirADTO(caja, false))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CajaDTO> obtenerTodasCajas() {
        return cajaRepository.findAll().stream()
                .map(caja -> convertirADTO(caja, false))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MovimientoCajaDTO> obtenerMovimientos(Long idCaja) {
        return movimientoCajaRepository.findByCaja_IdOrderByFechaMovimientoAsc(idCaja).stream()
                .map(this::convertirMovimientoADTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void registrarVentaEnCaja(Long idUsuario, Venta venta) {
        Optional<Caja> cajaAbierta = cajaRepository.findByUsuarioIdAndEstado(idUsuario, "ABIERTA");
        if (cajaAbierta.isEmpty()) {
            return;
        }

        Caja caja = cajaAbierta.get();
        BigDecimal monto = venta.getTotalVentas();
        String metodoPago = venta.getMetodoPago().toUpperCase();

        if (metodoPago.contains("EFECTIVO") || metodoPago.contains("CASH")) {
            caja.setMontoVentasEfectivo(caja.getMontoVentasEfectivo().add(monto));
        } else if (metodoPago.contains("TARJETA") || metodoPago.contains("VISA") || metodoPago.contains("CARD")) {
            caja.setMontoVentasTarjeta(caja.getMontoVentasTarjeta().add(monto));
        } else if (metodoPago.contains("YAPE") || metodoPago.contains("PLIN")) {
            caja.setMontoVentasYape(caja.getMontoVentasYape().add(monto));
        } else {
            caja.setMontoVentasEfectivo(caja.getMontoVentasEfectivo().add(monto));
        }

        cajaRepository.save(caja);

        MovimientoCaja movimiento = new MovimientoCaja();
        movimiento.setCaja(caja);
        movimiento.setTipoMovimiento("VENTA");
        movimiento.setMonto(monto);
        movimiento.setMetodoPago(venta.getMetodoPago());
        movimiento.setDescripcion("Venta ID: " + venta.getIdVenta());
        movimiento.setFechaMovimiento(LocalDateTime.now());
        movimiento.setReferenciaId(venta.getIdVenta());

        movimientoCajaRepository.save(movimiento);
    }

    private CajaDTO convertirADTO(Caja caja) {
        return convertirADTO(caja, true);
    }

    private CajaDTO convertirADTO(Caja caja, boolean incluirMovimientos) {
        List<MovimientoCajaDTO> movimientos = new ArrayList<>();
        if (incluirMovimientos && caja.getId() != null) {
            movimientos = movimientoCajaRepository.findByCaja_IdOrderByFechaMovimientoAsc(caja.getId()).stream()
                    .map(this::convertirMovimientoADTO)
                    .collect(Collectors.toList());
        }

        BigDecimal totalVentas = caja.getMontoVentasEfectivo()
                .add(caja.getMontoVentasTarjeta())
                .add(caja.getMontoVentasYape());

        BigDecimal efectivoEsperado = caja.getMontoApertura() != null && caja.getMontoVentasEfectivo() != null
                ? caja.getMontoApertura().add(caja.getMontoVentasEfectivo())
                : BigDecimal.ZERO;

        CajaDTO dto = new CajaDTO();
        dto.setIdCaja(caja.getId());
        dto.setUsuario(caja.getUsuario().getUsuario());
        dto.setIdUsuario(caja.getUsuario().getId());
        dto.setFechaApertura(caja.getFechaApertura());
        dto.setMontoApertura(caja.getMontoApertura());
        dto.setFechaCierre(caja.getFechaCierre());
        dto.setMontoCierre(caja.getMontoCierre());
        dto.setMontoVentasEfectivo(caja.getMontoVentasEfectivo());
        dto.setMontoVentasTarjeta(caja.getMontoVentasTarjeta());
        dto.setMontoVentasYape(caja.getMontoVentasYape());
        dto.setMontoEsperado(caja.getMontoEsperado());
        dto.setDiscrepancia(caja.getDiscrepancia());
        dto.setObservaciones(caja.getObservaciones());
        dto.setEstado(caja.getEstado());
        dto.setNumeroOperacion(caja.getNumeroOperacion());
        dto.setMovimientos(movimientos);
        dto.setTotalVentas(totalVentas);
        dto.setEfectivoEsperado(efectivoEsperado);

        return dto;
    }

    private MovimientoCajaDTO convertirMovimientoADTO(MovimientoCaja movimiento) {
        MovimientoCajaDTO dto = new MovimientoCajaDTO();
        dto.setIdMovimiento(movimiento.getId());
        dto.setIdCaja(movimiento.getCaja().getId());
        dto.setTipoMovimiento(movimiento.getTipoMovimiento());
        dto.setMonto(movimiento.getMonto());
        dto.setMetodoPago(movimiento.getMetodoPago());
        dto.setDescripcion(movimiento.getDescripcion());
        dto.setFechaMovimiento(movimiento.getFechaMovimiento());
        dto.setReferenciaId(movimiento.getReferenciaId());
        return dto;
    }
}