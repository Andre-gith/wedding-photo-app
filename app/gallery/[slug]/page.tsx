"use client";

import { useEffect, useState } from "react";
import FilmStrip from "@/components/FilmStrip";

interface Photo {
  id: string;
  guestName: string;
  thumbnailUrl: string;
  createdAt: string;
}

export default function GalleryPage({ params }: { params: { slug: string } }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [title, setTitle] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const res = await fetch(`/api/events/${params.slug}/photos`, { cache: "no-store" });
      if (!res.ok || !active) return;
      const data = await res.json();
      setTitle(data.event.title);
      setPhotos(data.photos);
    }

    load();
    const id = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [params.slug]);

  return (
    <main className="page-shell">
      <div className="page-card" style={{ maxWidth: 1080 }}>
        <div className="card">
          <FilmStrip top />
          <div className="card-inner gallery-shell">
            <div className="hero__header">
              <span className="eyebrow">Galeria ao vivo</span>
              <h1 className="page-title" style={{ fontSize: "clamp(2.2rem, 8vw, 4rem)" }}>
                {title || "Galeria"}
              </h1>
            </div>

            {photos.length > 0 ? (
              <div className="gallery-grid">
                {photos.map((photo, index) => (
                  <figure
                    key={photo.id}
                    className="polaroid"
                    style={{ transform: `rotate(${(index % 2 === 0 ? -1 : 1) * (index % 4 === 0 ? 2.2 : 1.3)}deg)` }}
                  >
                    <span className="tape" aria-hidden="true" />
                    <img
                      src={photo.thumbnailUrl}
                      alt={`Foto de ${photo.guestName}`}
                    />
                    <figcaption className="polaroid__caption">{photo.guestName}</figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>Nenhuma foto ainda. Quando os convidados enviarem, elas aparecem aqui.</p>
              </div>
            )}
          </div>
          <FilmStrip />
        </div>
      </div>
    </main>
  );
}
