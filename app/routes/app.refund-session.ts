import { json, type ActionFunctionArgs } from "@remix-run/node";

import { writeAuditLog } from "~/services/audit.server";
import { prisma } from "~/services/db.server";
import { rejectRefundSession } from "~/services/shopify-payments.server";
import type { ShopifyRefundSessionRequest } from "~/types/payments";
import { getBooleanEnv, getEnv } from "~/utils/env.server";
import { parseJsonRequest } from "~/utils/http.server";
import { assertShopifyOrigin, getShopifyRequestContext } from "~/utils/shopify-request.server";

export async function action({ request }: ActionFunctionArgs) {
  assertShopifyOrigin(request);
  const context = getShopifyRequestContext(request);
  const { body } = await parseJsonRequest<ShopifyRefundSessionRequest>(request);

  const paymentSession = await prisma.paymentSession.findFirst({
    where: {
      OR: [
        { shopifyPaymentSessionId: body.payment_id },
        { shopifyPaymentSessionGid: body.payment_id },
      ],
    },
  });

  if (!paymentSession) {
    throw new Response("Payment session not found for refund request.", { status: 404 });
  }

  const supportsRefunds = getBooleanEnv(getEnv().CLICKPESA_SUPPORTS_REFUNDS);
  await prisma.refundSession.upsert({
    where: { shopifyRefundSessionId: body.id },
    create: {
      paymentSessionId: paymentSession.id,
      shopifyRefundSessionId: body.id,
      shopifyRefundSessionGid: body.gid,
      amount: body.amount,
      currency: body.currency,
      state: supportsRefunds ? "PENDING" : "BLOCKED",
      payload: body,
    },
    update: {
      amount: body.amount,
      currency: body.currency,
      state: supportsRefunds ? "PENDING" : "BLOCKED",
      payload: body,
    },
  });

  await rejectRefundSession(
    context.shopDomain,
    body.gid,
    supportsRefunds
      ? "Refund route is scaffolded but ClickPesa refund API integration is not implemented yet."
      : "Refunds are blocked until ClickPesa refund support is confirmed.",
  );

  await writeAuditLog({
    shopId: paymentSession.shopId,
    paymentSessionId: paymentSession.id,
    action: "refund_session.received",
    actor: "shopify",
    message: "Received refund session request and rejected it because provider-side support is not wired yet.",
    context: {
      refundSessionId: body.id,
      requestId: context.requestId,
    },
  });

  return json({ status: "accepted" }, { status: 202 });
}

