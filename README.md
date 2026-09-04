# Vértice

Programa libre de topografía, implementado desde cero bajo filosofía clean-room
(sin copiar código, iconos, textos ni assets de software propietario).

Pensado para topógrafos que vienen del flujo clásico: lista de puntos, rumbo/distancia
con códigos de campo **TR / IN / GT**, áreas de poligonal, listado e impresión de reportes.
UI en español, letra grande, 100% offline, y un job = un archivo `.vertice` (JSON versionado)
con autoguardado y copia `.bak`.

## Estado

**MVP en desarrollo.** Requisitos definidos en [`docs/01-requisitos.md`](docs/01-requisitos.md).
Formato de archivo en [`docs/formato.md`](docs/formato.md) e instalación/desarrollo en
[`docs/instalacion.md`](docs/instalacion.md).

Stack previsto: Tauri v2 + React + TypeScript + Vite + Tailwind CSS (bun).

## Fase 2 (planificada, aún no iniciada)

Curvas de nivel, curvas IC, dibujo/plot, estación/backsight, Merge Coordinates,
importadores legados (.dat/DXF/PDF) y `vertice-convert`. Nada de esto entra en el MVP actual.

## Licencia

GPL-3.0-or-later. Ver [LICENSE](LICENSE).
