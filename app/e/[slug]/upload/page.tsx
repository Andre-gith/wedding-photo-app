"use client";

import { useRef, useState } from "react";
import FilmStrip from "@/components/FilmStrip";

export default function UploadPage({ params }: { params: { slug: string } }) {
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const galleryUrl = `/gallery/${params.slug}`;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setSending(true);
    setSent(false);
    setError("");

    const formData = new FormData();
    formData.append("photo", file);
    formData.append("guestName", name.trim() || "Convidado");

    try {
      const res = await fetch(`/api/events/${params.slug}/photos`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao enviar.");
      setSent(true);
    } catch (err: any) {
      setError(err.message || "N\u00e3o foi poss\u00edvel enviar a foto.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="page-card" style={{ maxWidth: 540 }}>
        <div className="glass-panel upload-panel">
          <div className="hero-panel__content upload-intro">
            <span className="eyebrow">Compartilhe o momento</span>
            <h1>Registre esse momento</h1>
            <p className="lead-text">
              A foto vai aparecer na galeria ao vivo do evento em poucos segundos.
            </p>
          </div>

          <div className="form-grid upload-form">
            <label className="field-group">
              <span className="field-label">Seu nome</span>
              <input
                className="field-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome (opcional)"
              />
            </label>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              style={{ display: "none" }}
            />

            <button
              className="btn-primary"
              onClick={() => inputRef.current?.click()}
              disabled={sending}
            >
              {sending ? "Enviando…" : "Tirar ou escolher foto"}
            </button>

            <a className="btn-secondary" href={galleryUrl}>
              Ver galeria
            </a>

            {sent && (
              <p className="status success" aria-live="polite">
                Foto enviada. Obrigado!
              </p>
            )}
            {error && <p className="status error" aria-live="assertive">{error}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
