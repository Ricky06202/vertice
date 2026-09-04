/**
 * Lectura/escritura del formato `.vertice` vía @tauri-apps/plugin-fs.
 * Validación según docs/formato.md. En navegador (sin Tauri) las operaciones
 * de disco devuelven null/false con aviso — la UI sigue siendo probable.
 */
import { copyFile, exists, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { VERSION_FORMATO, type Proyecto } from "../types";

export const esTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const numeroFinito = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

/** Valida un objeto ya parseado contra el esquema de docs/formato.md. */
export function validarProyecto(datos: unknown): Proyecto | null {
  if (!esObjeto(datos) || datos.version !== VERSION_FORMATO) return null;
  if (typeof datos.titulo !== "string" || typeof datos.creado !== "string") return null;
  if (!Array.isArray(datos.puntos) || !Array.isArray(datos.log)) return null;
  if (!esObjeto(datos.config)) return null;

  for (const p of datos.puntos) {
    if (!esObjeto(p) || typeof p.numero !== "string") return null;
    if (!numeroFinito(p.norte) || !numeroFinito(p.este)) return null;
    if (p.elevacion !== undefined && p.elevacion !== null && !numeroFinito(p.elevacion)) return null;
    if (p.descripcion !== undefined && typeof p.descripcion !== "string") return null;
  }
  for (const e of datos.log) {
    if (!esObjeto(e) || typeof e.ts !== "string" || typeof e.texto !== "string") return null;
    if (typeof e.tipo !== "string") return null;
  }

  const c = datos.config;
  const sepOk = c.separador === "," || c.separador === ".";
  if (!sepOk || typeof c.descDefault !== "string") return null;
  if (!numeroFinito(c.decimalesNE) || !numeroFinito(c.decimalesElev)) return null;
  if (c.numeroSiguiente !== undefined && !numeroFinito(c.numeroSiguiente)) return null;

  return datos as unknown as Proyecto;
}

/** Lee y valida `.vertice`; null si no existe, está ilegible o inválido. */
export async function leerProyecto(ruta: string): Promise<Proyecto | null> {
  if (!esTauri()) return null;
  try {
    const texto = await readTextFile(ruta);
    return validarProyecto(JSON.parse(texto));
  } catch {
    return null;
  }
}

export async function existeRuta(ruta: string): Promise<boolean> {
  if (!esTauri()) return false;
  try {
    return await exists(ruta);
  } catch {
    return false;
  }
}

/**
 * Escribe el proyecto con rotación de .bak: el contenido previo pasa a
 * `<ruta>.bak` antes de sobrescribir (regla de docs/formato.md §1).
 */
export async function escribirProyecto(ruta: string, proyecto: Proyecto): Promise<void> {
  if (!esTauri()) {
    console.warn("[vertice] escribirProyecto ignorado: no hay runtime Tauri");
    return;
  }
  if (await existeRuta(ruta)) {
    // v2: copyFile sobrescribe el destino
    await copyFile(ruta, rutaBak(ruta));
  }
  await writeTextFile(ruta, JSON.stringify(proyecto, null, 2) + "\n");
}

export const rutaBak = (ruta: string): string => `${ruta}.bak`;

/** Nombre de archivo sugerido a partir del título. */
export function nombreArchivo(titulo: string): string {
  const limpio = titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 _-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `${limpio || "sin-proyecto"}.vertice`;
}
