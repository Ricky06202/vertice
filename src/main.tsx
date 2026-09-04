import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { aplicarZoom } from "./state/zoom";

// tamaño de interfaz recordado (pantallas 4K cuyo escalado no llega al webview): zoom del webview
void aplicarZoom();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
