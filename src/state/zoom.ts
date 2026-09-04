import { leerPreferencias, guardarPreferencias } from "./preferencias";

/**
 * Tamaño de interfaz: fija inline el tamaño de fuente raíz (18px × factor).
 * Es la vía más bruta y fiable: no depende de permisos Tauri, de `calc(var())`
 * en el CSS compilado, ni del escalado HiDPI del compositor. Todo el resto de
 * la UI es rem (Tailwind), así que escala completo.
 */
const BASE_PX = 18;

export function aplicarZoom(): void {
  const factor = leerPreferencias().textoPantalla;
  const root = document.documentElement;
  root.style.setProperty("--vertice-zoom", String(factor));
  root.style.fontSize = `${BASE_PX * factor}px`;
}

export function fijarZoom(factor: number): void {
  guardarPreferencias({ textoPantalla: factor });
  aplicarZoom();
}
