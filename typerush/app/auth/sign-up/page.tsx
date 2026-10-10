'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignUpPage() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent) { event.preventDefault(); setLoading(true); setMessage(''); const { error } = await createClient().auth.signUp({ email, password, options: { emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback` } }); setLoading(false); setMessage(error ? (error.message.includes('Password') ? error.message : 'Unable to create your account. Please try again.') : 'Check your inbox to confirm your email, then sign in.') }
  return <main className="auth-page"><form className="auth-card" onSubmit={submit}><Link className="brand" href="/"><span className="brand-mark">T</span><span>TypeRush</span></Link><div><div className="eyebrow">JOIN TYPERUSH</div><h1>Create account.</h1><p>Keep a record of every run and your fastest flow.</p></div><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label><label>Password<input type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} required /></label>{message && <p className="auth-message">{message}</p>}<button className="primary-button" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</button><p className="auth-switch">Already have an account? <Link href="/auth/login">Sign in</Link></p></form></main>
}
