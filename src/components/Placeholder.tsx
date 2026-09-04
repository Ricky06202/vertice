type Props = {
  titulo: string;
  texto: string;
  glyph: string;
  fase2: boolean;
};

function Placeholder({ titulo, texto, glyph, fase2 }: Props) {
  return (
    <section className="card grid place-items-center gap-5 py-16 text-center">
      <span
        aria-hidden="true"
        className="grid size-20 place-items-center rounded-full bg-accent-soft text-4xl font-black text-accent-strong"
      >
        {glyph}
      </span>
      <h2 className="text-3xl font-extrabold tracking-tight">{titulo}</h2>
      <p className="max-w-md text-lg text-ink-soft">{texto}</p>
      {fase2 ? (
        <span className="rounded-full bg-accent-soft px-4 py-1.5 text-base font-bold text-accent-strong">
          Disponible en Fase 2
        </span>
      ) : (
        <p className="text-base text-ink-soft/70">
          En construcción — esta sección llega en las próximas entregas.
        </p>
      )}
    </section>
  );
}

export default Placeholder;
