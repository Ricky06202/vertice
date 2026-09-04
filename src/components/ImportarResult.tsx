import { useEffect, useRef } from "react";
import type { ResumenImportacion } from "../storage/importarCsv";

type Props = {
  resumen: ResumenImportacion;
  onAplicar: () => void;
  onCancelar: () => void;
};

function Estadistica({ etiqueta, valor, tono }: { etiqueta: string; valor: number; tono: string }) {
  return (
    <div className={`grid place-items-center rounded-xl px-4 py-5 ${tono}`}>
      <span className="text-3xl font-black tabular-nums">{valor}</span>
      <span className="text-base font-semibold">{etiqueta}</span>
    </div>
  );
}

function ListaProblemas({
  titulo,
  lineas,
}: {
  titulo: string;
  lineas: ResumenImportacion["errores"];
}) {
  if (lineas.length === 0) return null;
  return (
    <div className="grid gap-1.5">
      <h4 className="text-base font-bold uppercase tracking-wide text-ink-soft">{titulo}</h4>
      <ul className="grid max-h-40 gap-1 overflow-y-auto rounded-xl border border-line bg-canvas p-3 text-base">
        {lineas.map((l, i) => (
          <li key={`${l.linea}-${i}`} className="flex gap-3">
            <span className="shrink-0 font-mono text-red-700">L{l.linea}</span>
            <span className="min-w-0">
              <span className="font-semibold">{l.motivo}</span>
              {l.texto && <span className="block truncate text-ink-soft" title={l.texto}>{l.texto}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ImportarResult({ resumen, onAplicar, onCancelar }: Props) {
  const boton = useRef<HTMLButtonElement>(null);
  useEffect(() => boton.current?.focus(), []);

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-ink/30 p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Resumen de importación"
      onClick={onCancelar}
    >
      <div className="card w-full max-w-2xl grid gap-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-2xl font-extrabold">Resumen de la importación</h3>

        <p className="text-lg text-ink-soft">
          Se detectó: separador <strong className="text-ink">{resumen.separador}</strong>, orden{" "}
          <strong className="text-ink">{resumen.orden}</strong>,{" "}
          {resumen.huboEncabezado ? "con fila de encabezado" : "sin encabezado"}.
        </p>

        <div className="grid grid-cols-3 gap-3">
          <Estadistica etiqueta="importados" valor={resumen.importados.length} tono="bg-accent-soft text-accent-strong" />
          <Estadistica etiqueta="omitidos" valor={resumen.omitidos.length} tono="bg-amber-100 text-amber-800" />
          <Estadistica etiqueta="con errores" valor={resumen.errores.length} tono="bg-red-100 text-red-800" />
        </div>

        <ListaProblemas titulo="Errores" lineas={resumen.errores} />
        <ListaProblemas titulo="Omitidos (números repetidos)" lineas={resumen.omitidos} />

        <div className="flex flex-wrap justify-end gap-3">
          <button ref={boton} type="button" className="btn btn-secondary" onClick={onCancelar}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary disabled:opacity-50"
            disabled={resumen.importados.length === 0}
            onClick={onAplicar}
          >
            Agregar {resumen.importados.length} punto{resumen.importados.length === 1 ? "" : "s"} al proyecto
          </button>
        </div>
        <p className="text-base text-ink-soft">
          Ningún punto existente será pisado; los repetidos se listan arriba. Después de
          agregar, el autoguardado escribe el archivo.
        </p>
      </div>
    </div>
  );
}

export default ImportarResult;
