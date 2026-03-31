import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

import { prisma } from "~/services/db.server";

export async function loader(_: LoaderFunctionArgs) {
  const merchants = await prisma.merchantConfig.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      shop: true,
      credentials: {
        select: {
          id: true,
        },
      },
    },
  });

  return json({ merchants });
}

export default function ClickPesaSettingsRoute() {
  const data = useLoaderData<typeof loader>();

  return (
    <section className="panel stack">
      <div className="stack" style={{ gap: 4 }}>
        <h2>ClickPesa settings inventory</h2>
        <p className="muted">
          Review which merchants have credentials stored, checksum verification enabled,
          and provider readiness switched on.
        </p>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Shop</th>
              <th>Environment</th>
              <th>Credentials</th>
              <th>Checksum</th>
              <th>Ready</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {data.merchants.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <p className="muted">No merchant settings saved yet.</p>
                </td>
              </tr>
            ) : (
              data.merchants.map((merchant) => (
                <tr key={merchant.id}>
                  <td>
                    <div className="stack" style={{ gap: 6 }}>
                      <strong>{merchant.shop.shopDomain}</strong>
                      <Link to={`/app/onboarding?shop=${merchant.shop.shopDomain}`}>Edit configuration</Link>
                    </div>
                  </td>
                  <td>{merchant.environment}</td>
                  <td>{merchant.credentials ? "Stored" : "Missing"}</td>
                  <td>{merchant.checksumEnabled ? "Enabled" : "Disabled"}</td>
                  <td>
                    <span className={merchant.isProviderReady ? "badge" : "badge warn"}>
                      {merchant.isProviderReady ? "Ready" : "Blocked"}
                    </span>
                  </td>
                  <td>{new Date(merchant.updatedAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
