import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import {
  FREE_PHOTO_LIMIT,
  PAID_PHOTO_LIMIT,
  PAID_PRICE_CENTS,
  getAppBaseUrl,
  getStripeClient,
} from "@/lib/billing";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const hostEmail = typeof body?.hostEmail === "string" ? body.hostEmail.trim() : "";
  const plan = body?.plan === "PAID" ? "PAID" : body?.plan === "FREE" || !body?.plan ? "FREE" : null;

  if (!title) {
    return NextResponse.json({ error: "Informe o nome do evento." }, { status: 400 });
  }
  if (!plan) {
    return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
  }

  let stripe: ReturnType<typeof getStripeClient> | undefined;
  let appBaseUrl: string | undefined;
  if (plan === "PAID") {
    try {
      stripe = getStripeClient();
      appBaseUrl = getAppBaseUrl(req.nextUrl.origin);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível iniciar o pagamento.";
      return NextResponse.json({ error: message }, { status: 503 });
    }
  }

  const slug = `${title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40)}-${nanoid(6)}`;

  const hostToken = nanoid(24);

  const event = await prisma.event.create({
    data: {
      title,
      slug,
      hostEmail: hostEmail || null,
      hostToken,
      plan,
      paymentStatus: plan === "PAID" ? "PENDING" : "NOT_REQUIRED",
      photoLimit: plan === "PAID" ? PAID_PHOTO_LIMIT : FREE_PHOTO_LIMIT,
      isPublished: plan === "FREE",
    },
  });

  if (plan === "PAID" && stripe && appBaseUrl) {
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        client_reference_id: event.id,
        customer_email: hostEmail || undefined,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "brl",
              unit_amount: PAID_PRICE_CENTS,
              product_data: {
                name: `Galeria de casamento — ${title}`,
                description: `Até ${PAID_PHOTO_LIMIT} fotos, pagamento único por evento.`,
              },
            },
          },
        ],
        metadata: { eventId: event.id },
        success_url: `${appBaseUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appBaseUrl}/?payment=cancelled`,
      });

      if (!session.url) {
        throw new Error("O Stripe não retornou o endereço de checkout.");
      }

      await prisma.event.update({
        where: { id: event.id },
        data: { stripeCheckoutSessionId: session.id },
      });

      return NextResponse.json({ event, checkoutUrl: session.url }, { status: 201 });
    } catch (error) {
      console.error("Falha ao criar o checkout do Stripe:", error);
      await prisma.event.delete({ where: { id: event.id } });
      return NextResponse.json(
        { error: "Não foi possível iniciar o pagamento. Tente novamente." },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ event }, { status: 201 });
}
