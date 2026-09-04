# Vértice — Requisitos del MVP (documento 01)

> Programa libre de topografía, clean-room (sin código, iconos, textos ni assets de software propietario).
> Stack: Tauri v2 + React + TypeScript + Vite + Tailwind CSS (bun). 100% offline. GPL-3.0-or-later.
> Este documento define QUÉ se construye. No contiene código de la aplicación.

---

## 1. Objetivo

Crear un programa de topografía para el **usuario mayor habituado al flujo clásico de software
de campo/oficina** (lista de puntos, rumbo/distancia, inversos, áreas, reporte de texto), que:

- Reemplace ese flujo básico con una interfaz moderna, legible y sin fricción.
- Guarde el trabajo en **un solo archivo** que el usuario entiende y controla.
- Sea **abierto a la comunidad**: código libre (GPL-3.0-or-later), formato de archivo documentado
  (`docs/formato.md`), sin cuentas, sin telemetría, sin dependencia de servicios externos.

Criterio global de éxito del MVP: un topógrafo puede registrar puntos, calcular estaciones por
TR, verificar por IN, medir una poligonal, exportar CSV e imprimir el informe, todo offline y
sin perder datos por corte de energía o cierre accidental.

## 2. Usuario

- **Perfil principal**: topógrafo de edad avanzada, años de uso de software clásico de
  topografía. Tecla-friendly, alérgico a menús profundos y gestos. Desconfía de lo que "no guarda".
- **Perfil secundario**: comunidad de topógrafos/técnicos que adopten un proyecto libre.

Requisitos derivados:

| ID | Requisito |
|----|-----------|
| U-01 | UI completamente en **español** (etiquetas, mensajes, errores, reportes). |
| U-02 | **Texto grande por defecto** (base ≥ 18px en pantalla; escalable en configuración). |
| U-03 | Alto contraste, colores neutros + un acento; `focus-visible`always visible y navegable con teclado. |
| U-04 | **Modo Simple por defecto**: solo lo esencial (puntos, área, exportar). |
| U-05 | **Modo Avanzado** revela los códigos clásicos de campo: TR, IN, GT. |
| U-06 | Cada acción destructiva pide confirmación explícita y nombra el archivo afectado. |
| U-07 | Terminología familiar: "Número de punto", "Descripción", "Norte", "Este", "Elevación", "Rumbo", "Inverso". |

## 3. Flujo principal

El camino típico de una semana de trabajo:

1. **Abrir o crear un job** (archivo único `.vertice`), con lista de **recientes**.
2. **Cargar o importar puntos** (tecleo manual o importación CSV/ASCII PNEZD).
3. **TR** — establecer/avance de estaciones con rumbo + distancia (+ Δelev opcional).
4. **IN** — inversos de revisión entre puntos existentes (verificación de campo).
5. **Área de poligonal cerrada** sobre una selección de puntos.
6. **Listado, exportación e impresión** de coordenadas, informe de texto y log.
7. **Guardado obsesivo**: el programa guarda solo. El usuario nunca debe pensar en Ctrl+S.
   Autoguardado continuo + copia `.bak` + recuperación ante archivo corrupto.

## 4. Modelo de datos: el punto

Un punto topográfico tiene:

| Campo | Tipo | Notas |
|-------|------|-------|
| `num` | entero o texto | Número de punto. Orden = número si es numérico; si no, orden de inserción. |
| `desc` | string | Descripción, opcional. |
| `n` | número | Norte (Y). |
| `e` | número | Este (X). |
| `z` | número o null | Elevación, **opcional**. |

- Coordenadas **locales o georreferenciadas**: se aceptan valores con hasta 6 dígitos enteros
  sin tratamiento especial (no hay proyecciones en el MVP; el programa no asume datum).
- **Rumbos en formato cuadrante** (NE, SE, SW, NW) para entrada y salida; nunca azimut por defecto.
- Un job contiene: título, lista de puntos, log de operaciones y configuración de visualización.
  Formato: JSON versionado `{ version: 1, titulo, puntos, log, config }` (spec en `docs/formato.md`).

## 5. Entradas (importación)

Importar **CSV / ASCII PNEZD** con autodetección tanto como sea posible:

| Eje | Casos a soportar |
|-----|------------------|
| Separador | coma `,`, punto y coma `;`, tabulador, espacio(s) |
| Orden de campos | `PNEZD` y `PDNEZ` (con y sin Z) |
| Encabezado | con fila de encabezado o sin ella (autodetectar) |
| Nº de campos | 4 (P,N,E,D), 5 (P,N,E,Z,D), y variaciones P,N,E / P,N,E,D |
| Decimales | punto o coma decimal (independiente del separador de campos) |

Reglas:

- **Preview antes de confirmar**: mostrar las primeras N filas parseadas tal como se entenderán,
  con edición manual de mapeo si la autodetección falla.
- Conflictos de número duplicado: ofrecer reemplazar, renombrar (`n-2`) o cancelar.
- Archivos leídos como **UTF-8 con tolerancia a BOM**; fallback latin-1 informado al usuario.
- Entrada manual: tabla editable con navegación por tab/enter, validación en línea.

## 6. Salidas (exportación)

| Salida | Detalle |
|--------|---------|
| **CSV PNEZD** | Orden `P,N,E,Z,D` configurable; separador configurable (`,` `;` tab); descripciones con comillas si contienen el separador; **BOM UTF-8** para compatibilidad con Excel. |
| **Informe .txt** | Texto plano con alineación tipo reporte clásico (listado de puntos, inversos, áreas) listo para cualquier impresora/terminal. |
| **Impresión** | Listado de coordenadas y reporte de áreas, con título del job, fecha y paginación simple (vía `window.print()` del listado formateado). |
| **Log** | Exportar el registro de operaciones a .txt (ver §9). |

## 7. Cálculos del MVP

### 7.1 TR (traversing/estación por rumbo)

- Entrada: punto desde el que se calcula (base), **rumbo crudo flexible**, **distancia horizontal**,
  **Δelevación opcional**.
- Rumbo crudo debe aceptar, entre otros: `30.04SE`, `S30.04E`, `S 30 04 E`, `90nw`, `0ne`,
  grados decimales y **DMS** (`30°04'`, `30d04m`, `30 04 00`), con y sin espacios/acentos.
- Salida: coordenadas del nuevo punto (N, E, y Z = Z_base + Δelev si se indicó), rumbo normalizado
  cuadrante DMS, número de punto resultante autoincrementado sugerido.
- Toda operación TR se registra en el log y crea/actualiza el punto en el job.

### 7.2 IN (inverso)

- Entrada: dos puntos existentes (por número o selección en tabla).
- Salida: **rumbo cuadrante en DMS**, **distancia horizontal**, **Δelevación** (null si falta Z).
- Modo revisión: muestra la diferencia contra distancia/rumbo esperados si el usuario los captura.

### 7.3 GT (punto actual / "go to")

- Designar el **punto actual** (último punto activo del job); atajo y visualización destacada.
- Sirve como base por defecto para TR y como destino de navegación en la tabla.

### 7.4 Área de poligonal cerrada

- Selección de puntos en orden (lista ordenada editable; aviso si no hay cierre implícito).
- Método: **desarrollo de coordenades (fórmula de Gauss (shoelace))** sobre la secuencia cerrada.
- Salida simultánea: **m² y hectáreas** y **ft² y acres** (factor exacto de conversión internacional).
- Reporta el perímetro y lista de vértices; resultado va al log y al informe imprimible.

### 7.5 Reglas numéricas comunes

- Redondeo **solo en la visualización**; el archivo almacena los valores crudos en precisión
  flotante completa, con decimales de pantalla configurables (§7.5).
- Configuración global de **decimales** (coordenada, elevación, distancia, área) y **separador
  decimal** (`.` o `,`) según pantalla, import/export e informe.
- Validaciones: distancia > 0, rumbo dentro de cuadrante, coordenadas finitas, número de punto no vacío.

## 8. El job (archivo `.vertice`)

- **Archivo único** con extensión `.vertice`, JSON versionado `{ version: 1, titulo, puntos, log, config }`
  (spec completa en `docs/formato.md`, documento propio).
- Título editable; visible en barra de ventana, listados e informes.
- **Recientes**: lista de jobs abiertos previamente (persistente entre sesiones).
- **Autoguardado**: escribe cambios tras un periodo corto de inactividad (~2s) y además al cerrar.
- **Copia de seguridad `.bak`**: al sobrescribir, el contenido previo queda en `archivo.vertice.bak`
  (rotación simple `bak` → `bak.1`, como máximo conservados por configuración inicial: 1).
- **Recuperación**: al abrir, si el JSON está truncado/inválido, intentar `.bak`, y si tampoco
  funciona, ofrecer exportar los registros recuperables y reportar la incidencia en el log.
- Nunca guardar datos del usuario fuera del archivo del job (salvo recientes/config en AppData).

## 9. Log ("Text Output" clásico)

- Ventana/panel de **registro de texto** estilo Text Output: cada operación relevante deja
  una línea con **timestamp**, código de operación y resultados numéricos tal como los vio el usuario
  (TR, IN, área, importaciones, ediciones de punto, guardados, errores).
- **Notas libres**: el usuario puede añadir líneas de nota al log en cualquier momento
  (p. ej. "día nublado, prisma en P3").
- El log forma parte del job (viaja con el `.vertice`).
- **Copiable, exportable a .txt e imprimible** desde el propio panel.

## 10. Alcance: MoSCoW y FASE 2

### Must (MVP)

- M-01 Crear/abrir/guardar job `.vertice` con título y recientes.
- M-02 Autoguardado + `.bak` + recuperación.
- M-03 CRUD de puntos con validación, rangos y selección.
- M-04 Importación PNEZD con autodetección (§5) y preview.
- M-05 Exportación CSV PNEZD configurable + BOM (§6).
- M-06 Cálculo TR con parser de rumbo crudo (§7.1).
- M-07 Cálculo IN (§7.2).
- M-08 GT / punto actual (§7.3).
- M-09 Área de poligonal en m²+ha y ft²+ac (§7.4).
- M-10 Log con timestamp + notas + exportar/imprimir (§9).
- M-11 Listado de coordenadas imprimible.
- M-12 Modo Simple/Avanzado.
- M-13 Configuración de decimales y separador.
- M-14 UI en español, letra grande, alto contraste, accesible por teclado.
- M-15 Licencia GPL-3.0-or-later + formato documentado.

### Should (si el tiempo lo permite, dentro del MVP)

- S-01 Informe .txt formateado descarga directa.
- S-02 Detección/avisos de números duplicados al importar (§5) — ya es "must" la detección, "should" el renombrado.

### Could

- C-01 Plantillas de perfiles de decimales por trabajo.
- C-02 Atajos de teclado personalizables.

### Won't (fase 2 — ver §10.2)

### 10.2 FASE 2 (fuera del MVP; **no tocar ahora**)

- Curvas de nivel (contornos) desde puntos.
- Curvas **IC** (líneas de influencia/interpolación según convención del gremio).
- Dibujo/plot 2D y visualizador gráfico de puntos.
- Módulo de **estación/backsight** (levantamiento con ángulos hor/vert).
- **Merge Coordinates** (combinar/ajustar juegos de coordenadas).
- Importadores legados: `.dat`, DXF, tablas PDF.
- `vertice-convert`: CLI de conversión de formatos.

## Regla de trabajo

**Cada prompt del proyecto = UNA sola feature.** No se avanzan varias a la vez. Si falta
información, máximo 3 preguntas; si no, asumir la solución simple y dejar un `TODO`.
