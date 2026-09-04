import type { Modo } from "../App";

/** Preferencias globales (no viajan en el .vertice): docs/01-requisitos.md §8. */
export type Preferencias = {
  modoDefecto: Modo;
};

const CLAVE_PREFS = "vertice.prefs.v1";
const CLAVE_MODO_LEGACY = "vertice.modo";

const POR_DEFECTO: Preferencias = { modoDefecto: "simple" };

export function leerPreferencias(): Preferencias {
  try {
    const crudo = localStorage.getItem(CLAVE_PREFS);
    if (crudo) {
      const p = JSON.parse(crudo);
      if (p && (p.modoDefecto === "simple" || p.modoDefecto === "avanzado")) {
        return { modoDefecto: p.modoDefecto };
      }
    }
    // migración: el toggle guardaba "vertice.modo"
    const legado = localStorage.getItem(CLAVE_MODO_LEGACY);
    if (legado === "avanzado") return { modoDefecto: "avanzado" };
  } catch {
    /* almacenamiento no disponible */
  }
  return POR_DEFECTO;
}

export function guardarPreferencias(prefs: Preferencias): void {
  try {
    localStorage.setItem(CLAVE_PREFS, JSON.stringify(prefs));
    localStorage.removeItem(CLAVE_MODO_LEGACY);
  } catch {
    /* almacenamiento no disponible */
  }
}
