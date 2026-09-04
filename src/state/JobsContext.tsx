import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { confirm as dialogConfirm, message, open, save } from "@tauri-apps/plugin-dialog";
import { createEmptyProject, type Proyecto } from "../types";
import {
  escribirProyecto,
  esTauri,
  existeRuta,
  leerProyecto,
  nombreArchivo,
  rutaBak,
} from "../storage/verticeFs";

export type Estado = {
  proyecto: Proyecto;
  ruta: string | null;
  /** Hay cambios aún no escritos en disco. */
  sucio: boolean;
  guardando: boolean;
  /** ISO del último guardado exitoso. */
  ultimoGuardado: string | null;
};

type Accion =
  | { t: "nuevo"; proyecto: Proyecto }
  | { t: "cargado"; proyecto: Proyecto; ruta: string | null }
  | { t: "proyecto"; proyecto: Proyecto }
  | { t: "ruta"; ruta: string }
  | { t: "guardando" }
  | { t: "guardado"; ts: string };

function reductor(estado: Estado, accion: Accion): Estado {
  switch (accion.t) {
    case "nuevo":
      return { ...estado, proyecto: accion.proyecto, ruta: null, sucio: false, ultimoGuardado: null };
    case "cargado":
      return {
        ...estado,
        proyecto: accion.proyecto,
        ruta: accion.ruta,
        sucio: false,
        ultimoGuardado: null,
      };
    case "proyecto":
      return { ...estado, proyecto: accion.proyecto, sucio: true };
    case "ruta":
      return { ...estado, ruta: accion.ruta, sucio: true };
    case "guardando":
      return { ...estado, guardando: true };
    case "guardado":
      return { ...estado, guardando: false, sucio: false, ultimoGuardado: accion.ts };
  }
}

export type Reciente = { ruta: string; titulo: string; ts: string };

const CLAVE_RECIENTES = "vertice.recientes";
const MAX_RECIENTES = 10;
const DEBOUNCE_AUTOSAVE_MS = 400;

function leerRecientes(): Reciente[] {
  try {
    const crudo = localStorage.getItem(CLAVE_RECIENTES);
    if (!crudo) return [];
    const lista = JSON.parse(crudo);
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export function confirmar(descartarCambios: boolean): Promise<boolean> {
  if (!descartarCambios) return Promise.resolve(true);
  return esTauri()
    ? dialogConfirm("Hay cambios sin guardar. ¿Descartarlos y continuar?", {
        title: "Vértice",
        kind: "warning",
        okLabel: "Descartar",
        cancelLabel: "Cancelar",
      })
    : Promise.resolve(window.confirm("Hay cambios sin guardar. ¿Descartarlos?"));
}

type ValorContexto = {
  estado: Estado;
  recientes: Reciente[];
  nuevo: () => Promise<void>;
  abrir: () => Promise<void>;
  abrirRuta: (ruta: string) => Promise<void>;
  guardar: () => Promise<void>;
  guardarComo: () => Promise<void>;
  /** Para futuras pestañas: reemplazar el proyecto actual (dispara autoguardado). */
  actualizarProyecto: (p: Proyecto) => void;
};

const Ctx = createContext<ValorContexto | null>(null);

export function JobsProvider({ children }: { children: ReactNode }) {
  const estadoInicial = useMemo<Estado>(
    () => ({
      proyecto: createEmptyProject(),
      ruta: null,
      sucio: false,
      guardando: false,
      ultimoGuardado: null,
    }),
    [],
  );
  const [estado, dispatch] = useReducer(reductor, estadoInicial);
  const [recientes, setRecientes] = useState<Reciente[]>(leerRecientes);

  const registrarReciente = useCallback((ruta: string, titulo: string, ts = new Date().toISOString()) => {
    setRecientes((prev) => {
      const resto = prev.filter((r) => r.ruta !== ruta).slice(0, MAX_RECIENTES - 1);
      const nuevo = [{ ruta, titulo, ts }, ...resto];
      try {
        localStorage.setItem(CLAVE_RECIENTES, JSON.stringify(nuevo));
      } catch {
        /* sin persistencia disponible */
      }
      return nuevo;
    });
  }, []);

  const cargarDesde = useCallback(
    async (ruta: string) => {
      let proyecto = await leerProyecto(ruta);
      if (!proyecto) {
        const bak = rutaBak(ruta);
        if ((await existeRuta(bak)) && esTauri()) {
          const intenta = await dialogConfirm(
            "El archivo no se puede leer (¿está corrupto?). ¿Intentar recuperar desde la copia de seguridad .bak?",
            { title: "Archivo dañado", kind: "warning", okLabel: "Recuperar .bak", cancelLabel: "Cancelar" },
          );
          if (intenta) {
            proyecto = await leerProyecto(bak);
          }
        }
        if (!proyecto) {
          if (esTauri()) {
            await message("No se pudo abrir el archivo ni su copia .bak.", { title: "Error", kind: "error" });
          }
          return;
        }
        if (esTauri()) {
          await message("Se recuperó el contenido desde la copia .bak.", { title: "Vértice", kind: "info" });
        }
        dispatch({ t: "cargado", proyecto, ruta });
        registrarReciente(ruta, proyecto.titulo);
        return;
      }
      dispatch({ t: "cargado", proyecto, ruta });
      registrarReciente(ruta, proyecto.titulo);
    },
    [registrarReciente],
  );

  const nuevo = useCallback(async () => {
    if (!(await confirmar(estado.sucio))) return;
    dispatch({ t: "nuevo", proyecto: createEmptyProject() });
  }, [estado.sucio]);

  const abrir = useCallback(async () => {
    if (!(await confirmar(estado.sucio))) return;
    if (!esTauri()) return;
    const elegido = await open({
      multiple: false,
      title: "Abrir proyecto Vértice",
      filters: [{ name: "Proyecto Vértice", extensions: ["vertice"] }],
    });
    if (typeof elegido === "string") await cargarDesde(elegido);
  }, [estado.sucio, cargarDesde]);

  const abrirRuta = useCallback(
    async (ruta: string) => {
      if (!(await confirmar(estado.sucio))) return;
      await cargarDesde(ruta);
    },
    [estado.sucio, cargarDesde],
  );

  const guardar = useCallback(async () => {
    const { ruta } = estado;
    if (!ruta) return;
    dispatch({ t: "guardando" });
    try {
      await escribirProyecto(ruta, estado.proyecto);
      dispatch({ t: "guardado", ts: new Date().toISOString() });
      registrarReciente(ruta, estado.proyecto.titulo);
    } catch (e) {
      dispatch({ t: "proyecto", proyecto: estado.proyecto }); // sigue sucio
      if (esTauri()) {
        await message(`No se pudo guardar: ${String(e)}`, { title: "Error", kind: "error" });
      }
    }
  }, [estado, registrarReciente]);

  const guardarComo = useCallback(async () => {
    if (!esTauri()) return;
    const elegida = await save({
      title: "Guardar proyecto como",
      defaultPath: nombreArchivo(estado.proyecto.titulo),
      filters: [{ name: "Proyecto Vértice", extensions: ["vertice"] }],
    });
    if (typeof elegida !== "string") return;
    const ruta = elegida.endsWith(".vertice") ? elegida : `${elegida}.vertice`;
    dispatch({ t: "ruta", ruta });
    dispatch({ t: "guardando" });
    try {
      await escribirProyecto(ruta, estado.proyecto);
      dispatch({ t: "guardado", ts: new Date().toISOString() });
      registrarReciente(ruta, estado.proyecto.titulo);
    } catch (e) {
      if (esTauri()) {
        await message(`No se pudo guardar: ${String(e)}`, { title: "Error", kind: "error" });
      }
    }
  }, [estado.proyecto, registrarReciente]);

  // Autoguardado con debounce cuando cambian los datos (nunca sin ruta definida).
  useEffect(() => {
    if (!estado.sucio || !estado.ruta || estado.guardando) return;
    const id = setTimeout(() => {
      void guardar();
    }, DEBOUNCE_AUTOSAVE_MS);
    return () => clearTimeout(id);
  }, [estado.sucio, estado.ruta, estado.guardando, estado.proyecto, guardar]);

  const value = useMemo<ValorContexto>(
    () => ({ estado, recientes, nuevo, abrir, abrirRuta, guardar, guardarComo, actualizarProyecto: (p) => dispatch({ t: "proyecto", proyecto: p }) }),
    [estado, recientes, nuevo, abrir, abrirRuta, guardar, guardarComo],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useJobs(): ValorContexto {
  const v = useContext(Ctx);
  if (!v) throw new Error("useJobs fuera de JobsProvider");
  return v;
}

/** Texto corto de estado para el header. */
export function textoGuardado(estado: Estado): string {
  if (estado.guardando) return "Guardando…";
  if (estado.sucio && !estado.ruta) return "Sin archivo — use Guardar como";
  if (estado.sucio) return "Sin guardar…";
  if (estado.ultimoGuardado) {
    const d = new Date(estado.ultimoGuardado);
    return `Guardado ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }
  return "Listo";
}
