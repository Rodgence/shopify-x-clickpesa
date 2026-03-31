import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

import { prisma } from "~/services/db.server";
import {
  finalizePaymentSessionFromStatus,
  reconcilePaymentSession,
} from "~/services/reconciliation.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const sessionRef = url.searchParams.get("sessionRef");
  const orderReference = url.searchParams.get("orderReference");
  const status = url.searchParams.get("status");
  const paymentReference = url.searchParams.get("paymentReference") ?? undefined;

  const session = sessionRef
    ? await prisma.paymentSession.findUnique({
        where: { id: sessionRef },
      })
    : orderReference
      ? await prisma.paymentSession.findUnique({
          where: { clickpesaOrderReference: orderReference },
        })
      : null;

  if (!session) {
    throw new Response("Payment session could not be resolved from the return URL.", {
      status: 404,
    });
  }

  const finalized = status
    ? await finalizePaymentSessionFromStatus(session.id, status, paymentReference)
    : await reconcilePaymentSession(session.id);

  return json({
    session: finalized,
    continueUrl: finalized?.nextActionRedirectUrl ?? session.cancelUrl ?? null,
  });
}

function describeState(state?: string | null) {
  switch (state) {
    case "RESOLVED":
      return "Payment completed and Shopify has been updated.";
    case "REJECTED":
      return "Payment failed or was cancelled.";
    case "PENDING":
    case "RECONCILING":
      return "Payment is still being reconciled with ClickPesa.";
    default:
      return "Payment state is being checked.";
  }
}

export default function ClickPesaReturnRoute() {
  const data = useLoaderData<typeof loader>();

  return (
    <main className="grid">
      <section className="panel stack">
        <span
          className={
            data.session?.state === "RESOLVED"
              ? "badge"
              : data.session?.state === "REJECTED"
                ? "badge danger"
                : "badge warn"
          }
        >
          {data.session?.state ?? "UNKNOWN"}
        </span>
        <h1>ClickPesa payment return</h1>
        <p className="muted">{describeState(data.session?.state)}</p>
        <div className="grid two">
          <div className="panel stack">
            <h2>Shopify session</h2>
            <p><code>{data.session?.shopifyPaymentSessionId}</code></p>
          </div>
          <div className="panel stack">
            <h2>ClickPesa reference</h2>
            <p><code>{data.session?.clickpesaPaymentReference ?? data.session?.clickpesaOrderReference ?? "Pending"}</code></p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {data.continueUrl ? (
            <a className="button" href={data.continueUrl}>
              Continue to Shopify
            </a>
          ) : null}
          <Link className="button secondary" to="/app">
            Open operations dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
