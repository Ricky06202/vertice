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
        if std::env::var_os("GDK_BACKEND").is_none() && std::env::var_os("WAYLAND_DISPLAY").is_some() {
            std::env::set_var("GDK_BACKEND", "wayland");
        }
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
