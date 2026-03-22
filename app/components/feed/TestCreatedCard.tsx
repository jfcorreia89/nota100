import Link from 'next/link'
import ActorRow from './ActorRow'
import { daysUntil } from '@/lib/utils'
import type { FeedEvent } from '@/lib/supabase/types'

type TestCreatedEvent = Extract<FeedEvent, { type: 'test_created' }>

export default function TestCreatedCard({ event }: { event: TestCreatedEvent }) {
  const { actor, test, timestamp } = event
  const days = daysUntil(test.test_date)
  const isPast = days < 0

  return (
    <div className="bg-white border border-[#D4E8F2] rounded-2xl p-4 shadow-sm">
      <ActorRow
        actor={actor}
        timestamp={timestamp}
        action="adicionou um novo teste"
      />
      <Link href={`/test/${test.id}`}>
        <div className="bg-[#E0F2FC] border border-[#B8DEF2] rounded-xl p-3.5">
          <div className="flex items-start justify-between mb-1.5">
            <p className="text-sm font-bold text-[#0C2233]">{test.subject}</p>
            {!isPast && (
              <span
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white flex-shrink-0 ml-2"
                style={{ background: days <= 5 ? '#C0392B' : days <= 10 ? '#C2681C' : '#0369A1' }}
              >
                {days === 0 ? 'Hoje!' : days === 1 ? 'amanhã' : `em ${days}d`}
              </span>
            )}
          </div>
          <p className="text-xs text-[#5A8AA8] mb-3 truncate">{test.topic}</p>
          <div className="flex gap-2">
            <Link
              href={`/upload?test=${test.id}`}
              className="flex-1 py-2 rounded-lg text-xs font-semibold text-center text-white"
              style={{ background: 'linear-gradient(135deg, #024F82, #0369A1)' }}
            >
              📸 Upload
            </Link>
            <Link
              href={`/test/${test.id}`}
              className="flex-1 py-2 rounded-lg text-xs font-semibold text-center text-[#0369A1] bg-white border border-[#B8DEF2]"
            >
              🔮 Previsões
            </Link>
          </div>
        </div>
      </Link>
    </div>
  )
}
