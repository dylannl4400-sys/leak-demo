import "server-only"

import type Stripe from "stripe"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getStripeClient } from "@/lib/stripe"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

const userIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type SubscriptionStatus = "active" | "free"
type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>

type StripeResource = string | { id: string } | null | undefined

function getStripeResourceId(resource: StripeResource) {
  return typeof resource === "string" ? resource : resource?.id ?? null
}

async function upsertSubscription(
  supabase: SupabaseAdminClient,
  userId: string,
  customerId: string,
  status: SubscriptionStatus,
) {
  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  )

  if (error) throw error
}

async function setSubscriptionStatus(
  supabase: SupabaseAdminClient,
  customerId: string,
  status: SubscriptionStatus,
  fallbackUserId?: string,
) {
  const { data: match, error: lookupError } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle()

  if (lookupError) throw lookupError

  const userId = match?.user_id ?? fallbackUserId
  if (!userId) throw new Error("Unable to map Stripe customer to a TypeRush user.")

  await upsertSubscription(supabase, userId, customerId, status)
}

async function handleCompletedCheckout(stripe: Stripe, session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") return

  const subscriptionId = getStripeResourceId(session.subscription)
  if (!subscriptionId) {
    throw new Error("Completed subscription Checkout has no subscription ID.")
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const sessionCustomerId = getStripeResourceId(session.customer)
  const customerId = getStripeResourceId(subscription.customer) ?? sessionCustomerId

  if (!customerId || (sessionCustomerId && sessionCustomerId !== customerId)) {
    throw new Error("Checkout customer does not match the Stripe subscription.")
  }

  const supabase = createSupabaseAdminClient()

  const userId = session.client_reference_id
  if (!userId || !userIdPattern.test(userId)) {
    throw new Error("Checkout session has an invalid client reference ID.")
  }

  await upsertSubscription(
    supabase,
    userId,
    customerId,
    subscription.status === "active" ? "active" : "free",
  )
}

export async function POST(request: Request) {
  const stripe = getStripeClient()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 })
  }

  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const rawBody = await request.text()
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCompletedCheckout(stripe, event.data.object)
        break
      }
      case "customer.subscription.updated": {
        const eventSubscription = event.data.object
        const subscription = await stripe.subscriptions.retrieve(eventSubscription.id)
        const customerId = getStripeResourceId(subscription.customer)

        if (!customerId) {
          throw new Error("Stripe subscription has no customer ID.")
        }

        const metadataUserId = subscription.metadata?.user_id
        if (metadataUserId && !userIdPattern.test(metadataUserId)) {
          throw new Error("Stripe subscription metadata has an invalid user ID.")
        }

        await setSubscriptionStatus(
          createSupabaseAdminClient(),
          customerId,
          subscription.status === "active" ? "active" : "free",
          metadataUserId,
        )
        break
      }
      case "customer.subscription.deleted": {
        const customerId = getStripeResourceId(event.data.object.customer)

        if (!customerId) {
          throw new Error("Deleted Stripe subscription has no customer ID.")
        }

        await setSubscriptionStatus(createSupabaseAdminClient(), customerId, "free")
        break
      }
      default:
        break
    }
  } catch (error) {
    console.error("[stripe webhook] Failed to synchronize subscription status.", error)
    const isConfigurationError =
      error instanceof Error && error.message === "Supabase admin client is not configured."

    return NextResponse.json(
      { error: isConfigurationError ? "Subscription sync is not configured." : "Unable to sync subscription." },
      { status: isConfigurationError ? 503 : 500 },
    )
  }

  return NextResponse.json({ received: true })
}
