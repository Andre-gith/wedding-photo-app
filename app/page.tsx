"use client";

import { useState } from "react";
import QRCode from "qrcode";
import FilmStrip from "@/components/FilmStrip";

export default function HomePage() {
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [event, setEvent] = useState<{ slug: string; title: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function handleCreate() {
    if (!title.trim()) {
      setError("Digite um nome pro evento.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao criar evento.");

      setEvent(data.event);
      const uploadUrl = `${baseUrl}/e/${data.event.slug}/upload`;
      const qr = await QRCode.toDataURL(uploadUrl, { width: 400, margin: 1 });
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
          <div className="card">
            <FilmStrip top />
            <div className="card-inner">
              <div className="hero">
                <div className="hero__header">
                  <span className="eyebrow">Cabine instantânea</span>
                  <h1>{event.title}</h1>
                  <p className="page-subtitle">
                    Imprima ou exponha esse QR code no local do evento para receber fotos em tempo real.
                  </p>
                </div>

                <div className="event-qr">
                  <div className="qr-panel">
                    {qrDataUrl && (
                      <img className="qr-code" src={qrDataUrl} alt="QR code do evento" />
                    )}
                    <p className="qr-link">{uploadUrl}</p>
                  </div>

                  <div className="inline-actions">
                    <a className="btn-primary" href={galleryUrl}>
                      Ver galeria ao vivo
                    </a>
                    <a className="btn-secondary" href={uploadUrl}>
                      Abrir upload
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <FilmStrip />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="page-card">
        <div className="card">
          <FilmStrip top />
          <div className="card-inner">
            <div className="hero__header">
              <span className="eyebrow">Criar evento</span>
              <h1 className="page-title">Cabine de fotos do casamento</h1>
              <p className="page-subtitle">
                Dê um nome ao evento e gere um QR code para os convidados enviarem fotos direto do celular.
              </p>
            </div>

            <div className="form-grid" style={{ marginTop: 24 }}>
              <label className="field-group">
                <span className="field-label">Nome do evento</span>
                <input
                  className="field-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ana & Rafael — 14 de novembro"
                />
              </label>

              {error && <p className="status error">{error}</p>}

              <button className="btn-primary" onClick={handleCreate} disabled={creating}>
                {creating ? "Criando…" : "Gerar QR code"}
              </button>
            </div>
          </div>
          <FilmStrip />
        </div>
      </div>
    </main>
  );
}
