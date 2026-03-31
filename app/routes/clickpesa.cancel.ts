import { redirect, type LoaderFunctionArgs } from "@remix-run/node";

import { writeAuditLog } from "~/services/audit.server";
import { prisma } from "~/services/db.server";
import { rejectPaymentSession } from "~/services/shopify-payments.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const sessionRef = url.searchParams.get("sessionRef");
  const orderReference = url.searchParams.get("orderReference");

  const session = sessionRef
    ? await prisma.paymentSession.findUnique({
        where: { id: sessionRef },
        include: { shop: true },
      })
    : orderReference
      ? await prisma.paymentSession.findUnique({
          where: { clickpesaOrderReference: orderReference },
          include: { shop: true },
        })
      : null;

  if (!session) {
    throw new Response("Payment session could not be resolved for cancellation.", {
      status: 404,
    });
  }

  const mutation = await rejectPaymentSession({
    shopDomain: session.shop.shopDomain,
    gid: session.shopifyPaymentSessionGid,
    reason: "PROCESSING_ERROR",
    merchantMessage: "Buyer cancelled the ClickPesa hosted checkout.",
  });

  await prisma.paymentSession.update({
    where: { id: session.id },
    data: {
      state: "CANCELLED",
      rejectedAt: new Date(),
      clickpesaStatus: "CANCELLED",
      nextActionRedirectUrl: mutation.nextActionRedirectUrl,
    },
  });

  await writeAuditLog({
    shopId: session.shopId,
    paymentSessionId: session.id,
    action: "payment_session.cancelled",
    actor: "buyer",
    message: "Buyer cancelled ClickPesa hosted checkout.",
  });

  return redirect(
    mutation.nextActionRedirectUrl ??
      new URL(`/clickpesa/return?sessionRef=${session.id}&status=CANCELLED`, url.origin).toString(),
  );
}
