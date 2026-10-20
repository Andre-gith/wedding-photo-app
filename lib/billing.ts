import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const FREE_PHOTO_LIMIT = 100;
export const PAID_PHOTO_LIMIT = 2000;
export const PAID_PRICE_CENTS = 4990;

let stripeClient: Stripe | undefined;

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Pagamentos ainda não estão configurados. Defina STRIPE_SECRET_KEY.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

export function getAppBaseUrl(requestOrigin: string): string {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : requestOrigin);
  const url = new URL(configuredUrl);

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("A URL pública do aplicativo precisa usar HTTP ou HTTPS.");
  }

  return url.origin;
}

export async function activatePaidEvent(session: Stripe.Checkout.Session): Promise<boolean> {
  const eventId = session.metadata?.eventId;
  if (
    session.mode !== "payment" ||
    session.payment_status !== "paid" ||
    session.amount_total !== PAID_PRICE_CENTS ||
    session.currency !== "brl" ||
    !eventId
  ) {
    return false;
  }

  const result = await prisma.event.updateMany({
    where: {
      id: eventId,
      plan: "PAID",
      paymentStatus: "PENDING",
      stripeCheckoutSessionId: session.id,
    },
    data: {
      paymentStatus: "PAID",
      paidAt: new Date(),
      photoLimit: PAID_PHOTO_LIMIT,
      isPublished: true,
    },
  });

  return result.count === 1 || Boolean(
    await prisma.event.findFirst({
      where: {
        id: eventId,
        plan: "PAID",
        paymentStatus: "PAID",
        stripeCheckoutSessionId: session.id,
      },
      select: { id: true },
    }),
  );
}
