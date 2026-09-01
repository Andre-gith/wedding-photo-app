"use client";

import { useEffect, useState } from "react";

interface Photo {
  id: string;
  guestName: string;
  imageUrl: string;
  thumbnailUrl: string;
  createdAt: string;
}

function getTokenFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("hostToken") || params.get("token") || "";
}

export default function ModeratePage({ params }: { params: { slug: string } }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [hostToken, setHostToken] = useState<string>("");
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [accessError, setAccessError] = useState("");

  async function loadPhotos(tokenValue?: string) {
    const queryToken = getTokenFromUrl();
    const storageToken =
      window.localStorage.getItem(`event-host-token:${params.slug}`) ||
      window.sessionStorage.getItem(`event-host-token:${params.slug}`) ||
      "";
    const token = tokenValue || hostToken || queryToken || storageToken;
    setLoading(true);

    if (!token) {
      setAccessError("Acesso restrito ao criador do evento. Abra esta página a partir do evento criado no mesmo navegador.");
      setPhotos([]);
      setTitle("");
      setLoading(false);
      return;
    }

    // Guarda o token assim que descoberto, pra sobreviver a um refresh
    // de página mesmo que o parâmetro suma da URL depois.
    window.localStorage.setItem(`event-host-token:${params.slug}`, token);

    const res = await fetch(`/api/events/${params.slug}/photos?mode=moderation&hostToken=${encodeURIComponent(token)}`, { cache: "no-store" });
    const data = await res.json();

    if (!res.ok) {
      setAccessError(res.status === 403 ? "Acesso restrito ao criador do evento." : data.error || "Não foi possível carregar as fotos.");
      setPhotos([]);
      setTitle("");
      setLoading(false);
      return;
    }

    setAccessError("");
    setTitle(data.event.title);
    setPhotos(data.photos || []);
    setLoading(false);
  }

  useEffect(() => {
    const queryToken = getTokenFromUrl();
    const storageToken =
      window.localStorage.getItem(`event-host-token:${params.slug}`) ||
      window.sessionStorage.getItem(`event-host-token:${params.slug}`) ||
      "";
    const token = queryToken || storageToken;
    setHostToken(token);
    loadPhotos(token);
  }, [params.slug]);

  async function handleDelete(photoId: string) {
    const confirmed = window.confirm("Tem certeza que deseja excluir esta foto? Essa ação remove a foto do banco e do storage.");
    if (!confirmed) return;

    setBusyId(photoId);
    try {
      const res = await fetch(`/api/events/${params.slug}/photos?photoId=${photoId}&hostToken=${encodeURIComponent(hostToken)}`, {
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

  async function handleDownloadApproved() {
    if (!hostToken) {
      alert("Acesso restrito ao criador do evento.");
      return;
    }

    setDownloadBusy(true);
    try {
      const res = await fetch(`/api/events/${params.slug}/photos?mode=download&hostToken=${encodeURIComponent(hostToken)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível obter as fotos aprovadas.");

      for (const photo of data.photos || []) {
        const anchor = document.createElement("a");
        anchor.href = photo.imageUrl;
        anchor.download = `${photo.guestName || "foto"}.jpg`;
        anchor.target = "_blank";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      }
    } catch (error: any) {
      alert(error.message || "Erro ao baixar as fotos.");
    } finally {
      setDownloadBusy(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="page-card" style={{ maxWidth: 1100 }}>
        <div className="glass-panel gallery-panel">
          <div className="gallery-header">
            <div>
              <span className="eyebrow">Moderação</span>
              <h1>{title || "Moderar fotos"}</h1>
            </div>
            <div className="inline-actions">
              <button className="btn-secondary" onClick={handleDownloadApproved} disabled={downloadBusy || !hostToken}>
                {downloadBusy ? "Baixando…" : "Baixar fotos aprovadas"}
              </button>
              <a className="btn-secondary" href={`/gallery/${params.slug}`}>
                Ver galeria
              </a>
            </div>
          </div>

          {accessError ? (
            <div className="empty-state">
              <p>{accessError}</p>
            </div>
          ) : loading ? (
            <div className="empty-state">
              <p>Carregando fotos…</p>
            </div>
          ) : photos.length > 0 ? (
            <div className="moderation-grid">
              {photos.map((photo) => (
                <div key={photo.id} className="moderation-card">
                  <img src={photo.imageUrl} alt={`Foto de ${photo.guestName}`} />
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