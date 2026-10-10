import Link from 'next/link'
export default function AuthErrorPage() { return <main className="auth-page"><div className="auth-card"><div className="eyebrow">AUTHENTICATION</div><h1>That link expired.</h1><p>Request a new confirmation email or return to the test.</p><Link className="primary-button" href="/auth/login">Back to sign in</Link></div></main> }
