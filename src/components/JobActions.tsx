import { useJobs } from "../state/JobsContext";

type Props = { compacto?: boolean };

function JobActions({ compacto = false }: Props) {
  const { estado, nuevo, abrir, guardar, guardarComo } = useJobs();
  const clases = compacto
    ? "min-h-10 rounded-lg px-3 text-base"
    : "btn min-h-12 px-6 text-lg";

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Acciones del proyecto">
      <button type="button" className={`${clases} font-semibold bg-accent text-white hover:bg-accent-strong`} onClick={() => void nuevo()}>
        Nuevo
      </button>
      <button type="button" className={`${clases} font-semibold border border-line bg-surface hover:bg-accent-soft`} onClick={() => void abrir()}>
        Abrir
      </button>
      <button
        type="button"
        className={`${clases} font-semibold border border-line bg-surface hover:bg-accent-soft disabled:opacity-50`}
        disabled={estado.guardando}
        onClick={() => void (estado.ruta ? guardar() : guardarComo())}
        title={estado.ruta ?? "Asigne una ubicación con «Guardar como»"}
      >
        Guardar
      </button>
      <button type="button" className={`${clases} font-semibold border border-line bg-surface hover:bg-accent-soft`} onClick={() => void guardarComo()}>
        Guardar como
      </button>
    </div>
  );
}

export default JobActions;
