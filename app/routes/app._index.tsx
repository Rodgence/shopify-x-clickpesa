import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

import { prisma } from "~/services/db.server";

export async function loader(_: LoaderFunctionArgs) {
  const [shopCount, paymentCount, unresolvedCount, recentSessions] = await Promise.all([
    prisma.shop.count(),
    prisma.paymentSession.count(),
    prisma.paymentSession.count({
      where: {
        state: {
          in: ["RECEIVED", "REDIRECT_READY", "REDIRECTED", "PENDING", "RECONCILING"],
        },
      },
    }),
    prisma.paymentSession.findMany({
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        shop: true,
      },
    }),
  ]);

  return json({
    shopCount,
    paymentCount,
    unresolvedCount,
    recentSessions,
  });
}

function badgeClass(state: string) {
  if (["RESOLVED"].includes(state)) {
    return "badge";
  }

  if (["REJECTED", "FAILED", "CANCELLED"].includes(state)) {
    return "badge danger";
  }

  return "badge warn";
}

export default function AppDashboardRoute() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="grid">
      <section className="panel stack">
        <h2>Operations snapshot</h2>
        <div className="kpis">
          <div className="kpi">
            <small>Merchants configured</small>
            <strong>{data.shopCount}</strong>
          </div>
          <div className="kpi">
            <small>Payment sessions</small>
            <strong>{data.paymentCount}</strong>
          </div>
          <div className="kpi">
            <small>Open investigations</small>
            <strong>{data.unresolvedCount}</strong>
          </div>
        </div>
      </section>
      <section className="panel stack">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div className="stack" style={{ gap: 4 }}>
            <h2>Recent payment sessions</h2>
            <p className="muted">
              Review the latest payment attempts and drill into pending or failed cases.
            </p>
          </div>
          <Link className="button secondary" to="/app/onboarding">
            Add merchant configuration
          </Link>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Shop</th>
                <th>Shopify session</th>
                <th>Amount</th>
                <th>State</th>
                <th>ClickPesa ref</th>
              </tr>
            </thead>
            <tbody>
              {data.recentSessions.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <p className="muted">No payment sessions have been created yet.</p>
                  </td>
                </tr>
              ) : (
                data.recentSessions.map((session) => (
                  <tr key={session.id}>
                    <td>{session.shop.shopDomain}</td>
                    <td><code>{session.shopifyPaymentSessionId}</code></td>
                    <td>{session.currency} {session.amount.toString()}</td>
                    <td><span className={badgeClass(session.state)}>{session.state}</span></td>
                    <td>{session.clickpesaPaymentReference ?? session.clickpesaOrderReference ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
