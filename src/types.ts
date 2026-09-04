/** Tipos del dominio de Vértice y formato nativo `.vertice` (ver docs/formato.md). */

/** Versión del formato de proyecto. Sube solo con cambios incompatibles. */
export const VERSION_FORMATO = 1 as const;

export type SeparadorDecimal = "." | ",";

/**
 * Tipos de entrada del log. Cada operación del MVP deja una línea:
 * crear/importar/exportar puntos, cálculos (tr/in/area), guardado (bak), errores…
 */
export type LogTipo =
  | "sesion"
  | "proyecto"
  | "punto"
  | "importar"
  | "exportar"
  | "tr"
  | "in"
  | "area"
  | "nota"
  | "guardar"
  | "error";

export type Punto = {
  /** Identificador del punto. Único dentro del proyecto; admite "BM1" si se renombra. */
  numero: string;
  descripcion?: string;
  norte: number;
  este: number;
  /** Elevación opcional. `null` = sin dato (distinguir de 0). */
  elevacion?: number | null;
};

export type LogEntry = {
  /** Timestamp ISO 8601 en UTC, p. ej. "2026-09-04T14:05:00Z". */
  ts: string;
  tipo: LogTipo;
  texto: string;
};

export type Config = {
  /** Decimales mostrados para Norte/Este. */
  decimalesNE: number;
  /** Decimales mostrados para elevación y Δelev. */
  decimalesElev: number;
  /** Separador decimal de pantalla. */
  separador: SeparadorDecimal;
  /** Descripción que se autocompleta en el formulario de captura. */
  descDefault: string;
};

/** Un trabajo = un archivo `.vertice` con este objeto serializado (UTF-8, sin BOM). */
export type Proyecto = {
  version: typeof VERSION_FORMATO;
  titulo: string;
  /** Fecha de creación del proyecto, ISO 8601 UTC. */
  creado: string;
  puntos: Punto[];
  log: LogEntry[];
  config: Config;
};

export function createEmptyProject(titulo = "Sin proyecto"): Proyecto {
  return {
    version: VERSION_FORMATO,
    titulo,
    creado: new Date().toISOString(),
    puntos: [],
    log: [
      {
        ts: new Date().toISOString(),
        tipo: "sesion",
        texto: `Proyecto creado: ${titulo}`,
      },
    ],
    config: {
      decimalesNE: 5,
      decimalesElev: 3,
      separador: ",",
      descDefault: "",
    },
  };
}
