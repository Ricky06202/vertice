/**
 * Exportación CSV PNEZD (docs/01-requisitos.md §6):
 * separador de campos según config, comillas cuando la descripción lo exige,
 * decimales/renderizado según config y BOM UTF-8 para Excel.
 */
import { save } from "@tauri-apps/plugin-dialog";
import type { Config, Punto } from "../types";
import { esTauri } from "./verticeFs";

/**
 * Elegible por el usuario en Configuración; si es automático y los decimales
 * van con coma se fuerza ";" para que Excel no parta "1234,56".
 * (Ya no hace falta TODO: la opción existe desde la pestaña Configuración.)
 */
export function separadorDeCampos(config: Config): string {
  if (config.separadorExport === "," || config.separadorExport === ";") {
    return config.separadorExport;
  }
  return config.separador === "," ? ";" : ",";
}

function numero(v: number, dec: number, sep: string): string {
  return v.toFixed(dec).replace(".", sep);
}

/** Comillas solo cuando el campo lo exige (RFC 4180): separador, comillas, saltos de línea. */
function citar(campo: string, sep: string): string {
  if (campo.includes(sep) || campo.includes('"') || /[\n\r]/.test(campo) || campo.startsWith(" ")) {
    return `"${campo.replace(/"/g, '""')}"`;
  }
  return campo;
}

/** Construye el contenido del CSV (sin BOM) para el listado PNEZD dado. */
export function construirCsv(puntos: Punto[], config: Config): string {
  const sep = separadorDeCampos(config);
  const lineas = puntos.map((p) =>
    [
      citar(p.numero, sep),
      numero(p.norte, config.decimalesNE, config.separador),
      numero(p.este, config.decimalesNE, config.separador),
      p.elevacion == null ? "" : numero(p.elevacion, config.decimalesElev, config.separador),
      citar(p.descripcion ?? "", sep),
    ].join(sep),
  );
  return lineas.join("\r\n") + "\r\n";
}

/** Descarga vía <a> cuando no hay runtime Tauri (probar en navegador). */
function descargarEnNavegador(nombre: string, contenido: string): void {
  const url = URL.createObjectURL(new Blob(["\uFEFF", contenido], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Abre el diálogo nativo "Guardar como" y escribe el CSV con BOM UTF-8.
 * Devuelve la ruta elegida o null si el usuario cancela.
 */
export async function exportarCsv(
  puntos: Punto[],
  config: Config,
  tituloProyecto: string,
): Promise<string | null> {
  const contenido = construirCsv(puntos, config);
  const nombre = `${(tituloProyecto || "sin-proyecto").toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-puntos.csv`;

  if (!esTauri()) {
    descargarEnNavegador(nombre, contenido);
    return nombre;
  }

  const ruta = await save({
    title: "Exportar puntos a CSV",
    defaultPath: nombre,
    filters: [{ name: "CSV (PNEZD)", extensions: ["csv"] }],
  });
  if (typeof ruta !== "string") return null;
  const { writeTextFile } = await import("@tauri-apps/plugin-fs");
  await writeTextFile(ruta.endsWith(".csv") ? ruta : `${ruta}.csv`, "\uFEFF" + contenido);
  return ruta;
}
