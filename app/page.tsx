"use client";

import { useState } from "react";
import QRCode from "qrcode";
import FilmStrip from "@/components/FilmStrip";

const previewPhotos = [
  "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=900&q=80",
];

export default function HomePage() {
  const [title, setTitle] = useState("");
  const [hostEmail, setHostEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [event, setEvent] = useState<{ slug: string; title: string; hostToken?: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function handleCreate() {
    if (!title.trim()) {
      setError("Digite um nome para o evento.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, hostEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao criar evento.");

      setEvent(data.event);
      if (data.event?.hostToken) {
        window.localStorage.setItem(`event-host-token:${data.event.slug}`, data.event.hostToken);
      }
      const uploadUrl = `${baseUrl}/e/${data.event.slug}/upload`;
      const qr = await QRCode.toDataURL(uploadUrl, { width: 420, margin: 2 });
      setQrDataUrl(qr);
    } catch (e: any) {
      setError(e.message || "Algo deu errado.");
    } finally {
      setCreating(false);
    }
  }

  if (event) {
    const uploadUrl = `${baseUrl}/e/${event.slug}/upload`;
    const galleryUrl = `${baseUrl}/gallery/${event.slug}`;

    return (
      <main className="page-shell">
        <div className="page-card">
          <div className="glass-panel hero-panel">
            <div className="hero-panel__content">
              <div className="eyebrow">Evento pronto</div>
              <h1>{event.title}</h1>
              <p className="lead-text">
                A galeria vai se formando em tempo real enquanto os convidados enviam as fotos do casamento.
              </p>

              <div className="inline-actions">
                <a className="btn-primary" href={galleryUrl}>Abrir galeria ao vivo</a>
                <a className="btn-secondary" href={uploadUrl}>Enviar foto</a>
                <a className="btn-secondary" href={`/host/${event.slug}/moderate`}>Moderar fotos</a>
              </div>
            </div>

            <div className="qr-panel">
              <div className="qr-panel__frame">
                {qrDataUrl ? <img className="qr-code" src={qrDataUrl} alt="QR code do evento" /> : null}
              </div>
              <div className="qr-meta">
                <span className="mini-label">URL de upload</span>
                <code>{uploadUrl}</code>
              </div>
            </div>
          </div>
          <FilmStrip />
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="page-card hero-layout">
        <section className="glass-panel hero-panel">
          <div className="hero-panel__content">
            <div className="eyebrow">Cabine de fotos do casamento</div>
            <h1>Transforme o casamento em uma galeria em tempo real.</h1>
            <p className="lead-text">
              Crie um evento, gere o QR code e deixe convidados mandarem fotos direto do celular com uma experiência moderna e instantânea.
            </p>

            <div className="field-group">
              <label className="field-label" htmlFor="event-name">Nome do evento</label>
              <input
                id="event-name"
                className="field-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ana & Rafael — 14 de novembro"
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="host-email">E-mail do responsável</label>
              <input
                id="host-email"
                className="field-input"
                value={hostEmail}
                onChange={(e) => setHostEmail(e.target.value)}
                placeholder="voce@email.com"
                type="email"
              />
            </div>

            {error ? <p className="status error">{error}</p> : null}

            <button className="btn-primary" onClick={handleCreate} disabled={creating}>
              {creating ? "Criando evento…" : "Gerar QR do evento"}
            </button>
          </div>

          <div className="photo-mosaic" aria-hidden="true">
            {previewPhotos.map((src, index) => (
              <img
                key={src}
                src={src}
                alt=""
                className={`photo-mosaic__item photo-mosaic__item--${index + 1}`}
                style={{ transform: `rotate(${index % 2 === 0 ? "-8deg" : "8deg"})` }}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
