export default function FilmStrip({ top = false }: { top?: boolean }) {
  const holes = Array.from({ length: 18 });

  return (
    <div className={`film-strip ${top ? "film-strip--top" : "film-strip--bottom"}`} aria-hidden="true">
      <div className="film-strip__holes">
        {holes.map((_, index) => (
          <span key={index} className="film-strip__hole" />
        ))}
      </div>
    </div>
  );
}
