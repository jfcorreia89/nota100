'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { AIQuestion, BadgeSlug } from '@/lib/supabase/types'
import { saveQuizAttempt } from '@/app/actions/quiz'

const QUESTION_TIME = 30 // seconds per question

const BADGE_META: Record<BadgeSlug, { emoji: string; label: string }> = {
  perfect:     { emoji: '🎯', label: 'Pontaria Perfeita' },
  lightning:   { emoji: '⚡', label: 'Relâmpago' },
  five_correct:{ emoji: '🧠', label: 'Primeira Tentativa' },
  on_fire:     { emoji: '🔥', label: 'Em Chamas' },
  completed:   { emoji: '🏅', label: 'Dedicado' },
}

interface Props {
  testId: string
  testSubject: string
  testTopic: string
  questions: AIQuestion[]
  bestScore: number | null
}

type Phase = 'intro' | 'question' | 'feedback' | 'results'

export default function QuizClient({ testId, testSubject, testTopic, questions, bestScore }: Props) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('intro')
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME)
  const [answerTimes, setAnswerTimes] = useState<number[]>([])  // ms per question
  const [correctStreak, setCorrectStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [earnedBadges, setEarnedBadges] = useState<BadgeSlug[]>([])
  const [saving, setSaving] = useState(false)

  const questionStartRef = useRef<number>(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const q = questions[current]
  const total = questions.length

  // Start timer when entering question phase
  useEffect(() => {
    if (phase !== 'question') return
    questionStartRef.current = Date.now()
    setTimeLeft(QUESTION_TIME)

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          // Time's up — auto-submit with no answer
          handleAnswer(null, 0)
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, current])

  const handleAnswer = useCallback((letter: string | null, remainingTime: number) => {
    if (timerRef.current) clearInterval(timerRef.current)

    const elapsed = Date.now() - questionStartRef.current
    setAnswerTimes(prev => [...prev, elapsed])
    setSelected(letter)

    const isCorrect = letter !== null && letter === q.answer

    // Compute new values locally — avoids stale closure issues when calling finishQuiz
    const newCorrectCount = correctCount + (isCorrect ? 1 : 0)
    const newCorrectStreak = isCorrect ? correctStreak + 1 : 0
    const newMaxStreak = Math.max(maxStreak, newCorrectStreak)
    const newAnswerTimes = [...answerTimes, elapsed]

    if (isCorrect) {
      const speedBonus = Math.floor((remainingTime / QUESTION_TIME) * 10)
      setScore(prev => prev + 10 + speedBonus)
      setCorrectCount(newCorrectCount)
      setCorrectStreak(newCorrectStreak)
      setMaxStreak(newMaxStreak)
    } else {
      setCorrectStreak(0)
    }

    setPhase('feedback')

    setTimeout(() => {
      if (current + 1 >= total) {
        finishQuiz(newCorrectCount, newMaxStreak, newAnswerTimes)
      } else {
        setCurrent(c => c + 1)
        setSelected(null)
        setPhase('question')
      }
    }, 1500)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, total, q, correctCount, correctStreak, maxStreak, answerTimes])

  function finishQuiz(finalCorrect: number, finalMaxStreak: number, allAnswerTimes: number[]) {
    const badges: BadgeSlug[] = ['completed']

    if (finalCorrect === total) badges.push('perfect')
    if (finalCorrect >= 5) badges.push('five_correct')
    if (finalMaxStreak >= 5) badges.push('on_fire')

    const avgTime = allAnswerTimes.length > 0
      ? allAnswerTimes.reduce((a, b) => a + b, 0) / allAnswerTimes.length / 1000
      : QUESTION_TIME
    if (avgTime < 10) badges.push('lightning')

    setEarnedBadges(badges)
    setPhase('results')
  }

  // Save when results phase is reached
  useEffect(() => {
    if (phase !== 'results' || saving) return
    setSaving(true)
    saveQuizAttempt({
      testId,
      score,
      questionsCorrect: correctCount,
      questionsTotal: total,
      badges: earnedBadges,
    })
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Intro ────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-[#F0F7FC] flex flex-col">
        <div className="px-6 pt-12 pb-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white border border-[#D4E8F2] flex items-center justify-center text-lg"
          >
            ‹
          </button>
          <div>
            <p className="text-xs text-[#5A8AA8] font-medium uppercase tracking-wider">{testSubject}</p>
            <h1 className="text-lg font-bold text-[#0C2233] leading-tight">{testTopic}</h1>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <div className="text-6xl">🎮</div>
          <div className="text-center">
            <p className="text-2xl font-black text-[#0C2233]">{total} perguntas</p>
            <p className="text-sm text-[#5A8AA8] mt-1">Pool da turma • 30s por pergunta</p>
            {bestScore !== null && (
              <p className="text-sm text-[#0369A1] font-semibold mt-2">Melhor score: {bestScore} XP</p>
            )}
          </div>

          <div className="w-full space-y-3">
            <div className="bg-white border border-[#D4E8F2] rounded-2xl p-4 grid grid-cols-2 gap-3 text-center text-sm">
              <div>
                <p className="text-2xl font-black text-[#0369A1]">+10</p>
                <p className="text-xs text-[#5A8AA8]">XP por resposta</p>
              </div>
              <div>
                <p className="text-2xl font-black text-[#0369A1]">+10</p>
                <p className="text-xs text-[#5A8AA8]">XP speed bonus</p>
              </div>
            </div>

            <button
              onClick={() => setPhase('question')}
              className="w-full py-4 rounded-2xl text-white font-bold text-base"
              style={{ background: 'linear-gradient(135deg, #024F82, #0369A1)' }}
            >
              Iniciar Quiz →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Results ──────────────────────────────────────────────────────────────
  if (phase === 'results') {
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0
    const isNewBest = bestScore === null || score > bestScore

    return (
      <div className="min-h-screen bg-[#F0F7FC] pb-24">
        <div className="px-6 pt-12 pb-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white border border-[#D4E8F2] flex items-center justify-center text-lg"
          >
            ‹
          </button>
          <h1 className="text-lg font-bold text-[#0C2233]">Resultado</h1>
        </div>

        {/* Score hero */}
        <div className="mx-6 mb-5 rounded-2xl p-6 text-white text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #024F82 0%, #0369A1 50%, #06B6D4 100%)' }}>
          <div className="absolute top-[-24px] right-[-24px] w-24 h-24 rounded-full bg-white/10" />
          {isNewBest && (
            <p className="text-xs font-semibold bg-white/20 rounded-full px-3 py-1 inline-block mb-3">
              🏆 Novo recorde!
            </p>
          )}
          <p className="text-5xl font-black">{score}</p>
          <p className="text-base opacity-75 mt-1">XP</p>
          <p className="text-sm opacity-80 mt-2">
            {correctCount}/{total} corretas • {accuracy}% de precisão
          </p>
        </div>

        {/* Badges */}
        {earnedBadges.length > 0 && (
          <div className="mx-6 mb-5">
            <p className="text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest mb-3">Conquistas</p>
            <div className="flex flex-wrap gap-2">
              {earnedBadges.map(slug => {
                const b = BADGE_META[slug]
                return (
                  <div
                    key={slug}
                    className="flex items-center gap-1.5 bg-white border border-[#D4E8F2] rounded-xl px-3 py-2 shadow-sm"
                  >
                    <span className="text-lg">{b.emoji}</span>
                    <span className="text-sm font-semibold text-[#0C2233]">{b.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mx-6 space-y-3">
          <button
            onClick={() => {
              setCurrent(0)
              setSelected(null)
              setScore(0)
              setTimeLeft(QUESTION_TIME)
              setAnswerTimes([])
              setCorrectStreak(0)
              setMaxStreak(0)
              setCorrectCount(0)
              setEarnedBadges([])
              setSaving(false)
              setPhase('intro')
            }}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm"
            style={{ background: 'linear-gradient(135deg, #024F82, #0369A1)' }}
          >
            Jogar de novo
          </button>
          <button
            onClick={() => router.push(`/test/${testId}`)}
            className="w-full py-3.5 rounded-xl text-[#0369A1] font-semibold text-sm bg-white border border-[#D4E8F2]"
          >
            Ver apontamentos
          </button>
        </div>
      </div>
    )
  }

  // ─── Question / Feedback ──────────────────────────────────────────────────
  const timerPct = (timeLeft / QUESTION_TIME) * 100

  return (
    <div className="min-h-screen bg-[#F0F7FC] flex flex-col pb-8">
      {/* Progress + score */}
      <div className="px-6 pt-10 pb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-[#5A8AA8]">
            {current + 1} / {total}
          </p>
          <p className="text-xs font-bold text-[#0369A1]">{score} XP</p>
        </div>
        <div className="h-2 rounded-full bg-[#D4E8F2] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${((current) / total) * 100}%`,
              background: 'linear-gradient(90deg, #0369A1, #06B6D4)',
            }}
          />
        </div>
      </div>

      {/* Timer bar */}
      <div className="px-6 mb-5">
        <div className="h-1.5 rounded-full bg-[#D4E8F2] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 linear"
            style={{
              width: `${timerPct}%`,
              background: timerPct > 50 ? '#2D8A56' : timerPct > 20 ? '#F59E0B' : '#C0392B',
            }}
          />
        </div>
        <p className="text-right text-xs text-[#8AACCB] mt-1">{timeLeft}s</p>
      </div>

      {/* Question */}
      <div className="px-6 mb-6">
        <div className="bg-white border border-[#D4E8F2] rounded-2xl p-5 shadow-sm">
          <p className="text-base font-bold text-[#0C2233] leading-snug">{q.question}</p>
        </div>
      </div>

      {/* Options */}
      <div className="px-6 space-y-3 flex-1">
        {q.options.map((opt) => {
          const letter = opt.charAt(0)
          const isCorrect = letter === q.answer
          const isSelected = selected === letter
          const showResult = phase === 'feedback'

          let bg = '#FFFFFF'
          let border = '#D4E8F2'
          let color = '#0C2233'

          if (showResult && isCorrect) { bg = '#D1FAE5'; border = '#2D8A56'; color = '#2D8A56' }
          else if (showResult && isSelected && !isCorrect) { bg = '#FEE2E2'; border = '#C0392B'; color = '#C0392B' }
          else if (isSelected) { bg = '#E0F2FC'; border = '#0369A1'; color = '#0369A1' }

          return (
            <button
              key={letter}
              disabled={phase === 'feedback'}
              onClick={() => phase === 'question' && handleAnswer(letter, timeLeft)}
              className="w-full text-left px-4 py-3.5 rounded-2xl border font-medium text-sm transition-colors shadow-sm"
              style={{ background: bg, borderColor: border, color }}
            >
              {opt}
            </button>
          )
        })}
      </div>

      {/* XP flash on feedback */}
      {phase === 'feedback' && selected === q.answer && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 animate-bounce">
          <div
            className="px-5 py-2 rounded-full text-white font-black text-lg shadow-lg"
            style={{ background: 'linear-gradient(135deg, #024F82, #06B6D4)' }}
          >
            +{10 + Math.floor((timeLeft / QUESTION_TIME) * 10)} XP
          </div>
        </div>
      )}
    </div>
  )
}
