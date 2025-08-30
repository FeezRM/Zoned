import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/sonner'
import useSupabaseAuth from '@/lib/useSupabaseAuth'
import { getProfile, upsertProfile, uploadAvatar } from '@/lib/profiles'

const Onboarding: React.FC = () => {
  const { user } = useSupabaseAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [goals, setGoals] = useState('')
  const [focusAreas, setFocusAreas] = useState('')
  const [style, setStyle] = useState<'maker' | 'manager' | 'balanced'>('balanced')
  const [chronotype, setChrono] = useState<'morning' | 'evening' | 'neutral'>('neutral')
  const [burnoutRisk, setBurnoutRisk] = useState(3)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    getProfile(user.id).then(({ data }) => {
      if (data) {
        setDisplayName(data.display_name ?? '')
        setGoals((data.goals ?? []).join(', '))
        setFocusAreas((data.focus_areas ?? []).join(', '))
        setStyle((data.preferences?.productivity_style as any) ?? 'balanced')
        setChrono((data.preferences?.chronotype as any) ?? 'neutral')
        setBurnoutRisk(data.preferences?.burnout_risk ?? 3)
        if (data.onboarding_completed) navigate('/')
      }
    })
  }, [user])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    try {
      let avatar_url: string | undefined
      if (avatarFile) {
        const { data, error } = await uploadAvatar(user.id, avatarFile)
        if (error) throw error
        avatar_url = data || undefined
      }
      const payload = {
        id: user.id,
        display_name: displayName,
        avatar_url,
        goals: goals ? goals.split(',').map((g) => g.trim()).filter(Boolean) : [],
        focus_areas: focusAreas ? focusAreas.split(',').map((g) => g.trim()).filter(Boolean) : [],
        preferences: {
          productivity_style: style,
          chronotype,
          burnout_risk: burnoutRisk,
        },
        onboarding_completed: true,
      }
      const { error } = await upsertProfile(payload)
      if (error) throw error
      toast('Welcome to Zoned — you’re all set!')
      navigate('/')
    } catch (err: any) {
      toast(err.message || 'Failed to save onboarding')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Welcome to Zoned</h1>
      <p className="text-muted-foreground mb-8">
        Zoned helps you gamify and romanticize your life. Build purpose and discipline without burnout.
      </p>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">What should we call you?</Label>
            <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar">Add an avatar (optional)</Label>
            <Input id="avatar" type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>What are your current goals? (comma separated)</Label>
          <Input placeholder="Get fit, Learn React, Read 12 books" value={goals} onChange={(e) => setGoals(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>What areas will you focus on?</Label>
          <Input placeholder="Health, Career, Mindfulness" value={focusAreas} onChange={(e) => setFocusAreas(e.target.value)} />
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>Your productivity style</Label>
            <select className="w-full bg-background border rounded p-2" value={style} onChange={(e) => setStyle(e.target.value as any)}>
              <option value="maker">Maker (deep work)</option>
              <option value="manager">Manager (meetings)</option>
              <option value="balanced">Balanced</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Your chronotype</Label>
            <select className="w-full bg-background border rounded p-2" value={chronotype} onChange={(e) => setChrono(e.target.value as any)}>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Burnout risk (how close do you feel to the edge?)</Label>
            <input type="range" min={1} max={5} value={burnoutRisk} onChange={(e) => setBurnoutRisk(parseInt(e.target.value))} className="w-full" />
            <div className="text-xs text-muted-foreground">{burnoutRisk} / 5</div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate('/')}>Skip for now</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Finish onboarding'}</Button>
        </div>
      </form>
    </div>
  )
}

export default Onboarding
