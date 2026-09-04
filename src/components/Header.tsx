import type { Modo } from "../App";

type Props = {
  jobTitle: string;
  modo: Modo;
  onCambiarModo: (m: Modo) => void;
  onAbrirRegistro: () => void;
};

function Header({ jobTitle, modo, onCambiarModo, onAbrirRegistro }: Props) {
  return (
    <header className="flex items-center gap-4 border-b border-line bg-surface px-6 py-4">
      <div className="flex min-w-0 items-baseline gap-4">
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center self-center rounded-xl bg-accent text-2xl font-black text-white"
        >
          ▲
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Vértice</h1>
        <span
          className="min-w-0 truncate text-lg text-ink-soft"
          title={`Proyecto: ${jobTitle}`}
        >
          · {jobTitle}
        </span>
      </div>

      <span
        className="ml-auto flex shrink-0 items-center gap-2 text-base text-ink-soft"
        role="status"
      >
        <span aria-hidden="true" className="size-3 rounded-full bg-accent" />
        Guardado
      </span>

      <button
        type="button"
        className="btn btn-secondary shrink-0"
        onClick={onAbrirRegistro}
      >
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
              modo === m
                ? "bg-accent text-white"
                : "text-ink-soft hover:bg-accent-soft"
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
