import type { Modo } from "../App";
import { textoGuardado, useJobs } from "../state/JobsContext";
import JobActions from "./JobActions";

type Props = {
  modo: Modo;
  onCambiarModo: (m: Modo) => void;
  onAbrirRegistro: () => void;
};

function Header({ modo, onCambiarModo, onAbrirRegistro }: Props) {
  const { estado } = useJobs();

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line bg-surface px-6 py-4">
      <div className="flex min-w-0 items-baseline gap-4">
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center self-center rounded-xl bg-accent text-2xl font-black text-white"
        >
          ▲
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Vértice</h1>
        <span className="min-w-0 truncate text-lg text-ink-soft" title={`Proyecto: ${estado.proyecto.titulo}`}>
          · {estado.proyecto.titulo}
        </span>
      </div>

      <span
        className={`ml-auto flex shrink-0 items-center gap-2 text-base ${estado.sucio ? "text-amber-700" : "text-ink-soft"}`}
        role="status"
      >
        <span
          aria-hidden="true"
          className={`size-3 rounded-full ${estado.sucio || estado.guardando ? "bg-amber-500" : "bg-accent"}`}
        />
        {textoGuardado(estado)}
      </span>

      <JobActions compacto />

      <button type="button" className="btn btn-secondary shrink-0 !min-h-10 !px-4 !text-base" onClick={onAbrirRegistro}>
        Registro
      </button>

      <div
        className="flex shrink-0 items-center rounded-xl border border-line bg-canvas p-1"
        role="group"
        aria-label="Modo de la aplicación"
      >
        {(["simple", "avanzado"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={modo === m}
            onClick={() => onCambiarModo(m)}
            className={`min-h-10 cursor-pointer rounded-lg px-4 text-base font-semibold capitalize transition-colors ${
              modo === m ? "bg-accent text-white" : "text-ink-soft hover:bg-accent-soft"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </header>
  );
}

export default Header;
