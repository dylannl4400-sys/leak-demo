import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { ProCheckoutButton } from "./pro-checkout-button"

const features = ["Unlimited typing tests", "Detailed results & history", "Personal best tracking", "Punctuation & numbers modes", "Symbols & special characters", "Code snippet practice"]

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  const isLoggedIn = Boolean(user && !error)
  const { data: subscription } = user ? await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle() : { data: null }
  const isPro = subscription?.status === "active"

  return (
    <main className="site-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">T</span>
          <span>TypeRush</span>
        </Link>
        <nav>
          <Link href="/">Test</Link>
          <Link href="/results">Results</Link>
          <Link className="nav-active" href="/pricing">Pricing</Link>
        </nav>
        {isLoggedIn ? (
          <Link className="ghost-button" href="/results">My results <span aria-hidden="true">↗</span></Link>
        ) : (
          <Link className="ghost-button" href="/auth/login">Sign in <span aria-hidden="true">↗</span></Link>
        )}
      </header>
      <section className="page-heading pricing-heading">
        <div className="eyebrow">LEVEL UP YOUR PRACTICE</div>
        <h1>Speed is a <em>skill.</em></h1>
        <p>Start free. Go Pro when you’re ready to push further.</p>
      </section>
      <section className="pricing-grid">
        <div className="price-card">
          <div className="price-top">
            <span>FREE</span>
            <strong>$0 <small>forever</small></strong>
            <p>Everything you need to build a strong typing foundation.</p>
          </div>
          <Link href="/" className="price-button secondary">Start typing <span aria-hidden="true">→</span></Link>
          <ul>{features.slice(0, 3).map((feature) => <li key={feature}><b aria-hidden="true">✓</b>{feature}</li>)}</ul>
        </div>
        <div className={isPro ? "price-card pro-card is-current-plan" : "price-card pro-card"}>
          <div className="pro-badge">{isPro ? "★ YOU ARE PRO" : "MOST POPULAR"}</div>
          <div className="price-top">
            <span>{isPro ? "PRO MEMBER" : "PRO"}</span>
            <strong>$8 <small>/ month</small></strong>
            <p>Unlock advanced modes and turn practice into progress.</p>
          </div>
          {isPro ? (
            <div className="price-button current-plan-button" role="status"><span aria-hidden="true">♛</span> Active Pro plan</div>
          ) : isLoggedIn ? (
            <ProCheckoutButton />
          ) : (
            <Link href="/auth/sign-up" className="price-button primary">Create account to subscribe <span aria-hidden="true">→</span></Link>
          )}
          <ul>{features.map((feature) => <li key={feature}><b aria-hidden="true">✓</b>{feature}</li>)}</ul>
        </div>
      </section>
      <p className="pricing-note">No commitment. Cancel anytime. <Link href="/">Try the free test first →</Link></p>
    </main>
  )
}
