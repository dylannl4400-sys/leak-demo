'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { BarChart3, ChevronDown, Clock3, Crown, Keyboard, LockKeyhole, RotateCcw, Sparkles, Target, Trophy, Zap } from 'lucide-react'

const sampleText = 'The best way to improve your typing is to practice with intention. Focus on accuracy first, then let your speed follow naturally.'

const history = [
  { date: 'Today, 9:42 AM', mode: 'Classic', wpm: 78, accuracy: '98%', time: '60s' },
  { date: 'Yesterday, 6:18 PM', mode: 'Classic', wpm: 74, accuracy: '96%', time: '60s' },
  { date: 'May 24, 10:03 AM', mode: 'Classic', wpm: 71, accuracy: '95%', time: '60s' },
  { date: 'May 22, 8:51 PM', mode: 'Classic', wpm: 68, accuracy: '94%', time: '30s' },
]

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand"><span className="brand-mark"><Zap /></span><span>Type<span className="brand-accent">Rush</span></span></Link>
      <nav className="main-nav" aria-label="Main navigation">
        <Link href="/" className="active">Test</Link>
        <Link href="/results">Results</Link>
        <Link href="/pricing">Pricing</Link>
      </nav>
      <button className="profile-button" aria-label="Open profile menu"><span className="profile-avatar">JD</span><ChevronDown /></button>
    </header>
  )
}

export function TestCard() {
  const [typed, setTyped] = useState('')
  const [seconds, setSeconds] = useState(60)
  const words = useMemo(() => sampleText.split(' '), [])
  const accuracy = typed.length ? Math.max(0, Math.round((typed.split('').filter((char, i) => char === sampleText[i]).length / typed.length) * 100)) : 100
  const wpm = Math.max(0, Math.round(typed.trim().split(/\s+/).filter(Boolean).length * 60 / Math.max(1, 60 - seconds)))

  return <section className="test-card">
    <div className="test-toolbar"><div className="mode-select"><Keyboard /> <span>Classic</span><ChevronDown /></div><div className="duration-select"><Clock3 /> <span>60 seconds</span><ChevronDown /></div></div>
    <div className="metrics"><div><span className="metric-label">WPM</span><strong>{wpm || 78}</strong></div><div><span className="metric-label">Accuracy</span><strong>{accuracy}%</strong></div><div><span className="metric-label">Time</span><strong>0:{String(seconds).padStart(2, '0')}</strong></div></div>
    <div className="prompt-wrap"><div className="prompt-text" aria-hidden="true">{words.map((word, index) => <span key={`${word}-${index}`} className={typed.split(' ')[index] ? 'word-complete' : index === typed.split(' ').length ? 'word-current' : ''}>{word}{index < words.length - 1 ? ' ' : ''}</span>)}</div><textarea value={typed} onChange={(event) => setTyped(event.target.value.slice(0, sampleText.length))} aria-label="Type the text shown above" placeholder="Start typing here..." autoFocus /></div>
    <div className="test-footer"><span><span className="live-dot" /> Type to begin</span><button className="reset-button" onClick={() => { setTyped(''); setSeconds(60) }}><RotateCcw /> Reset test</button></div>
  </section>
}

export function HomePage() {
  return <><SiteHeader /><main className="page-container home-page"><div className="eyebrow"><span className="eyebrow-line" /> DAILY PRACTICE <span className="eyebrow-line" /></div><h1>How fast can you <em>type?</em></h1><p className="lede">Put your fingers to the test. Build speed, improve accuracy, and make every keystroke count.</p><TestCard /><div className="feature-row"><div><Target /><strong>Accuracy first</strong><span>Train precision that lasts.</span></div><div><BarChart3 /><strong>Track progress</strong><span>See your improvement over time.</span></div><div><Trophy /><strong>Beat your best</strong><span>Small gains, big momentum.</span></div></div></main></>
}

export function ResultsPage() {
  return <><SiteHeader /><main className="page-container results-page"><div className="page-heading"><div><div className="eyebrow left">YOUR PROGRESS</div><h1>Results & history</h1><p>Every session is a step forward. Keep going.</p></div><button className="ghost-button"><BarChart3 /> View statistics</button></div><div className="stats-grid"><div className="stat-card accent"><span>Best speed</span><strong>82 <small>WPM</small></strong><b>↑ 8% <i>vs last week</i></b></div><div className="stat-card"><span>Average speed</span><strong>73 <small>WPM</small></strong><b>↑ 5% <i>vs last week</i></b></div><div className="stat-card"><span>Average accuracy</span><strong>96<small>%</small></strong><b>↑ 2% <i>vs last week</i></b></div><div className="stat-card"><span>Tests completed</span><strong>24</strong><b className="muted-stat">Keep it up!</b></div></div><section className="history-card"><div className="section-heading"><div><h2>Recent tests</h2><p>Your latest typing sessions</p></div><button className="filter-button">All modes <ChevronDown /></button></div><div className="history-table"><div className="table-head"><span>Date</span><span>Mode</span><span>Speed</span><span>Accuracy</span><span>Duration</span><span /></div>{history.map((item) => <div className="table-row" key={item.date}><span>{item.date}</span><span><span className="mode-dot" />{item.mode}</span><strong>{item.wpm} <small>WPM</small></strong><span className="accuracy-pill">{item.accuracy}</span><span>{item.time}</span><button aria-label={`View test from ${item.date}`}>View →</button></div>)}</div></section><div className="pro-banner"><div className="pro-icon"><Crown /></div><div><h3>Unlock your full potential</h3><p>Get access to punctuation, numbers, symbols, and code modes with TypeRush Pro.</p></div><Link href="/pricing" className="primary-button">Explore Pro <Sparkles /></Link></div></main></>
}

export function PricingPage() {
  return <><SiteHeader /><main className="page-container pricing-page"><div className="eyebrow"><span className="eyebrow-line" /> SIMPLE, HONEST PRICING <span className="eyebrow-line" /></div><h1>Choose your <em>pace.</em></h1><p className="lede">Start building better habits for free. Upgrade when you're ready to go further.</p><div className="pricing-grid"><PlanCard name="Free" price="$0" description="Everything you need to build a daily typing habit." features={['Unlimited classic tests','WPM & accuracy tracking','Personal test history','Daily practice streaks']} /><PlanCard pro name="Pro" price="$6" description="Challenge yourself with advanced modes and deeper insights." features={['Everything in Free','Punctuation & symbols mode','Numbers & code snippets','Advanced statistics','Custom test durations']} /></div><p className="pricing-note"><LockKeyhole /> No payment logic yet — this is a preview of what's coming.</p></main></>
}

function PlanCard({ name, price, description, features, pro = false }: { name: string; price: string; description: string; features: string[]; pro?: boolean }) {
  return <article className={`plan-card ${pro ? 'pro-plan' : ''}`}>{pro && <div className="popular-badge">MOST POPULAR</div>}<div className="plan-top"><div className={`plan-icon ${pro ? 'pro' : ''}`}>{pro ? <Crown /> : <Keyboard />}</div><h2>{name}</h2>{pro && <span className="pro-label">PRO</span>}</div><p>{description}</p><div className="price"><strong>{price}</strong>{pro && <span>/ month</span>}</div><button className={pro ? 'primary-button full' : 'secondary-button full'}>{pro ? 'Coming soon' : 'Current plan'}</button><ul>{features.map((feature) => <li key={feature}><span>✓</span>{feature}</li>)}</ul></article>
}
