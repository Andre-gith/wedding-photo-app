CREATE TYPE "EventPlan" AS ENUM ('FREE', 'PAID', 'LEGACY');

CREATE TYPE "PaymentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PAID');

ALTER TABLE "Event"
ADD COLUMN "plan" "EventPlan" NOT NULL DEFAULT 'LEGACY',
ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN "stripeCheckoutSessionId" TEXT,
ADD COLUMN "paidAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Event_stripeCheckoutSessionId_key"
ON "Event"("stripeCheckoutSessionId");
