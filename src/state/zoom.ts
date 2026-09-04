import { leerPreferencias, guardarPreferencias } from "./preferencias";

/**
 * Tamaño de interfaz: escala la base del `rem` (html font-size = 18px × factor).
 * Todo Tailwind (texto, padding, alturas) es rem, así que la UI completa crece.
 * No depende de permisos Tauri ni del escalado del compositor: vale en 4K sin HiDPI,
 * con webview y hasta en navegador.
 */
export function aplicarZoom(): void {
  const factor = leerPreferencias().textoPantalla;
  document.documentElement.style.setProperty("--vertice-zoom", String(factor));
}

export function fijarZoom(factor: number): void {
  guardarPreferencias({ textoPantalla: factor });
  aplicarZoom();
}
