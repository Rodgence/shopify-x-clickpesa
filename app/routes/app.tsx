import { Link, Outlet } from "@remix-run/react";

export default function AppLayoutRoute() {
  return (
    <main className="grid">
      <section className="hero stack">
        <span className="badge">ClickPesa Payments App</span>
        <h1>Merchant onboarding and payment operations.</h1>
        <p className="muted">
          Use the pages below to save ClickPesa credentials, inspect recent payment
          sessions, and validate the offsite flow before Shopify review.
        </p>
      </section>
      <nav>
        <Link to="/app">Dashboard</Link>
        <Link to="/app/onboarding">Onboarding</Link>
        <Link to="/app/settings/clickpesa">ClickPesa Settings</Link>
        <Link to="/">Landing Page</Link>
      </nav>
      <Outlet />
    </main>
  );
}
