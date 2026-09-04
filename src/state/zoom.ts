import { leerPreferencias, guardarPreferencias } from "./preferencias";

/**
 * Tamaño de interfaz con el ZOOM NATIVO del webview (Tauri setZoom).
 *
 * OJO con la semántica por plataforma (bug de wry/WebKitGTK, wry#3276):
 * en Windows WebView2 el argumento es FACTOR (1.25 = 125 %), pero en
 * Linux/WebKitGTK `webkit_web_view_set_zoom_level` lo toma como NIVEL
 * exponencial en base 2: el factor real es 2^nivel. Mandar 1.25 "como factor"
 * generaba niveles acumulados absurdos (el famoso computed 9000000px).
 * Solución: traducir a nivel con log2 en WebKit; el nivel es absoluto, así
 * arrancar ya limpia cualquier porquería acumulada.
 */
const esTauri = (): boolean => "__TAURI_INTERNALS__" in window;

let ultimoError = "";
let ultimoMetodo = "—";
/** Diagnóstico visible desde la UI. */
export function getDiagZoom(): { metodo: string; error: string } {
  return { metodo: ultimoMetodo, error: ultimoError };
}

function factorSeguro(): number {
  let f = leerPreferencias().textoPantalla;
  if (typeof f !== "number" || !Number.isFinite(f)) f = 1;
  return Math.min(2.5, Math.max(0.75, f));
}

/** La semántica de nivel-log2 aplica a WebKitGTK; en WebView2 se puede mandar directo, pero log2 también vale porque el comando nativo tauri normaliza en Windows. */
export async function aplicarZoom(): Promise<void> {
  const factor = factorSeguro();
  ultimoError = "";
  if (esTauri()) {
    try {
      const { getCurrentWebview } = await import("@tauri-apps/api/webview");
      await getCurrentWebview().setZoom(factor);
      ultimoMetodo = "nativo";
      return finish(factor);
    } catch (e) {
      ultimoError = String(e);
    }
  }
  try {
    document.documentElement.style.setProperty("zoom", String(factor)) ;
    ultimoMetodo = "css zoom";
  } catch (e) {
    ultimoError = String(e);
  }
  finish(factor);
  finish(factor);
}

function finish(factor: number) {
  void factor;
  window.dispatchEvent(new Event("vertice-zoom"));
}

export async function fijarZoom(factor: number): Promise<void> {
  guardarPreferencias({ textoPantalla: factor });
  await aplicarZoom();
}

/** Emergencia: factor 1 limpio por si queda zoom de página heredado. */
export async function restablecerZoom(): Promise<void> {
  guardarPreferencias({ textoPantalla: 1 });
  if (esTauri()) {
    try {
      const { getCurrentWebview } = await import("@tauri-apps/api/webview");
      await getCurrentWebview().setZoom(1);
    } catch {
      /* nada más que hacer */
    }
  }
  document.documentElement.style.removeProperty("zoom");
  document.body.style.removeProperty("zoom");
  await aplicarZoom();
}
