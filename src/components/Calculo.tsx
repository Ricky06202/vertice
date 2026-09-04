import { useMemo, useState, type ReactNode } from "react";
import type { Modo } from "../App";
import { useJobs } from "../state/JobsContext";
import type { LogTipo, Punto } from "../types";
import { buscarPunto, punteroTras, siguienteNumero } from "../lib/puntos";
import { areaPoligonal, inverso, parseRumbo, tr, formatearRumboDMS } from "../lib/topografia";

const num = (texto: string): number | null => {
  const limpio = texto.trim().replace(/\s/g, "").replace(",", ".");
  if (limpio === "") return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
};

type Props = { modo: Modo };

function Aviso({ children }: { children: string }) {
  return (
    <p role="alert" className="text-base font-semibold text-red-700">
      {children}
    </p>
  );
}

function Resultado({ children }: { children: ReactNode }) {
  return (
    <output className="block rounded-xl bg-accent-soft px-4 py-3 text-lg text-accent-strong">
      {children}
    </output>
  );
}

function SelectorPunto({
  etiqueta,
  valor,
  onChange,
  puntos,
  permitVacio = false,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  puntos: Punto[];
  permitVacio?: boolean;
}) {
  return (
    <label className="grid flex-1 gap-1.5">
      <span className="text-base font-semibold">{etiqueta}</span>
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-12 rounded-xl border border-line bg-surface px-3 text-lg"
      >
        {permitVacio ? <option value="">— ninguno —</option> : <option value="" disabled>seleccione…</option>}
        {puntos.map((p) => (
          <option key={p.numero} value={p.numero}>
            {p.numero}
            {p.descripcion ? ` — ${p.descripcion}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function Calculo({ modo }: Props) {
  const { estado, actualizarProyecto } = useJobs();
  const { puntos, config } = estado.proyecto;
  const gt = buscarPunto(puntos, estado.proyecto.puntoActual);

  const f = (v: number, dec: number) => v.toFixed(dec).replace(".", config.separador);

  function registrar(tipo: LogTipo, texto: string, extra?: Partial<import("../types").Proyecto>) {
    actualizarProyecto({
      ...estado.proyecto,
      ...extra,
      log: [...estado.proyecto.log, { ts: new Date().toISOString(), tipo, texto }],
    });
  }

  /* ---------------- GT ---------------- */
  const [gtSel, setGtSel] = useState<string>(gt?.numero ?? "");
  const [gtErr, setGtErr] = useState("");
  function fijarGt() {
    if (!gtSel) return setGtErr("Seleccione un punto.");
    setGtErr("");
    actualizarProyecto({ ...estado.proyecto, puntoActual: gtSel });
  }
  const gtOpciones = useMemo(() => puntos, [puntos]);

  /* ---------------- TR ---------------- */
  const [base, setBase] = useState<string>(gt?.numero ?? "");
  const [rumbo, setRumbo] = useState("");
  const [distancia, setDistancia] = useState("");
  const [dElev, setDElev] = useState("");
  const [trErr, setTrErr] = useState("");
  const [trRes, setTrRes] = useState<{ nuevo: Punto; rumboTexto: string } | null>(null);
  const [lineaRapida, setLineaRapida] = useState("");

  function calcularTr(textoRumbo: string, textoDist: string, textoDElev: string) {
    const pBase = buscarPunto(puntos, base);
    if (!pBase) return setTrErr("Seleccione el punto base.");
    const d = num(textoDist);
    if (d === null || d <= 0) return setTrErr("Distancia: escriba un número mayor que cero.");
    let de: number | null = null;
    if (textoDElev.trim() !== "") {
      de = num(textoDElev);
      if (de === null) return setTrErr("ΔElevación debe ser un número o quedar vacía.");
    }
    try {
      const r = parseRumbo(textoRumbo);
      const c = tr(pBase, r, d, de);
      const numero = siguienteNumero(puntos, config);
      setTrErr("");
      setTrRes({
        rumboTexto: formatearRumboDMS(r),
        nuevo: {
          numero,
          descripcion: config.descDefault || undefined,
          norte: c.norte,
          este: c.este,
          elevacion: c.elevacion ?? null,
        },
      });
    } catch (e) {
      setTrErr(e instanceof Error ? e.message : "Rumbo no entendido.");
    }
  }

  function aprobarTr() {
    if (!trRes) return;
    const { nuevo } = trRes;
    const zTxt = nuevo.elevacion != null ? ` Z ${f(nuevo.elevacion, config.decimalesElev)}` : "";
    setTrErr("");
    actualizarProyecto({
      ...estado.proyecto,
      puntos: [...puntos, nuevo],
      config: { ...config, ...punteroTras(nuevo.numero, config) },
      puntoActual: nuevo.numero,
      log: [
        ...estado.proyecto.log,
        {
          ts: new Date().toISOString(),
          tipo: "tr",
          texto: `TR ${base} → ${nuevo.numero} · rumbo ${trRes.rumboTexto} · dist ${f(
            Math.hypot(nuevo.norte - (buscarPunto(puntos, base)?.norte ?? 0), nuevo.este - (buscarPunto(puntos, base)?.este ?? 0)),
            3,
          )}${zTxt} · N ${f(nuevo.norte, config.decimalesNE)}, E ${f(nuevo.este, config.decimalesNE)}`,
        },
      ],
    });
    setTrRes(null);
    setRumbo("");
    setDistancia("");
    setDElev("");
    setLineaRapida("");
  }

  function lineaRapidaTr() {
    // TR  <rumbo> <dist> [Δelev]   — el rumbo es el token con letras (ej. 30.04SE)
    const m = lineaRapida.trim().match(/^TR\s+(\S+)\s+(\S+)(?:\s+(\S+))?\s*$/i);
    if (!m) return setTrErr("Formato: TR <rumbo> <distancia> [Δelev]. Ej.: TR 30.04SE 37.24 1.5");
    calcularTr(m[1], m[2], m[3] ?? "");
  }

  /* ---------------- IN ---------------- */
  const [puntoA, setPuntoA] = useState<string>(gt?.numero ?? "");
  const [puntoB, setPuntoB] = useState("");
  const [inErr, setInErr] = useState("");
  const [inRes, setInRes] = useState<string | null>(null);
  const [lineaIn, setLineaIn] = useState("");

  function calcularIn(a: string, b: string, registrarEnLog: boolean) {
    const pa = buscarPunto(puntos, a);
    const pb = buscarPunto(puntos, b);
    if (!pa || !pb) return setInErr("Elija dos puntos existentes.");
    try {
      const r = inverso(pa, pb);
      setInErr("");
      const texto = `IN ${a} → ${b} · rumbo ${r.rumboTexto} · distancia ${f(r.distancia, 3)}${
        r.dElev != null ? ` · Δelev ${f(r.dElev, config.decimalesElev)}` : ""
      }`;
      setInRes(texto);
      if (registrarEnLog) registrar("in", texto);
    } catch (e) {
      setInErr(e instanceof Error ? e.message : "No se pudo calcular el inverso.");
    }
  }

  /* ---------------- Área ---------------- */
  const [lazo, setLazo] = useState<string[]>([]);
  const [candidato, setCandidato] = useState("");
  const [areaErr, setAreaErr] = useState("");
  const [areaRes, setAreaRes] = useState<string | null>(null);

  function mover(i: number, dir: -1 | 1) {
    setLazo((l) => {
      const n = [...l];
      const j = i + dir;
      if (j < 0 || j >= n.length) return l;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  }

  function calcularArea() {
    const coords = lazo.map((n) => buscarPunto(puntos, n)).filter((p): p is Punto => Boolean(p));
    try {
      const r = areaPoligonal(coords);
      setAreaErr("");
      const texto = `Área lazo ${lazo.join("–")} · ${f(r.m2, 2)} m² = ${f(r.ha, 4)} ha · ${f(r.ft2, 2)} ft² = ${f(r.ac, 4)} ac · perímetro ${f(r.perimetro, 2)} m`;
      setAreaRes(texto);
      registrar("area", texto);
    } catch (e) {
      setAreaErr(e instanceof Error ? e.message : "No se pudo calcular el área.");
    }
  }

  if (puntos.length === 0) {
    return (
      <div className="card grid place-items-center gap-3 py-14 text-center">
        <span aria-hidden="true" className="grid size-16 place-items-center rounded-full bg-accent-soft text-3xl font-black text-accent-strong">
          ⊕
        </span>
        <p className="text-xl font-bold">Primero cargue puntos</p>
        <p className="max-w-md text-lg text-ink-soft">
          Vaya a la pestaña <strong>Puntos</strong> y agregue o importe sus puntos;
          luego podrá calcular TR, inversos y áreas aquí.
        </p>
      </div>
    );
  }

  const entrada = "min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-lg";

  return (
    <div className="grid gap-6">
      <p className="text-lg text-ink-soft" role="status">
        Punto actual (GT):{" "}
        <strong className="text-accent-strong">
          {gt ? `${gt.numero}${gt.descripcion ? ` — ${gt.descripcion}` : ""}` : "ninguno"}
        </strong>
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ------ GT / punto actual ------ */}
        <section className="card grid h-fit gap-3" aria-label="Punto actual (GT)">
          <h3 className="text-xl font-bold">
            Punto actual — GT{" "}
            {modo === "avanzado" && (
              <code className="rounded-md bg-canvas px-2 py-0.5 text-base font-mono text-accent-strong">GT</code>
            )}
          </h3>
          <p className="text-base text-ink-soft">
            Es el punto desde el que se trabaja: base por defecto del TR y del punto A del inverso.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <SelectorPunto etiqueta="Designar como actual" valor={gtSel} onChange={setGtSel} puntos={gtOpciones} />
            <button type="button" className="btn btn-primary" onClick={fijarGt}>
              Fijar
            </button>
          </div>
          {gtErr && <Aviso>{gtErr}</Aviso>}
        </section>

        {/* ------ IN ------ */}
        <section className="card grid h-fit gap-3" aria-label="Inverso (IN)">
          <h3 className="text-xl font-bold">
            Inverso{" "}
            {modo === "avanzado" && (
              <code className="rounded-md bg-canvas px-2 py-0.5 text-base font-mono text-accent-strong">IN</code>
            )}
          </h3>
          <p className="text-base text-ink-soft">
            Compruebe dirección y distancia entre dos puntos ya conocidos.
          </p>
          {modo === "avanzado" && (
            <label className="grid gap-1.5">
              <span className="text-base font-semibold">Tipeo rápido (Avanzado)</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={lineaIn}
                  onChange={(e) => setLineaIn(e.target.value)}
                  placeholder="IN 1 2"
                  className={`${entrada} font-mono`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const m = lineaIn.trim().match(/^IN\s+(\S+)\s+(\S+)$/i);
                      if (m) calcularIn(m[1], m[2], true);
                      else setInErr('Formato: IN <puntoA> <puntoB>');
                    }
                  }}
                />
              </div>
            </label>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <SelectorPunto etiqueta="Punto A" valor={puntoA} onChange={setPuntoA} puntos={puntos} />
            <SelectorPunto etiqueta="Punto B" valor={puntoB} onChange={setPuntoB} puntos={puntos} permitVacio />
            <button type="button" className="btn btn-primary" onClick={() => calcularIn(puntoA, puntoB, true)}>
              Calcular
            </button>
          </div>
          {inErr && <Aviso>{inErr}</Aviso>}
          {inRes && <Resultado>{inRes} · <span className="font-semibold">quedó en el Registro</span></Resultado>}
        </section>

        {/* ------ TR ------ */}
        <section className="card grid h-fit gap-3" aria-label="Estación por rumbo (TR)">
          <h3 className="text-xl font-bold">
            Estación nueva por rumbo{" "}
            {modo === "avanzado" && (
              <code className="rounded-md bg-canvas px-2 py-0.5 text-base font-mono text-accent-strong">TR</code>
            )}
          </h3>
          <p className="text-base text-ink-soft">
            Desde el punto base, avance con rumbo (p. ej. «30.04SE») y distancia. El nuevo
            punto toma el número siguiente y pasa a ser el punto actual.
          </p>
          {modo === "avanzado" && (
            <label className="grid gap-1.5">
              <span className="text-base font-semibold">Tipeo rápido (Avanzado)</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={lineaRapida}
                  onChange={(e) => setLineaRapida(e.target.value)}
                  placeholder="TR 30.04SE 37.24 1.5"
                  className={`${entrada} font-mono`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") lineaRapidaTr();
                  }}
                />
                <button type="button" className="btn btn-secondary" onClick={lineaRapidaTr}>
                  Ir
                </button>
              </div>
            </label>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectorPunto etiqueta="Punto base" valor={base} onChange={setBase} puntos={puntos} />
            <label className="grid gap-1.5">
              <span className="text-base font-semibold">Rumbo (acepta 30.04SE, S30°04'E…)</span>
              <input type="text" value={rumbo} onChange={(e) => setRumbo(e.target.value)} placeholder="30.04SE" className={entrada} />
            </label>
            <label className="grid gap-1.5">
              <span className="text-base font-semibold">Distancia horizontal</span>
              <input type="text" inputMode="decimal" value={distancia} onChange={(e) => setDistancia(e.target.value)} className={entrada} />
            </label>
            <label className="grid gap-1.5">
              <span className="text-base font-semibold">ΔElevación (opcional)</span>
              <input type="text" inputMode="decimal" value={dElev} onChange={(e) => setDElev(e.target.value)} className={entrada} />
            </label>
          </div>
          {trErr && <Aviso>{trErr}</Aviso>}
          {trRes ? (
            <div className="grid gap-3">
              <Resultado>
                Nuevo punto {trRes.nuevo.numero}: N {f(trRes.nuevo.norte, config.decimalesNE)} · E{" "}
                {f(trRes.nuevo.este, config.decimalesNE)}
                {trRes.nuevo.elevacion != null ? ` · Z ${f(trRes.nuevo.elevacion, config.decimalesElev)}` : ""} · rumbo {trRes.rumboTexto}
              </Resultado>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn btn-primary" onClick={aprobarTr}>
                  Agregar punto {trRes.nuevo.numero}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setTrRes(null)}>
                  Descartar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary justify-self-start"
              onClick={() => calcularTr(rumbo, distancia, dElev)}
            >
              Calcular TR
            </button>
          )}
        </section>

        {/* ------ Área ------ */}
        <section className="card grid h-fit gap-3" aria-label="Área de poligonal">
          <h3 className="text-xl font-bold">Área de poligonal cerrada</h3>
          <p className="text-base text-ink-soft">
            Arme el lazo en el orden en que se recorre; el último se cierra contra el primero.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <SelectorPunto etiqueta="Agregar vértice" valor={candidato} onChange={setCandidato} puntos={puntos} permitVacio />
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!candidato || lazo.includes(candidato)}
              onClick={() => {
                if (candidato) setLazo((l) => [...l, candidato]);
                setCandidato("");
              }}
            >
              Agregar
            </button>
          </div>
          {lazo.length > 0 && (
            <ol className="grid gap-2" aria-label="Vértices del lazo en orden">
              {lazo.map((n, i) => (
                <li key={n} className="flex min-h-12 items-center gap-2 rounded-xl border border-line bg-canvas px-4 text-lg">
                  <span className="inline-block w-8 shrink-0 text-base font-bold text-ink-soft">{i + 1}</span>
                  <span className="font-bold">{n}</span>
                  <span className="text-base text-ink-soft">
                    N {f(buscarPunto(puntos, n)?.norte ?? 0, config.decimalesNE)} · E {f(buscarPunto(puntos, n)?.este ?? 0, config.decimalesNE)}
                  </span>
                  <button type="button" className="ml-auto cursor-pointer rounded-lg px-2 font-bold text-accent-strong hover:bg-accent-soft disabled:opacity-30" disabled={i === 0} onClick={() => mover(i, -1)} aria-label={`Subir vértice ${n}`}>
                    ▲
                  </button>
                  <button type="button" className="cursor-pointer rounded-lg px-2 font-bold text-accent-strong hover:bg-accent-soft disabled:opacity-30" disabled={i === lazo.length - 1} onClick={() => mover(i, +1)} aria-label={`Bajar vértice ${n}`}>
                    ▼
                  </button>
                  <button type="button" className="cursor-pointer rounded-lg px-2 font-bold text-red-700 hover:bg-red-50" onClick={() => setLazo((l) => l.filter((x) => x !== n))} aria-label={`Quitar vértice ${n}`}>
                    ✕
                  </button>
                </li>
              ))}
            </ol>
          )}
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary" disabled={lazo.length < 3} onClick={calcularArea}>
              Calcular área
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => { setLazo([]); setAreaRes(null); setAreaErr(""); }}>
              Vaciar lazo
            </button>
          </div>
          <p className="text-base text-ink-soft">
            {lazo.length < 3 ? `Agregue al menos 3 vértices (lleva ${lazo.length}).` : `Lazo con ${lazo.length} vértices listo para calcular.`}
          </p>
          {areaErr && <Aviso>{areaErr}</Aviso>}
          {areaRes && <Resultado>{areaRes} · <span className="font-semibold">quedó en el Registro</span></Resultado>}
        </section>
      </div>
    </div>
  );
}

export default Calculo;
