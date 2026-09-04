import type { Config, Punto } from "../types";

/** Número sugerido para la siguiente captura (puntero config o máximo+1). */
export function siguienteNumero(puntos: Punto[], config: Config): string {
  if (
    config.numeroSiguiente !== undefined &&
    Number.isInteger(config.numeroSiguiente) &&
    config.numeroSiguiente >= 0
  ) {
    return String(config.numeroSiguiente);
  }
  const max = puntos.reduce((acc, p) => {
    const n = Number(p.numero);
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return String(max + 1);
}

/** Avanza el puntero de numeración tras consumir un número (solo si estaba activo). */
export function punteroTras(numeroCreado: string, config: Config): Partial<Config> {
  if (config.numeroSiguiente === undefined) return {};
  const n = Number(numeroCreado);
  const nuevo = (Number.isFinite(n) ? n : config.numeroSiguiente) + 1;
  return { numeroSiguiente: nuevo };
}

export function buscarPunto(puntos: Punto[], numero: string | null | undefined): Punto | undefined {
  if (numero == null) return undefined;
  return puntos.find((p) => p.numero === numero);
}
