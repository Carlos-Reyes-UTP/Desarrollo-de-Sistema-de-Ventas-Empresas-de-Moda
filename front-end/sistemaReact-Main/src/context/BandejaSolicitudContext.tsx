import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ItemBandeja {
  /** Clave única: `${idVariante}-${idUbicacionAreaDestino}` */
  key: string;
  idVariante: number;
  cantidad: number;
  idUbicacionAreaDestino: number;
  nombreProducto: string;
  talla: string;
  color: string;
  nombreUbicacion: string;
}

interface BandejaContextType {
  items: ItemBandeja[];
  agregar: (item: Omit<ItemBandeja, "key">) => void;
  quitar: (key: string) => void;
  limpiar: () => void;
  /** Número de ítems distintos en la bandeja */
  total: number;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const BandejaContext = createContext<BandejaContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BandejaSolicitudProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemBandeja[]>([]);

  const agregar = useCallback((item: Omit<ItemBandeja, "key">) => {
    const key = `${item.idVariante}-${item.idUbicacionAreaDestino}`;
    setItems((prev) => {
      const existe = prev.findIndex((i) => i.key === key);
      if (existe >= 0) {
        // Si ya existe la misma variante+área → acumula cantidad
        const copia = [...prev];
        copia[existe] = { ...copia[existe], cantidad: copia[existe].cantidad + item.cantidad };
        return copia;
      }
      return [...prev, { ...item, key }];
    });
  }, []);

  const quitar = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const limpiar = useCallback(() => setItems([]), []);

  return (
    <BandejaContext.Provider
      value={{ items, agregar, quitar, limpiar, total: items.length }}
    >
      {children}
    </BandejaContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export function useBandeja(): BandejaContextType {
  const ctx = useContext(BandejaContext);
  if (!ctx) throw new Error("useBandeja debe usarse dentro de BandejaSolicitudProvider");
  return ctx;
}
