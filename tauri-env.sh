# Entorno temporal de Tauri para probar en NixOS SIN el flake del proyecto.
# Exporta PKG_CONFIG_PATH a los .pc de las libs ya declaradas en el system.
# Uso:  source tauri-env.sh   y luego  cargo check / npm run tauri dev
export PKG_CONFIG_PATH="$(nix --extra-experimental-features 'nix-command flakes' eval --raw 'nixpkgs#glib.dev.outPath' 2>/dev/null)/lib/pkgconfig:$(nix --extra-experimental-features 'nix-command flakes' eval --raw 'nixpkgs#gtk3.dev.outPath' 2>/dev/null)/lib/pkgconfig:$(nix --extra-experimental-features 'nix-command flakes' eval --raw 'nixpkgs#webkitgtk_4_1.dev.outPath' 2>/dev/null)/lib/pkgconfig:$(nix --extra-experimental-features 'nix-command flakes' eval --raw 'nixpkgs#libsoup_3.dev.outPath' 2>/dev/null)/lib/pkgconfig:$(nix --extra-experimental-features 'nix-command flakes' eval --raw 'nixpkgs#javascriptcoregtk_4_1.dev.outPath' 2>/dev/null)/lib/pkgconfig:$(nix --extra-experimental-features 'nix-command flakes' eval --raw 'nixpkgs#openssl.dev.outPath' 2>/dev/null)/lib/pkgconfig:${PKG_CONFIG_PATH:-}"
echo "PKG_CONFIG_PATH set. Verificando..."
for lib in glib-2.0 gtk+-3.0 webkit2gtk-4.1 javascriptcoregtk-4.1 libsoup-3.0 openssl; do
  pkg-config --exists "$lib" && echo "  $lib: OK" || echo "  $lib: NO"
done
