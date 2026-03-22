'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ReactionEmoji } from '@/lib/supabase/types'

export async function shareUpload(uploadId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: upload, error: fetchError } = await supabase
    .from('uploads')
    .select('id, test_id, user_id')
    .eq('id', uploadId)
    .eq('user_id', user.id)  // only own uploads
    .single()

  if (fetchError || !upload) return { error: 'Upload não encontrado' }

  const { error } = await supabase
    .from('uploads')
    .update({ is_public: true } as never)
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

  // Check if reaction already exists
  const { data: existing } = await supabase
    .from('upload_reactions')
    .select('id')
    .eq('upload_id', uploadId)
    .eq('user_id', user.id)
    .eq('emoji', emoji)
    .single()

  if (existing) {
    await supabase.from('upload_reactions').delete().eq('id', existing.id)
  } else {
    await supabase.from('upload_reactions').insert({ upload_id: uploadId, user_id: user.id, emoji })
  }

  // Revalidate the pages that show this upload
  const { data: upload } = await supabase
    .from('uploads')
    .select('test_id')
    .eq('id', uploadId)
    .single()

  if (upload) {
    revalidatePath(`/test/${upload.test_id}`)
    revalidatePath('/dashboard')
  }

  return { ok: true }
}
