{
  description = "Vértice — programa libre de topografía (Tauri v2 + React + TypeScript + Vite)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems f;
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = import nixpkgs {
            inherit system;
            config.allowUnfree = true;
          };
        in
        {
          vertice = pkgs.mkShell {
            name = "vertice-dev";

            packages = with pkgs; [
              # JS/TS
              bun
              nodejs_22 # fallback por si algo pide runtime Node

              # Rust (Tauri backend)
              cargo
              rustc
              rustfmt
              clippy
              pkg-config
              gnumake

              # Prerrequisitos Linux para Tauri v2
              openssl
              glib
              gtk3
              webkitgtk_4_1
              libsoup_3
              # TODO: javascriptcoregtk ya no existe como paquete suelto en nixpkgs
              # actual (viene incluido dentro de webkitgtk_4_1).
              libappindicator-gtk3
              zlib

              # gsettings schemas para que corra el binario en dev
              gsettings-desktop-schemas
            ];

            # Nota: pkg-config, PKG_CONFIG_PATH y XDG_DATA_DIRS (gsettings) ya los
            # arma mkShell a partir de los packages; el hook solo verifica el entorno.
            shellHook = ''
              echo "Vértice dev shell: bun $(bun --version), cargo $(cargo --version), webkit $(pkg-config --modversion webkit2gtk-4.1)"
            '';
          };
        }
      );
    };
}
