package com.tienda.ropa.service;

import com.tienda.ropa.dto.CategoriaDTO;
import com.tienda.ropa.entity.Categoria;
import com.tienda.ropa.repository.CategoriaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class CategoriaService {

    @Autowired
    private CategoriaRepository categoriaRepository;

    /**
     * Crea una nueva categoría. Si no se especifica una categoría padre,
     * se crea como categoría principal.
     */
    @Transactional
    public Categoria crearCategoria(CategoriaDTO categoriaDto) {
        Categoria categoria = new Categoria();
        categoria.setNombre(categoriaDto.getNombre());

        // if (categoriaDTO.getCategoriaPadreId() != null) {
        //     Categoria padre = categoriaRepository.findById(categoriaDTO.getCategoriaPadreId())
        //         .orElseThrow(() -> new IllegalArgumentException("Categoría padre no encontrada"));
        //     categoria.setCategoriaPadre(padre);
        // }
        return categoriaRepository.save(categoria);
    }

    /**
     * Crea una subcategoría asignándole una categoría padre.
     */
    @Transactional
    public Categoria crearSubcategoria(Long idCategoriaPadre, Categoria subcategoria) {
        Optional<Categoria> categoriaPadreOpt = categoriaRepository.findById(idCategoriaPadre);

        if (categoriaPadreOpt.isPresent()) {
            Categoria categoriaPadre = categoriaPadreOpt.get();
            subcategoria.setCategoriaPadre(categoriaPadre);
            return categoriaRepository.save(subcategoria);
        } else {
            throw new IllegalArgumentException("Categoría padre no encontrada con ID: " + idCategoriaPadre);
        }
    }

    /**
     * Actualiza una categoría existente.
     */
    @Transactional
    public Categoria editarCategoria(Long id, Categoria categoriaActualizada) {
        return categoriaRepository.findById(id).map(categoria -> {
            categoria.setNombre(categoriaActualizada.getNombre());
            return categoriaRepository.save(categoria);
        }).orElseThrow(() -> new IllegalArgumentException("Categoría no encontrada con el ID: " + id));
    }

    /**
     * Elimina una categoría. Si tiene subcategorías, estas se convierten en categorías principales.
     */
    @Transactional
    public void eliminarCategoria(Long id) {
        Optional<Categoria> categoriaOpt = categoriaRepository.findById(id);

        if (categoriaOpt.isPresent()) {
            Categoria categoria = categoriaOpt.get();

            // Si tiene subcategorías, necesitamos decidir qué hacer con ellas
            // En este caso, las convertimos en categorías principales
            if (categoria.getSubCategorias() != null && !categoria.getSubCategorias().isEmpty()) {
                for (Categoria subcategoria : categoria.getSubCategorias()) {
                    subcategoria.setCategoriaPadre(null);
                    categoriaRepository.save(subcategoria);
                }
            }

            categoriaRepository.deleteById(id);
        } else {
            throw new IllegalArgumentException("Categoría no encontrada con el ID: " + id);
        }
    }

    /**
     * Obtiene todas las categorías.
     */
    public List<Categoria> obtenerCategorias() {
        return categoriaRepository.findAll();
    }

    /**
     * Obtiene solo las categorías principales (sin categoría padre).
     */
    public List<Categoria> obtenerCategoriasPrincipales() {
        return categoriaRepository.findByCategoriaPadreIsNull();
    }

    /**
     * Obtiene las subcategorías de una categoría específica.
     */
    public List<Categoria> obtenerSubcategorias(Long idCategoria) {
        return categoriaRepository.findByCategoriaPadreIdCategoria(idCategoria);
    }

    /**
     * Obtiene una categoría por su nombre.
     */
    public Optional<Categoria> obtenerCategoriaPorNombre(String nombre) {
        return categoriaRepository.findByNombre(nombre);
    }

    /**
     * Obtiene una categoría por su ID.
     */
    public Optional<Categoria> obtenerCategoriaPorId(Long id) {
        return categoriaRepository.findById(id);
    }

    /**
     * Mueve una categoría a un nuevo padre. Si idNuevoPadre es null,
     * la categoría se convierte en categoría principal.
     */
    @Transactional
    public Categoria moverCategoria(Long idCategoria, Long idNuevoPadre) {
        Optional<Categoria> categoriaOpt = categoriaRepository.findById(idCategoria);

        if (categoriaOpt.isPresent()) {
            Categoria categoria = categoriaOpt.get();

            // Si el nuevo padre es null, la categoría se convierte en principal
            if (idNuevoPadre == null) {
                categoria.setCategoriaPadre(null);
            } else {
                Optional<Categoria> nuevoPadreOpt = categoriaRepository.findById(idNuevoPadre);

                if (nuevoPadreOpt.isPresent()) {
                    Categoria nuevoPadre = nuevoPadreOpt.get();

                    // Verificar que no sea su propio descendiente para evitar ciclos
                    if (esDescendiente(nuevoPadre, categoria)) {
                        throw new IllegalArgumentException(
                                "Operación inválida: no se puede mover una categoría a una de sus subcategorías"
                        );
                    }

                    categoria.setCategoriaPadre(nuevoPadre);
                } else {
                    throw new IllegalArgumentException("Nueva categoría padre no encontrada con ID: " + idNuevoPadre);
                }
            }

            return categoriaRepository.save(categoria);
        } else {
            throw new IllegalArgumentException("Categoría no encontrada con ID: " + idCategoria);
        }
    }

    /**
     * Verifica si una categoría es descendiente de otra para evitar ciclos en la jerarquía.
     */
    private boolean esDescendiente(Categoria posibleDescendiente, Categoria ancestro) {
        if (posibleDescendiente.getIdCategoria().equals(ancestro.getIdCategoria())) {
            return true;
        }

        if (posibleDescendiente.getCategoriaPadre() == null) {
            return false;
        }

        return esDescendiente(posibleDescendiente.getCategoriaPadre(), ancestro);
    }

    /**
     * Busca categorías por nombre que coincidan parcialmente.
     */
    public List<Categoria> buscarPorNombre(String nombre) {
        return categoriaRepository.findByNombreContainingIgnoreCase(nombre);
    }

    /**
     * Obtiene todas las categorías en formato de árbol.
     * Este método devuelve todas las categorías principales con sus respectivas
     * subcategorías organizadas jerárquicamente.
     *
     * @return Lista de DTOs que representan el árbol de categorías
     */
    public List<CategoriaDTO> obtenerCategoriasTree() {
        List<Categoria> categoriasPrincipales = obtenerCategoriasPrincipales();
        return CategoriaDTO.convertirListaConSubcategorias(categoriasPrincipales);
    }

    /**
     * Obtiene una categoría específica con todas sus subcategorías en formato de árbol.
     *
     * @param id ID de la categoría
     * @return DTO con la categoría y sus subcategorías, o vacío si no existe
     */
    public Optional<CategoriaDTO> obtenerCategoriaTree(Long id) {
        return obtenerCategoriaPorId(id)
                .map(categoria -> new CategoriaDTO(categoria, true));
    }


}