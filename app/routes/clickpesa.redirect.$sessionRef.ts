import { redirect, type LoaderFunctionArgs } from "@remix-run/node";

import { writeAuditLog } from "~/services/audit.server";
import { prisma } from "~/services/db.server";

export async function loader({ params }: LoaderFunctionArgs) {
  if (!params.sessionRef) {
    throw new Response("Missing payment session reference.", { status: 400 });
  }

  const session = await prisma.paymentSession.findUnique({
    where: { id: params.sessionRef },
  });

  if (!session?.clickpesaCheckoutLink) {
    throw new Response("Hosted checkout link is not available.", { status: 404 });
  }

  if (session.state !== "REDIRECTED") {
    await prisma.paymentSession.update({
      where: { id: session.id },
      data: {
        state: "REDIRECTED",
      },
    });

    await writeAuditLog({
      shopId: session.shopId,
      paymentSessionId: session.id,
      action: "payment_session.redirected",
      actor: "system",
      message: "Redirected buyer to ClickPesa hosted checkout.",
      context: {
        clickpesaCheckoutLink: session.clickpesaCheckoutLink,
      },
    });
  }

  return redirect(session.clickpesaCheckoutLink);
}
