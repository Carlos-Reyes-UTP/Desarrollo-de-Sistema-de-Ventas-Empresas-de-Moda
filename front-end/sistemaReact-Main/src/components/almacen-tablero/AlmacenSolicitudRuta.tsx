import { ArrowRight, MapPin, Warehouse } from "lucide-react";

export interface UbicacionSolicitudResumen {
  piso: string | null;
  area: string | null;
  etiqueta: string | null;
}

interface Props {
  origen: UbicacionSolicitudResumen;
  destino: UbicacionSolicitudResumen;
  destinosAdicionales?: UbicacionSolicitudResumen[];
  compacto?: boolean;
  invertido?: boolean;
}

function FilaUbicacion({
  titulo,
  u,
  icono,
  oscuro,
}: {
  titulo: string;
  u: UbicacionSolicitudResumen;
  icono: "almacen" | "piso";
  oscuro: boolean;
}) {
  const etiqueta =
    u.etiqueta?.trim() ||
    [u.piso, u.area].filter(Boolean).join(" · ") ||
    "—";

  const Wrapper = "div" as const;
  const Row = Wrapper;

  return (
    <Row className="min-w-0 flex-1">
      <p
        className={`text-[8px] font-black uppercase tracking-[0.2em] mb-0.5 ${
          oscuro ? "text-white/50" : "text-gray-400"
        }`}
      >
        {titulo}
      </p>
      <Row className={`flex items-start gap-1.5 ${oscuro ? "text-white" : "text-black"}`}>
        {icono === "almacen" ? (
          <Warehouse className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70" strokeWidth={2.5} />
        ) : (
          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70" strokeWidth={2.5} />
        )}
        <Row className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-tight leading-tight truncate">
            {etiqueta}
          </p>
          {u.piso && u.area && (
            <p
              className={`text-[9px] font-bold uppercase tracking-wider truncate mt-0.5 ${
                oscuro ? "text-white/50" : "text-gray-500"
              }`}
            >
              Piso: {u.piso} · Área: {u.area}
            </p>
          )}
        </Row>
      </Row>
    </Row>
  );
}

export function AlmacenSolicitudRuta({
  origen,
  destino,
  destinosAdicionales,
  compacto = false,
  invertido = false,
}: Props) {
  const extra = destinosAdicionales?.filter(
    (d) =>
      d.etiqueta !== destino.etiqueta ||
      d.piso !== destino.piso ||
      d.area !== destino.area
  );

  const Box = "div" as const;

  return (
    <Box
      className={`rounded-2xl border ${
        invertido
          ? "border-white/15 bg-white/10"
          : "border-gray-100 bg-white/80"
      } ${compacto ? "p-2.5" : "p-3.5"}`}
    >
      <Box className={`flex items-stretch ${compacto ? "gap-1.5" : "gap-3"}`}>
        <FilaUbicacion titulo="Recoger en" u={origen} icono="almacen" oscuro={invertido} />
        <Box
          className={`flex items-center shrink-0 self-center ${
            invertido ? "text-white/40" : "text-gray-300"
          }`}
        >
          <ArrowRight className="w-4 h-4" strokeWidth={3} />
        </Box>
        <FilaUbicacion titulo="Entregar en" u={destino} icono="piso" oscuro={invertido} />
      </Box>
      {extra && extra.length > 0 && (
        <Box
          className={`mt-2 pt-2 border-t ${
            invertido ? "border-white/10" : "border-gray-100"
          }`}
        >
          <p
            className={`text-[8px] font-black uppercase tracking-widest mb-1 ${
              invertido ? "text-white/50" : "text-gray-400"
            }`}
          >
            Otros destinos en el lote
          </p>
          <ul className="space-y-1">
            {extra.map((d, i) => (
              <li
                key={`${d.etiqueta}-${i}`}
                className={`text-[10px] font-bold uppercase tracking-wide truncate ${
                  invertido ? "text-white/80" : "text-gray-600"
                }`}
              >
                {d.etiqueta || [d.piso, d.area].filter(Boolean).join(" · ")}
              </li>
            ))}
          </ul>
        </Box>
      )}
    </Box>
  );
}
