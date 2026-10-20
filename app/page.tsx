"use client";

import { useEffect, useState } from "react";
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
  const [plan, setPlan] = useState<"FREE" | "PAID">("FREE");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");
  const [paymentChecking, setPaymentChecking] = useState(false);
  const [event, setEvent] = useState<{
    slug: string;
    title: string;
    hostToken?: string;
    plan?: "FREE" | "PAID" | "LEGACY";
    photoLimit?: number;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "cancelled") {
      setPaymentNotice("O pagamento foi cancelado. Você pode escolher um plano e tentar novamente.");
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    const sessionId = params.get("session_id");
    if (payment !== "success" || !sessionId) return;

    let active = true;
    setPaymentChecking(true);
    setPaymentNotice("Verificando a confirmação do pagamento…");

    async function verifyPayment() {
      try {
        let res: Response | undefined;
        for (let attempt = 0; attempt < 6; attempt++) {
          res = await fetch(`/api/billing/session?session_id=${encodeURIComponent(sessionId!)}`, {
            cache: "no-store",
          });
          if (res.status !== 202) break;
          await new Promise((resolve) => window.setTimeout(resolve, 2000));
        }

        const data = await res!.json();
        if (!res!.ok) throw new Error(data.error || "Não foi possível confirmar o pagamento.");
        if (!active) return;

        const paidEvent = data.event;
        const tokenKey = `event-host-token:${paidEvent.slug}`;
        const hostToken =
          window.sessionStorage.getItem(tokenKey) ||
          window.localStorage.getItem(tokenKey) ||
          undefined;
        setEvent({ ...paidEvent, hostToken });
        const uploadUrl = `${window.location.origin}/e/${paidEvent.slug}/upload`;
        setQrDataUrl(await QRCode.toDataURL(uploadUrl, { width: 420, margin: 2 }));
        setPaymentNotice("");
        window.history.replaceState({}, "", window.location.pathname);
      } catch (err) {
        if (active) {
          setPaymentNotice(
            err instanceof Error ? err.message : "Não foi possível confirmar o pagamento.",
          );
        }
      } finally {
        if (active) setPaymentChecking(false);
      }
    }

    void verifyPayment();
    return () => {
      active = false;
    };
  }, []);

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
        body: JSON.stringify({ title, hostEmail, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao criar evento.");

      if (data.event?.hostToken) {
        const tokenKey = `event-host-token:${data.event.slug}`;
        window.localStorage.setItem(tokenKey, data.event.hostToken);
        window.sessionStorage.setItem(tokenKey, data.event.hostToken);
      }
      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }

      setEvent(data.event);
      const uploadUrl = `${baseUrl}/e/${data.event.slug}/upload`;
      const qr = await QRCode.toDataURL(uploadUrl, { width: 420, margin: 2 });
      setQrDataUrl(qr);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo deu errado.");
    } finally {
      setCreating(false);
    }
  }

  if (event) {
    const uploadUrl = `${baseUrl}/e/${event.slug}/upload`;
    const galleryUrl = `${baseUrl}/gallery/${event.slug}`;
    const moderationUrl = event.hostToken
      ? `/host/${event.slug}/moderate?hostToken=${encodeURIComponent(event.hostToken)}`
      : `/host/${event.slug}/moderate`;

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
              {event.plan ? (
                <p className="event-plan-note">
                  Plano {event.plan === "PAID" ? "completo" : event.plan === "FREE" ? "gratuito" : "clássico"} ·
                  {" "}até {event.photoLimit ?? 500} fotos
                </p>
              ) : null}

              <div className="inline-actions">
                <a className="btn-primary" href={galleryUrl}>Abrir galeria ao vivo</a>
                <a className="btn-secondary" href={uploadUrl}>Enviar foto</a>
                <a className="btn-secondary" href={moderationUrl}>Moderar fotos</a>
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
    <main className="landing-page">
      <header className="landing-nav">
        <a className="landing-brand" href="/" aria-label="Laço — início">
          <span className="landing-brand__mark" aria-hidden="true">l</span>
          <span>laço</span>
        </a>
        <nav className="landing-nav__links" aria-label="Navegação principal">
          <a href="#como-funciona">Como funciona</a>
          <a href="#vantagens">Vantagens</a>
        </nav>
        <a className="landing-nav__cta" href="#criar">Criar meu evento <span aria-hidden="true">↗</span></a>
      </header>

      <section className="landing-hero">
        <div className="landing-hero__copy">
          <div className="landing-kicker"><span aria-hidden="true">✳</span> Cada olhar guarda uma lembrança</div>
          <h1>O seu grande dia, visto por <em>todos os ângulos.</em></h1>
          <p className="landing-hero__description">
            Reúna as fotos dos seus convidados em uma galeria só. É só escanear o QR code e enviar — sem instalar aplicativo.
          </p>

          <form
            id="criar"
            className="landing-create-card"
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreate();
            }}
          >
            <div className="landing-create-card__heading">
              <span>Crie sua galeria</span>
            </div>
            <fieldset className="landing-plan-picker">
              <legend>Escolha seu plano</legend>
              <label className={`landing-plan-option ${plan === "FREE" ? "is-selected" : ""}`}>
                <input
                  type="radio"
                  name="plan"
                  value="FREE"
                  checked={plan === "FREE"}
                  onChange={() => setPlan("FREE")}
                />
                <span className="landing-plan-option__copy">
                  <strong>Grátis</strong>
                  <small>Até 100 fotos por evento</small>
                </span>
                <span className="landing-plan-option__price">R$ 0</span>
              </label>
              <label className={`landing-plan-option ${plan === "PAID" ? "is-selected" : ""}`}>
                <input
                  type="radio"
                  name="plan"
                  value="PAID"
                  checked={plan === "PAID"}
                  onChange={() => setPlan("PAID")}
                />
                <span className="landing-plan-option__copy">
                  <strong>Completo</strong>
                  <small>Até 2.000 fotos · pagamento único</small>
                </span>
                <span className="landing-plan-option__price">R$ 49,90</span>
              </label>
            </fieldset>
            <label className="landing-field">
              <span>Nome do evento</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Ana & Rafael"
                autoComplete="off"
                required
              />
            </label>
            <label className="landing-field">
              <span>Seu e-mail (opcional)</span>
              <input
                value={hostEmail}
                onChange={(e) => setHostEmail(e.target.value)}
                placeholder="voce@email.com"
                type="email"
                autoComplete="email"
              />
            </label>
            {error ? <p className="landing-error" role="alert">{error}</p> : null}
            <button className="landing-submit" type="submit" disabled={creating}>
              {creating
                ? plan === "PAID" ? "Preparando pagamento…" : "Preparando seu evento…"
                : plan === "PAID" ? "Continuar para pagamento" : "Criar galeria grátis"}
              {!creating ? <span aria-hidden="true">→</span> : null}
            </button>
            <p className="landing-create-card__note">
              Sem aplicativo para baixar. {plan === "PAID" ? "Pagamento único e seguro via Stripe." : "Seus convidados enviam direto pelo celular."}
            </p>
          </form>
          {paymentNotice ? (
            <p className={paymentChecking ? "landing-payment-notice" : "landing-error"} role="status">
              {paymentNotice}
            </p>
          ) : null}
        </div>

        <div className="landing-hero__visual" aria-label="Momentos de um casamento">
          <div className="landing-photo landing-photo--main">
            <img src={previewPhotos[0]} alt="Casal celebrando o casamento ao ar livre" />
            <span className="landing-photo__caption">um dia, mil lembranças</span>
          </div>
          <div className="landing-photo landing-photo--small">
            <img src={previewPhotos[2]} alt="Convidados celebrando juntos" />
          </div>
          <div className="landing-photo landing-photo--detail">
            <img src={previewPhotos[1]} alt="Detalhe de uma celebração de casamento" />
          </div>
          <div className="landing-live-note">
            <span className="landing-live-note__icon" aria-hidden="true">↗</span>
            <span><strong>De todos, para vocês</strong><small>Fotos reunidas em um só lugar</small></span>
          </div>
          <span className="landing-spark landing-spark--one" aria-hidden="true">✳</span>
          <span className="landing-spark landing-spark--two" aria-hidden="true">✳</span>
        </div>
      </section>

      <section className="landing-benefits" id="vantagens" aria-label="Vantagens">
        <div><span aria-hidden="true">⌁</span><p><strong>Sem aplicativo</strong><small>Abre direto no navegador</small></p></div>
        <div><span aria-hidden="true">▦</span><p><strong>Um QR code</strong><small>Compartilhe com todos</small></p></div>
        <div><span aria-hidden="true">♡</span><p><strong>Mais lembranças</strong><small>Fotos de cada convidado</small></p></div>
      </section>

      <section className="landing-steps" id="como-funciona">
        <div className="landing-section-heading">
          <span>Simples assim</span>
          <h2>Mais presença. Menos preocupação.</h2>
          <p>Todo mundo participa, sem complicação — e vocês aproveitam cada momento.</p>
        </div>
        <div className="landing-step-grid">
          <article className="landing-step">
            <span className="landing-step__number">01</span>
            <h3>Crie o evento</h3>
            <p>Escolha um nome e prepare sua galeria em instantes.</p>
          </article>
          <article className="landing-step">
            <span className="landing-step__number">02</span>
            <h3>Compartilhe o QR</h3>
            <p>Coloque o código nas mesas ou envie para os convidados.</p>
          </article>
          <article className="landing-step">
            <span className="landing-step__number">03</span>
            <h3>Reviva cada instante</h3>
            <p>As fotos enviadas formam uma galeria para guardar e compartilhar.</p>
          </article>
        </div>
      </section>

      <footer className="landing-footer">
        <a className="landing-brand" href="/" aria-label="Laço — início">
          <span className="landing-brand__mark" aria-hidden="true">l</span>
          <span>laço</span>
        </a>
        <span>Feito para guardar o que importa.</span>
        <a href="#criar">Criar meu evento <span aria-hidden="true">↑</span></a>
      </footer>
    </main>
  );
}
