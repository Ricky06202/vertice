import { leerPreferencias, guardarPreferencias } from "./preferencias";

/**
 * Tamaño de interfaz vía CSS `zoom` (la misma mecánica que el Ctrl++ del
 * navegador): WebKitGTK la re-resuelve EN CALIENTE, a diferencia del
 * font-size root con rem (bug propio de wry#3276, sin respuesta upstream).
 * Escala TODO: rem, px, bordes, sombras, diálogos internos.
 */
export function aplicarZoom(): void {
  let factor = leerPreferencias().textoPantalla;
  if (typeof factor !== "number" || !Number.isFinite(factor)) factor = 1;
  factor = Math.min(2.5, Math.max(0.75, factor));
  document.documentElement.style.removeProperty("--vertice-zoom");
  document.documentElement.style.removeProperty("font-size");
  const zoomStr = String(factor);
  document.documentElement.style.zoom = zoomStr;
  // por si algún motor anida raro: body también
  document.body.style.zoom = document.body.style.zoom || "1";
  window.dispatchEvent(new Event("vertice-zoom"));
}

/**
 * Botón de emergencia: devuelve el zoom de PÁGINA de WebKit (el que dejó el
 * antiguo comando setZoom con valores sin dividir) a 1.0 y reescribe el CSS.
 */
export async function restablecerZoom(): Promise<void> {
  guardarPreferencias({ textoPantalla: 1 });
  try {
    if ("__TAURI_INTERNALS__" in window) {
      const { getCurrentWebview } = await import("@tauri-apps/api/webview");
      await getCurrentWebview().setZoom(1);
    }
  } catch {
    /* sin permiso/comando: el reset visual por CSS sigue sirviendo */
  }
  aplicarZoom();
}

export function fijarZoom(factor: number): void {
  guardarPreferencias({ textoPantalla: factor });
  aplicarZoom();
}
