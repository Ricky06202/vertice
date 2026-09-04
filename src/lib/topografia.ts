/**
 * Módulo puro de topografía (sin UI). Convenciones:
 * - Norte = eje Y, Este = eje X. Rumbos en CUADRANTE (N/S … E/W), ángulo
 *   medido desde el eje Norte-Sur, 0°–90°.
 * - parseRumbo acepta rumbo "crudo" flexible: DD.MM ("30.04SE" = 30°04'),
 *   DD.MMSS ("30.0430SE"), grados decimales con cuadrante ("45.5ne"),
 *   solo-grados ("90nw" → N90°W), DMS explícito (S 30°04'00" E, 30d04m,
 *   con o sin espacios, acentos, coma decimal y O=Oeste).
 * - Todos los cálculos en precisión doble; el redondeo es de presentación.
 */

export type Cuadrante = "NE" | "SE" | "SW" | "NW";

export type Rumbo = {
  cuadrante: Cuadrante;
  /** Partes mostrables del ángulo (segundos puede tener decimales). */
  grados: number;
  minutos: number;
  segundos: number;
  /** Ángulo de cuadrante en grados decimales (0–90). */
  decimal: number;
};

export type Coordenada = {
  norte: number;
  este: number;
  elevacion?: number | null;
};

type Lado = "E" | "W";

const REDONDEO_MIN = 1e-9;

function anguloDePartes(g: number, m: number, s: number): { g: number; m: number; s: number; dec: number } {
  if (!Number.isFinite(g) || !Number.isFinite(m) || !Number.isFinite(s)) throw new Error("Ángulo no numérico.");
  if (m < 0 || s < 0 || g < 0) throw new Error("El ángulo de cuadrante no puede ser negativo.");
  if (m >= 60 + REDONDEO_MIN) throw new Error(`Minutos inválidos (${m}).`);
  if (s >= 60 + REDONDEO_MIN) throw new Error(`Segundos inválidos (${s}).`);
  const dec = g + m / 60 + s / 3600;
  if (dec > 90 + 1e-6) throw new Error(`Ángulo ${dec.toFixed(4)}° no cabe en un cuadrante (máx 90°).`);
  return { g, m, s, dec: Math.min(90, dec) };
}

/**
 * Dado DD.MM[SS] escrito con punto (p. ej. "04", "5", "045", "0430"),
 * devuelve [minutos, segundos]. La coma decimal del ángulo ya fue convertida.
 */
function partesDeFraccion(frac: string): [number, number] {
  if (/^\d{5,}$/.test(frac)) throw new Error(`Formato de ángulo ambiguo: "${frac}". Use DMS.`);
  if (frac.length <= 2) return [Number(frac), 0];
  if (frac.length === 3) return [Number(frac.slice(0, 2)), Number(frac.slice(2))];
  return [Number(frac.slice(0, 2)), Number(frac.slice(2, 4))];
}

/** Interpreta un rumbo escrito a mano. Lanza Error con mensaje en español. */
export function parseRumbo(texto: string): Rumbo {
  if (typeof texto !== "string") throw new Error("El rumbo debe ser texto.");
  let t = texto.toUpperCase().replace(/[\t ]/g, " ").trim();
  if (t === "") throw new Error("Rumbo vacío. Ejemplos: \"30.04SE\", \"S 30°04' E\", \"90nw\".");

  let base: "N" | "S" | null = null;
  let lado: Lado | null = null;

  // cuadrante inicial: "S 30 04 E" (solo si sigue un dígito)
  const ini = t.match(/^([NS])\s*(?=\d)/);
  if (ini) {
    base = ini[1] as "N" | "S";
    t = t.slice(ini[0].length);
  }

  // cuadrante final completo: "…SE" / "…S E" / "…SO"
  const fin2 = t.match(/([NS])\s*([EWO])\s*$/);
  if (fin2) {
    if (base && base !== fin2[1]) throw new Error("Cuadrante ambiguo (dos bases indicadas).");
    base = fin2[1] as "N" | "S";
    lado = fin2[2] === "O" ? "W" : (fin2[2] as Lado);
    t = t.slice(0, fin2.index).trim();
  } else {
    const fin1 = t.match(/([EWO])\s*$/);
    if (fin1) {
      if (lado) throw new Error("Cuadrante ambiguo.");
      lado = fin1[1] === "O" ? "W" : (fin1[1] as Lado);
      t = t.slice(0, fin1.index).trim();
    }
  }
  if (!base) base = "N"; // defecto simple: ángulo desde el Norte
  if (!lado) throw new Error("Falta indicar Este u Oeste en el rumbo.");

  // cuerpo numérico: QUITAMOS marcas DMS ([° ' " d m s :]) y comas sueltas de separación
  const cuerpo = t.replace(/["″]/g, "");
  const tokens = cuerpo.split(/[^0-9.,]+/).filter((x) => x.replace(/[.,]/g, "") !== "");
  if (tokens.length === 0) throw new Error("No se encontró ningún ángulo en el rumbo.");

  let g: number, m: number, s: number;
  if (tokens.length === 1) {
    const tok = tokens[0].replace(/,/g, "."); // una sola coma: decimal manual
    if (!/^\d*\.?\d*$/.test(tok)) throw new Error(`Ángulo no entendido: "${tok}".`);
    const [entero, frac = ""] = tok.split(".");
    g = Number(entero);
    if (frac === "") {
      m = 0;
      s = 0;
    } else {
      [m, s] = partesDeFraccion(frac);
    }
  } else if (tokens.length <= 3) {
    g = Number(tokens[0].replace(",", "."));
    m = Number(tokens[1].replace(",", "."));
    s = tokens[2] !== undefined ? Number(tokens[2].replace(",", ".")) : 0;
  } else {
    throw new Error("Demasiadas cifras en el rumbo.");
  }

  if (!Number.isFinite(g)) throw new Error("Grados no numéricos.");
  const ang = anguloDePartes(g, m, s);
  return {
    cuadrante: `${base}${lado}` as Cuadrante,
    grados: ang.g,
    minutos: ang.m,
    segundos: ang.s,
    decimal: ang.dec,
  };
}

/** Formatea "N 22°20'47\"" con segundos redondeados (un decimal si no es entero). */
export function formatearRumboDMS(rumbo: Rumbo): string {
  const base = rumbo.cuadrante[0];
  const lado = rumbo.cuadrante[1];
  const dec = rumbo.decimal;
  let g = Math.floor(dec + 1e-9);
  let m = Math.floor((dec - g) * 60 + 1e-9);
  let s = Math.round((((dec - g) * 60 - m) * 60 + 1e-9) * 10) / 10;
  if (s >= 60) {
    s -= 60;
    m += 1;
  }
  if (m >= 60) {
    m -= 60;
    g += 1;
  }
  const p2 = (n: number) => String(Math.round(n)).padStart(2, "0");
  const seg = Number.isInteger(s) ? p2(s) : s.toFixed(1).padStart(4, "0");
  return `${base} ${g}°${p2(m)}'${seg}" ${lado}`;
}

/**
 * TR — traversing: nuevo punto a partir de `base` con rumbo + distancia
 * horizontal y ΔElevación opcional (si se omite, conserva la elevación base).
 */
export function tr(
  base: Coordenada,
  rumbo: Rumbo | string,
  distancia: number,
  deltaElev?: number | null,
): Coordenada {
  const r = typeof rumbo === "string" ? parseRumbo(rumbo) : rumbo;
  if (!Number.isFinite(distancia) || distancia <= 0) {
    throw new Error("La distancia debe ser un número mayor que cero.");
  }
  if (!Number.isFinite(base.norte) || !Number.isFinite(base.este)) {
    throw new Error("La coordenada base no es válida.");
  }
  const rad = (r.decimal * Math.PI) / 180;
  const signoN = r.cuadrante[0] === "N" ? 1 : -1;
  const signoE = r.cuadrante[1] === "E" ? 1 : -1;
  const norte = base.norte + signoN * distancia * Math.cos(rad);
  const este = base.este + signoE * distancia * Math.sin(rad);
  let elevacion: number | null;
  if (deltaElev !== undefined && deltaElev !== null) {
    elevacion = (base.elevacion ?? 0) + deltaElev;
  } else {
    elevacion = base.elevacion ?? null;
  }
  return { norte, este, elevacion };
}

export type ResultadoInverso = {
  rumbo: Rumbo;
  /** Rumbo legible, p. ej. "N 22°20'47\" W". */
  rumboTexto: string;
  distancia: number;
  /** b − a; null si falta alguna elevación. */
  dElev: number | null;
};

/** IN — inverso: rumbo cuadrante DMS + distancia horizontal + Δelev. */
export function inverso(a: Coordenada, b: Coordenada): ResultadoInverso {
  const dN = b.norte - a.norte;
  const dE = b.este - a.este;
  if (Math.abs(dN) < REDONDEO_MIN && Math.abs(dE) < REDONDEO_MIN) {
    throw new Error("Los dos puntos son el mismo punto.");
  }
  const base: "N" | "S" = dN >= 0 ? "N" : "S";
  const lado: Lado = dE >= 0 ? "E" : "W";
  const decimal = (Math.atan2(Math.abs(dE), Math.abs(dN)) * 180) / Math.PI;
  let g = Math.floor(decimal + 1e-9);
  let m = Math.floor((decimal - g) * 60 + 1e-9);
  let s = Math.round((((decimal - g) * 60 - m) * 60 + 1e-9) * 1e6) / 1e6;
  if (s >= 60 - 1e-9) {
    s -= 60;
    m += 1;
  }
  if (m >= 60) {
    m -= 60;
    g += 1;
  }
  const rumboDe: Rumbo = { cuadrante: `${base}${lado}`, grados: g, minutos: m, segundos: s, decimal };
  const dElev =
    a.elevacion != null && b.elevacion != null ? b.elevacion - a.elevacion : null;
  return {
    rumbo: rumboDe,
    rumboTexto: formatearRumboDMS(rumboDe),
    distancia: Math.hypot(dN, dE),
    dElev,
  };
}

export type ResultadoArea = {
  m2: number;
  ha: number;
  ft2: number;
  ac: number;
  perimetro: number;
};

const M2_A_FT2 = 1 / 0.09290304; // pie internacional exacto
const FT2_A_AC = 1 / 43560;

/**
 * Área de poligonal cerrada (fórmula de Gauss/shoelace); los puntos se
 * cierran implícitamente y el resultado es valor absoluto (no importa el
 * sentido horario/antihorario). Requiere ≥3 vértices.
 */
export function areaPoligonal(puntos: Coordenada[]): ResultadoArea {
  if (puntos.length < 3) throw new Error("Se necesitan al menos 3 vértices para cerrar una poligonal.");
  if (puntos.some((p) => !Number.isFinite(p.norte) || !Number.isFinite(p.este))) {
    throw new Error("Hay vértices con coordenadas no numéricas.");
  }
  let suma = 0;
  let perimetro = 0;
  for (let i = 0; i < puntos.length; i++) {
    const p = puntos[i];
    const q = puntos[(i + 1) % puntos.length];
    suma += p.norte * q.este - q.norte * p.este;
    perimetro += Math.hypot(q.norte - p.norte, q.este - p.este);
  }
  const m2 = Math.abs(suma) / 2;
  const ft2 = m2 * M2_A_FT2;
  return { m2, ha: m2 / 10000, ft2, ac: ft2 * FT2_A_AC, perimetro };
}
