import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

type TestResult = {
  id: string
  created_at: string
  wpm: number | string
  accuracy: number | string
  mode: string
}

function formatWpm(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value)}%`
}

function formatMode(value: string) {
  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value))
}

export default async function ResultsPage() {
  let isAuthenticated = false
  let userEmail: string | null = null
  let results: TestResult[] = []
  let historyError = false

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      isAuthenticated = true
      userEmail = user.email ?? null

      const { data, error } = await supabase
        .from("test_results")
        .select("id, created_at, wpm, accuracy, mode")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        historyError = true
      } else {
        results = (data ?? []) as TestResult[]
      }
    }
  } catch {
    historyError = true
  }

  const bestWpm = results.length
    ? Math.max(...results.map((result) => Number(result.wpm)))
    : null
  const averageAccuracy = results.length
    ? results.reduce((total, result) => total + Number(result.accuracy), 0) / results.length
    : null

  return (
    <main className="site-shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">T</span><span>TypeRush</span></Link>
        <nav aria-label="Main navigation">
          <Link href="/">Test</Link>
          <Link className="nav-active" href="/results">Results</Link>
          <Link href="/pricing">Pricing</Link>
        </nav>
        {isAuthenticated ? (
          <div className="account-menu"><span className="account-email">{userEmail ?? "Signed in"}</span></div>
        ) : (
          <Link className="ghost-button" href="/auth/login">Sign in <span>↗</span></Link>
        )}
      </header>

      <section className="page-heading">
        <div className="eyebrow">YOUR PROGRESS</div>
        <h1>Results & <em>history.</em></h1>
        <p>Every session is a step forward. Keep going.</p>
      </section>

      {isAuthenticated && !historyError && (
        <section className="summary-grid" aria-label="Typing history summary">
          <div className="summary-card primary">
            <span>BEST SPEED</span>
            <strong>{bestWpm === null ? "—" : formatWpm(bestWpm)} <small>WPM</small></strong>
            <b>{bestWpm === null ? "No tests yet" : "Personal best"}</b>
          </div>
          <div className="summary-card">
            <span>AVG. ACCURACY</span>
            <strong>{averageAccuracy === null ? "—" : formatPercent(averageAccuracy)}</strong>
            <b>Across saved tests</b>
          </div>
          <div className="summary-card">
            <span>TESTS TAKEN</span>
            <strong>{results.length}</strong>
            <b>Saved to your account</b>
          </div>
        </section>
      )}

      {historyError ? (
        <section className="history-card" role="alert">
          <div className="history-state history-state-error">
            <h2>We couldn&apos;t load your results.</h2>
            <p>Please refresh the page and try again.</p>
            <Link href="/results" className="outline-button">Try again <span>↻</span></Link>
          </div>
        </section>
      ) : isAuthenticated ? (
        <section className="history-card" aria-labelledby="history-title">
          <div className="section-title">
            <div>
              <h2 id="history-title">Test history</h2>
              <p>{results.length.toLocaleString()} {results.length === 1 ? "saved test" : "saved tests"}, newest first</p>
            </div>
            <Link href="/" className="outline-button">Take a test <span>→</span></Link>
          </div>

          {results.length > 0 ? (
            <div className="results-history-scroll">
              <table className="results-history-table">
                <thead>
                  <tr><th scope="col">Date</th><th scope="col">WPM</th><th scope="col">Accuracy</th><th scope="col">Mode</th></tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.id}>
                      <td><time dateTime={result.created_at}>{formatDate(result.created_at)}</time></td>
                      <td>{formatWpm(Number(result.wpm))}</td>
                      <td>{formatPercent(Number(result.accuracy))}</td>
                      <td>{formatMode(result.mode)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="history-state">
              <h2>Your first result is waiting.</h2>
              <p>Finish a typing test while signed in and it will be saved here.</p>
              <Link href="/" className="primary-button">Take your first test <span>→</span></Link>
            </div>
          )}
        </section>
      ) : (
        <section className="history-card history-signup-card">
          <div className="history-state">
            <div className="eyebrow">SAVE YOUR PROGRESS</div>
            <h2>Your typing history starts here.</h2>
            <p>Create a free account to save your results and track your progress over time. You can still take a test without signing in.</p>
            <div className="history-state-actions">
              <Link href="/auth/sign-up" className="primary-button">Create a free account <span>↗</span></Link>
              <Link href="/auth/login" className="history-sign-in">Already have an account? Sign in</Link>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
