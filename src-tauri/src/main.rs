// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // === Workaround WebKitGTK/NixOS+Hyprland (devicePixelRatio negativo) ===
    // Sin proveedor de XSettings, `gdk_x11_screen_get_resolution()` devuelve el
    // centinela -1 y WebKitGTK 2.52 lo propaga: dpr = -1/96 → la pantalla quedó
    // insensible a font-size/zoom. Forzar un xft-dpi sano (96dpi = 98304/1024)
    // y, si hay compositor Wayland, backend nativo (wl_output.scale sí es fiable).
    #[cfg(target_os = "linux")]
    {
        // IMPORTANTE: no forzar GDK_BACKEND=wayland. Sobre Hyprland, la salida
        // Wayland no reporta tamaño físico y WebKitGTK 2.52 calcula un DPI
        // negativo (dpr = -1/96) que deja la vista insensible a zoom/font-size.
        // Con DISPLAY presente, GTK usa X11/XWayland, donde si hay Xft.dpi o
        // xsettingsd el dpr es el correcto.
        let actuales = std::env::var("GTK_SETTINGS").unwrap_or_default();
        if !actuales.contains("xft-dpi") {
            let nuevo = if actuales.is_empty() {
                "gtk-xft-dpi=98304".to_string()
            } else {
                format!("{actuales} gtk-xft-dpi=98304")
            };
            std::env::set_var("GTK_SETTINGS", nuevo);
        }
    }
    vertice_lib::run()
}
