import { NextRequest, NextResponse } from "next/server";
import { activatePaidEvent, getStripeClient } from "@/lib/billing";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Sessão de pagamento não informada." }, { status: 400 });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { stripeCheckoutSessionId: sessionId },
    });
    if (!event || event.plan !== "PAID") {
      return NextResponse.json({ error: "Pagamento não encontrado." }, { status: 404 });
    }

    const session = await getStripeClient().checkout.sessions.retrieve(sessionId);
    if (session.metadata?.eventId !== event.id || session.mode !== "payment") {
      return NextResponse.json({ error: "Sessão de pagamento inválida." }, { status: 400 });
    }
    if (session.status === "expired") {
      return NextResponse.json({ error: "Esta sessão de pagamento expirou." }, { status: 410 });
    }
    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Estamos aguardando a confirmação do pagamento." },
        { status: 202 },
      );
    }

    const activated = await activatePaidEvent(session);
    if (!activated) {
      return NextResponse.json({ error: "Não foi possível confirmar este pagamento." }, { status: 400 });
    }

    const paidEvent = await prisma.event.findUnique({ where: { id: event.id } });
    return NextResponse.json({
      event: paidEvent
        ? {
            slug: paidEvent.slug,
            title: paidEvent.title,
            plan: paidEvent.plan,
            photoLimit: paidEvent.photoLimit,
          }
        : null,
    });
  } catch (error) {
    console.error("Falha ao verificar a sessão de pagamento do Stripe:", error);
    return NextResponse.json(
      { error: "Não foi possível verificar o pagamento agora. Tente novamente." },
      { status: 503 },
    );
  }
}
