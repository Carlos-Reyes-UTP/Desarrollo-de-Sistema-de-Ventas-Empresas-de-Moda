export interface CategoriaDTO {
  id: number; // En tu CategoriaDTO.java es 'id'
  nombre: string;
  subcategorias?: CategoriaDTO[]; // En tu CategoriaDTO.java es 'subcategorias'
}