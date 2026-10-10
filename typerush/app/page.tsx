'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type TestMode = 'common_words' | 'punctuation' | 'numbers_and_symbols' | 'code_snippets'

const TEST_MODES: { value: TestMode; label: string; description: string }[] = [
  { value: 'common_words', label: 'Common words', description: 'Everyday word practice' },
  { value: 'punctuation', label: 'Punctuation', description: 'Commas, periods & quotes' },
  { value: 'numbers_and_symbols', label: 'Numbers and symbols', description: 'Words, digits, %, # and @' },
  { value: 'code_snippets', label: 'Code snippets', description: 'Short JavaScript lines' },
]

function TestToolbar({ mode, onModeChange, disabled, isPro }: { mode: TestMode; onModeChange: (mode: TestMode) => void; disabled: boolean; isPro: boolean }) {
  return (
    <div className="test-toolbar">
      <fieldset className="test-mode-picker" disabled={disabled}>
        <legend className="mode-picker-legend">CHOOSE A MODE</legend>
        <div className="mode-picker-options">
          {TEST_MODES.map(({ value, label, description }) => {
            const isPremium = value !== 'common_words'
            return (
            <label className={mode === value ? 'mode-option is-selected' : 'mode-option'} key={value}>
              {isPremium && !isPro ? <span className="mode-lock" aria-label="Pro required">♛</span> : null}
              <input
                className="mode-option-input sr-only"
                type="radio"
                name="test-mode"
                value={value}
                checked={mode === value}
                onChange={() => onModeChange(value)}
              />
              <span className="mode-option-title">{label}</span>
              <span className="mode-option-description">{isPremium && !isPro ? 'Pro members only' : description}</span>
            </label>
            )
          })}
        </div>
      </fieldset>
      <div className="test-duration" aria-label="Test duration: 30 seconds"><span>30</span><span>SEC</span></div>
    </div>
  )
}

export default function HomePage() {
  const [typed, setTyped] = useState('')
  const [mode, setMode] = useState<TestMode>('common_words')
  const [testText, setTestText] = useState('')
  const [started, setStarted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [isTimeUp, setIsTimeUp] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isPro, setIsPro] = useState(false)
  const savedResult = useRef(false)

  async function loadTestText(requestedMode: TestMode) {
    const response = await fetch(`/api/typing-content?mode=${requestedMode}`, { cache: 'no-store' })
    if (!response.ok) throw new Error('Unable to load typing content.')
    const result: { mode: TestMode; content: string; proRequired: boolean } = await response.json()
    setMode(result.mode)
    setTestText(result.content)
    return result
  }

  useEffect(() => {
    void loadTestText('common_words').catch(() => setTestText(''))
  }, [])

  async function refreshProStatus() {
    try {
      const response = await fetch('/api/subscription-status', { cache: 'no-store' })
      const result = await response.json() as { isPro?: boolean }
      setIsPro(result.isPro === true)
    } catch {
      setIsPro(false)
    }
  }

  useEffect(() => {
    void refreshProStatus()
    try {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data }) => {
        setUserEmail(data.user?.email ?? null)
        setUserId(data.user?.id ?? null)
      }).catch(() => {
        setUserEmail(null)
        setUserId(null)
      })
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setUserEmail(session?.user?.email ?? null)
        setUserId(session?.user?.id ?? null)
        void refreshProStatus()
      })
      return () => data.subscription.unsubscribe()
    } catch {
      setUserEmail(null)
      setUserId(null)
    }
  }, [])

  useEffect(() => {
    if (!started || isTimeUp) return
    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          setIsTimeUp(true)
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [started, isTimeUp])

  const elapsed = started ? 30 - timeLeft : 0
  const correctCharacters = typed.split('').filter((char, index) => char === testText[index]).length
  const accuracy = typed ? Math.round((correctCharacters / typed.length) * 100) : 100
  const wpm = Math.round((correctCharacters / 5) / (Math.max(1, elapsed) / 60)) || 0
  const progress = useMemo(() => testText ? Math.min(100, (typed.length / testText.length) * 100) : 0, [typed, testText])
  const modeLabel = TEST_MODES.find((item) => item.value === mode)?.label ?? 'Common words'

  useEffect(() => {
    if (!isTimeUp || savedResult.current || !userId) return
    savedResult.current = true
    void (async () => {
      try {
        const { error } = await createClient().from('test_results').insert({
          user_id: userId,
          wpm,
          accuracy,
          mode: mode.toLowerCase(),
        })
        if (error) {
          savedResult.current = false
          console.error('[v0] Failed to save typing result:', error)
        }
      } catch (error: unknown) {
        savedResult.current = false
        console.error('[v0] Failed to save typing result:', error)
      }
    })()
  }, [accuracy, isTimeUp, mode, userId, wpm])

  async function selectMode(nextMode: TestMode) {
    if (started && !isTimeUp) return
    if (nextMode !== 'common_words' && !isPro) return
    setTyped('')
    setStarted(false)
    setTimeLeft(30)
    setIsTimeUp(false)
    savedResult.current = false
    try {
      await loadTestText(nextMode)
    } catch {
      setMode('common_words')
      setTestText('')
    }
  }

  async function newTest() {
    setTyped('')
    setStarted(false)
    setTimeLeft(30)
    setIsTimeUp(false)
    savedResult.current = false
    try {
      await loadTestText(mode)
    } catch {
      setMode('common_words')
      setTestText('')
    }
  }

  function handleTyping(value: string) {
    if (isTimeUp) return
    if (!started && value.length > 0) setStarted(true)
    setTyped(value.slice(0, testText.length))
  }

  async function logout() {
    await createClient().auth.signOut()
    setUserEmail(null)
    setUserId(null)
    setIsPro(false)
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">T</span><span>TypeRush</span></Link>
        <nav><Link className="nav-active" href="/">Test</Link><Link href="/results">Results</Link><Link href="/pricing">Pricing</Link></nav>
        {userEmail ? <div className="account-menu"><span className="account-email">{userEmail}</span><button className="ghost-button" onClick={logout}>Log out</button></div> : <Link className="ghost-button" href="/auth/login">Sign in <span>↗</span></Link>}
      </header>
      <section className="hero"><div className="eyebrow"><span className="live-dot" /> READY WHEN YOU ARE</div><h1>Find your <em>flow.</em></h1><p>Build speed, sharpen accuracy, and make every keystroke count.</p></section>
      {isTimeUp ? (
        <section className="test-card results-card">
          <TestToolbar mode={mode} onModeChange={selectMode} disabled={false} isPro={isPro} />
          <div className="results-content">
            <div className="results-heading"><div className="prompt-label">TEST COMPLETE · {modeLabel}</div><h2>Time&apos;s up.</h2><p>Here&apos;s how you did on this run.</p></div>
            <div className="results-grid"><div><strong>{wpm}</strong><small>WORDS PER MINUTE</small></div><div><strong>{accuracy}<i>%</i></strong><small>ACCURACY</small></div></div>
            <button className="primary-button" onClick={newTest}>Try again <span>↗</span></button>
          </div>
        </section>
      ) : (
        <section className="test-card">
          <TestToolbar mode={mode} onModeChange={selectMode} disabled={started} isPro={isPro} />
          <div className="typing-panel">
            <div className="stats-row"><div><strong>{wpm}</strong><small>WPM</small></div><div><strong>{accuracy}<i>%</i></strong><small>ACCURACY</small></div><div className="timer"><strong>{timeLeft}</strong><small>TIME</small></div></div>
            <div className="prompt-label" id="typing-prompt-label">TYPE THE TEXT BELOW</div>
            <div className={mode === 'code_snippets' ? 'prompt-text prompt-code' : 'prompt-text'} id="typing-prompt">
              {testText.split('').map((char, index) => char === '\n' ? (
                <br key={`line-break-${index}`} />
              ) : (
                <span key={`${index}-${char}`} className={[index === typed.length ? 'char-cursor' : '', index < typed.length ? (typed[index] === char ? 'char-correct' : 'char-incorrect') : ''].filter(Boolean).join(' ')}>{char}</span>
              ))}
            </div>
            {mode === 'code_snippets' ? (
              <textarea
                className="typing-input code-typing-input"
                aria-labelledby="typing-prompt-label"
                aria-describedby="typing-prompt"
                autoFocus
                rows={5}
                spellCheck={false}
                value={typed}
                onChange={(event) => handleTyping(event.target.value)}
                disabled={!testText || isTimeUp}
                placeholder="Start typing here..."
              />
            ) : (
              <input
                className="typing-input"
                aria-labelledby="typing-prompt-label"
                aria-describedby="typing-prompt"
                autoComplete="off"
                autoFocus
                spellCheck={false}
                value={typed}
                onChange={(event) => handleTyping(event.target.value)}
                disabled={!testText || isTimeUp}
                placeholder="Start typing here..."
              />
            )}
            <div className="test-footer"><span>{Math.round(progress)}% complete</span><button className="restart-button" onClick={newTest}>Restart <span>↻</span></button></div>
          </div>
        </section>
      )}
      <footer className="page-footer"><span>© 2024 TypeRush</span><span>Made for the curious mind.</span></footer>
    </main>
  )
}
