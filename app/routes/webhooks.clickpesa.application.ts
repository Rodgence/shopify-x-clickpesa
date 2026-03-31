import { json, type ActionFunctionArgs } from "@remix-run/node";

import {
  extractWebhookIdentifiers,
  verifyClickPesaWebhook,
} from "~/services/clickpesa.server";
import { prisma } from "~/services/db.server";
import { getMerchantConfig } from "~/services/merchant-config.server";
import { finalizePaymentSessionFromStatus } from "~/services/reconciliation.server";
import type { ClickPesaWebhookPayload } from "~/types/payments";

export async function action({ request }: ActionFunctionArgs) {
  const rawBody = await request.text();
  if (!rawBody) {
    throw new Response("Webhook body is required.", { status: 400 });
  }

  let payload: ClickPesaWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as ClickPesaWebhookPayload;
  } catch {
    throw new Response("Webhook body must be valid JSON.", { status: 400 });
  }

  const headerSignature =
    request.headers.get("x-clickpesa-signature") ??
    request.headers.get("x-clickpesa-checksum");
  const headerEventId =
    request.headers.get("x-clickpesa-event-id") ??
    request.headers.get("x-webhook-id");

  const identifiers = extractWebhookIdentifiers(payload);
  const session = identifiers.orderReference
    ? await prisma.paymentSession.findUnique({
        where: { clickpesaOrderReference: identifiers.orderReference },
        include: { shop: true },
      })
    : identifiers.paymentReference
      ? await prisma.paymentSession.findFirst({
          where: { clickpesaPaymentReference: identifiers.paymentReference },
          include: { shop: true },
        })
      : null;

  const merchantConfig = session
    ? await getMerchantConfig(session.shop.shopDomain)
    : null;
  const verified = verifyClickPesaWebhook(
    payload,
    merchantConfig?.credentials?.checksumKey,
    headerSignature,
  );

  const idempotencyKey =
    headerEventId ??
    `${identifiers.eventType ?? "unknown"}:${identifiers.orderReference ?? "no-order"}:${identifiers.paymentReference ?? "no-payment"}:${identifiers.status ?? "no-status"}`;

  const existing = await prisma.webhookEvent.findUnique({
    where: { idempotencyKey },
  });

  if (existing) {
    return json({ status: "duplicate" });
  }

  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      shopId: session?.shopId,
      paymentSessionId: session?.id,
      idempotencyKey,
      eventType: identifiers.eventType ?? "UNKNOWN",
      verified,
      rawBody,
      payload,
    },
  });

  try {
    if (session && verified && identifiers.status) {
      await finalizePaymentSessionFromStatus(
        session.id,
        identifiers.status,
        identifiers.paymentReference,
      );
    }

    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        processedAt: new Date(),
      },
    });

    return json({ status: "ok", verified });
  } catch (error) {
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        errorMessage: error instanceof Error ? error.message : "Webhook processing failed.",
      },
    });

    throw error;
  }
}
