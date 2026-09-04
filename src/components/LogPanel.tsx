import { useEffect, useRef, useState } from "react";
import { useJobs } from "../state/JobsContext";
import { fechaHora, exportarRegistroTxt, imprimirRegistro } from "../storage/registro";
import type { LogTipo } from "../types";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
};

const ESTILO_TIPO: Record<LogTipo, string> = {
  sesion: "bg-stone-200 text-stone-700",
  proyecto: "bg-canvas text-ink-soft",
  punto: "bg-canvas text-ink-soft",
  importar: "bg-sky-100 text-sky-800",
  exportar: "bg-sky-100 text-sky-800",
  tr: "bg-accent-soft text-accent-strong",
  in: "bg-accent-soft text-accent-strong",
  area: "bg-accent-soft text-accent-strong",
  nota: "bg-amber-100 text-amber-800",
  guardar: "bg-stone-200 text-stone-700",
  error: "bg-red-100 text-red-800",
};

const NOMBRE_TIPO: Record<LogTipo, string> = {
  sesion: "Sesión",
  proyecto: "Proyecto",
  punto: "Punto",
  importar: "Importar",
  exportar: "Exportar",
  tr: "TR",
  in: "IN",
  area: "Área",
  nota: "Nota",
  guardar: "Guardado",
  error: "Error",
};

function LogPanel({ abierto, onCerrar }: Props) {
  const { estado, actualizarProyecto } = useJobs();
  const log = estado.proyecto.log;
  const notaRef = useRef<HTMLTextAreaElement>(null);
  const finalRef = useRef<HTMLLIElement>(null);
  const [nota, setNota] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (!abierto) return;
    notaRef.current?.focus();
    finalRef.current?.scrollIntoView();
    function alPulsarTecla(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", alPulsarTecla);
    return () => window.removeEventListener("keydown", alPulsarTecla);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  function agregarNota() {
    const texto = nota.trim();
    if (texto === "") return;
    actualizarProyecto({
      ...estado.proyecto,
      log: [...log, { ts: new Date().toISOString(), tipo: "nota", texto }],
    });
    setNota("");
    setAviso("Nota agregada al registro.");
    requestAnimationFrame(() => finalRef.current?.scrollIntoView({ behavior: "smooth" }));
  }

  async function exportar() {
    const ruta = await exportarRegistroTxt(estado.proyecto);
    setAviso(ruta ? `Registro exportado.` : "Exportación cancelada.");
  }

  let ultimoDia = "";

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-ink/30"
      role="dialog"
      aria-modal="true"
      aria-label="Registro"
      onClick={onCerrar}
    >
      <aside
        className="flex h-full w-full max-w-xl flex-col gap-4 bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-extrabold">Registro</h2>
          <span className="text-base text-ink-soft">{estado.proyecto.titulo}</span>
          <button type="button" className="btn btn-secondary ml-auto !min-h-10 !px-4 !text-base" onClick={onCerrar}>
            Cerrar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto rounded-xl border border-line bg-canvas p-4">
          {log.length === 0 ? (
            <p className="grid h-full place-items-center text-center text-lg text-ink-soft">
              Aún no hay operaciones registradas. Todo lo que haga (puntos, TR,
              inversos, áreas…) aparecerá aquí con su hora.
            </p>
          ) : (
            <ol className="grid gap-2.5" aria-label="Líneas del registro">
              {log.map((e, i) => {
                const { fecha, hora } = fechaHora(e.ts);
                const diaNuevo = fecha !== ultimoDia;
                ultimoDia = fecha;
                return (
                  <li key={`${e.ts}-${i}`}>
                    {diaNuevo && (
                      <p className="my-2 text-center text-base font-bold uppercase tracking-widest text-ink-soft">
                        {fecha}
                      </p>
                    )}
                    <div className="flex items-start gap-3 rounded-lg bg-surface px-3 py-2">
                      <span className="shrink-0 font-mono text-base text-ink-soft">{hora}</span>
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold uppercase ${ESTILO_TIPO[e.tipo ?? "nota"]}`}
                      >
                        {NOMBRE_TIPO[e.tipo ?? "nota"] ?? e.tipo}
                      </span>
                      <span className="min-w-0 text-lg break-words">{e.texto}</span>
                    </div>
                  </li>
                );
              })}
              <li ref={finalRef} aria-hidden="true" />
            </ol>
          )}
        </div>

        <label className="grid gap-2">
          <span className="text-base font-semibold">Agregar nota</span>
          <div className="flex items-end gap-2">
            <textarea
              ref={notaRef}
              rows={2}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) agregarNota();
              }}
              placeholder="p. ej. día nublado, prisma en P3 (Ctrl+Enter agrega)"
              className="min-h-12 flex-1 resize-none rounded-xl border border-line bg-canvas px-4 py-2 text-lg"
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={nota.trim() === ""}
              onClick={agregarNota}
            >
              Agregar
            </button>
          </div>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={log.length === 0}
            onClick={() => void exportar()}
          >
            Exportar .txt
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={log.length === 0}
            onClick={() => imprimirRegistro(estado.proyecto)}
          >
            Imprimir
          </button>
          {aviso && (
            <span className="text-base text-ink-soft" role="status">
              {aviso}
            </span>
          )}
        </div>
      </aside>
    </div>
  );
}

export default LogPanel;
