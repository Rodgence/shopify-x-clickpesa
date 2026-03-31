import { json, type ActionFunctionArgs } from "@remix-run/node";

import { writeAuditLog } from "~/services/audit.server";
import { prisma } from "~/services/db.server";
import { rejectVoidSession } from "~/services/shopify-payments.server";
import type { ShopifyVoidSessionRequest } from "~/types/payments";
import { getBooleanEnv, getEnv } from "~/utils/env.server";
import { parseJsonRequest } from "~/utils/http.server";
import { assertShopifyOrigin, getShopifyRequestContext } from "~/utils/shopify-request.server";

export async function action({ request }: ActionFunctionArgs) {
  assertShopifyOrigin(request);
  const context = getShopifyRequestContext(request);
  const { body } = await parseJsonRequest<ShopifyVoidSessionRequest>(request);

  const paymentSession = await prisma.paymentSession.findFirst({
    where: {
      OR: [
        { shopifyPaymentSessionId: body.payment_id },
        { shopifyPaymentSessionGid: body.payment_id },
      ],
    },
  });

  if (!paymentSession) {
    throw new Response("Payment session not found for void request.", { status: 404 });
  }

  const supportsVoids = getBooleanEnv(getEnv().CLICKPESA_SUPPORTS_VOIDS);
  await prisma.voidSession.upsert({
    where: { shopifyVoidSessionId: body.id },
    create: {
      paymentSessionId: paymentSession.id,
      shopifyVoidSessionId: body.id,
      shopifyVoidSessionGid: body.gid,
      state: supportsVoids ? "PENDING" : "BLOCKED",
      payload: body,
    },
    update: {
      state: supportsVoids ? "PENDING" : "BLOCKED",
      payload: body,
    },
  });

  await rejectVoidSession(
    context.shopDomain,
    body.gid,
    supportsVoids
      ? "Void route is scaffolded but ClickPesa void API integration is not implemented yet."
      : "Voids are blocked until ClickPesa void support is confirmed.",
  );

  await writeAuditLog({
    shopId: paymentSession.shopId,
    paymentSessionId: paymentSession.id,
    action: "void_session.received",
    actor: "shopify",
    message: "Received void session request and rejected it because provider-side support is not wired yet.",
    context: {
      voidSessionId: body.id,
      requestId: context.requestId,
    },
  });

  return json({ status: "accepted" }, { status: 202 });
}
