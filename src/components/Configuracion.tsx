import { useJobs } from "../state/JobsContext";
import { fijarZoom, restablecerZoom } from "../state/zoom";
import { leerPreferencias } from "../state/preferencias";
import { useEffect, useState } from "react";
import type { Modo } from "../App";
import type { Config, SeparadorExport } from "../types";

type Props = {
  modo: Modo;
  onCambiarModo: (m: Modo) => void;
};

const FILA = "flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-canvas px-4 py-3";

function Selector<O extends string | number>({
  valor,
  opciones,
  onChange,
}: {
  valor: O;
  opciones: { v: O; l: string }[];
  onChange: (v: O) => void;
}) {
  return (
    <div className="flex gap-2" role="group">
      {opciones.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          aria-pressed={valor === o.v}
          onClick={() => onChange(o.v)}
          className={`min-h-11 cursor-pointer rounded-lg px-4 text-lg font-semibold transition-colors ${
            valor === o.v ? "bg-accent text-white" : "border border-line bg-surface text-ink-soft hover:bg-accent-soft"
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function Configuracion({ modo, onCambiarModo }: Props) {
  const { estado, actualizarProyecto } = useJobs();
  const { config } = estado.proyecto;
  const [zoom, setZoom] = useState(leerPreferencias().textoPantalla);
  const [medido, setMedido] = useState("");
  useEffect(() => {
    function medir() {
      setMedido(`inline ${document.documentElement.style.fontSize || "—"} → ${getComputedStyle(document.documentElement).fontSize}`);
      setZoom(leerPreferencias().textoPantalla);
    }
    medir();
    const id = setTimeout(medir, 400);
    window.addEventListener("vertice-zoom", medir);
    return () => {
      clearTimeout(id);
      window.removeEventListener("vertice-zoom", medir);
    };
  }, [zoom]);

  function setConfig(parche: Partial<Config>) {
    actualizarProyecto({ ...estado.proyecto, config: { ...config, ...parche } });
  }

  const ejNE = (1234.5).toFixed(config.decimalesNE).replace(".", config.separador);
  const ejZ = (12.25).toFixed(config.decimalesElev).replace(".", config.separador);
  const exportAuto = config.separadorExport === undefined;
  const sepEfectivo = exportAuto ? (config.separador === "," ? ";" : ",") : config.separadorExport;

  return (
    <div className="grid gap-6">
      <section className="card grid gap-3" aria-label="Números y decimales">
        <h3 className="text-xl font-bold">Números</h3>
        <div className={FILA}>
          <div>
            <p className="text-lg font-semibold">Decimales de Norte/Este</p>
            <p className="text-base text-ink-soft">
              Cómo se muestran las coordenadas en tablas e informes (valor real no cambia). Ejemplo: {ejNE}
            </p>
          </div>
          <Selector
            valor={config.decimalesNE}
            onChange={(v) => setConfig({ decimalesNE: v })}
            opciones={[0, 1, 2, 3, 4, 5, 6].map((n) => ({ v: n, l: String(n) }))}
          />
        </div>
        <div className={FILA}>
          <div>
            <p className="text-lg font-semibold">Decimales de elevación</p>
            <p className="text-base text-ink-soft">Para cotas y Δelevación. Ejemplo: {ejZ}</p>
          </div>
          <Selector
            valor={config.decimalesElev}
            onChange={(v) => setConfig({ decimalesElev: v })}
            opciones={[0, 1, 2, 3, 4].map((n) => ({ v: n, l: String(n) }))}
          />
        </div>
      </section>

      <section className="card grid gap-3" aria-label="Exportación de archivos">
        <h3 className="text-xl font-bold">Exportación (CSV e informes)</h3>
        <div className={FILA}>
          <div>
            <p className="text-lg font-semibold">Separador de campos en CSV</p>
            <p className="text-base text-ink-soft">
              Automático = coma decimal fuerza «punto y coma». Hoy exporta con{" "}
              <strong className="text-ink">«{sepEfectivo === ";" ? "punto y coma" : "coma"}»</strong>.
            </p>
          </div>
          <Selector<SeparadorExport | "auto">
            valor={exportAuto ? "auto" : (config.separadorExport as SeparadorExport)}
            onChange={(v) => setConfig({ separadorExport: v === "auto" ? undefined : v })}
            opciones={[
              { v: "auto", l: "Auto" },
              { v: ",", l: "Coma" },
              { v: ";", l: "Punto y coma" },
            ]}
          />
        </div>
        <label className={FILA}>
          <span>
            <span className="text-lg font-semibold">Descripción sugerida al capturar</span>
            <span className="block text-base text-ink-soft">
              Se autopone en el formulario de Puntos (p. ej. el tipo de trabajo del día).
            </span>
          </span>
          <input
            type="text"
            value={config.descDefault}
            onChange={(e) => setConfig({ descDefault: e.target.value })}
            className="min-h-12 w-64 rounded-xl border border-line bg-surface px-4 text-lg"
            placeholder="p. ej. límite"
          />
        </label>
      </section>

      <section className="card grid gap-3" aria-label="Interfaz">
        <h3 className="text-xl font-bold">Interfaz</h3>
        <div className={FILA}>
          <div>
            <p className="text-lg font-semibold">Modo con el que abre Vértice</p>
            <p className="text-base text-ink-soft">
              Simple oculta los códigos de campo; Avanzado muestra TR/IN/GT y tipeo rápido.
              También puede cambiarse desde el botón del encabezado.
            </p>
          </div>
          <Selector<Modo>
            valor={modo}
            onChange={onCambiarModo}
            opciones={[
              { v: "simple", l: "Simple" },
              { v: "avanzado", l: "Avanzado" },
            ]}
          />
        </div>
        <div className={FILA}>
          <div>
            <p className="text-lg font-semibold">Tamaño de pantalla</p>
            <p className="text-base text-ink-soft">
              Agranda o achica toda la interfaz. En pantallas 4K donde el sistema
              no aplica el escalado, suba a 150–200 %. Se recuerda en este equipo.
            </p>
          </div>
          <Selector
            valor={Math.round(zoom * 100)}
            onChange={(v) => {
              setZoom(v / 100);
              fijarZoom(v / 100);
            }}
            opciones={[100, 125, 150, 175, 200].map((n) => ({ v: n, l: `${n} %` }))}
          />
        </div>
        <p className="text-base text-ink-soft" role="status">
          Preferido: <strong className="text-accent-strong">{Math.round(zoom * 100)} %</strong>
          {" · "}tamaño real del documento: <strong className="font-mono">{medido || "…"}</strong>
          {" · "}Ctrl + “+”/“−” también cambia el tamaño.
          <button
            type="button"
            className="ml-2 cursor-pointer rounded-lg border border-line bg-surface px-3 py-1 text-base font-semibold text-red-700 hover:bg-red-50"
            onClick={() => void restablecerZoom()}
          >
            Restablecer zoom
          </button>
        </p>
        <p className="text-base text-ink-soft" role="status">
          Ajustes como decimales o descripción viajan dentro del archivo del proyecto; el tamaño de pantalla y el modo (se aplica a este job); el
          modo por defecto queda guardado en este equipo.
        </p>
      </section>
    </div>
  );
}

export default Configuracion;
