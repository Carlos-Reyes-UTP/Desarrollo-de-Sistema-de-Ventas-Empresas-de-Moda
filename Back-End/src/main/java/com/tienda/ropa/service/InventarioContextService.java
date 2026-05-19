package com.tienda.ropa.service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.tienda.ropa.dto.InventarioContextoDTO;
import com.tienda.ropa.dto.ResumenStockAreaDTO;
import com.tienda.ropa.dto.UbicacionDTO;
import com.tienda.ropa.entity.Area;
import com.tienda.ropa.entity.Role;
import com.tienda.ropa.entity.Rol;
import com.tienda.ropa.entity.UbicacionArea;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.repository.InventarioRepository;
import com.tienda.ropa.repository.UbicacionAreaRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InventarioContextService {

    public static final String NOMBRE_AREA_GENERAL = "General";
    public static final List<String> SECTORES_LINEA = List.of("Damas", "Caballeros", "Niños");

    private final InventarioService inventarioService;
    private final UbicacionAreaRepository ubicacionAreaRepository;
    private final InventarioRepository inventarioRepository;

    @Transactional(readOnly = true)
    public List<UbicacionDTO> listarAreasAlmacen() {
        return listarAreasAlmacenEntidades().stream().map(this::toUbicacionDTO).toList();
    }

    /** Sectores de almacén donde se registra stock (sin fila General). */
    @Transactional(readOnly = true)
    public List<UbicacionDTO> listarAreasAlmacenParaEntrada() {
        return listarAreasAlmacenEntidades().stream()
                .filter(ua -> !esAreaCatalogoGeneral(ua.getArea()))
                .map(this::toUbicacionDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public InventarioContextoDTO construirContexto(Usuario usuario) {
        if (usuario == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no autenticado");
        }
        Role rol = rolPrincipalInventario(usuario);
        boolean esAlmaceneroGeneral = esAlmaceneroGeneral(usuario);
        boolean esAlmaceneroLinea = esAlmaceneroDeLinea(usuario);

        List<UbicacionDTO> areasAlmacen = (rol == Role.ADMIN || rol == Role.SUPERVISOR_ALMACEN || esAlmaceneroGeneral)
                ? listarAreasAlmacenParaEntrada()
                : listarAreasAlmacen();

        UbicacionArea asignada = usuario.getAreaAsignado();
        Long idAsignada = asignada != null ? asignada.getIdUbicacionArea() : null;
        String etiquetaAsignada = asignada != null ? InventarioService.etiquetaUbicacionArea(asignada) : null;

        boolean puedeElegir = rol == Role.ADMIN || rol == Role.SUPERVISOR_ALMACEN || esAlmaceneroGeneral;
        boolean restriccionTraslado = esAlmaceneroLinea;

        List<UbicacionDTO> destinosTraslado;
        if (esAlmaceneroLinea) {
            destinosTraslado = listarDestinosTrasladoParaAlmacenero(usuario).stream()
                    .map(this::toUbicacionDTO)
                    .toList();
        } else if (esAlmaceneroGeneral) {
            destinosTraslado = listarTodasLasUbicacionesArea().stream()
                    .map(this::toUbicacionDTO)
                    .toList();
        } else {
            destinosTraslado = areasAlmacen;
        }

        List<String> sectoresVisibles = sectoresVisiblesParaUsuario(usuario, rol, esAlmaceneroGeneral);

        return new InventarioContextoDTO(
                rol != null ? rol.name() : null,
                idAsignada,
                etiquetaAsignada,
                puedeElegir,
                restriccionTraslado,
                esAlmaceneroGeneral,
                sectoresVisibles,
                areasAlmacen,
                destinosTraslado);
    }

    @Transactional(readOnly = true)
    public UbicacionArea resolverAreaParaAltaStock(Usuario usuario, Long idUbicacionAreaSolicitada) {
        if (usuario == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no autenticado");
        }
        Role rol = rolPrincipalInventario(usuario);

        if (rol == Role.ALMACENERO && esAlmaceneroGeneral(usuario)) {
            return resolverAreaEntradaSupervisor(idUbicacionAreaSolicitada);
        }

        if (rol == Role.ALMACENERO) {
            UbicacionArea asignada = usuario.getAreaAsignado();
            if (asignada == null) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "El almacenero no tiene área de almacén asignada. Contacte al administrador.");
            }
            if (!inventarioService.esUbicacionAlmacen(asignada)) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "El área asignada no corresponde a un sector de almacén válido.");
            }
            if (esAreaCatalogoGeneral(asignada.getArea())) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Debe elegir un sector concreto (Damas, Caballeros, Niños) para registrar stock.");
            }
            return cargarUbicacionArea(asignada.getIdUbicacionArea());
        }

        if (rol == Role.ADMIN || rol == Role.SUPERVISOR_ALMACEN) {
            return resolverAreaEntradaSupervisor(idUbicacionAreaSolicitada);
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Rol sin permiso para alta de stock en almacén.");
    }

    private UbicacionArea resolverAreaEntradaSupervisor(Long idUbicacionAreaSolicitada) {
        if (idUbicacionAreaSolicitada == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Debe indicar el área de almacén para registrar la entrada de stock.");
        }
        UbicacionArea area = cargarUbicacionArea(idUbicacionAreaSolicitada);
        if (!inventarioService.esUbicacionAlmacen(area)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La ubicación indicada no es un área de almacén válida.");
        }
        if (esAreaCatalogoGeneral(area.getArea())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "No se registra stock en el sector General; elija Damas, Caballeros o Niños.");
        }
        return area;
    }

    @Transactional(readOnly = true)
    public List<UbicacionArea> listarDestinosTrasladoParaAlmacenero(Usuario usuario) {
        if (esAlmaceneroGeneral(usuario)) {
            return listarTodasLasUbicacionesArea();
        }
        UbicacionArea asignada = usuario.getAreaAsignado();
        if (asignada == null || asignada.getArea() == null) {
            return List.of();
        }
        Long idAreaCatalogo = asignada.getArea().getIdArea();
        return ubicacionAreaRepository.findByCatalogoAreaId(idAreaCatalogo);
    }

    @Transactional(readOnly = true)
    public List<UbicacionArea> resolverUbicacionesAlmacenParaConsulta(Usuario usuario, String sectorOpcional) {
        if (usuario == null) {
            return inventarioService.listarUbicacionesAreaAlmacen();
        }
        if (esAlmaceneroDeLinea(usuario)) {
            UbicacionArea asignada = usuario.getAreaAsignado();
            if (asignada == null) {
                return List.of();
            }
            return List.of(cargarUbicacionArea(asignada.getIdUbicacionArea()));
        }
        if (esAlmaceneroGeneral(usuario)) {
            if (sectorOpcional == null || sectorOpcional.isBlank()
                    || NOMBRE_AREA_GENERAL.equalsIgnoreCase(sectorOpcional.trim())) {
                return inventarioService.listarUbicacionesAreaAlmacen().stream()
                        .filter(ua -> !esAreaCatalogoGeneral(ua.getArea()))
                        .toList();
            }
            return inventarioService.listarUbicacionesAreaAlmacen().stream()
                    .filter(ua -> ua.getArea() != null
                            && sectorOpcional.equalsIgnoreCase(ua.getArea().getNombre()))
                    .toList();
        }
        if (sectorOpcional != null && !sectorOpcional.isBlank()
                && !NOMBRE_AREA_GENERAL.equalsIgnoreCase(sectorOpcional.trim())) {
            return inventarioService.listarUbicacionesAreaAlmacen().stream()
                    .filter(ua -> ua.getArea() != null
                            && sectorOpcional.equalsIgnoreCase(ua.getArea().getNombre()))
                    .toList();
        }
        return inventarioService.listarUbicacionesAreaAlmacen();
    }

    @Transactional(readOnly = true)
    public Long idAreaCatalogoPorNombre(String nombreSector) {
        if (nombreSector == null || nombreSector.isBlank()
                || NOMBRE_AREA_GENERAL.equalsIgnoreCase(nombreSector.trim())) {
            return null;
        }
        List<UbicacionArea> almacen = inventarioService.listarUbicacionesAreaAlmacen();
        return almacen.stream()
                .filter(ua -> ua.getArea() != null && nombreSector.equalsIgnoreCase(ua.getArea().getNombre()))
                .map(ua -> ua.getArea().getIdArea())
                .findFirst()
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public Long idUbicacionAreaAlmacenPorNombreSector(String nombreSector) {
        if (nombreSector == null || nombreSector.isBlank()) {
            return null;
        }
        return inventarioService.listarUbicacionesAreaAlmacen().stream()
                .filter(ua -> ua.getArea() != null && nombreSector.equalsIgnoreCase(ua.getArea().getNombre()))
                .map(UbicacionArea::getIdUbicacionArea)
                .findFirst()
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<ResumenStockAreaDTO> resumenStockAreasAlmacen() {
        return listarAreasAlmacenEntidades().stream()
                .map(ua -> {
                    int total = inventarioRepository.sumStockByUbicacionArea(ua.getIdUbicacionArea());
                    int variantes = inventarioRepository.countVariantesConStockByUbicacionArea(ua.getIdUbicacionArea());
                    return new ResumenStockAreaDTO(
                            ua.getIdUbicacionArea(),
                            InventarioService.etiquetaUbicacionArea(ua),
                            total,
                            variantes);
                })
                .toList();
    }

    public boolean esAlmaceneroGeneral(Usuario usuario) {
        if (usuario == null || rolPrincipalInventario(usuario) != Role.ALMACENERO) {
            return false;
        }
        UbicacionArea asignada = usuario.getAreaAsignado();
        return asignada != null && esAreaCatalogoGeneral(asignada.getArea());
    }

    public boolean esAlmaceneroDeLinea(Usuario usuario) {
        return usuario != null
                && rolPrincipalInventario(usuario) == Role.ALMACENERO
                && !esAlmaceneroGeneral(usuario);
    }

    public static boolean esAreaCatalogoGeneral(Area area) {
        return area != null
                && area.getNombre() != null
                && NOMBRE_AREA_GENERAL.equalsIgnoreCase(area.getNombre().trim());
    }

    public boolean usuarioTieneRol(Usuario usuario, Role rol) {
        return usuario.getRoles().stream().anyMatch(r -> r.getNombreRol() == rol);
    }

    public Role rolPrincipalInventario(Usuario usuario) {
        Set<Role> roles = usuario.getRoles().stream().map(Rol::getNombreRol).collect(Collectors.toSet());
        if (roles.contains(Role.ADMIN)) {
            return Role.ADMIN;
        }
        if (roles.contains(Role.SUPERVISOR_ALMACEN)) {
            return Role.SUPERVISOR_ALMACEN;
        }
        if (roles.contains(Role.ALMACENERO)) {
            return Role.ALMACENERO;
        }
        return roles.isEmpty() ? null : roles.iterator().next();
    }

    private List<String> sectoresVisiblesParaUsuario(Usuario usuario, Role rol, boolean esGeneral) {
        if (esGeneral) {
            return List.of(NOMBRE_AREA_GENERAL, "Damas", "Caballeros", "Niños");
        }
        if (rol == Role.ALMACENERO && usuario.getAreaAsignado() != null && usuario.getAreaAsignado().getArea() != null) {
            return List.of(usuario.getAreaAsignado().getArea().getNombre());
        }
        return List.of();
    }

    private List<UbicacionArea> listarTodasLasUbicacionesArea() {
        return ubicacionAreaRepository.findAllWithUbicacionYArea();
    }

    private List<UbicacionArea> listarAreasAlmacenEntidades() {
        return ubicacionAreaRepository.findAreasAlmacen(InventarioService.nombresAlmacenLower());
    }

    private UbicacionArea cargarUbicacionArea(Long id) {
        return ubicacionAreaRepository.findByIdWithUbicacionYArea(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Ubicación-área no encontrada: " + id));
    }

    private UbicacionDTO toUbicacionDTO(UbicacionArea ua) {
        return new UbicacionDTO(
                ua.getIdUbicacionArea(),
                ua.getUbicacion() != null ? ua.getUbicacion().getNombre() : null,
                ua.getArea() != null ? ua.getArea().getNombre() : null,
                InventarioService.etiquetaUbicacionArea(ua));
    }
}
