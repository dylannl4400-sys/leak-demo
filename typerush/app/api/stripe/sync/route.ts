import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getStripeClient } from "@/lib/stripe"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const stripe = getStripeClient()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!stripe || !user) return NextResponse.json({ isPro: false }, { status: user ? 503 : 401 })

  const body = await request.json().catch(() => null) as { sessionId?: string } | null
  if (!body?.sessionId || !/^cs_[A-Za-z0-9_]+$/.test(body.sessionId)) {
    return NextResponse.json({ error: "Invalid Checkout session." }, { status: 400 })
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(body.sessionId)
    if (session.client_reference_id !== user.id || session.mode !== "subscription") {
      return NextResponse.json({ error: "Invalid Checkout session." }, { status: 403 })
    }

    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id
    if (!subscriptionId || !customerId) return NextResponse.json({ error: "Subscription is not ready yet." }, { status: 409 })

    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const status = subscription.status === "active" ? "active" : "free"
    const admin = createSupabaseAdminClient()
    const { error } = await admin.from("subscriptions").upsert({
      user_id: user.id,
      stripe_customer_id: customerId,
      status,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    if (error) throw error

    return NextResponse.json({ isPro: status === "active" })
  } catch {
    return NextResponse.json({ error: "Unable to synchronize subscription." }, { status: 502 })
  }
}
