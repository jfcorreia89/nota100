'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { ReactionEmoji } from '@/lib/supabase/types'

export async function shareUpload(uploadId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // Verify ownership before updating
  const { data: upload, error: fetchError } = await supabase
    .from('uploads')
    .select('id, test_id, user_id')
    .eq('id', uploadId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !upload) return { error: 'Upload não encontrado' }

  // Use admin client to bypass RLS for the update (ownership already verified above)
  const admin = await createAdminClient()
  const { error } = await admin
    .from('uploads')
    .update({ is_public: true })
    .eq('id', uploadId)

  if (error) return { error: error.message }

  revalidatePath(`/test/${upload.test_id}`)
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function toggleReaction(uploadId: string, emoji: ReactionEmoji) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: existing } = await supabase
    .from('upload_reactions')
    .select('id')
    .eq('upload_id', uploadId)
    .eq('user_id', user.id)
    .eq('emoji', emoji)
    .single()

  if (existing) {
    const { error } = await supabase.from('upload_reactions').delete().eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('upload_reactions').insert({ upload_id: uploadId, user_id: user.id, emoji })
    if (error) return { error: error.message }
  }

  const { data: upload } = await supabase.from('uploads').select('test_id').eq('id', uploadId).single()
  if (upload) {
    revalidatePath(`/test/${upload.test_id}`)
    revalidatePath('/dashboard')
  }

  return { ok: true }
}
