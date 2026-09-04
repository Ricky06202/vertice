# Formato de archivo `.vertice`

> Especificación del formato nativo de proyectos de Vértice. Implementación de referencia:
> tipos en [`src/types.ts`](../src/types.ts) (función `createEmptyProject()`).
> Formato **open**: cualquier herramienta de terceros puede leerlo/escribirlo; al documentarse
> aquí sin copiar estructuras de otros logiciels, sirve de **contrato público** con la comunidad.

## 1. Generalidades

| Propiedad | Regla |
|---|---|
| Extensión | `.vertice` (minúsculas, un solo punto: `camino-real.vertice`) |
| Contenido | Un documento **JSON** (RFC 8259) |
| Codificación | **UTF-8 sin BOM**. (El BOM solo aplica a exportaciones CSV para Excel.) |
| Root | Un objeto JSON con las claves de §2. Nunca arrays ni scalares en el root. |
| Números | Formato JSON estándar (punto decimal en el archivo, independientemente del separador de pantalla). El archivo guarda valores crudos; el redondeo solo ocurre al mostrar. |
| Fechas/tiempos | ISO 8601 UTC con terminación `Z` (p. ej. `2026-09-04T14:05:00Z`). |
| Espaciado | Recomendado: JSON con indentación de 2 espacios para legibilidad humana/diff. |
| Claves desconocidas | Un lector **debe ignorar** las claves que no conozca y no debe rechazar el archivo por ellas. |

### Copias de seguridad y recuperación (comportamiento del lector/escritor)

- Al sobrescribir, Vértice deja el contenido previo en `nombre.vertice.bak` como máximo 1 nivel
  (el `.bak` viejo pasa a descartarse; rotación simple).
- Al abrir: si el root del JSON es inválido o `version` > soporteado, Vértice intenta `.bak`;
  si tampoco funciona, ofrece volcar a texto los fragmentos parseables y registra el incidente en el log.

## 2. Esquema del objeto raíz (`Proyecto`)

| Clave | Tipo | Req. | Descripción |
|---|---|---|---|
| `version` | entero | **Sí** | Versión del formato. Actual: `1`. Ver §6 migración. |
| `titulo` | string | **Sí** | Nombre del trabajo. Puede estar vacío; por defecto `"Sin proyecto"`. |
| `creado` | string fecha ISO | **Sí** | Momento de creación del proyecto. |
| `puntos` | array de `Punto` (§3) | **Sí** | Puede estar vacío. |
| `log` | array de `LogEntry` (§4) | **Sí** | Puede estar vacío. Orden cronológico (más antiguo primero). |
| `config` | objeto `Config` (§5) | **Sí** | Preferencias que viajan con el proyecto. |
| `puntoActual` | string \| null | No | Clave **opcional** (GT): número del punto actual; null = ninguno. Aditiva, no sube versión. |

## 3. `Punto`

```json
{ "numero": "1", "descripcion": "hito", "norte": 1234.567, "este": 5678.901, "elevacion": 12.34 }
```

| Clave | Tipo | Req. | Notas |
|---|---|---|---|
| `numero` | string | **Sí** | Identificador único **dentro del proyecto**. Acepta enteros como texto (`"12"`) — al importar/crear, se guarda como texto sin ceros a la izquierda. |
| `descripcion` | string | No | Omisible o `""`. |
| `norte` | número | **Sí** | Coordenada local o georreferenciada (Vértice no asume datum ni proyección). Finita. |
| `este` | número | **Sí** | Ídem. |
| `elevacion` | número o `null` | No | `null` / omitida = sin dato; `0` es un valor real distinto. |

Reglas de orden: la tabla muestra los puntos ordenados numéricamente por `numero` si todos los
números son enteros; si no, conserva el orden de inserción (orden en el array).

## 4. `LogEntry`

```json
{ "ts": "2026-09-04T14:05:00Z", "tipo": "nota", "texto": "día nublado, prisma en P3" }
```

| Clave | Tipo | Req. | Notas |
|---|---|---|---|
| `ts` | string fecha ISO | **Sí** | Timestamp de la operación en UTC. |
| `tipo` | string | **Sí** | Categorías conocidas: `sesion`, `proyecto`, `punto`, `importar`, `exportar`, `tr`, `in`, `area`, `nota`, `guardar`, `error`. Un lector **no debe fallar** con un tipo desconocido (los trata como `nota`). |
| `texto` | string | **Sí** | Línea legible por humanos. Las operaciones registran resultados tal como se mostraron (redondeo de presentación aplicado al momento de guardar el texto). |

## 5. `Config`

| Clave | Tipo | Default | Notas |
|---|---|---|---|
| `decimalesNE` | entero ≥ 0 | 5 | Decimales mostrados de Norte/Este. |
| `decimalesElev` | entero ≥ 0 | 3 | Decimales mostrados de elevación/Δelev. |
| `separador` | `"."` o `","` | `","` | Separador decimal **en pantalla**; el archivo siempre usa punto. |
| `descDefault` | string | `""` | Descripción autocompletada en captura manual (campo de trabajo repetitivo). |
| `numeroSiguiente` | entero ≥ 0 | No | Clave **opcional**: número para la próxima captura ("Retomar numeración"). Su ausencia = deducir máximo+1. Cambios así no suben `version` (§6 regla 1). |

## 6. Versionado y migración

1. `version` es un entero que **solo aumenta**. Cambios aditivos que no rompan lectores viejos
   (añadir claves opcionales, nuevos `tipo` de log) **no** requieren subir `version`.
2. El escritor siempre produce `version` actual y nunca escribe un formato de versión anterior.
3. El lector acepta `version` ≤ la de la implementación y:
   - `version` falta o no es `1`: error claro, ni `.bak` ni parse parcial (proteger datos).
   - `version` > soportada: negarse a abrir para escritura, ofrecer `.bak` o abrir en modo lectura (futuro).
4. Cuando haya cambios incompatibles se definirá una cadena de migración por pasos
   (`migrar_v1_a_v2`, …) en `src/formato.ts` y se documentará aquí mismo con: motivo, regla campo
   a campo y ejemplo antes/después. Las migraciones nunca descartan `puntos` ni `log` sin avisar.
5. El JSON de cualquier versión **debe conservar** todas las claves de §2 en el root; los arrays
   `puntos`/`log` sin límites de tamaño.

## 7. Ejemplo mínimo válido

```json
{
  "version": 1,
  "titulo": "Sin proyecto",
  "creado": "2026-09-04T14:05:00Z",
  "puntos": [],
  "log": [
    { "ts": "2026-09-04T14:05:00Z", "tipo": "sesion", "texto": "Proyecto creado: Sin proyecto" }
  ],
  "config": { "decimalesNE": 5, "decimalesElev": 3, "separador": ",", "descDefault": "" }
}
```

## 8. Fuera del alcance de este documento

Carpeta de proyectos recientes y preferencia global de UI viven en AppData/config externa —
**nunca** dentro del `.vertice` (el job debe poder copiarse entre máquinas intacto).
Fase 2 evaluará adjuntar contornos/dibujos como claves opcionales (§6 regla 1).
