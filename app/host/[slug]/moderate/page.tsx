"use client";

import { useEffect, useState } from "react";

interface Photo {
  id: string;
  guestName: string;
  thumbnailUrl: string;
  createdAt: string;
}

export default function ModeratePage({ params }: { params: { slug: string } }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadPhotos() {
    setLoading(true);
    const res = await fetch(`/api/events/${params.slug}/photos?mode=moderation`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      setPhotos([]);
      setTitle("");
      setLoading(false);
      return;
    }

    setTitle(data.event.title);
    setPhotos(data.photos || []);
    setLoading(false);
  }

  useEffect(() => {
    loadPhotos();
  }, [params.slug]);

  async function handleDelete(photoId: string) {
    const confirmed = window.confirm("Tem certeza que deseja excluir esta foto? Essa ação remove a foto do banco e do storage.");
    if (!confirmed) return;

    setBusyId(photoId);
    try {
      const res = await fetch(`/api/events/${params.slug}/photos?photoId=${photoId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível excluir a foto.");
      await loadPhotos();
    } catch (error: any) {
      alert(error.message || "Erro ao excluir a foto.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="page-shell">
      <div className="page-card" style={{ maxWidth: 1100 }}>
        <div className="glass-panel gallery-panel">
          <div className="gallery-header">
            <div>
              <span className="eyebrow">Moderation</span>
              <h1>{title || "Moderar fotos"}</h1>
            </div>
            <a className="btn-secondary" href={`/gallery/${params.slug}`}>
              Ver galeria
            </a>
          </div>

          {loading ? (
            <div className="empty-state">
              <p>Carregando fotos…</p>
            </div>
          ) : photos.length > 0 ? (
            <div className="moderation-grid">
              {photos.map((photo) => (
                <div key={photo.id} className="moderation-card">
                  <img src={photo.thumbnailUrl} alt={`Foto de ${photo.guestName}`} />
                  <div className="moderation-card__meta">
                    <span>{photo.guestName}</span>
                    <span>{new Date(photo.createdAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <button
                    className="moderation-card__delete"
                    onClick={() => handleDelete(photo.id)}
                    disabled={busyId === photo.id}
                  >
                    {busyId === photo.id ? "Excluindo…" : "Excluir foto"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>Nenhuma foto para moderar neste evento.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
