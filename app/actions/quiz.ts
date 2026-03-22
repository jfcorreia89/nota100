'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { BadgeSlug } from '@/lib/supabase/types'

interface SaveQuizAttemptInput {
  testId: string
  score: number
  questionsCorrect: number
  questionsTotal: number
  badges: BadgeSlug[]
}

export async function saveQuizAttempt(input: SaveQuizAttemptInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { testId, score, questionsCorrect, questionsTotal, badges } = input

  // Save attempt
  const { error } = await supabase
    .from('quiz_attempts')
    .insert({
      user_id: user.id,
      test_id: testId,
      score,
      questions_correct: questionsCorrect,
      questions_total: questionsTotal,
      badges,
    })

  if (error) return { error: error.message }

  // Update streak via admin client (bypasses RLS for profile update)
  const adminSupabase = await createAdminClient()
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('streak_count, last_active')
    .eq('id', user.id)
    .single()

  if (profile) {
    const now = new Date()
    const lastActive = profile.last_active ? new Date(profile.last_active) : null
    const hoursSinceLast = lastActive
      ? (now.getTime() - lastActive.getTime()) / 3600000
      : Infinity

    let newStreak = profile.streak_count
    if (hoursSinceLast >= 20 && hoursSinceLast < 48) {
      // Was active yesterday-ish → increment
      newStreak = profile.streak_count + 1
    } else if (hoursSinceLast >= 48) {
      // Missed a day → reset
      newStreak = 1
    }
    // If hoursSinceLast < 20: same day, no change to streak count

    await adminSupabase
      .from('profiles')
      .update({ streak_count: newStreak, last_active: now.toISOString() } as never)
      .eq('id', user.id)
  }

  return { ok: true }
}
