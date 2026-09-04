import type { Modo } from "../App";

/** Preferencias globales (no viajan en el .vertice): docs/01-requisitos.md §8. */
export type Preferencias = {
  modoDefecto: Modo;
  /** Multiplicador de tamaño de la interfaz (1 = base 18px). 0.75–2.5. */
  textoPantalla: number;
};

const CLAVE_PREFS = "vertice.prefs.v1";
const CLAVE_MODO_LEGACY = "vertice.modo";

const POR_DEFECTO: Preferencias = { modoDefecto: "simple", textoPantalla: 1 };

function modoValido(v: unknown): v is Modo {
  return v === "simple" || v === "avanzado";
}

function zoomValido(v: unknown): v is number {
  return typeof v === "number" && v >= 0.75 && v <= 2.5;
}

export function leerPreferencias(): Preferencias {
  let p: Preferencias = { ...POR_DEFECTO };
  try {
    const crudo = localStorage.getItem(CLAVE_PREFS);
    if (crudo) {
      const o = JSON.parse(crudo);
      if (modoValido(o?.modoDefecto)) p.modoDefecto = o.modoDefecto;
      if (zoomValido(o?.textoPantalla)) p.textoPantalla = o.textoPantalla;
      return p;
    }
    // migración: el toggle guardaba "vertice.modo"
    const legado = localStorage.getItem(CLAVE_MODO_LEGACY);
    if (legado === "avanzado") p.modoDefecto = "avanzado";
  } catch {
    /* almacenamiento no disponible */
  }
  return p;
}

/** Actualización parcial: guarda y devuelve las preferencias completas. */
export function guardarPreferencias(cambio: Partial<Preferencias>): Preferencias {
  const actual = { ...leerPreferencias(), ...cambio };
  try {
    localStorage.setItem(CLAVE_PREFS, JSON.stringify(actual));
    localStorage.removeItem(CLAVE_MODO_LEGACY);
  } catch {
    /* almacenamiento no disponible */
  }
  return actual;
}
