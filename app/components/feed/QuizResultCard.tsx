import ActorRow from './ActorRow'
import type { FeedEvent, BadgeSlug } from '@/lib/supabase/types'

type QuizEvent = Extract<FeedEvent, { type: 'quiz_completed' }>

const BADGE_META: Record<BadgeSlug, { emoji: string; label: string }> = {
  perfect:      { emoji: '🎯', label: 'Perfeito' },
  lightning:    { emoji: '⚡', label: 'Relâmpago' },
  five_correct: { emoji: '🧠', label: '5 Certas' },
  on_fire:      { emoji: '🔥', label: 'Em Chamas' },
  completed:    { emoji: '🏅', label: 'Dedicado' },
}

export default function QuizResultCard({ event }: { event: QuizEvent }) {
  const { actor, quiz, timestamp } = event
  const accuracy = quiz.questions_total > 0
    ? Math.round((quiz.questions_correct / quiz.questions_total) * 100)
    : 0
  const badges = quiz.badges.filter(b => b !== 'completed')

  return (
    <div className="bg-white border border-[#D4E8F2] rounded-2xl p-4 shadow-sm">
      <ActorRow
        actor={actor}
        timestamp={timestamp}
        action={<>completou quiz de <strong className="text-[#0C2233]">{quiz.subject}</strong></>}
      />
      <div
        className="rounded-xl p-3.5 flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg, #E0F2FC 0%, #F0F7FC 100%)' }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #024F82, #0369A1)' }}
        >
          <span className="text-base font-black leading-none">{quiz.score}</span>
          <span className="text-[9px] font-semibold opacity-80 uppercase">XP</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#0C2233]">{quiz.subject}</p>
          <p className="text-xs text-[#5A8AA8] mt-0.5">
            {quiz.questions_correct}/{quiz.questions_total} certas · {accuracy}% precisão
          </p>
          {badges.length > 0 && (
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {badges.map(slug => {
                const b = BADGE_META[slug]
                return (
                  <span key={slug} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white border border-[#D4E8F2] text-[#0C2233]">
                    {b.emoji} {b.label}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
