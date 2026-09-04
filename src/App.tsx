import { useEffect, useState } from "react";
import Header from "./components/Header";
import TabBar from "./components/TabBar";
import LogPanel from "./components/LogPanel";
import Placeholder from "./components/Placeholder";

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

const PLACEHOLDERS: Record<TabId, { titulo: string; texto: string; glyph: string }> = {
  inicio: {
    titulo: "Inicio",
    texto: "Pronto verás aquí tus trabajos recientes, el punto actual y accesos rápidos.",
    glyph: "△",
  },
  puntos: {
    titulo: "Puntos",
    texto: "La lista de puntos con número, descripción, Norte, Este y elevación.",
    glyph: "·×·",
  },
  calculo: {
    titulo: "Cálculo",
    texto: "Áreas de poligonal, inversos y utilidades de cálculo del proyecto.",
    glyph: "∠",
  },
  informes: {
    titulo: "Informes",
    texto: "Listado de coordenadas, informe de texto y opciones de impresión.",
    glyph: "☰",
  },
  configuracion: {
    titulo: "Configuración",
    texto: "Decimales, separador decimal, aspecto y preferencias de guardado.",
    glyph: "⚙",
  },
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

function leerModo(): Modo {
  try {
    const v = localStorage.getItem("vertice.modo");
    return v === "avanzado" ? "avanzado" : "simple";
  } catch {
    return "simple";
  }
}

function App() {
  const [modo, setModo] = useState<Modo>(leerModo);
  const [tab, setTab] = useState<TabId>("inicio");
  const [registroAbierto, setRegistroAbierto] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("vertice.modo", modo);
    } catch {
      /* sin persistencia disponible */
    }
  }, [modo]);

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo);
    if (nuevo === "simple") {
      const tabActual = TABS.find((t) => t.id === tab);
      if (tabActual?.fase2) setTab("inicio");
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <Header
        jobTitle="Sin proyecto"
        modo={modo}
        onCambiarModo={cambiarModo}
        onAbrirRegistro={() => setRegistroAbierto(true)}
      />

      <TabBar tabs={TABS} modo={modo} actual={tab} onSeleccionar={setTab} />

      <main className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="mx-auto max-w-5xl">
          <Placeholder {...PLACEHOLDERS[tab]} fase2={TABS.find((t) => t.id === tab)?.fase2 ?? false} />
        </div>
      </main>

      <LogPanel abierto={registroAbierto} onCerrar={() => setRegistroAbierto(false)} />
    </div>
  );
}

export default App;
