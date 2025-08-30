import supabase from '@/helper/supabaseClient'
import type { Profile } from '@/types/profile'

export async function getProfile(userId: string) {
  return await supabase.from('profiles').select('*').eq('id', userId).single()
}

export async function upsertProfile(profile: Partial<Profile> & { id: string }) {
  return await supabase.from('profiles').upsert(profile).select().single()
}

export async function uploadAvatar(userId: string, file: File) {
  const filePath = `${userId}/${Date.now()}_${file.name}`
  const { error } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
  if (error) return { data: null, error }
  const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(filePath)
  return { data: publicUrl?.publicUrl ?? null, error: null }
}
