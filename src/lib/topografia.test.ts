import { describe, expect, test } from "bun:test";
import {
  areaPoligonal,
  formatearRumboDMS,
  inverso,
  parseRumbo,
  tr,
  type Coordenada,
} from "./topografia";

describe("parseRumbo — rumbo crudo flexible", () => {
  test("DD.MM + cuadrante pegado (30.04SE = 30°04' SE)", () => {
    const r = parseRumbo("30.04SE");
    expect(r.cuadrante).toBe("SE");
    expect(r.decimal).toBeCloseTo(30 + 4 / 60, 10);
  });

  test("solo grados + cuadrante minúsculo (90nw = N90°W)", () => {
    const r = parseRumbo("90nw");
    expect(r.cuadrante).toBe("NW");
    expect(r.decimal).toBe(90);
  });

  test("cero con cuadrante (0ne)", () => {
    const r = parseRumbo("0ne");
    expect(r.cuadrante).toBe("NE");
    expect(r.decimal).toBe(0);
  });

  test("DMS con símbolos y espacios", () => {
    const r = parseRumbo('S 30°04\'00.0" E');
    expect(r.cuadrante).toBe("SE");
    expect(r.decimal).toBeCloseTo(30 + 4 / 60, 10);
  });

  test("DMS con letras 30d04m + S/E separados", () => {
    expect(parseRumbo("S30d04mE").decimal).toBeCloseTo(30 + 4 / 60, 10);
    expect(parseRumbo("s 30 04 e").decimal).toBeCloseTo(30 + 4 / 60, 10);
  });

  test("O acepta como Oeste", () => {
    expect(parseRumbo("S 45 SO").cuadrante).toBe("SW");
  });

  test("DD.MMSS", () => {
    const r = parseRumbo("30.0430SE");
    expect(r.decimal).toBeCloseTo(30 + 4 / 60 + 30 / 3600, 10);
  });

  test("rechaza ángulos fuera de cuadrante y basura", () => {
    expect(() => parseRumbo("120NE")).toThrow();
    expect(() => parseRumbo("")).toThrow();
    expect(() => parseRumbo("NE")).toThrow();
    expect(() => parseRumbo("S30")).toThrow(); // falta E/W
    expect(() => parseRumbo("45.50445NE")).toThrow(); // fracción ambigua
  });
});

describe("formatearRumboDMS", () => {
  test("ida y vuelta", () => {
    expect(formatearRumboDMS(parseRumbo("30.04SE"))).toBe("S 30°04'00\" E");
    expect(formatearRumboDMS(parseRumbo("90nw"))).toBe("N 90°00'00\" W");
  });
});

describe("tr — fixture real: primer lado del lazo del 2023", () => {
  test('"30.04SE" desde (0,0,0) con 37.24 m → (-32.22910, 18.65751)', () => {
    const base: Coordenada = { norte: 0, este: 0, elevacion: 0 };
    const p2 = tr(base, "30.04SE", 37.24);
    expect(p2.norte).toBeCloseTo(-32.2291, 5);
    expect(p2.este).toBeCloseTo(18.65751, 5);
    expect(p2.elevacion).toBe(0);
  });

  test("con ΔElevación sube la cota; sin ΔElevación la conserva", () => {
    const base: Coordenada = { norte: 100, este: 200, elevacion: 5 };
    expect(tr(base, "0ne", 10, 1.5).elevacion).toBeCloseTo(6.5, 10);
    expect(tr(base, "0ne", 10).elevacion).toBe(5);
    expect(tr(base, "0ne", 10).norte).toBeCloseTo(110, 10);
  });

  test("rechaza distancias inválidas", () => {
    expect(() => tr({ norte: 0, este: 0 }, "30.04SE", 0)).toThrow();
    expect(() => tr({ norte: 0, este: 0 }, "30.04SE", NaN)).toThrow();
  });
});

describe("inverso — fixture real (8.182,62.891,35.01)→(40.468,49.619,36.21)", () => {
  const a: Coordenada = { norte: 8.182, este: 62.891, elevacion: 35.01 };
  const b: Coordenada = { norte: 40.468, este: 49.619, elevacion: 36.21 };
  const res = inverso(a, b);

  test("rumbo N 22°20'47\" W y distancia 34.91, Δelev 1.20", () => {
    expect(res.rumbo.cuadrante).toBe("NW");
    expect(res.rumboTexto).toBe('N 22°20\'47" W');
    expect(res.distancia).toBeCloseTo(34.91, 2);
    expect(res.dElev).toBeCloseTo(1.2, 6);
  });

  test("recíproco: S…E con los mismos segundos", () => {
    expect(inverso(b, a).rumboTexto).toBe('S 22°20\'47" E');
  });

  test("sin elevaciones → dElev null; punto idéntico lanza", () => {
    expect(inverso({ norte: 0, este: 0 }, { norte: 1, este: 1 }).dElev).toBeNull();
    expect(() => inverso(a, a)).toThrow();
  });
});

describe("areaPoligonal — lazo RICARDO (puntos 1..5 de 2023, real)", () => {
  // Datos reales extraídos de RICARDO.ASC (job 2023 del usuario).
  const ricardo: Coordenada[] = [
    { norte: 0.0, este: 0.0 },
    { norte: -32.2291, este: 18.65751 },
    { norte: -2.10875, este: 24.99572 },
    { norte: -0.41256, este: 50.99044 },
    { norte: 20.46135, este: 29.73663 },
  ];

  test("959.5302 m² y conversiones ft²/ac coherentes", () => {
    const { m2, ha, ft2, ac, perimetro } = areaPoligonal(ricardo);
    expect(m2).toBeCloseTo(959.5302, 3);
    expect(ha).toBeCloseTo(0.0959530, 7);
    expect(ft2).toBeCloseTo(10328.3, 1);
    expect(ac).toBeCloseTo(0.237105, 5);
    expect(perimetro).toBeGreaterThan(0);
  });

  test("orden inverso da la misma área (absoluto)", () => {
    expect(areaPoligonal([...ricardo].reverse()).m2).toBeCloseTo(959.5302, 3);
  });

  test("requiere 3+ vértices", () => {
    expect(() => areaPoligonal([{ norte: 0, este: 0 }])).toThrow();
  });
});
