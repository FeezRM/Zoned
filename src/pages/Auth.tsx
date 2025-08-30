import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'
import useSupabaseAuth from '@/lib/useSupabaseAuth'

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const navigate = useNavigate()
  const { user, signUp, signInWithPassword, signOut } = useSupabaseAuth()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      if (mode === 'register') {
        const { error } = await signUp(email, password, { name })
  if (error) throw error
  toast('Check your email to confirm your account.')
      } else {
  const { error } = await signInWithPassword(email, password)
  if (error) throw error
  toast('Logged in successfully')
  navigate('/onboarding')
      }
    } catch (err: any) {
  toast(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // If logged in, show profile view
  if (user) {
    const createdAt = (user as any).created_at ? new Date((user as any).created_at).toLocaleString() : undefined
    const email = (user as any).email
    const name = (user as any).user_metadata?.name
    const avatar = (user as any).user_metadata?.avatar_url

    return (
      <div className="min-h-[70vh] flex items-start md:items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-popover border rounded-xl p-6 md:p-8 shadow-sm">
          <h1 className="text-2xl md:text-3xl font-bold text-center mb-6">Your profile</h1>
          <div className="flex flex-col items-center gap-4">
            {avatar ? (
              <img src={avatar} alt="avatar" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-muted" />
            )}
            <div className="text-center">
              <div className="font-medium">{name || 'Anonymous'}</div>
              <div className="text-sm text-muted-foreground">{email}</div>
              {createdAt && (
                <div className="text-xs text-muted-foreground mt-1">Joined {createdAt}</div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="ghost" onClick={() => signOut().then(() => navigate('/'))}>Sign out</Button>
              <Link to="/">
                <Button>Go to dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Otherwise show the auth form
  return (
    <div className="min-h-[70vh] flex items-start md:items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-popover border rounded-xl p-6 md:p-8 shadow-sm">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-6">
          {mode === 'register' ? 'Create an account' : 'Welcome back'}
        </h1>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !email || !password || (mode==='register' && !name)}>
            {loading ? 'Please wait…' : mode === 'register' ? 'Sign up' : 'Log in'}
          </Button>
        </form>

        {mode === 'register' ? (
          <p className="text-xs text-center text-muted-foreground mt-4">
            By clicking the “Sign up” button, you agree to our Terms of Use and Privacy Policy.
          </p>
        ) : null}

        <div className="mt-6 text-center text-sm">
          {mode === 'register' ? (
            <span className="text-muted-foreground">Already have an account? </span>
          ) : (
            <span className="text-muted-foreground">New here? </span>
          )}
          <button
            className="text-primary hover:underline"
            onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
          >
            {mode === 'register' ? 'Log in' : 'Create an account'}
          </button>
        </div>

  {/* Messages now use toasts */}
      </div>
    </div>
  )
}

export default AuthPage
