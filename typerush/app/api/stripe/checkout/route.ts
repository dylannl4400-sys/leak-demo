import { createHash } from "node:crypto"
import { createClient } from "@/lib/supabase/server"
import { getStripeClient } from "@/lib/stripe"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export const runtime = "nodejs"

const idempotencyKeyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function createIntegrationIdentifier(idempotencyKey: string) {
  const suffix = Array.from(
    createHash("sha256").update(idempotencyKey).digest().subarray(0, 8),
    (byte) => String.fromCharCode(97 + (byte % 26)),
  ).join("")

  return `typerush-pro-${suffix}`
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 })
  }

  const idempotencyKey = request.headers.get("idempotency-key")
  if (!idempotencyKey || !idempotencyKeyPattern.test(idempotencyKey)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  let user
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      return NextResponse.json({ error: "Unable to verify your account." }, { status: 503 })
    }
    user = data.user
  } catch {
    return NextResponse.json({ error: "Unable to verify your account." }, { status: 503 })
  }

  if (!user) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 })
  }

  const supabase = await createClient()
  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle()

  if (subscriptionError) {
    return NextResponse.json({ error: "Unable to verify your subscription." }, { status: 503 })
  }

  if (subscription?.status === "active") {
    return NextResponse.json({ error: "You already have an active Pro subscription." }, { status: 409 })
  }

  const priceId = process.env.STRIPE_PRICE_ID
  const stripe = getStripeClient()
  if (!priceId || !stripe) {
    return NextResponse.json({ error: "Checkout is not configured." }, { status: 503 })
  }

  try {
    const price = await stripe.prices.retrieve(priceId)
    if (!price.active || price.type !== "recurring" || price.recurring?.interval !== "month") {
      return NextResponse.json({ error: "Checkout is not configured." }, { status: 503 })
    }

    const session = await stripe.checkout.sessions.create(
      {
        ui_mode: "hosted_page",
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: user.id,
        subscription_data: { metadata: { user_id: user.id } },
        ...(user.email ? { customer_email: user.email } : {}),
        success_url: `${request.nextUrl.origin}/thanks?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${request.nextUrl.origin}/pricing?checkout=cancelled`,
        integration_identifier: createIntegrationIdentifier(idempotencyKey),
      },
      { idempotencyKey: `${user.id}:${idempotencyKey}` },
    )

    if (!session.url) {
      return NextResponse.json({ error: "Unable to start Checkout." }, { status: 502 })
    }

    return NextResponse.json({ url: session.url })
  } catch {
    return NextResponse.json({ error: "Unable to start Checkout." }, { status: 502 })
  }
}
