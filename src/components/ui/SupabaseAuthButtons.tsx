import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import useSupabaseAuth from '@/lib/useSupabaseAuth'

export const SupabaseAuthButtons: React.FC = () => {
  const { user, signInWithEmail, signUp, signInWithPassword, signOut, loading } = useSupabaseAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'magic' | 'password' | 'register'>('magic')
  const [message, setMessage] = useState<string | null>(null)

  if (loading) return null

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{user.email}</span>
        <Button variant="ghost" size="sm" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    )
  }

  const handleMagic = async () => {
    setMessage(null)
    const { error } = await signInWithEmail(email)
    if (error) setMessage(error.message)
    else setMessage('Check your email for the magic link')
  }

  const handleRegister = async () => {
    setMessage(null)
    const { data, error } = await signUp(email, password)
    if (error) setMessage(error.message)
    else setMessage('Registration successful — check email to confirm')
  }

  const handlePasswordLogin = async () => {
    setMessage(null)
    const { error } = await signInWithPassword(email, password)
    if (error) setMessage(error.message)
  }

  return (
    <div className="flex items-center gap-2">
      <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="bg-transparent border rounded px-2 py-1 text-sm">
        <option value="magic">Magic link</option>
        <option value="password">Password login</option>
        <option value="register">Register</option>
      </select>

      <input
        className="bg-transparent border rounded px-2 py-1 text-sm text-foreground"
        placeholder="you@domain.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {(mode === 'password' || mode === 'register') && (
        <input
          type="password"
          className="bg-transparent border rounded px-2 py-1 text-sm text-foreground"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      )}

      {mode === 'magic' && (
        <Button variant="ghost" size="sm" onClick={handleMagic} disabled={!email}>
          Send link
        </Button>
      )}

      {mode === 'register' && (
        <Button variant="ghost" size="sm" onClick={handleRegister} disabled={!email || !password}>
          Register
        </Button>
      )}

      {mode === 'password' && (
        <Button variant="ghost" size="sm" onClick={handlePasswordLogin} disabled={!email || !password}>
          Sign in
        </Button>
      )}

      {message && <div className="text-xs text-muted-foreground">{message}</div>}
    </div>
  )
}

export default SupabaseAuthButtons
