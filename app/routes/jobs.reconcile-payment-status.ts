import { json, type ActionFunctionArgs } from "@remix-run/node";

import { prisma } from "~/services/db.server";
import { reconcilePaymentSession } from "~/services/reconciliation.server";
import { getEnv } from "~/utils/env.server";

export async function action({ request }: ActionFunctionArgs) {
  const authorization = request.headers.get("Authorization");
  const expected = getEnv().JOB_SHARED_SECRET;

  if (!expected || authorization !== `Bearer ${expected}`) {
    throw new Response("Unauthorized.", { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "25");

  const sessions = await prisma.paymentSession.findMany({
    where: {
      state: {
        in: ["PENDING", "REDIRECTED", "RECONCILING"],
      },
    },
    orderBy: {
      updatedAt: "asc",
    },
    take: Math.min(Math.max(limit, 1), 100),
  });

  const results = [];
  for (const session of sessions) {
    try {
      const reconciled = await reconcilePaymentSession(session.id);
      results.push({
        sessionId: session.id,
        state: reconciled?.state ?? session.state,
      });
    } catch (error) {
      results.push({
        sessionId: session.id,
        error: error instanceof Error ? error.message : "Reconciliation failed.",
      });
    }
  }

  return json({
    processed: results.length,
    results,
  });
}
