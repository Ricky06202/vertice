/**
 * Importación CSV/ASCII PNEZD (docs/01-requisitos.md §5) con autodetección:
 * separador (coma, ";", tab), encabezado opcional, 4-5 campos y orden
 * PNEZD / PDNEZ (con o sin elevación/descripción).
 * papaparse hace el troceado fiel (respeta comillas en la descripción).
 */
import Papa from "papaparse";
import type { Punto } from "../types";

export type LineaProblema = { linea: number; texto: string; motivo: string };

export type ResumenImportacion = {
  /** Nombre legible del separador detectado: "coma", "punto y coma", "tabulador". */
  separador: string;
  /** Orden detectado, p. ej. "PNEZD (Punto,Norte,Este,Elevación,Descripción)". */
  orden: string;
  huboEncabezado: boolean;
  importados: Punto[];
  /** Filas válidas cuyo número ya existía (no se pisan datos del usuario). */
  omitidos: LineaProblema[];
  /** Filas que no se pudieron leer, con número de línea y motivo. */
  errores: LineaProblema[];
};

const SEPARADORES: { sep: string; nombre: string }[] = [
  { sep: ",", nombre: "coma" },
  { sep: ";", nombre: "punto y coma" },
  { sep: "\t", nombre: "tabulador" },
];

/** Acepta "1234,56", "1 234.5" o punto decimal. null si no es número. */
export function parseNumero(texto: unknown): number | null {
  if (typeof texto !== "string") return null;
  const limpio = texto.trim().replace(/\s/g, "").replace(",", ".");
  if (limpio === "") return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

const esVacio = (c: string | undefined): boolean => c === undefined || c.trim() === "";

type Mapeo = {
  nombre: string;
  largo: number;
  n: number;
  e: number;
  z: number | null;
  d: number | null;
};

/** En orden de preferencia: gana el primero con el mejor puntaje. */
const MAPEOS: Mapeo[] = [
  { nombre: "PNEZD (Punto,Norte,Este,Elevación,Descripción)", largo: 5, n: 1, e: 2, z: 3, d: 4 },
  { nombre: "PDNEZ (Punto,Descripción,Norte,Este,Elevación)", largo: 5, n: 2, e: 3, z: 4, d: 1 },
  { nombre: "PNEZ (Punto,Norte,Este,Elevación)", largo: 4, n: 1, e: 2, z: 3, d: null },
  { nombre: "PNED (Punto,Norte,Este,Descripción)", largo: 4, n: 1, e: 2, z: null, d: 3 },
  { nombre: "PDNE (Punto,Descripción,Norte,Este)", largo: 4, n: 2, e: 3, z: null, d: 1 },
];

function trocear(text: string, sep: string): string[][] {
  const res = Papa.parse<string[]>(text, { delimiter: sep, skipEmptyLines: "greedy" });
  return (res.data as unknown[][]).map((f) => f.map((c) => String(c ?? "")));
}

/** Filas con 4 o 5 columnas: cobertura por separador candidato. */
function elegirSeparador(text: string): { sep: string; nombre: string; filas: string[][] } {
  let mejor = { sep: ",", nombre: "coma", filas: trocear(text, ",") };
  let mejorCobertura = -1;
  for (const { sep, nombre } of SEPARADORES) {
    const filas = trocear(text, sep);
    const cobertura = filas.reduce(
      (s, f) => s + (f.length >= 4 && f.length <= 5 ? 1 : 0),
      0,
    );
    if (cobertura > mejorCobertura) {
      mejorCobertura = cobertura;
      mejor = { sep, nombre, filas };
    }
  }
  return mejor;
}

function pareceEncabezado(fila: string[], siguiente: string[] | undefined): boolean {
  if (/punto|norte|este|elev|descri/.test(fila.join(" ").toLowerCase())) return true;
  // sin palabras clave: solo si 0 números aquí y al menos 2 en la fila siguiente
  const nums = (f: string[]) => f.reduce((s, c) => s + (parseNumero(c) !== null ? 1 : 0), 0);
  return nums(fila) === 0 && siguiente !== undefined && nums(siguiente) >= 2;
}

function elegirMapeo(filas: string[][]): Mapeo | null {
  const coincide = (f: string[], m: Mapeo): boolean =>
    f.length === m.largo &&
    !esVacio(f[0]) &&
    parseNumero(f[m.n]) !== null &&
    parseNumero(f[m.e]) !== null &&
    (m.z === null || esVacio(f[m.z]) || parseNumero(f[m.z]) !== null);

  let mejor: Mapeo | null = null;
  let mejorPunt = 0;
  for (const m of MAPEOS) {
    const punt = filas.reduce((s, f) => s + (coincide(f, m) ? 1 : 0), 0);
    if (punt > mejorPunt) {
      mejorPunt = punt;
      mejor = m;
    }
  }
  // Basta con que al menos una fila encaje al 100% con el orden; las filas de
  // longitud o contenido incorrecto se reportan una a una con su línea.
  return mejor !== null && mejorPunt >= 1 ? mejor : null;
}

/** Analiza el contenido de un archivo CSV/ASCII frente a los números ya existentes. */
export function analizarCsv(text: string, existentes: Iterable<string>): ResumenImportacion {
  const sinBom = text.replace(/^\ufeff/, "");
  const { sep, nombre, filas: crudo } = elegirSeparador(sinBom);

  const base: ResumenImportacion = {
    separador: nombre,
    orden: "—",
    huboEncabezado: false,
    importados: [],
    omitidos: [],
    errores: [],
  };

  if (crudo.length === 0) {
    base.errores.push({ linea: 1, texto: "", motivo: "El archivo está vacío." });
    return base;
  }

  let filasOk = crudo;
  let desvio = 0;
  if (crudo.length > 1 && pareceEncabezado(crudo[0], crudo[1])) {
    filasOk = crudo.slice(1);
    desvio = 1;
    base.huboEncabezado = true;
  }

  const mapeo = elegirMapeo(filasOk);
  if (!mapeo) {
    base.errores.push({
      linea: desvio + 1,
      texto: crudo[0].join(sep),
      motivo: `No se reconocieron 4-5 columnas PNEZD/PDNEZ con el separador ${nombre}.`,
    });
    return base;
  }
  base.orden = mapeo.nombre;

  const delProyecto = new Set<string>(existentes);
  const tomados = new Set<string>(delProyecto);

  for (let i = 0; i < filasOk.length; i++) {
    const f = filasOk[i];
    const linea = i + 1 + desvio;
    const texto = f.join(sep === "\t" ? " · " : sep + " ");
    const numero = f[0]?.trim() ?? "";

    if (numero === "") {
      base.errores.push({ linea, texto, motivo: "Falta el número de punto." });
      continue;
    }
    if (f.length !== mapeo.largo) {
      base.errores.push({
        linea,
        texto,
        motivo: `Se esperaban ${mapeo.largo} columnas y hay ${f.length}.`,
      });
      continue;
    }
    const norte = parseNumero(f[mapeo.n]);
    const este = parseNumero(f[mapeo.e]);
    if (norte === null) {
      base.errores.push({ linea, texto, motivo: `Norte «${f[mapeo.n]}» no es un número.` });
      continue;
    }
    if (este === null) {
      base.errores.push({ linea, texto, motivo: `Este «${f[mapeo.e]}» no es un número.` });
      continue;
    }
    let elevacion: number | null = null;
    if (mapeo.z !== null && !esVacio(f[mapeo.z])) {
      elevacion = parseNumero(f[mapeo.z]);
      if (elevacion === null) {
        base.errores.push({ linea, texto, motivo: `Elevación «${f[mapeo.z]}» no es un número.` });
        continue;
      }
    }
    const descripcion = mapeo.d !== null ? f[mapeo.d]?.trim() || undefined : undefined;

    if (tomados.has(numero)) {
      base.omitidos.push({
        linea,
        texto: `${numero} — ${descripcion ?? ""}`.trim(),
        motivo: delProyecto.has(numero)
          ? "El número ya está en el proyecto; se omitió para no pisarlo (edítelo desde la tabla)."
          : "Número repetido dentro del archivo; se conservó la primera ocurrencia.",
      });
      continue;
    }
    tomados.add(numero);
    base.importados.push({ numero, descripcion, norte, este, elevacion });
  }

  return base;
}
