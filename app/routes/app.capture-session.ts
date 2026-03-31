import { json, type ActionFunctionArgs } from "@remix-run/node";

import { writeAuditLog } from "~/services/audit.server";
import { prisma } from "~/services/db.server";
import { rejectCaptureSession } from "~/services/shopify-payments.server";
import type { ShopifyCaptureSessionRequest } from "~/types/payments";
import { getBooleanEnv, getEnv } from "~/utils/env.server";
import { parseJsonRequest } from "~/utils/http.server";
import { assertShopifyOrigin, getShopifyRequestContext } from "~/utils/shopify-request.server";

export async function action({ request }: ActionFunctionArgs) {
  assertShopifyOrigin(request);
  const context = getShopifyRequestContext(request);
  const { body } = await parseJsonRequest<ShopifyCaptureSessionRequest>(request);

  const paymentSession = await prisma.paymentSession.findFirst({
    where: {
      OR: [
        { shopifyPaymentSessionId: body.payment_id },
        { shopifyPaymentSessionGid: body.payment_id },
      ],
    },
  });

  if (!paymentSession) {
    throw new Response("Payment session not found for capture request.", { status: 404 });
  }

  const supportsCaptures = getBooleanEnv(getEnv().CLICKPESA_SUPPORTS_CAPTURES);
  await prisma.captureSession.upsert({
    where: { shopifyCaptureSessionId: body.id },
    create: {
      paymentSessionId: paymentSession.id,
      shopifyCaptureSessionId: body.id,
      shopifyCaptureSessionGid: body.gid,
      amount: body.amount,
      currency: body.currency,
      state: supportsCaptures ? "PENDING" : "BLOCKED",
      payload: body,
    },
    update: {
      amount: body.amount,
      currency: body.currency,
      state: supportsCaptures ? "PENDING" : "BLOCKED",
      payload: body,
    },
  });

  await rejectCaptureSession(
    context.shopDomain,
    body.gid,
    supportsCaptures
      ? "Capture route is scaffolded but ClickPesa capture API integration is not implemented yet."
      : "Captures are blocked until ClickPesa capture support is confirmed.",
  );

  await writeAuditLog({
    shopId: paymentSession.shopId,
    paymentSessionId: paymentSession.id,
    action: "capture_session.received",
    actor: "shopify",
    message: "Received capture session request and rejected it because provider-side support is not wired yet.",
    context: {
      captureSessionId: body.id,
      requestId: context.requestId,
    },
  });

  return json({ status: "accepted" }, { status: 202 });
}

