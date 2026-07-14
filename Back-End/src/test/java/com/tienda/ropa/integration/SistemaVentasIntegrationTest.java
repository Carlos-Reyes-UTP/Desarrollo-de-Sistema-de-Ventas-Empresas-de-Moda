package com.tienda.ropa.integration;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tienda.ropa.agregates.request.SignInRequest;
import com.tienda.ropa.entity.*;
import com.tienda.ropa.repository.*;
import com.tienda.ropa.service.InventarioService;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class SistemaVentasIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private ProductoVarianteRepository productoVarianteRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private ProveedoresRepository proveedoresRepository;

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private InventarioRepository inventarioRepository;

    @Autowired
    private UbicacionRepository ubicacionRepository;

    @Autowired
    private AreaRepository areaRepository;

    @Autowired
    private UbicacionAreaRepository ubicacionAreaRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String tokenCajero;
    private String tokenGerente;

    @BeforeEach
    public void setUp() throws Exception {
        // Asegurarse de que los roles existan
        Rol rolCajero = rolRepository.findByNombreRol(Role.CAJERO)
                .orElseGet(() -> {
                    Rol r = new Rol();
                    r.setNombreRol(Role.CAJERO);
                    return rolRepository.save(r);
                });

        Rol rolGerente = rolRepository.findByNombreRol(Role.GERENTE)
                .orElseGet(() -> {
                    Rol r = new Rol();
                    r.setNombreRol(Role.GERENTE);
                    return rolRepository.save(r);
                });

        // Crear area y ubicacion si no existen
        Ubicacion ubicacion = ubicacionRepository.findAll().stream().findFirst().orElseGet(() -> {
            Ubicacion u = new Ubicacion();
            u.setNombre("TIENDA PRINCIPAL");
            u.setActivo(true);
            return ubicacionRepository.save(u);
        });

        Area area = areaRepository.findAll().stream().findFirst().orElseGet(() -> {
            Area a = new Area();
            a.setNombre("PISO DE VENTA");
            a.setActivo(true);
            return areaRepository.save(a);
        });

        UbicacionArea ubicacionArea = ubicacionAreaRepository.findAll().stream().findFirst().orElseGet(() -> {
            UbicacionArea ua = new UbicacionArea();
            ua.setUbicacion(ubicacion);
            ua.setArea(area);
            ua.setActivo(true);
            return ubicacionAreaRepository.save(ua);
        });

        // Crear/obtener usuarios de prueba
        Usuario cajero = usuarioRepository.findByUsuario("cajero_test")
                .orElseGet(() -> {
                    Usuario u = new Usuario();
                    u.setUsuario("cajero_test");
                    u.setPassword(passwordEncoder.encode("CajeroPass123!"));
                    u.setActivo(true);
                    u.setRoles(new HashSet<>(Set.of(rolCajero)));
                    u.setAreaAsignado(ubicacionArea);
                    return usuarioRepository.save(u);
                });

        Usuario gerente = usuarioRepository.findByUsuario("gerente_test")
                .orElseGet(() -> {
                    Usuario u = new Usuario();
                    u.setUsuario("gerente_test");
                    u.setPassword(passwordEncoder.encode("GerentePass123!"));
                    u.setActivo(true);
                    u.setRoles(new HashSet<>(Set.of(rolGerente)));
                    u.setAreaAsignado(ubicacionArea);
                    return usuarioRepository.save(u);
                });

        // Obtener tokens JWT reales mediante mockMvc login (signin)
        SignInRequest cajeroLogin = new SignInRequest("cajero_test", "CajeroPass123!");
        MvcResult resCajero = mockMvc.perform(post("/api/autenticacion/signin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(cajeroLogin)))
                .andExpect(status().isOk())
                .andReturn();
        String jsonCajero = resCajero.getResponse().getContentAsString();
        tokenCajero = objectMapper.readTree(jsonCajero).get("jwt").asText();

        SignInRequest gerenteLogin = new SignInRequest("gerente_test", "GerentePass123!");
        MvcResult resGerente = mockMvc.perform(post("/api/autenticacion/signin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(gerenteLogin)))
                .andExpect(status().isOk())
                .andReturn();
        String jsonGerente = resGerente.getResponse().getContentAsString();
        tokenGerente = objectMapper.readTree(jsonGerente).get("jwt").asText();
    }

    private ProductoVariante obtenerOcrearProductoVarianteConStock(String codigoIdentificacion) {
        // Categoria
        Categoria cat = categoriaRepository.findAll().stream().findFirst().orElseGet(() -> {
            Categoria c = new Categoria();
            c.setNombre("Polos");
            return categoriaRepository.save(c);
        });

        // Proveedor
        Proveedores prov = proveedoresRepository.findAll().stream().findFirst().orElseGet(() -> {
            Proveedores p = new Proveedores();
            p.setNombre("Proveedor Demo");
            p.setRuc("20123456789");
            return proveedoresRepository.save(p);
        });

        // Producto
        final Producto finalProd;
        List<Producto> prodList = productoRepository.findByCodigoIdentificacion(codigoIdentificacion);
        if (!prodList.isEmpty()) {
            finalProd = prodList.get(0);
        } else {
            Producto p = new Producto();
            p.setCodigoIdentificacion(codigoIdentificacion);
            p.setNombre("Polo de Prueba");
            p.setSexo("UNISEX");
            p.setTipoPublico("ADULTO");
            p.setMarca("Marca Demo");
            p.setCategoriaPadre(cat);
            p.setProveedor(prov);
            p.setPrecioUnitario(new BigDecimal("50.00"));
            p.setPrecioCuarto(new BigDecimal("144.00"));
            p.setPrecioMediaDocena(new BigDecimal("270.00"));
            p.setPrecioDocena(new BigDecimal("480.00"));
            p.setCodigoBarras(codigoIdentificacion + "-178491823901");
            finalProd = productoRepository.save(p);
        }

        // ProductoVariante
        ProductoVariante var = productoVarianteRepository.findAll().stream()
                .filter(v -> v.getProducto().getIdProducto().equals(finalProd.getIdProducto()))
                .findFirst()
                .orElseGet(() -> {
                    ProductoVariante v = new ProductoVariante();
                    v.setProducto(finalProd);
                    v.setColor("NEGRO");
                    v.setTalla("M");
                    v.setCantidad(20);
                    return productoVarianteRepository.save(v);
                });


        // UbicacionArea
        UbicacionArea ua = ubicacionAreaRepository.findAll().stream().findFirst().orElseThrow();

        // Inventario
        inventarioRepository.findAll().stream()
                .filter(i -> i.getVariante().getIdProductoVariante().equals(var.getIdProductoVariante()))
                .findFirst()
                .orElseGet(() -> {
                    Inventario inv = new Inventario();
                    inv.setVariante(var);
                    inv.setUbicacionArea(ua);
                    inv.setStock(20);
                    inv.setStockMinimo(5);
                    return inventarioRepository.save(inv);
                });

        // Actualizar stock de la variante
        var.setCantidad(20);
        return productoVarianteRepository.save(var);
    }

    @Test
    public void testINT01_CrearVentaDescuentaStock() throws Exception {
        // Crear cliente con DNI real
        Cliente clienteReal = new Cliente();
        clienteReal.setNombreCliente("Juan Perez");
        clienteReal.setTipoCliente("NATURAL");
        clienteReal.setNumeroDocumento("45678912");
        clienteReal = clienteRepository.save(clienteReal);

        // Buscar/Crear variantes e inventarios
        ProductoVariante variante = obtenerOcrearProductoVarianteConStock("INT01-PROD");
        int stockInicial = variante.getCantidad();

        // Crear request de venta
        Map<String, Object> ventaReq = new HashMap<>();
        ventaReq.put("cliente", Map.of("idCliente", clienteReal.getIdCliente()));
        ventaReq.put("metodoPago", Map.of("idMetodoPago", 1)); // EFECTIVO
        ventaReq.put("tipoComprobante", "BOLETA");
        ventaReq.put("fechaVenta", LocalDateTime.now().toString());
        ventaReq.put("detalles", List.of(
            Map.of(
                "productoVariante", Map.of("idProductoVariante", variante.getIdProductoVariante()),
                "cantidad", 2,
                "precioUnitario", 15.00
            )
        ));

        // Registrar venta por API
        mockMvc.perform(post("/api/cajero/ventas")
                .header("Authorization", "Bearer " + tokenCajero)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(ventaReq)))
                .andExpect(status().isOk());

        // Verificar descuento en base de datos
        ProductoVariante varianteActualizada = productoVarianteRepository.findById(variante.getIdProductoVariante()).orElseThrow();
        assertEquals(stockInicial - 2, varianteActualizada.getCantidad());
    }

    @Test
    public void testINT02_VentaFallidaHaceRollback() throws Exception {
        // Crear cliente con DNI sintético (anónimo)
        Cliente clienteAnonimo = new Cliente();
        clienteAnonimo.setNombreCliente("Clientes Varios");
        clienteAnonimo.setTipoCliente("NATURAL");
        clienteAnonimo.setNumeroDocumento("NN00000002");
        clienteAnonimo = clienteRepository.save(clienteAnonimo);

        ProductoVariante variante = obtenerOcrearProductoVarianteConStock("INT02-PROD");
        int stockInicial = variante.getCantidad();

        // Crear request de venta superior al umbral (Total = 2 * 60 = 120.00 >= 100.00)
        Map<String, Object> ventaReq = new HashMap<>();
        ventaReq.put("cliente", Map.of("idCliente", clienteAnonimo.getIdCliente()));
        ventaReq.put("metodoPago", Map.of("idMetodoPago", 1));
        ventaReq.put("tipoComprobante", "BOLETA");
        ventaReq.put("fechaVenta", LocalDateTime.now().toString());
        ventaReq.put("detalles", List.of(
            Map.of(
                "productoVariante", Map.of("idProductoVariante", variante.getIdProductoVariante()),
                "cantidad", 2,
                "precioUnitario", 60.00
            )
        ));

        // Registrar venta -> Espera 400 Bad Request por validación del cliente
        mockMvc.perform(post("/api/cajero/ventas")
                .header("Authorization", "Bearer " + tokenCajero)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(ventaReq)))
                .andExpect(status().isBadRequest());

        // Verificar que el stock NO fue disminuido en base de datos (Rollback exitoso)
        ProductoVariante varianteActualizada = productoVarianteRepository.findById(variante.getIdProductoVariante()).orElseThrow();
        assertEquals(stockInicial, varianteActualizada.getCantidad());
    }

    @Test
    public void testINT04_AutenticacionJWTYPropagacionRoles() throws Exception {
        // 1. Acceder sin token -> Esperar 403 o 401
        mockMvc.perform(get("/api/gerente/user"))
                .andExpect(status().isForbidden());

        // 2. Acceder con token de cajero -> Esperar 403 (Forbidden)
        mockMvc.perform(get("/api/gerente/user")
                .header("Authorization", "Bearer " + tokenCajero))
                .andExpect(status().isForbidden());

        // 3. Acceder con token de gerente -> Esperar 200 OK
        mockMvc.perform(get("/api/gerente/user")
                .header("Authorization", "Bearer " + tokenGerente))
                .andExpect(status().isOk());
    }

    @Test
    public void testINT05_DeshabilitarUsuarioBloqueaLogin() throws Exception {
        // Crear usuario cajero temporal
        Rol rolCajero = rolRepository.findByNombreRol(Role.CAJERO).orElseThrow();
        Usuario tempUser = new Usuario();
        tempUser.setUsuario("temp_cajero");
        tempUser.setPassword(passwordEncoder.encode("Prueba123!"));
        tempUser.setActivo(true);
        tempUser.setRoles(new HashSet<>(Set.of(rolCajero)));
        
        UbicacionArea ua = ubicacionAreaRepository.findAll().stream().findFirst().orElseThrow();
        tempUser.setAreaAsignado(ua);
        tempUser = usuarioRepository.save(tempUser);

        // 1. Login inicial exitoso
        SignInRequest req = new SignInRequest("temp_cajero", "Prueba123!");
        mockMvc.perform(post("/api/autenticacion/signin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        // 2. Deshabilitar usuario como Gerente
        mockMvc.perform(put("/api/gerente/user/deshabilitar/" + tempUser.getId())
                .header("Authorization", "Bearer " + tokenGerente))
                .andExpect(status().isOk());

        // 3. Intentar login y esperar fallo (401 Unauthorized / Bad Request)
        mockMvc.perform(post("/api/autenticacion/signin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().is4xxClientError());
    }
}