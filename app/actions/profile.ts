'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function updateAvatar(base64: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // Decode base64 → buffer
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(base64Data, 'base64')

  const path = `${user.id}/${user.id}.jpg`

  // Upload to avatars bucket (upsert to overwrite existing)
  const { error: storageError } = await supabase.storage
    .from('avatars')
    .upload(path, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (storageError) return { error: storageError.message }

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

  // Add cache-busting timestamp so the browser re-fetches the new photo
  const avatarUrl = `${publicUrl}?t=${Date.now()}`

  const adminSupabase = await createAdminClient()
  const { error: dbError } = await adminSupabase
    .from('profiles')
    .update({ avatar_url: avatarUrl } as never)
    .eq('id', user.id)

  if (dbError) return { error: dbError.message }

  revalidatePath('/profile')
  revalidatePath('/dashboard')
  return {}
}
