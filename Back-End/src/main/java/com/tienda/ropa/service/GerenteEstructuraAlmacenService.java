package com.tienda.ropa.service;

import com.tienda.ropa.dto.ActivoRequest;
import com.tienda.ropa.dto.AreaCatalogoDTO;
import com.tienda.ropa.dto.CoberturaUbicacionesDTO;
import com.tienda.ropa.dto.CombinacionFaltanteDTO;
import com.tienda.ropa.dto.CrearUbicacionOperativaRequest;
import com.tienda.ropa.dto.NombreEstructuraRequest;
import com.tienda.ropa.dto.PisoDTO;
import com.tienda.ropa.dto.ResumenGlobalUbicacionesDTO;
import com.tienda.ropa.dto.UbicacionOperativaDTO;
import com.tienda.ropa.dto.UbicacionPisoGrupoDTO;
import com.tienda.ropa.dto.UbicacionesResumenDTO;
import com.tienda.ropa.entity.Area;
import com.tienda.ropa.entity.Ubicacion;
import com.tienda.ropa.entity.UbicacionArea;
import com.tienda.ropa.repository.AreaRepository;
import com.tienda.ropa.repository.InventarioRepository;
import com.tienda.ropa.repository.UbicacionAreaRepository;
import com.tienda.ropa.repository.UbicacionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GerenteEstructuraAlmacenService {

    private static final List<String> RESERVADAS_PISO_LOWER = List.of(
            "almacén",
            "almacen",
            "bodega",
            "depósito",
            "deposito");

    private static final int MAX_FALTANTES = 50;

    private final UbicacionRepository ubicacionRepository;
    private final AreaRepository areaRepository;
    private final UbicacionAreaRepository ubicacionAreaRepository;
    private final InventarioRepository inventarioRepository;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<PisoDTO> listarPisos(boolean incluirInactivos, boolean incluirReservados) {
        List<Ubicacion> pisos = incluirInactivos
                ? ubicacionRepository.findAllByOrderByNombreAsc()
                : ubicacionRepository.findAllByActivoTrueOrderByNombreAsc();
        return pisos.stream()
                .filter(u -> incluirReservados || !esPisoReservado(u.getNombre()))
                .map(this::toPisoDTO)
                .toList();
    }

    @Transactional
    public PisoDTO crearPiso(NombreEstructuraRequest request) {
        String nombre = normalizarNombre(request.nombre());
        if (ubicacionRepository.findByNombreIgnoreCase(nombre).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un piso con ese nombre.");
        }
        Ubicacion u = new Ubicacion();
        u.setNombre(nombre);
        u.setActivo(true);
        u = ubicacionRepository.save(u);
        notificarEstructura("piso", "creado", u.getIdUbicacion());
        return toPisoDTO(u);
    }

    @Transactional
    public PisoDTO actualizarPiso(Long id, NombreEstructuraRequest request) {
        Ubicacion u = ubicacionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Piso no encontrado."));
        String nombre = normalizarNombre(request.nombre());
        ubicacionRepository.findByNombreIgnoreCase(nombre).ifPresent(existente -> {
            if (!existente.getIdUbicacion().equals(id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe otro piso con ese nombre.");
            }
        });
        u.setNombre(nombre);
        u = ubicacionRepository.save(u);
        notificarEstructura("piso", "actualizado", id);
        return toPisoDTO(u);
    }

    @Transactional
    public PisoDTO cambiarActivoPiso(Long id, ActivoRequest request) {
        Ubicacion u = ubicacionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Piso no encontrado."));
        boolean activo = Boolean.TRUE.equals(request.activo());
        if (!activo && ubicacionAreaRepository.countByUbicacion_IdUbicacionAndActivoTrue(id) > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "No se puede desactivar el piso: tiene ubicaciones operativas activas.");
        }
        u.setActivo(activo);
        u = ubicacionRepository.save(u);
        notificarEstructura("piso", activo ? "reactivado" : "desactivado", id);
        return toPisoDTO(u);
    }

    @Transactional(readOnly = true)
    public List<AreaCatalogoDTO> listarAreas(boolean incluirInactivos) {
        List<Area> areas = incluirInactivos
                ? areaRepository.findAllByOrderByNombreAsc()
                : areaRepository.findAllByActivoTrueOrderByNombreAsc();
        return areas.stream().map(this::toAreaDTO).toList();
    }

    @Transactional
    public AreaCatalogoDTO crearArea(NombreEstructuraRequest request) {
        String nombre = normalizarNombre(request.nombre());
        if (areaRepository.findByNombreIgnoreCase(nombre).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un área con ese nombre.");
        }
        Area a = new Area();
        a.setNombre(nombre);
        a.setActivo(true);
        a = areaRepository.save(a);
        notificarEstructura("area", "creado", a.getIdArea());
        return toAreaDTO(a);
    }

    @Transactional
    public AreaCatalogoDTO actualizarArea(Long id, NombreEstructuraRequest request) {
        Area a = areaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Área no encontrada."));
        String nombre = normalizarNombre(request.nombre());
        areaRepository.findByNombreIgnoreCase(nombre).ifPresent(existente -> {
            if (!existente.getIdArea().equals(id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe otra área con ese nombre.");
            }
        });
        a.setNombre(nombre);
        a = areaRepository.save(a);
        notificarEstructura("area", "actualizado", id);
        return toAreaDTO(a);
    }

    @Transactional
    public AreaCatalogoDTO cambiarActivoArea(Long id, ActivoRequest request) {
        Area a = areaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Área no encontrada."));
        boolean activo = Boolean.TRUE.equals(request.activo());
        if (!activo && ubicacionAreaRepository.countByArea_IdAreaAndActivoTrue(id) > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "No se puede desactivar el área: tiene ubicaciones operativas activas.");
        }
        a.setActivo(activo);
        a = areaRepository.save(a);
        notificarEstructura("area", activo ? "reactivado" : "desactivado", id);
        return toAreaDTO(a);
    }

    @Transactional(readOnly = true)
    public List<UbicacionOperativaDTO> listarUbicaciones(boolean incluirInactivos) {
        return ubicacionAreaRepository.findAllWithUbicacionYAreaForGerente().stream()
                .filter(ua -> incluirInactivos || ua.isActivo())
                .map(this::toUbicacionOperativaDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public UbicacionesResumenDTO listarUbicacionesResumen(boolean incluirInactivos) {
        List<UbicacionArea> todas = ubicacionAreaRepository.findAllWithUbicacionYAreaForGerente();
        List<UbicacionOperativaDTO> items = todas.stream()
                .filter(ua -> incluirInactivos || ua.isActivo())
                .map(this::toUbicacionOperativaDTO)
                .toList();

        List<UbicacionPisoGrupoDTO> grupos = agruparPorPiso(items);
        CoberturaUbicacionesDTO cobertura = calcularCobertura(todas);
        ResumenGlobalUbicacionesDTO global = calcularResumenGlobal(items);

        return new UbicacionesResumenDTO(grupos, cobertura, global);
    }

    @Transactional
    public UbicacionOperativaDTO crearUbicacion(CrearUbicacionOperativaRequest request) {
        Ubicacion piso = ubicacionRepository.findById(request.idUbicacion())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Piso no encontrado."));
        Area area = areaRepository.findById(request.idArea())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Área no encontrada."));
        if (!piso.isActivo() || !area.isActivo()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El piso y el área deben estar activos para crear una ubicación.");
        }
        if (ubicacionAreaRepository
                .findByUbicacion_IdUbicacionAndArea_IdArea(request.idUbicacion(), request.idArea())
                .isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ya existe una ubicación para ese piso y área.");
        }
        UbicacionArea ua = new UbicacionArea();
        ua.setUbicacion(piso);
        ua.setArea(area);
        ua.setActivo(true);
        ua = ubicacionAreaRepository.save(ua);
        ua = ubicacionAreaRepository.findByIdWithUbicacionYArea(ua.getIdUbicacionArea()).orElse(ua);
        notificarEstructura("ubicacion", "creado", ua.getIdUbicacionArea());
        return toUbicacionOperativaDTO(ua);
    }

    @Transactional
    public UbicacionOperativaDTO cambiarActivoUbicacion(Long id, ActivoRequest request) {
        UbicacionArea ua = ubicacionAreaRepository.findByIdWithUbicacionYArea(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ubicación no encontrada."));
        ua.setActivo(Boolean.TRUE.equals(request.activo()));
        ua = ubicacionAreaRepository.save(ua);
        notificarEstructura("ubicacion", ua.isActivo() ? "reactivado" : "desactivado", id);
        return toUbicacionOperativaDTO(ua);
    }

    private UbicacionOperativaDTO toUbicacionOperativaDTO(UbicacionArea ua) {
        long unidades = inventarioRepository.sumStockByUbicacionArea(ua.getIdUbicacionArea());
        long variantes = inventarioRepository.findStockPositivoByUbicacionArea(ua.getIdUbicacionArea()).size();
        boolean pisoActivo = ua.getUbicacion() != null && ua.getUbicacion().isActivo();
        boolean areaActivo = ua.getArea() != null && ua.getArea().isActivo();
        boolean operativa = ua.isActivo() && pisoActivo && areaActivo;
        return new UbicacionOperativaDTO(
                ua.getIdUbicacionArea(),
                ua.getUbicacion() != null ? ua.getUbicacion().getIdUbicacion() : null,
                ua.getUbicacion() != null ? ua.getUbicacion().getNombre() : null,
                ua.getArea() != null ? ua.getArea().getIdArea() : null,
                ua.getArea() != null ? ua.getArea().getNombre() : null,
                ua.isActivo(),
                pisoActivo,
                areaActivo,
                operativa,
                unidades,
                variantes);
    }

    private List<UbicacionPisoGrupoDTO> agruparPorPiso(List<UbicacionOperativaDTO> items) {
        Map<Long, List<UbicacionOperativaDTO>> porPiso = items.stream()
                .filter(u -> u.idUbicacion() != null)
                .collect(Collectors.groupingBy(
                        UbicacionOperativaDTO::idUbicacion,
                        LinkedHashMap::new,
                        Collectors.toList()));

        return porPiso.entrySet().stream()
                .map(entry -> {
                    List<UbicacionOperativaDTO> ubicaciones = entry.getValue().stream()
                            .sorted(Comparator.comparing(UbicacionOperativaDTO::nombreArea, String.CASE_INSENSITIVE_ORDER))
                            .toList();
                    UbicacionOperativaDTO first = ubicaciones.get(0);
                    long totalUnidadesPiso = ubicaciones.stream()
                            .mapToLong(UbicacionOperativaDTO::totalUnidades)
                            .sum();
                    int sectoresConStock = (int) ubicaciones.stream()
                            .filter(u -> u.totalUnidades() > 0)
                            .count();
                    int sectoresOperativos = (int) ubicaciones.stream()
                            .filter(UbicacionOperativaDTO::operativa)
                            .count();
                    return new UbicacionPisoGrupoDTO(
                            entry.getKey(),
                            first.nombrePiso(),
                            first.pisoActivo(),
                            esPisoReservado(first.nombrePiso()),
                            ubicaciones,
                            totalUnidadesPiso,
                            sectoresOperativos,
                            sectoresConStock);
                })
                .sorted(Comparator
                        .comparing((UbicacionPisoGrupoDTO g) -> g.totalUnidadesPiso() > 0 ? 0 : 1)
                        .thenComparing(g -> g.reservado() ? 1 : 0)
                        .thenComparing(g -> g.nombrePiso(), String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private CoberturaUbicacionesDTO calcularCobertura(List<UbicacionArea> todas) {
        List<Ubicacion> pisosActivos = ubicacionRepository.findAllByActivoTrueOrderByNombreAsc().stream()
                .filter(u -> !esPisoReservado(u.getNombre()))
                .toList();
        List<Area> sectoresActivos = areaRepository.findAllByActivoTrueOrderByNombreAsc();

        Set<String> paresExistentes = todas.stream()
                .filter(ua -> ua.getUbicacion() != null && ua.getArea() != null)
                .map(ua -> parKey(ua.getUbicacion().getIdUbicacion(), ua.getArea().getIdArea()))
                .collect(Collectors.toCollection(HashSet::new));

        int combinacionesPosibles = pisosActivos.size() * sectoresActivos.size();
        int combinacionesExistentes = 0;
        List<CombinacionFaltanteDTO> faltantes = new ArrayList<>();

        for (Ubicacion piso : pisosActivos) {
            for (Area area : sectoresActivos) {
                String key = parKey(piso.getIdUbicacion(), area.getIdArea());
                if (paresExistentes.contains(key)) {
                    combinacionesExistentes++;
                } else if (faltantes.size() < MAX_FALTANTES) {
                    faltantes.add(new CombinacionFaltanteDTO(
                            piso.getIdUbicacion(),
                            piso.getNombre(),
                            area.getIdArea(),
                            area.getNombre()));
                }
            }
        }

        int combinacionesFaltantes = combinacionesPosibles - combinacionesExistentes;

        return new CoberturaUbicacionesDTO(
                pisosActivos.size(),
                sectoresActivos.size(),
                combinacionesPosibles,
                combinacionesExistentes,
                combinacionesFaltantes,
                faltantes);
    }

    private static ResumenGlobalUbicacionesDTO calcularResumenGlobal(List<UbicacionOperativaDTO> items) {
        int totalOperativas = (int) items.stream().filter(UbicacionOperativaDTO::operativa).count();
        int totalConStock = (int) items.stream().filter(u -> u.totalUnidades() > 0).count();
        long totalUnidades = items.stream().mapToLong(UbicacionOperativaDTO::totalUnidades).sum();
        return new ResumenGlobalUbicacionesDTO(
                items.size(),
                totalOperativas,
                totalConStock,
                totalUnidades);
    }

    private static String parKey(Long idUbicacion, Long idArea) {
        return idUbicacion + ":" + idArea;
    }

    private PisoDTO toPisoDTO(Ubicacion u) {
        return new PisoDTO(u.getIdUbicacion(), u.getNombre(), u.isActivo(), esPisoReservado(u.getNombre()));
    }

    private AreaCatalogoDTO toAreaDTO(Area a) {
        return new AreaCatalogoDTO(a.getIdArea(), a.getNombre(), a.isActivo());
    }

    private static String normalizarNombre(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre es obligatorio.");
        }
        return nombre.trim();
    }

    private static boolean esUbicacionOperativaActiva(UbicacionArea ua) {
        return ua.isActivo()
                && ua.getUbicacion() != null
                && ua.getUbicacion().isActivo()
                && ua.getArea() != null
                && ua.getArea().isActivo();
    }

    private static boolean esPisoReservado(String nombre) {
        if (nombre == null) {
            return true;
        }
        return RESERVADAS_PISO_LOWER.contains(nombre.trim().toLowerCase());
    }

    private void notificarEstructura(String entidad, String accion, Long id) {
        notificationService.sendNotificationObject(Map.of(
                "type", "ESTRUCTURA_ALMACEN_ACTUALIZADA",
                "entidad", entidad,
                "accion", accion,
                "id", id));
    }
}
