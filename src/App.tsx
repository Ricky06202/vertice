import { useEffect, useState } from "react";
import Header from "./components/Header";
import TabBar from "./components/TabBar";
import LogPanel from "./components/LogPanel";
import Placeholder from "./components/Placeholder";
import Inicio from "./components/Inicio";
import Puntos from "./components/Puntos";
import Calculo from "./components/Calculo";
import Configuracion from "./components/Configuracion";
import Informes from "./components/Informes";
import { JobsProvider } from "./state/JobsContext";
import { aplicarZoom, fijarZoom } from "./state/zoom";
import { guardarPreferencias, leerPreferencias } from "./state/preferencias";

export type Modo = "simple" | "avanzado";

const TABS = [
  { id: "inicio", label: "Inicio", fase2: false },
  { id: "puntos", label: "Puntos", fase2: false },
  { id: "calculo", label: "Cálculo", fase2: false },
  { id: "informes", label: "Informes", fase2: false },
  { id: "configuracion", label: "Configuración", fase2: false },
  { id: "estaciones", label: "Estaciones", fase2: true },
  { id: "observaciones", label: "Observaciones", fase2: true },
  { id: "dibujo", label: "Dibujo", fase2: true },
] as const;

export type TabId = (typeof TABS)[number]["id"];

const PLACEHOLDERS: Record<Exclude<TabId, "inicio" | "puntos" | "calculo" | "informes" | "configuracion">, { titulo: string; texto: string; glyph: string }> = {
  estaciones: {
    titulo: "Estaciones",
    texto: "Códigos TR/IN/GT y avance de poligonal de campo.",
    glyph: "⊕",
  },
  observaciones: {
    titulo: "Observaciones",
    texto: "Registro de observaciones de campo.",
    glyph: "✎",
  },
  dibujo: {
    titulo: "Dibujo",
    texto: "Visualizador de puntos y plot 2D.",
    glyph: "▦",
  },
};

function App() {
  const [modo, setModo] = useState<Modo>(() => leerPreferencias().modoDefecto);
  const [tab, setTab] = useState<TabId>("inicio");
  const [registroAbierto, setRegistroAbierto] = useState(false);

  // Ctrl/Cmd + “+” / “−”: ajustar tamaño de pantalla desde cualquier pestaña
  useEffect(() => {
    function alPulsar(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const paso = e.key === "-" ? -0.25 : 0.25;
      if (e.key !== "-" && e.key !== "+" && e.key !== "=") return;
      e.preventDefault();
      const t = Math.min(2.5, Math.max(0.75, leerPreferencias().textoPantalla + paso));
      fijarZoom(t);
    }
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, []);

  useEffect(() => {
    aplicarZoom();
  }, []);

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo);
    // el último modo elegido del header también fija el de apertura
    guardarPreferencias({ modoDefecto: nuevo });
    if (nuevo === "simple") {
      const tabActual = TABS.find((t) => t.id === tab);
      if (tabActual?.fase2) setTab("inicio");
    }
  }

  return (
    <JobsProvider>
      <div className="flex h-screen flex-col">
        {/* Al imprimir un informe, el marco de la app desaparece de la página */}
        <div className={`contents ${tab === "informes" ? "print:hidden" : ""}`}>
          <Header
            modo={modo}
            onCambiarModo={cambiarModo}
            onAbrirRegistro={() => setRegistroAbierto(true)}
          />

          <TabBar tabs={TABS} modo={modo} actual={tab} onSeleccionar={setTab} />
        </div>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10 print:overflow-visible print:p-0">
          <div className="mx-auto max-w-5xl">
            {tab === "inicio" ? (
              <Inicio />
            ) : tab === "puntos" ? (
              <Puntos />
            ) : tab === "calculo" ? (
              <Calculo modo={modo} />
            ) : tab === "informes" ? (
              <Informes />
            ) : tab === "configuracion" ? (
              <Configuracion modo={modo} onCambiarModo={cambiarModo} />
            ) : (
              <Placeholder
                {...PLACEHOLDERS[tab]}
                fase2={TABS.find((t) => t.id === tab)?.fase2 ?? false}
              />
            )}
          </div>
        </main>

        <LogPanel abierto={registroAbierto} onCerrar={() => setRegistroAbierto(false)} />
      </div>
    </JobsProvider>
  );
}

export default App;
