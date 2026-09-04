import type { Modo, TabId } from "../App";

type Tab = { id: TabId; label: string; fase2: boolean };

type Props = {
  tabs: readonly Tab[];
  modo: Modo;
  actual: TabId;
  onSeleccionar: (id: TabId) => void;
};

function TabBar({ tabs, modo, actual, onSeleccionar }: Props) {
  const visibles = tabs.filter((t) => modo === "avanzado" || !t.fase2);

  return (
    <nav
      aria-label="Secciones"
      className="flex gap-2 overflow-x-auto border-b border-line bg-canvas px-6 py-3"
    >
      {visibles.map((t) => {
        const activa = t.id === actual;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => onSeleccionar(t.id)}
            className={`flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl px-5 text-lg font-semibold transition-colors ${
              activa
                ? "bg-surface text-accent-strong shadow-sm"
                : "text-ink-soft hover:bg-surface hover:text-ink"
            }`}
          >
            {t.label}
            {t.fase2 && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent-strong">
                Fase 2
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export default TabBar;
