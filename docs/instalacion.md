# Instalación de Vértice

> Vértice es 100 % offline: no necesita internet para trabajar, ni cuentas, ni telemetría.
> Licencia GPL-3.0-or-later. Formato de proyecto: un solo archivo `.vertice`.

## Requisitos mínimos

| | Windows | Linux |
|---|---|---|
| Sistema | Windows 10/11 (64 bits) | Cualquier distribución con glibc (Debian/Ubuntu, Fedora, Arch…) |
| Librerías | WebView2 (viene en Windows 11; el instalador ofrece descargarla en Windows 10 si falta) | WebKitGTK 4.1 (el `.deb` arrastra las dependencias; el AppImage no, ver más abajo) |
| RAM / disco | 2 GB / ~200 MB | 2 GB / ~200 MB |
| Extra AppImage | — | `libfuse2` (o modo de extracción, sin fuse) |

No necesita impresora especial: se imprime desde el diálogo del sistema.

## Instalación en Windows (instalador NSIS)

1. Descargue de la página **Releases** del repositorio
   (<https://github.com/Ricky06202/vertice>) el archivo `Vértice_x.y.z_x64-setup.exe`
   (o con el nombre equivalente `Vértice … nsis`).
2. Ejecútelo con doble clic. Si Windows SmartScreen avisa de "editor desconocido"
   (los builds comunitarios no están firmados), pulse **Más información → Ejecutar
   de todas formas**.
3. Termine el asistente; verá los accesos **Vértice** en el menú Inicio y el
   escritorio. Puede elegir "ejecutar al cerrar".
4. La instalación registra la asociación de archivos: un `.vertice` aparece con el
   icono ▲ de Vértice.

## Instalación en Linux

### Opción A — paquete `.deb` (Debian, Ubuntu y derivados)

```bash
sudo apt install ./vertice_x.y.z_amd64.deb   # resuelve dependencias (webkit2gtk-4.1, etc.)
```

Tras instalarlo, Vértice aparece en el menú de aplicaciones y registra
`.vertice` (`xdg-mime` lo ofrece como visor).

### Opción B — AppImage (cualquier distribución)

```bash
chmod +x Vertice_x.y.z_amd64.AppImage
./Vertice_x.y.z_amd64.AppImage
```

- Pide `libfuse2`: en Debian/Ubuntu `sudo apt install libfuse2`; en Fedora
  `sudo dnf install fuse-libs`.
- **Sin fuse** (o en sistemas inmutables), modo extracción — funciona igual:
  ```bash
  ./Vertice_x.y.z_amd64.AppImage --appimage-extract
  ./squashfs-root/vertice
  ```
  Cree un lanzador de escritorio apuntando a `squashfs-root/vertice` si lo usa a diario.
- El AppImage **no instala** asociaciones de archivos: úselo con "Abrir…" dentro
  de la app, o siga el apartado de doble clic más abajo.

### NixOS

Las binarias `.deb`/AppImage no encajan bien en NixOS (no encontró las librerías de
sistema). Por ahora, en NixOS use el entorno de desarrollo del repo (§
Desarrollo con Nix); el empaquetado Nix "de producción" está planificado como
trabajo comunitario. En `nixdots` se puede añadir un `nix profile install` en
cuando exista `.#packages`.

## Abrir un job `.vertice` con doble clic

- **Windows**: instalado con NSIS, basta doble clic sobre el archivo. Si Windows pregunta
  "¿Qué aplicación desea usar?", elija Vértice y marque "siempre".
- **Linux con .deb**: igual (doble clic en el administrador de archivos). Si su entorno
  aún abre otra app (por ejemplo una AppImage vieja que se registra como "text/plain"),
  fíjelo a mano:
  ```bash
  xdg-mime default app.vertice.desktop application/vertice
  ```
- Dentro de Vértice siempre quedan el botón **Abrir** y la lista de **recientes**.
- El trabajo se guarda automáticamente: al cerrar la ventana, se escribe
  `archivo.vertice` y se conserva `archivo.vertice.bak` con el contenido previo.
  Si un archivo resulta dañado, al abrirlo Vértice ofrece recuperar desde el `.bak`.

## Desarrollo

### Con bun (cualquier Linux/Windows)

```bash
git clone https://github.com/Ricky06202/vertice && cd vertice
bun install

# solo la interfaz, en navegador (sin diálogos nativos de disco):
bun run dev

# app completa (primera vez: compila Rust, puede tardar varios minutos):
bun run tauri dev

# pruebas unitarias del motor topográfico:
bun test

# binarios de distribución (en Linux: .deb y AppImage; en Windows: NSIS):
bun run tauri build
```

En Linux se necesitan las librerías de desarrollo de Tauri una sola vez en el equipo:

```bash
# Debian/Ubuntu
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

### Con Nix (flakes; así se desarrolla en los equipos de Ricky)

```bash
cd vertice
nix develop .#vertice        # bun, rust, webkitgtk… todo dentro del shell
bun install && bun run tauri dev
```

Comprobar los flujos rápidos: `nix flake check`, `bun run build` (typecheck +
frontend), `bun test`.

## Problemas comunes

| Síntoma | Solución |
|---|---|
| Windows: ventana en blanco o el instalador no arranca en Win10 | Falta el runtime **Microsoft Edge WebView2**: https://developer.microsoft.com/microsoft-edge/webview2/ |
| Antivirus/SmartScreen bloquea el instalador `.exe` | Builds sin firma digital: verifique el hash del Release y elija "Ejecutar de todas formas"; repórtelo si persiste |
| `error while loading shared libraries: libwebkit2gtk-4.1` | Ejecutó el AppImage/binario sin instalar el `.deb` o las librerías: use la vía A (apt) o instale `libwebkit2gtk-4.1-0` de su distro |
| AppImage: `dlopen(): error loading libfuse.so.2` | Instale libfuse2 o use `--appimage-extract` (arriba) |
| Nada ocurre al hacer doble clic un `.vertice` | La asociación solo queda al instalar (NSIS) o con el `.deb` y `xdg-mime`; pruebe botón **Abrir** |
| "No se puede leer el archivo" al abrir | Si existe el `.bak`, Vértice ofrece recuperarlo; cómpartalo (borrando datos sensibles) reportando un Issue con el archivo dañado |
| Se pierde el trabajo tras un corte | Reabra `nombre.vertice` (autoguardado cada pocos segundos); si eso falla, abra `nombre.vertice.bak` y renómbralo |
| En NixOS `bun run tauri dev` falla al buscar librerías | Ejecute siempre dentro de `nix develop .#vertice`, no en el shell del sistema |
| El diálogo Abrir/Guardar no aparece | Son diálogos nativos: si acaba de instalar, reinicie el entorno de escritorio; no se muestra con `bun run dev` en navegador (normal) |
