import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import type { AIQuestion } from '@/lib/supabase/types'
import QuizClient from './QuizClient'

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: test } = await supabase
    .from('tests')
    .select('id, subject, topic')
    .eq('id', id)
    .single()

  if (!test) notFound()

  // Fetch all uploads for this test that have AI questions
  const { data: uploads } = await supabase
    .from('uploads')
    .select('ai_questions')
    .eq('test_id', id)
    .not('ai_questions', 'is', null)

  // Flatten and shuffle questions from all uploads
  const allQuestions: AIQuestion[] = []
  for (const upload of uploads ?? []) {
    if (Array.isArray(upload.ai_questions)) {
      allQuestions.push(...(upload.ai_questions as AIQuestion[]))
    }
  }

  // Shuffle
  for (let i = allQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]]
  }

  // Cap at 10 questions
  const questions = allQuestions.slice(0, 10)

  if (questions.length === 0) redirect(`/test/${id}`)

  // Fetch user's best score for this test
  const { data: bestAttempt } = await supabase
    .from('quiz_attempts')
    .select('score')
    .eq('test_id', id)
    .eq('user_id', user.id)
    .order('score', { ascending: false })
    .limit(1)
    .single()

  return (
    <QuizClient
      testId={id}
      testSubject={test.subject}
      testTopic={test.topic}
      questions={questions}
      bestScore={bestAttempt?.score ?? null}
    />
  )
}
