import { useMemo, useState } from "react";
import { useJobs } from "../state/JobsContext";
import { buscarPunto } from "../lib/puntos";
import { exportarInformeTxt, fechaInforme } from "../storage/informes";
import { fechaHora } from "../storage/registro";
import { aplicarZoom } from "../state/zoom";
import { guardarPreferencias, leerPreferencias } from "../state/preferencias";

type Alcance = "todos" | "rango";

function parseEntero(texto: string): number | null {
  const n = Number(texto.trim());
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function Informes() {
  const { estado } = useJobs();
  const { proyecto } = estado;
  const { puntos, config } = proyecto;

  const [alcance, setAlcance] = useState<Alcance>("todos");
  const [de, setDe] = useState("");
  const [hasta, setHasta] = useState("");
  const [aviso, setAviso] = useState("");

  const del = parseEntero(de);
  const fin = parseEntero(hasta);
  const rangoValido = del !== null && fin !== null && del <= fin;

  const listado = useMemo(() => {
    if (alcance !== "rango" || !rangoValido) return puntos;
    return puntos.filter((p) => {
      const n = Number(p.numero);
      return Number.isFinite(n) && n >= del! && n <= fin!;
    });
  }, [alcance, rangoValido, del, fin, puntos]);

  const areas = useMemo(
    () => proyecto.log.filter((e) => e.tipo === "area"),
    [proyecto.log],
  );

  const fmt = (v: number, dec: number) => v.toFixed(dec).replace(".", config.separador);
  const etiquetas = {
    inicio: alcance === "rango" && rangoValido ? String(del) : undefined,
    fin: alcance === "rango" && rangoValido ? String(fin) : undefined,
  };

  return (
    <div className="grid gap-6">
      {/* Controles: no se imprimen */}
      <section className="card flex flex-wrap items-end gap-4 print:hidden" aria-label="Opciones del informe">
        <fieldset className="grid gap-1.5">
          <legend className="text-base font-semibold">Qué incluir</legend>
          <div className="flex gap-2">
            {(
              [
                ["todos", `Todos (${puntos.length})`],
                ["rango", "Por rango"],
              ] as const
            ).map(([v, l]) => (
              <label
                key={v}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-lg font-semibold ${
                  alcance === v ? "border-accent bg-accent-soft text-accent-strong" : "border-line bg-surface text-ink-soft hover:bg-accent-soft/50"
                }`}
              >
                <input
                  type="radio"
                  name="alcance-informe"
                  className="size-5 accent-accent"
                  checked={alcance === v}
                  onChange={() => setAlcance(v)}
                />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        {alcance === "rango" && (
          <div className="flex items-end gap-2">
            <label className="grid gap-1.5">
              <span className="text-base font-semibold">Del nº</span>
              <input type="text" inputMode="numeric" value={de} onChange={(e) => setDe(e.target.value)} className="min-h-12 w-24 rounded-xl border border-line bg-surface px-3 text-lg" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-base font-semibold">Hasta nº</span>
              <input type="text" inputMode="numeric" value={hasta} onChange={(e) => setHasta(e.target.value)} className="min-h-12 w-24 rounded-xl border border-line bg-surface px-3 text-lg" />
            </label>
            {!rangoValido && (de || hasta) && (
              <span role="alert" className="self-center text-base font-semibold text-red-700">
                Rango inválido.
              </span>
            )}
          </div>
        )}
        <div className="ml-auto flex flex-wrap gap-3">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={listado.length === 0}
            onClick={() => {
              // el zoom nativo del webview también entraría en el papel:
              // imprimimos a 100 % y restauramos seguido
              const previo = leerPreferencias().textoPantalla;
              guardarPreferencias({ textoPantalla: 1 });
              void aplicarZoom().then(() => {
                window.print();
                setTimeout(() => {
                  guardarPreferencias({ textoPantalla: previo });
                  void aplicarZoom();
                }, 1500);
              });
            }}
          >
            Imprimir
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={listado.length === 0}
            onClick={async () => {
              const ruta = await exportarInformeTxt(proyecto, listado, etiquetas);
              setAviso(ruta ? `Informe de ${listado.length} puntos exportado.` : "Exportación cancelada.");
            }}
          >
            Exportar .txt
          </button>
        </div>
        {aviso && (
          <p className="w-full text-base text-ink-soft" role="status">
            {aviso}
          </p>
        )}
      </section>

      {/* El papel del informe */}
      <article className="card mx-auto w-full max-w-4xl grid gap-6 bg-white print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="grid gap-1 border-b-2 border-ink pb-4 text-center">
          <h2 className="text-3xl font-black tracking-tight">Listado de coordenadas</h2>
          <p className="text-xl">
            Proyecto: <strong>{proyecto.titulo}</strong>
          </p>
          <p className="text-lg text-ink-soft">
            {fechaInforme(new Date().toISOString())}
            {etiquetas.inicio && etiquetas.fin ? ` · rango ${etiquetas.inicio}–${etiquetas.fin}` : " · todos los puntos"} · generado con Vértice
          </p>
        </header>

        <div className="overflow-x-auto rounded-xl border border-line print:border-0">
          <table className="w-full border-collapse text-lg tabular-nums">
            <caption className="sr-only">Coordenadas de los puntos del proyecto</caption>
            <thead className="bg-canvas text-left text-base uppercase tracking-wide text-ink-soft print:bg-transparent">
              <tr>
                {["N°", "Descripción", "Norte", "Este", "Elevación"].map((h) => (
                  <th key={h} scope="col" className={`px-4 py-2.5 font-bold ${h === "Norte" || h === "Este" || h === "Elevación" ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listado.map((p, i) => (
                <tr key={p.numero} className={`border-t border-line ${i % 2 ? "bg-canvas/60 print:bg-transparent" : ""}`}>
                  <td className="px-4 py-2 font-bold">{p.numero}</td>
                  <td className="px-4 py-2">{p.descripcion ?? ""}</td>
                  <td className="px-4 py-2 text-right">{fmt(p.norte, config.decimalesNE)}</td>
                  <td className="px-4 py-2 text-right">{fmt(p.este, config.decimalesNE)}</td>
                  <td className="px-4 py-2 text-right">{p.elevacion == null ? "—" : fmt(p.elevacion, config.decimalesElev)}</td>
                </tr>
              ))}
              {listado.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-ink-soft">
                    {puntos.length === 0
                      ? "El proyecto todavía no tiene puntos."
                      : "El rango indicado no contiene puntos."}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink text-base font-bold">
                <td colSpan={5} className="px-4 py-2">
                  {listado.length} punto(s)
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {areas.length > 0 && (
          <section className="grid gap-2">
            <h3 className="text-xl font-bold">Resumen de áreas</h3>
            <ul className="grid gap-1.5 text-lg">
              {areas.map((a, i) => (
                <li key={`${a.ts}-${i}`} className="flex gap-3">
                  <span className="shrink-0 font-mono text-base text-ink-soft">{fechaHora(a.ts).hora}</span>
                  <span>{a.texto}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-base text-ink-soft print:text-sm">
          Vértice — programa libre de topografía (GPL-3.0-or-later). {buscarPunto(puntos, proyecto.puntoActual) ? `Punto actual: ${proyecto.puntoActual}.` : ""}
        </p>
      </article>
    </div>
  );
}

export default Informes;
