"use client";

import { useEffect, useState } from "react";

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
      <div className="page-card" style={{ maxWidth: 1120 }}>
        <div className="glass-panel gallery-panel">
          <div className="gallery-header">
            <div>
              <span className="eyebrow">Live gallery</span>
              <h1>{title || "Galeria"}</h1>
            </div>
            <div className="gallery-badge">
              {photos.length} {photos.length === 1 ? "foto" : "fotos"}
            </div>
          </div>

          {photos.length > 0 ? (
            <div className="gallery-grid">
              {photos.map((photo, index) => (
                <figure
                  key={photo.id}
                  className="photo-card"
                  style={{ transform: `rotate(${(index % 2 === 0 ? -1 : 1) * (index % 4 === 0 ? 2.2 : 1.3)}deg)` }}
                >
                  <img src={photo.thumbnailUrl} alt={`Foto de ${photo.guestName}`} />
                  <figcaption>{photo.guestName}</figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>Nenhuma foto ainda. Quando os convidados enviarem, elas aparecem aqui.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
