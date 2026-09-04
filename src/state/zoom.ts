import { leerPreferencias, guardarPreferencias } from "./preferencias";

/**
 * Zoom de la interfaz (independiente del escalado del compositor):
 * en pantallas 4K sin escala HiDPI bien propagada, el texto sale a media
 * altura; este ajuste multiplica todo el tamaño de la UI y se recuerda.
 */
export async function aplicarZoom(): Promise<void> {
  if (!("__TAURI_INTERNALS__" in window)) return; // en navegador: zoom propio del browser
  try {
    const { getCurrentWebview } = await import("@tauri-apps/api/webview");
    await getCurrentWebview().setZoom(leerPreferencias().textoPantalla);
  } catch {
    /* permisos/versión sin soporte de zoom: la UI sigue usable con el tamaño base */
  }
}

export async function fijarZoom(factor: number): Promise<void> {
  guardarPreferencias({ textoPantalla: factor });
  await aplicarZoom();
}
