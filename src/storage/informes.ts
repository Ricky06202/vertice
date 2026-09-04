/**
 * Informes imprimibles/exportables (docs/01-requisitos.md §6): listado de
 * coordenadas + resumen de áreas. Solo texto, sin backend ni PDF.
 */
import { save } from "@tauri-apps/plugin-dialog";
import type { Proyecto } from "../types";
import { esTauri } from "./verticeFs";
import { fechaHora } from "./registro";

function fmt(v: number, dec: number, sep: string): string {
  return v.toFixed(dec).replace(".", sep);
}

export function fechaInforme(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("es", { day: "2-digit", month: "long", year: "numeric" });
}

/** Líneas tipo "2026-09-04 10:00  ..." para filtrar del log lo que sigue. */
function quitarMarca(texto: string): string {
  return texto.replace(/^Área lazo /, "Poligonal ");
}

/** Texto plano del informe (listado PNEZ + áreas). */
export function textoInforme(proyecto: Proyecto, puntos: Proyecto["puntos"], etiquetas: { inicio?: string; fin?: string }): string {
  const { config } = proyecto;
  const anchoNumero = Math.max(3, ...puntos.map((p) => p.numero.length));
  const lineas: string[] = [
    "V E R T I C E   —   LISTADO DE COORDENADAS",
    `Proyecto: ${proyecto.titulo}`,
    `Fecha:    ${fechaInforme(new Date().toISOString())}`,
    etiquetas.inicio && etiquetas.fin ? `Rango:    ${etiquetas.inicio}–${etiquetas.fin}` : "Rango:    todos los puntos",
    "".padEnd(64, "-"),
    `${"N°".padEnd(anchoNumero)}  ${"NORTE".padStart(12)}  ${"ESTE".padStart(12)}  ${"ELEV".padStart(9)}  DESCRIPCION`,
    "".padEnd(64, "-"),
  ];
  for (const p of puntos) {
    lineas.push(
      `${p.numero.padEnd(anchoNumero)}  ${fmt(p.norte, config.decimalesNE, config.separador).padStart(12)}  ${fmt(
        p.este,
        config.decimalesNE,
        config.separador,
      ).padStart(12)}  ${(p.elevacion == null ? "---" : fmt(p.elevacion, config.decimalesElev, config.separador)).padStart(9)}  ${p.descripcion ?? ""}`,
    );
  }
  lineas.push("".padEnd(64, "-"), `${puntos.length} punto(s)`);

  const areas = proyecto.log.filter((e) => e.tipo === "area");
  if (areas.length > 0) {
    lineas.push("", "RESUMEN DE AREAS", "".padEnd(64, "-"));
    for (const a of areas) {
      lineas.push(`${fechaHora(a.ts).fecha} ${fechaHora(a.ts).hora}  ${quitarMarca(a.texto)}`);
    }
  }
  return lineas.join("\r\n") + "\r\n";
}

function descargarEnNavegador(nombre: string, contenido: string): void {
  const url = URL.createObjectURL(new Blob(["\uFEFF", contenido], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Guarda el informe .txt con diálogo nativo; null si el usuario cancela. */
export async function exportarInformeTxt(
  proyecto: Proyecto,
  puntos: Proyecto["puntos"],
  etiquetas: { inicio?: string; fin?: string },
): Promise<string | null> {
  const contenido = "\ufeff" + textoInforme(proyecto, puntos, etiquetas);
  const base = (proyecto.titulo || "sin-proyecto").toLowerCase().replace(/[^a-z0-9]+/gi, "-");
  if (!esTauri()) {
    descargarEnNavegador(`${base}-listado.txt`, contenido);
    return `${base}-listado.txt`;
  }
  const ruta = await save({
    title: "Exportar informe",
    defaultPath: `${base}-listado.txt`,
    filters: [{ name: "Texto", extensions: ["txt"] }],
  });
  if (typeof ruta !== "string") return null;
  const { writeTextFile } = await import("@tauri-apps/plugin-fs");
  await writeTextFile(ruta.endsWith(".txt") ? ruta : `${ruta}.txt`, contenido);
  return ruta;
}
