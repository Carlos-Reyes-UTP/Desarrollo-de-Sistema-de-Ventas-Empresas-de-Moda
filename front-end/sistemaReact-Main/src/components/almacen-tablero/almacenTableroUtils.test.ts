import { describe, expect, it } from "vitest";
import type { AlertaReposicion } from "../../types/DashboardStats";
import { solicitudDesdeAlerta } from "./almacenTableroUtils";

function alertaBase(partial: Partial<AlertaReposicion>): AlertaReposicion {
  return {
    idVariante: 1,
    idProducto: 10,
    nombreProducto: "Americano",
    color: "Blanco",
    talla: "M",
    sku: "SKU-1",
    ubicacionPiso: "Piso 1",
    area: "Caballeros",
    stockActual: 0,
    stockObjetivo: 15,
    cantidadSugerida: 15,
    tieneSolicitudPendiente: false,
    idUbicacionArea: 99,
    ...partial,
  };
}

describe("solicitudDesdeAlerta", () => {
  it("usa cantidadSugerida del API (objetivo - stock en piso)", () => {
    const ticket = solicitudDesdeAlerta(
      alertaBase({ stockActual: 3, stockObjetivo: 15, cantidadSugerida: 12 })
    );

    expect(ticket.stockPisoAlerta).toBe(3);
    expect(ticket.stockObjetivoAlerta).toBe(15);
    expect(ticket.lineas[0]?.cantidad).toBe(12);
  });

  it("stock cero sugiere reponer hasta objetivo 15", () => {
    const ticket = solicitudDesdeAlerta(
      alertaBase({ stockActual: 0, stockObjetivo: 15, cantidadSugerida: 15 })
    );

    expect(ticket.lineas[0]?.cantidad).toBe(15);
  });
});
