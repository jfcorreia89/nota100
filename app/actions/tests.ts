'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createTest(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const classId = formData.get('class_id') as string
  const subject = formData.get('subject') as string
  const topic = formData.get('topic') as string
  const testDate = formData.get('test_date') as string

  const { data, error } = await supabase
    .from('tests')
    .insert({ class_id: classId, subject, topic, test_date: testDate, created_by: user.id })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  redirect(`/test/${data.id}`)
}

export async function addTopicPrediction(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const testId = formData.get('test_id') as string
  const topicName = (formData.get('topic_name') as string).trim()

  if (!topicName) return { error: 'Escreve um tópico' }

  // Duplicate check: same user + same topic name (case-insensitive) for this test
  const { data: existing } = await supabase
    .from('topic_predictions')
    .select('id')
    .eq('test_id', testId)
    .eq('created_by', user.id)
    .ilike('topic_name', topicName)
    .limit(1)
    .single()

  if (existing) return { error: 'Já sugeriste este tópico' }

  const { error } = await supabase
    .from('topic_predictions')
    .insert({ test_id: testId, topic_name: topicName, created_by: user.id })

  if (error) return { error: 'Erro ao adicionar tópico' }

  revalidatePath(`/test/${testId}`)
  return { ok: true }
}

export async function voteOnTopic(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const predictionId = formData.get('prediction_id') as string
  const testId = formData.get('test_id') as string

  const { data: existing } = await supabase
    .from('topic_votes')
    .select('id')
    .eq('prediction_id', predictionId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    await supabase.from('topic_votes').delete().eq('id', existing.id)
  } else {
    await supabase.from('topic_votes').insert({ prediction_id: predictionId, user_id: user.id })
  }

  revalidatePath(`/test/${testId}`)
}
