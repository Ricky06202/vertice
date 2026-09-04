import { useEffect, useRef } from "react";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
};

const LINEAS_EJEMPLO = [
  { hora: "08:12:03", texto: "Sesión iniciada — modo interfaz (sin proyecto abierto)" },
  { hora: "08:12:41", texto: "Nota de ejemplo: así se verá el registro con fecha y hora" },
];

function LogPanel({ abierto, onCerrar }: Props) {
  const botonCerrar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    botonCerrar.current?.focus();
    function alPulsarTecla(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", alPulsarTecla);
    return () => window.removeEventListener("keydown", alPulsarTecla);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-ink/30"
      role="dialog"
      aria-modal="true"
      aria-label="Registro"
      onClick={onCerrar}
    >
      <aside
        className="flex h-full w-full max-w-lg flex-col gap-4 bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-extrabold">Registro</h2>
          <button
            ref={botonCerrar}
            type="button"
            className="btn btn-secondary"
            onClick={onCerrar}
          >
            Cerrar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto rounded-xl border border-line bg-canvas p-4">
          <ul className="grid gap-3">
            {LINEAS_EJEMPLO.map((l) => (
              <li key={l.hora} className="flex gap-3 text-lg">
                <span className="shrink-0 font-mono text-base text-accent-strong">
                  {l.hora}
                </span>
                <span>{l.texto}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-base text-ink-soft/70">
            Aquí aparecerá cada operación con su hora, más las notas que escriba
            el usuario. Pronto podrá exportarse e imprimirse.
          </p>
        </div>
      </aside>
    </div>
  );
}

export default LogPanel;
