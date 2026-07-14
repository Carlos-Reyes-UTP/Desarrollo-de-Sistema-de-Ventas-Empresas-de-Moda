package com.tienda.ropa.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.tienda.ropa.dto.OrigenVentaResult;
import com.tienda.ropa.entity.Cliente;
import com.tienda.ropa.entity.DetalleVenta;
import com.tienda.ropa.entity.OrigenVenta;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.UbicacionArea;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.entity.Venta;
import com.tienda.ropa.repository.DetalleVentaRepository;
import com.tienda.ropa.repository.VentaRepository;

@ExtendWith(MockitoExtension.class)
class VentaServiceUnitTest {

    @Mock
    private VentaRepository ventaRepository;

    @Mock
    private DetalleVentaRepository detalleVentaRepository;

    @Mock
    private InventarioService inventarioService;

    @Mock
    private ReposicionAutomaticaService reposicionAutomaticaService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private CajaService cajaService;

    @InjectMocks
    private VentaService ventaService;

    @Test
    void testRegistrarVenta_CalculaTotalYDescuentaStock() {
        // Preparar Datos
        Usuario usuario = new Usuario();
        usuario.setId(1L);
        usuario.setUsuario("cajero1");
        
        Cliente cliente = new Cliente();
        cliente.setIdCliente(1L);
        cliente.setNumeroDocumento("12345678");

        ProductoVariante variante = new ProductoVariante();
        variante.setIdProductoVariante(5L);
        variante.setCantidad(20);

        DetalleVenta detalle = new DetalleVenta();
        detalle.setProductoVariante(variante);
        detalle.setCantidad(2);
        detalle.setPrecioUnitario(new BigDecimal("15.00"));

        List<DetalleVenta> detalles = new ArrayList<>();
        detalles.add(detalle);

        Venta venta = new Venta();
        venta.setUsuario(usuario);
        venta.setCliente(cliente);
        venta.setDetalles(detalles);
        
        UbicacionArea area = new UbicacionArea();
        area.setIdUbicacionArea(2L);

        OrigenVentaResult origin = new OrigenVentaResult(area, OrigenVenta.PISO);

        // Mocks
        when(inventarioService.resolverUbicacionAreaDeVentaConFallback(5L, 2)).thenReturn(origin);
        when(ventaRepository.save(any(Venta.class))).thenAnswer(invocation -> {
            Venta v = invocation.getArgument(0);
            v.setIdVenta(100L);
            return v;
        });
        when(detalleVentaRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        // Ejecutar
        Venta registrada = ventaService.registrarVenta(venta);

        // Aserciones
        assertNotNull(registrada);
        assertEquals(100L, registrada.getIdVenta());
        assertEquals(new BigDecimal("30.00"), registrada.getTotalVentas());

        // Verificar interacciones
        verify(inventarioService).aplicarDeltaEnUbicacionArea(eq(5L), eq(area), eq(-2), anyString());
        verify(notificationService).sendNotificationObject(any());
        verify(cajaService).registrarVentaEnCaja(eq(1L), any(Venta.class));
    }
}