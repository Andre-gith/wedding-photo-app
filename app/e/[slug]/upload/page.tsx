"use client";

import { useRef, useState } from "react";
import FilmStrip from "@/components/FilmStrip";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024;

async function compressImageForUpload(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD_BYTES) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const loadedImage = new Image();
      loadedImage.onload = () => resolve(loadedImage);
      loadedImage.onerror = () => reject(
        new Error("Não foi possível ler esta foto neste navegador. Escolha uma imagem JPEG ou PNG."),
      );
      loadedImage.src = objectUrl;
    });

    const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar a foto neste navegador.");

    const qualities = [0.84, 0.76, 0.68, 0.6];
    for (let resizeAttempt = 0; resizeAttempt < 5; resizeAttempt++) {
      const resizeScale = scale * 0.8 ** resizeAttempt;
      canvas.width = Math.max(1, Math.round(image.naturalWidth * resizeScale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * resizeScale));
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      for (const quality of qualities) {
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, "image/jpeg", quality);
        });
        if (blob && blob.size <= MAX_UPLOAD_BYTES) {
          const filename = file.name.replace(/\.[^.]+$/, "") || "foto";
          return new File([blob], `${filename}.jpg`, {
            type: "image/jpeg",
            lastModified: file.lastModified,
          });
        }
      }
    }

    throw new Error("Não foi possível reduzir esta foto o suficiente. Escolha uma imagem menor.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

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

    try {
      if (file.size > MAX_ORIGINAL_BYTES) {
        throw new Error("A foto original deve ter no máximo 15 MB.");
      }

      const uploadFile = await compressImageForUpload(file);
      const formData = new FormData();
      formData.append("photo", uploadFile);
      formData.append("guestName", name.trim() || "Convidado");

      const res = await fetch(`/api/events/${params.slug}/photos`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          data?.error ||
            (res.status === 413
              ? "A foto excedeu o limite de envio. Escolha uma imagem menor."
              : "Falha ao enviar a foto. Tente novamente."),
        );
      }
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
              {sending ? "Preparando e enviando…" : "Tirar ou escolher foto"}
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
