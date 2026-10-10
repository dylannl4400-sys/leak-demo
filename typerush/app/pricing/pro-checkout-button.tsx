"use client"

import { useState } from "react"

interface CheckoutResponse {
  url?: unknown
}

export function ProCheckoutButton() {
  const [isPending, setIsPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  async function startCheckout() {
    setIsPending(true)
    setErrorMessage("")

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
      })

      if (response.status === 401) {
        window.location.assign("/auth/login")
        return
      }

      const result = (await response.json().catch(() => null)) as CheckoutResponse | null
      if (!response.ok || typeof result?.url !== "string") {
        setErrorMessage("Checkout is unavailable right now. Please try again.")
        return
      }

      window.location.assign(result.url)
    } catch {
      setErrorMessage("Checkout is unavailable right now. Please try again.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div>
      <button
        className="price-button primary"
        type="button"
        onClick={startCheckout}
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? "Starting checkout..." : "Subscribe to Pro"}
        <span aria-hidden="true">→</span>
      </button>
      {errorMessage ? (
        <p role="alert" style={{ color: "var(--muted)", fontSize: 12, margin: "10px 0 0" }}>
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
