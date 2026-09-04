function App() {
  return (
    <main className="grid min-h-screen place-items-center p-8">
      <div className="card w-full max-w-xl grid gap-4">
        <header className="grid gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-accent">
            Vértice
          </h1>
          <p className="text-lg text-ink-soft">
            Programa libre de topografía — MVP en desarrollo
          </p>
        </header>

        <p className="text-lg">
          Tarjeta de muestra del tema: neutro cálido, acento verde profundo y
          botones grandes pensados para usarse sin gafas de cerca.
        </p>

        <label className="grid gap-2 text-base font-medium">
          Ejemplo de campo
          <input
            type="text"
            placeholder="Escribe un número de punto…"
            className="min-h-12 rounded-xl border border-line bg-surface px-4 text-lg placeholder:text-ink-soft/60"
          />
        </label>

        <footer className="flex flex-wrap gap-4 pt-2">
          <button type="button" className="btn btn-primary">
            Acción principal
          </button>
          <button type="button" className="btn btn-secondary">
            Acción secundaria
          </button>
        </footer>
      </div>
    </main>
  );
}

export default App;
