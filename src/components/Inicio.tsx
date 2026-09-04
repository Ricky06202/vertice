import { useJobs, textoGuardado } from "../state/JobsContext";
import JobActions from "./JobActions";

function fechaCorta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });
}

/** Quita el prefijo /home/usuario para mostrar rutas legibles. */
function rutaCorta(ruta: string): string {
  const partes = ruta.split("/");
  return partes.length > 3 ? `…/${partes.slice(-2).join("/")}` : ruta;
}

function Inicio() {
  const { estado, recientes, abrirRuta } = useJobs();

  return (
    <div className="grid gap-6">
      <section className="card flex flex-wrap items-center gap-x-10 gap-y-5">
        <div className="grid gap-1">
          <h2 className="text-2xl font-extrabold tracking-tight">{estado.proyecto.titulo}</h2>
          <p className="text-lg text-ink-soft">
            {estado.ruta ? rutaCorta(estado.ruta) : "Sin archivo todavía — «Guardar como» le pone nombre y ubicación"}
          </p>
        </div>
        <span
          className={`rounded-full px-4 py-1.5 text-base font-bold ${
            estado.sucio || estado.guardando
              ? "bg-amber-100 text-amber-800"
              : "bg-accent-soft text-accent-strong"
          }`}
          role="status"
        >
          {textoGuardado(estado)}
        </span>
        <div className="ml-auto">
          <JobActions />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xl font-bold">Proyectos recientes</h3>
        {recientes.length === 0 ? (
          <div className="card grid place-items-center gap-2 py-12 text-center">
            <span aria-hidden="true" className="grid size-16 place-items-center rounded-full bg-accent-soft text-3xl font-black text-accent-strong">
              ★
            </span>
            <p className="text-lg text-ink-soft">
              Aún no hay proyectos recientes. Los que abra o guarde aparecerán aquí
              para retomarlos con un clic.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recientes.map((r) => (
              <li key={r.ruta}>
                <button
                  type="button"
                  className="card grid w-full cursor-pointer gap-1 text-left transition-colors hover:bg-accent-soft"
                  onClick={() => void abrirRuta(r.ruta)}
                  title={r.ruta}
                >
                  <span className="text-xl font-bold">{r.titulo || "Sin proyecto"}</span>
                  <span className="text-base break-all text-ink-soft">{rutaCorta(r.ruta)}</span>
                  <span className="text-base text-accent-strong">
                    Abierto el {fechaCorta(r.ts)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default Inicio;
