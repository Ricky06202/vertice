import { useMemo, useState } from "react";
import { useJobs } from "../state/JobsContext";
import type { Punto } from "../types";

type Formulario = {
  numero: string;
  descripcion: string;
  norte: string;
  este: string;
  elevacion: string;
};

const FORM_VACIO: Formulario = { numero: "", descripcion: "", norte: "", este: "", elevacion: "" };

/** Acepta "1234,567", "1 234.5" o punto decimal. null si no es número. */
function parseNumero(texto: string): number | null {
  const limpio = texto.trim().replace(/\s/g, "").replace(",", ".");
  if (limpio === "") return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

function esEnteroPosible(texto: string): number | null {
  const n = parseNumero(texto);
  if (n === null || !Number.isInteger(n) || n < 0) return null;
  return n;
}

function formatea(v: number, dec: number, sep: string): string {
  return v.toFixed(dec).replace(".", sep);
}

function siguienteNumeroDe(puntos: Punto[], puntado?: number): string {
  if (puntado !== undefined && Number.isInteger(puntado) && puntado >= 0) return String(puntado);
  const max = puntos.reduce((acc, p) => {
    const n = Number(p.numero);
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return String(max + 1);
}

function Puntos() {
  const { estado, actualizarProyecto } = useJobs();
  const { puntos, config } = estado.proyecto;

  const [busqueda, setBusqueda] = useState("");
  const [rango, setRango] = useState<{ de: number; hasta: number } | null>(null);
  const [rangoEntrada, setRangoEntrada] = useState({ de: "", hasta: "" });
  const [editando, setEditando] = useState<string | null>(null); // número del punto en edición
  const [form, setForm] = useState<Formulario>(FORM_VACIO);
  const [errores, setErrores] = useState<Partial<Record<keyof Formulario, string>>>({});
  const [confirmLimpiar, setConfirmLimpiar] = useState(false);
  const [reanudarDesde, setReanudarDesde] = useState("");

  const visibles = useMemo(() => {
    let l = puntos;
    if (rango) l = l.filter((p) => {
      const n = Number(p.numero);
      return Number.isFinite(n) && n >= rango.de && n <= rango.hasta;
    });
    if (busqueda.trim() !== "") l = l.filter((p) => p.numero.includes(busqueda.trim()));
    return l;
  }, [puntos, rango, busqueda]);

  function escribirProyecto(con: Punto[], configExtra?: Partial<typeof config>) {
    actualizarProyecto({
      ...estado.proyecto,
      puntos: con,
      config: { ...config, ...configExtra },
    });
  }

  function validar(f: Formulario, ignorandoNumero?: string): Partial<Record<keyof Formulario, string>> {
    const e: Partial<Record<keyof Formulario, string>> = {};
    if (f.numero.trim() === "") e.numero = "Ponga un número de punto.";
    else if (puntos.some((p) => p.numero === f.numero.trim() && p.numero !== ignorandoNumero))
      e.numero = `El punto ${f.numero.trim()} ya existe en el proyecto.`;
    if (parseNumero(f.norte) === null) e.norte = "Norte debe ser un número (p. ej. 1234,56).";
    if (parseNumero(f.este) === null) e.este = "Este debe ser un número (p. ej. 5678,90).";
    if (f.elevacion.trim() !== "" && parseNumero(f.elevacion) === null)
      e.elevacion = "Elevación debe ser un número o quedar vacía.";
    return e;
  }

  function comenzarNuevo() {
    setEditando(null);
    setErrores({});
    setForm({
      ...FORM_VACIO,
      numero: siguienteNumeroDe(puntos, config.numeroSiguiente),
      descripcion: config.descDefault,
    });
  }

  function comenzarEdicion(p: Punto) {
    setEditando(p.numero);
    setErrores({});
    setForm({
      numero: p.numero,
      descripcion: p.descripcion ?? "",
      norte: String(p.norte).replace(".", config.separador),
      este: String(p.este).replace(".", config.separador),
      elevacion: p.elevacion == null ? "" : String(p.elevacion).replace(".", config.separador),
    });
  }

  function guardarFormulario() {
    const e = validar(form, editando ?? undefined);
    setErrores(e);
    if (Object.keys(e).length > 0) return;
    const nuevo: Punto = {
      numero: form.numero.trim(),
      descripcion: form.descripcion.trim() || undefined,
      norte: parseNumero(form.norte)!,
      este: parseNumero(form.este)!,
      elevacion: form.elevacion.trim() === "" ? null : parseNumero(form.elevacion),
    };
    const con = editando
      ? puntos.map((p) => (p.numero === editando ? nuevo : p))
      : [...puntos, nuevo];
    // Si hay puntero de numeración, avanza tras cualquier captura manual nueva.
    const configExtra =
      !editando && config.numeroSiguiente !== undefined
        ? { numeroSiguiente: (Number(nuevo.numero) || config.numeroSiguiente + 1) + 1 }
        : undefined;
    escribirProyecto(con, configExtra);
    comenzarNuevo();
  }

  function eliminar() {
    if (!editando) return;
    escribirProyecto(puntos.filter((p) => p.numero !== editando));
    comenzarNuevo();
  }

  function listarRango() {
    const de = esEnteroPosible(rangoEntrada.de);
    const hasta = esEnteroPosible(rangoEntrada.hasta);
    if (de === null || hasta === null || de > hasta) return;
    setRango({ de, hasta });
  }

  function limpiarCoordenadasRango() {
    if (!rango) return;
    const con = puntos.map((p) => {
      const n = Number(p.numero);
      if (Number.isFinite(n) && n >= rango.de && n <= rango.hasta) {
        return { ...p, norte: 0, este: 0, elevacion: null };
      }
      return p;
    });
    escribirProyecto(con);
    setConfirmLimpiar(false);
  }

  function retomarNumeracion() {
    const desde = esEnteroPosible(reanudarDesde);
    if (desde === null) return;
    escribirProyecto(puntos, { numeroSiguiente: desde });
    setReanudarDesde("");
  }

  const campo = (nombre: keyof Formulario, etiqueta: string, opts: { tipoTexto?: boolean; opcional?: boolean } = {}) => (
    <label className="grid gap-1.5">
      <span className="text-base font-semibold">
        {etiqueta}
        {opts.opcional && <span className="ml-1 font-normal text-ink-soft">(opcional)</span>}
      </span>
      <input
        type="text"
        inputMode={opts.tipoTexto ? "text" : "decimal"}
        value={form[nombre]}
        aria-invalid={Boolean(errores[nombre])}
        aria-describedby={errores[nombre] ? `err-${nombre}` : undefined}
        onChange={(ev) => setForm((f) => ({ ...f, [nombre]: ev.target.value }))}
        className={`min-h-12 rounded-xl border px-4 text-lg ${
          errores[nombre] ? "border-red-500 bg-red-50" : "border-line bg-surface"
        }`}
      />
      {errores[nombre] && (
        <span id={`err-${nombre}`} role="alert" className="text-base text-red-700">
          {errores[nombre]}
        </span>
      )}
    </label>
  );

  return (
    <div className="grid gap-6">
      {/* Barra de búsqueda y listado */}
      <section className="card flex flex-wrap items-end gap-4">
        <label className="grid min-w-64 flex-1 gap-1.5">
          <span className="text-base font-semibold">Buscar por número</span>
          <input
            type="search"
            value={busqueda}
            placeholder="p. ej. 12 o 120…"
            onChange={(e) => setBusqueda(e.target.value)}
            className="min-h-12 rounded-xl border border-line bg-surface px-4 text-lg"
          />
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1.5">
            <span className="text-base font-semibold">Del nº</span>
            <input type="text" inputMode="numeric" value={rangoEntrada.de} onChange={(e) => setRangoEntrada((r) => ({ ...r, de: e.target.value }))} className="min-h-12 w-24 rounded-xl border border-line bg-surface px-3 text-lg" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-base font-semibold">Hasta nº</span>
            <input type="text" inputMode="numeric" value={rangoEntrada.hasta} onChange={(e) => setRangoEntrada((r) => ({ ...r, hasta: e.target.value }))} className="min-h-12 w-24 rounded-xl border border-line bg-surface px-3 text-lg" />
          </label>
          <button type="button" className="btn btn-secondary" onClick={listarRango}>
            Listar rango
          </button>
          {rango && (
            <button type="button" className="btn btn-secondary" onClick={() => setRango(null)}>
              Mostrar todos
            </button>
          )}
        </div>
        <p className="w-full text-base text-ink-soft" role="status">
          {puntos.length} punto{puntos.length === 1 ? "" : "s"} en el proyecto
          {rango && ` · listando rango ${rango.de}–${rango.hasta} (${visibles.length} resultado${visibles.length === 1 ? "" : "s"})`}
          {busqueda.trim() && ` · buscando «${busqueda.trim()}»`}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[24rem_1fr]">
        {/* Formulario */}
        <section className="card grid h-fit gap-4" aria-label="Agregar o editar punto">
          <h3 className="text-xl font-bold">{editando ? `Editar punto ${editando}` : "Agregar punto"}</h3>
          {campo("numero", "Número de punto")}
          {campo("descripcion", "Descripción", { tipoTexto: true, opcional: true })}
          {campo("norte", "Norte")}
          {campo("este", "Este")}
          {campo("elevacion", "Elevación", { opcional: true })}
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary" onClick={guardarFormulario}>
              {editando ? "Actualizar" : "Agregar"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={comenzarNuevo}>
              Limpiar
            </button>
            {editando && (
              <button
                type="button"
                className="btn min-h-12 cursor-pointer rounded-xl border border-red-300 bg-red-50 px-6 text-lg font-semibold text-red-700 hover:bg-red-100"
                onClick={eliminar}
              >
                Eliminar
              </button>
            )}
          </div>
        </section>

        <div className="grid gap-6">
          {/* Tabla */}
          <section className="card grid gap-3" aria-label="Lista de puntos">
            <div className="max-h-[26rem] overflow-y-auto rounded-xl border border-line">
              <table className="w-full border-collapse text-lg">
                <caption className="sr-only">Puntos del proyecto: número, descripción, norte, este y elevación</caption>
                <thead className="sticky top-0 bg-canvas text-left text-base uppercase tracking-wide text-ink-soft">
                  <tr>
                    {["Nº", "Descripción", "Norte", "Este", "Elevación", ""].map((h) => (
                      <th key={h} scope="col" className="px-3 py-2.5 font-bold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((p, i) => (
                    <tr
                      key={p.numero}
                      className={`border-t border-line ${i % 2 ? "bg-canvas/60" : ""} ${editando === p.numero ? "bg-accent-soft font-semibold" : ""}`}
                    >
                      <td className="px-3 py-2 font-bold">{p.numero}</td>
                      <td className="px-3 py-2">{p.descripcion ?? ""}</td>
                      <td className="px-3 py-2 tabular-nums">{formatea(p.norte, config.decimalesNE, config.separador)}</td>
                      <td className="px-3 py-2 tabular-nums">{formatea(p.este, config.decimalesNE, config.separador)}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {p.elevacion == null ? "—" : formatea(p.elevacion, config.decimalesElev, config.separador)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button type="button" className="cursor-pointer rounded-lg px-3 py-1 font-semibold text-accent-strong hover:bg-accent-soft" onClick={() => comenzarEdicion(p)}>
                          Editar<span className="sr-only"> punto {p.numero}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {visibles.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-ink-soft">
                        {puntos.length === 0
                          ? "Todavía no hay puntos. Agregue el primero con el formulario."
                          : "Ningún punto coincide con la búsqueda o el rango."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Acciones por rango */}
          <section className="card flex flex-wrap items-end gap-4" aria-label="Acciones por rango">
            <button
              type="button"
              disabled={!rango}
              onClick={() => (confirmLimpiar ? limpiarCoordenadasRango() : setConfirmLimpiar(true))}
              onBlur={() => setConfirmLimpiar(false)}
              className={`btn min-h-12 cursor-pointer rounded-xl border px-6 text-lg font-semibold disabled:opacity-50 ${
                confirmLimpiar ? "border-red-500 bg-red-600 text-white" : "border-line bg-surface hover:bg-red-50 hover:text-red-700"
              }`}
            >
              {rango
                ? confirmLimpiar
                  ? `¿Seguro? N/E a 0 en ${rango.de}–${rango.hasta}`
                  : `Limpiar coordenadas ${rango.de}–${rango.hasta}`
                : "Limpiar coordenadas de rango"}
            </button>
            <label className="grid gap-1.5">
              <span className="text-base font-semibold">Retomar numeración desde</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={reanudarDesde}
                  onChange={(e) => setReanudarDesde(e.target.value)}
                  className="min-h-12 w-28 rounded-xl border border-line bg-surface px-3 text-lg"
                />
                <button type="button" className="btn btn-secondary" onClick={retomarNumeracion}>
                  Fijar
                </button>
              </div>
            </label>
            {config.numeroSiguiente !== undefined && (
              <p className="self-center text-base text-ink-soft" role="status">
                Próximo punto sugerido: <strong className="text-accent-strong">{config.numeroSiguiente}</strong>
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default Puntos;
