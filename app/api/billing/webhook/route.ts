import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { activatePaidEvent, getStripeClient } from "@/lib/billing";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Configuração do webhook Stripe ausente." }, { status: 400 });
  }

  let stripeEvent: Stripe.Event;
  try {
    const rawBody = await req.text();
    stripeEvent = getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.warn("Assinatura inválida ou erro ao validar o webhook do Stripe:", error);
    return NextResponse.json({ error: "Assinatura do webhook inválida." }, { status: 400 });
  }

  if (
    stripeEvent.type === "checkout.session.completed" ||
    stripeEvent.type === "checkout.session.async_payment_succeeded"
  ) {
    try {
      const session = stripeEvent.data.object as Stripe.Checkout.Session;
      await activatePaidEvent(session);
    } catch (error) {
      console.error("Falha ao ativar o evento após confirmação do Stripe:", error);
      return NextResponse.json({ error: "Falha ao processar o pagamento." }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
