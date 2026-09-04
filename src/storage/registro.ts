/**
 * Presentación del registro (log del proyecto): texto plano exportable e
 * impresión vía iframe oculto (sin dependencias nuevas).
 */
import { save } from "@tauri-apps/plugin-dialog";
import type { LogTipo, Proyecto } from "../types";
import { esTauri } from "./verticeFs";

const ETIQUETA: Record<LogTipo, string> = {
  sesion: "SESION",
  proyecto: "PROYECTO",
  punto: "PUNTO",
  importar: "IMPORTAR",
  exportar: "EXPORTAR",
  tr: "TR",
  in: "IN",
  area: "AREA",
  nota: "NOTA",
  guardar: "GUARDAR",
  error: "ERROR",
};

function f2(n: number): string {
  return String(n).padStart(2, "0");
}

/** "2026-09-04 09:12:03" en hora local. */
export function fechaHora(ts: string): { fecha: string; hora: string } {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return { fecha: ts, hora: "" };
  return {
    fecha: `${d.getFullYear()}-${f2(d.getMonth() + 1)}-${f2(d.getDate())}`,
    hora: `${f2(d.getHours())}:${f2(d.getMinutes())}:${f2(d.getSeconds())}`,
  };
}

function lineaPlana(e: Proyecto["log"][number]): string {
  const { fecha, hora } = fechaHora(e.ts);
  return `${fecha} ${hora}  ${ETIQUETA[e.tipo] ?? "NOTA".padEnd(8)}  ${e.texto}`;
}

/** Contenido completo del registro en texto plano (con cabecera). */
export function textoRegistro(proyecto: Proyecto): string {
  const hoy = new Date();
  return [
    "VERTICE — REGISTRO DE OPERACIONES",
    `Proyecto: ${proyecto.titulo}`,
    `Emitido: ${fechaHora(hoy.toISOString()).fecha} ${f2(hoy.getHours())}:${f2(hoy.getMinutes())}`,
    "".padEnd(58, "-"),
    ...proyecto.log.map(lineaPlana),
    "".padEnd(58, "-"),
    `${proyecto.log.length} lineas`,
    "",
  ].join("\r\n");
}

function escaparHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function htmlRegistro(proyecto: Proyecto): string {
  const filas = proyecto.log
    .map((e) => {
      const { fecha, hora } = fechaHora(e.ts);
      return `<tr><td class="f">${fecha}</td><td class="h">${hora}</td><td class="t">${escaparHtml(ETIQUETA[e.tipo] ?? "NOTA")}</td><td>${escaparHtml(e.texto)}</td></tr>`;
    })
    .join("\n");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Registro — ${escaparHtml(proyecto.titulo)}</title>
<style>
  body{font-family:Georgia,'Times New Roman',serif;margin:2.5cm;color:#111}
  h1{font-size:19pt;margin:0} h2{font-size:13pt;font-weight:normal;margin:.2cm 0 .8cm}
  table{width:100%;border-collapse:collapse;font-family:'Courier New',monospace;font-size:9.5pt}
  th{border-bottom:1.5pt solid #111;text-align:left;padding:3pt 6pt;font-size:8.5pt}
  td{border-bottom:.5pt solid #bbb;padding:3pt 6pt;vertical-align:top}
  .f,.h,.t{white-space:nowrap} .t{font-weight:bold}
  @page{margin:1.8cm}
</style></head><body>
<h1>Vértice</h1><h2>Registro de operaciones — ${escaparHtml(proyecto.titulo)}</h2>
<table><thead><tr><th>Fecha</th><th>Hora</th><th>Op.</th><th>Detalle</th></tr></thead>
<tbody>${filas || '<tr><td colspan="4">Sin operaciones registradas.</td></tr>'}</tbody></table>
</body></html>`;
}

function descargarEnNavegador(nombre: string, contenido: string): void {
  const url = URL.createObjectURL(new Blob(["\uFEFF", contenido], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Guarda el registro como .txt con diálogo nativo; null si cancela. */
export async function exportarRegistroTxt(proyecto: Proyecto): Promise<string | null> {
  const contenido = "\ufeff" + textoRegistro(proyecto);
  const nombreBase = (proyecto.titulo || "sin-proyecto").toLowerCase().replace(/[^a-z0-9]+/gi, "-");
  if (!esTauri()) {
    descargarEnNavegador(`${nombreBase}-registro.txt`, contenido);
    return `${nombreBase}-registro.txt`;
  }
  const ruta = await save({
    title: "Exportar registro",
    defaultPath: `${nombreBase}-registro.txt`,
    filters: [{ name: "Texto", extensions: ["txt"] }],
  });
  if (typeof ruta !== "string") return null;
  const { writeTextFile } = await import("@tauri-apps/plugin-fs");
  await writeTextFile(ruta.endsWith(".txt") ? ruta : `${ruta}.txt`, contenido);
  return ruta;
}

/** Imprime el registro usando un iframe oculto (funciona en WebKit/Tauri). */
export function imprimirRegistro(proyecto: Proyecto): void {
  const marco = document.createElement("iframe");
  marco.setAttribute("aria-hidden", "true");
  Object.assign(marco.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(marco);
  const doc = marco.contentWindow?.document;
  if (!doc) {
    marco.remove();
    return;
  }
  doc.open();
  doc.write(htmlRegistro(proyecto));
  doc.close();
  const ventana = marco.contentWindow;
  if (!ventana) return;
  ventana.addEventListener("load", () => {
    ventana.focus();
    ventana.print();
    setTimeout(() => marco.remove(), 60_000);
  });
}
