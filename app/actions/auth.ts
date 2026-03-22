'use server'

import { redirect } from 'next/navigation'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single()

  if (profile?.role === 'admin') redirect('/admin')
  redirect('/dashboard')
}

export async function register(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })
  if (error) return { error: error.message }

  redirect('/onboarding')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function joinClass(formData: FormData) {
  const supabase = await createClient()
  const code = (formData.get('code') as string).toUpperCase().trim()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // Find the invite code
  const { data: invite, error: inviteError } = await supabase
    .from('invite_codes')
    .select('id, class_id, is_active, uses_count')
    .eq('code', code)
    .single()

  if (inviteError || !invite) return { error: 'Código inválido ou expirado' }
  if (!invite.is_active) return { error: 'Este código já não está ativo' }

  // Check not already a member
  const { data: existing } = await supabase
    .from('class_members')
    .select('user_id')
    .eq('class_id', invite.class_id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    redirect('/dashboard')
  }

  // Join
  const { error: joinError } = await supabase
    .from('class_members')
    .insert({ class_id: invite.class_id, user_id: user.id })

  if (joinError) return { error: 'Erro ao entrar na turma' }

  // Consume the code: mark as used (single-use) — requires admin client to bypass RLS
  const adminSupabase = await createAdminClient()
  await adminSupabase
    .from('invite_codes')
    .update({ is_active: false, used_by: user.id, uses_count: invite.uses_count + 1 } as never)
    .eq('id', invite.id)

  redirect('/dashboard')
}
