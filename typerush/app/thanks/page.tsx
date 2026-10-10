import Link from "next/link"
import type { Metadata } from "next"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Thanks for subscribing | TypeRush",
  description: "Thank you for subscribing to TypeRush Pro.",
}

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let syncMessage = "Your Pro access will be available as soon as payment confirmation finishes."

  if (user && sessionId) {
    const requestHeaders = await headers()
    const origin = requestHeaders.get("origin") ?? `${requestHeaders.get("x-forwarded-proto") ?? "https"}://${requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")}`
    try {
      const response = await fetch(`${origin}/api/stripe/sync`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: requestHeaders.get("cookie") ?? "" },
        body: JSON.stringify({ sessionId }),
        cache: "no-store",
      })
      if (response.ok) syncMessage = "Your Pro access is active. Premium typing modes are ready."
    } catch {}
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">T</span>
          <span>TypeRush</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/">Test</Link>
          <Link href="/results">Results</Link>
          <Link href="/pricing">Pricing</Link>
        </nav>
        <Link className="ghost-button" href="/">Keep practicing <span aria-hidden="true">↗</span></Link>
      </header>

      <section className="page-heading" aria-labelledby="thanks-heading">
        <div className="eyebrow">SUBSCRIPTION CONFIRMED</div>
        <h1 id="thanks-heading">Thanks for <em>subscribing.</em></h1>
        <p>Your TypeRush Pro checkout is complete. Thanks for supporting your typing practice.</p>
      </section>

      <section className="history-card" aria-labelledby="thanks-next-step">
        <div className="history-state">
          <h2 id="thanks-next-step">Ready for another round?</h2>
          <p>{syncMessage}</p>
          <Link href="/" className="primary-button">Back to typing <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </main>
  )
}
