'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setMessage('')
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    setLoading(false)
    setMessage(error?.message === 'Invalid login credentials' ? 'Invalid email or password.' : error ? 'Unable to sign in. Please try again.' : 'Signed in. You can close this page.')
    if (!error) window.location.href = '/'
  }
  return <main className="auth-page"><form className="auth-card" onSubmit={submit}><Link className="brand" href="/"><span className="brand-mark">T</span><span>TypeRush</span></Link><div><div className="eyebrow">WELCOME BACK</div><h1>Sign in.</h1><p>Save your results and keep your progress close.</p></div><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>{message && <p className="auth-message">{message}</p>}<button className="primary-button" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button><p className="auth-switch">New to TypeRush? <Link href="/auth/sign-up">Create an account</Link></p></form></main>
}
