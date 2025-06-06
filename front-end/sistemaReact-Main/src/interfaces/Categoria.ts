export interface Categoria {
  idCategoria?: number;
  nombre: string;
  categoriaPadre?: Categoria | null;
  subCategorias?: Categoria[];
  esCategoriaPrincipal?: boolean;
  tieneSubcategorias?: boolean;
}

