'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'

function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function createClass(formData: FormData): Promise<void> {
  const supabase = await createAdminClient()
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) return

  const name = formData.get('name') as string
  const subject = (formData.get('subject') as string) || ''

  const { data: cls, error: classError } = await supabase
    .from('classes')
    .insert({ name, subject, created_by: user.id })
    .select('id')
    .single()

  if (classError) throw new Error(classError.message)

  // Generate invite code
  let code = randomCode()
  let attempts = 0
  while (attempts < 5) {
    const { error } = await supabase
      .from('invite_codes')
      .insert({ class_id: cls.id, code, created_by: user.id })
    if (!error) break
    code = randomCode()
    attempts++
  }

  revalidatePath('/admin/classes')
}

export async function generateInviteCode(formData: FormData) {
  const supabase = await createAdminClient()
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const classId = formData.get('class_id') as string
  if (!classId) return { error: 'Seleciona uma turma' }

  let lastError: string | null = null
  let code = randomCode()
  for (let i = 0; i < 5; i++) {
    const { error } = await supabase
      .from('invite_codes')
      .insert({ class_id: classId, code, created_by: user.id })
    if (!error) {
      revalidatePath('/admin/classes')
      revalidatePath(`/admin/classes/${classId}`)
      revalidatePath('/admin/invites')
      return { ok: true, code }
    }
    lastError = error.message
    code = randomCode()
  }

  return { error: lastError ?? 'Erro ao gerar código' }
}

export async function deactivateInviteCode(formData: FormData): Promise<void> {
  const supabase = await createAdminClient()
  const codeId = formData.get('code_id') as string
  const classId = formData.get('class_id') as string

  await supabase
    .from('invite_codes')
    .update({ is_active: false } as never)
    .eq('id', codeId)

  revalidatePath('/admin/invites')
  revalidatePath(`/admin/classes/${classId}`)
}
