/**
 * Genera el PNG maestro del icono (1024×1024 RGBA) sin dependencias:
 * cuadrado redondeado verde profundo con "▲" claro. Usar luego:
 *   bun run scripts/generar-icono.ts && bun run tauri icon scripts/app-icon.png
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const T = 1024;
const FONDO: [number, number, number] = [13, 125, 107]; // --color-accent
const MARK: [number, number, number] = [255, 253, 251]; // --color-surface
const RADIO = T * 0.22;
// triángulo ▲ equilibrado visualmente
const V: [number, number][] = [
  [512, 236],
  [848, 806],
  [176, 806],
];

function enCuadradoRedondeado(x: number, y: number): boolean {
  const cx = Math.max(RADIO, Math.min(T - RADIO, x));
  const cy = Math.max(RADIO, Math.min(T - RADIO, y));
  return (x - cx) ** 2 + (y - cy) ** 2 <= RADIO ** 2;
}

function area2(x: number, y: number, p: [number, number], q: [number, number]): number {
  return (q[0] - p[0]) * (y - p[1]) - (x - p[0]) * (q[1] - p[1]);
}

function dentroDelTriangulo(x: number, y: number): boolean {
  const [a, b, c] = V;
  const s1 = area2(x, y, a, b);
  const s2 = area2(x, y, b, c);
  const s3 = area2(x, y, c, a);
  const neg = s1 < 0 || s2 < 0 || s3 < 0;
  const pos = s1 > 0 || s2 > 0 || s3 > 0;
  return !(neg && pos);
}

const raw = new Uint8Array((1 + T * 4) * T);
for (let y = 0; y < T; y++) {
  const fila = y * (1 + T * 4);
  raw[fila] = 0; // filtro de línea: none
  for (let x = 0; x < T; x++) {
    const i = fila + 1 + x * 4;
    const adentro = enCuadradoRedondeado(x + 0.5, y + 0.5);
    const marca = adentro && dentroDelTriangulo(x + 0.5, y + 0.5);
    const [r, g, b] = adentro ? (marca ? MARK : FONDO) : [0, 0, 0];
    raw[i] = r;
    raw[i + 1] = g;
    raw[i + 2] = b;
    raw[i + 3] = adentro ? 255 : 0;
  }
}

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(tipo: string, datos: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + datos.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, datos.length);
  out.set(new TextEncoder().encode(tipo), 4);
  out.set(datos, 8);
  dv.setUint32(8 + datos.length, crc32(out.subarray(4, 8 + datos.length)));
  return out;
}

const ihdr = new Uint8Array(13);
const di = new DataView(ihdr.buffer);
di.setUint32(0, T);
di.setUint32(4, T);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA

const salida = Buffer.concat([
  new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", new Uint8Array(0)),
]);
writeFileSync(new URL("./app-icon.png", import.meta.url), salida);
console.log("scripts/app-icon.png generado (1024×1024 RGBA)");
