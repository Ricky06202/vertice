import { leerPreferencias, guardarPreferencias } from "./preferencias";

/**
 * Tamaño de interfaz: fija inline el tamaño de fuente raíz (18px × factor).
 * Es la vía más bruta y fiable: no depende de permisos Tauri, de `calc(var())`
 * en el CSS compilado, ni del escalado HiDPI del compositor. Todo el resto de
 * la UI es rem (Tailwind), así que escala completo.
 */
const BASE_PX = 18;

export function aplicarZoom(): void {
  let factor = leerPreferencias().textoPantalla;
  if (typeof factor !== "number" || !Number.isFinite(factor)) factor = 1;
  factor = Math.min(2.5, Math.max(0.75, factor));
  const root = document.documentElement;
  root.style.removeProperty("--vertice-zoom");
  root.style.fontSize = `${BASE_PX * factor}px`;
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
