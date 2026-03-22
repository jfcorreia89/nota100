'use client'

import { useTransition, useState } from 'react'
import ActorRow from './ActorRow'
import { voteOnTopic } from '@/app/actions/tests'
import type { FeedEvent } from '@/lib/supabase/types'

type TopicEvent = Extract<FeedEvent, { type: 'topic_suggested' }>

export default function TopicSuggestedCard({ event }: { event: TopicEvent }) {
  const { actor, topic, timestamp } = event
  const [voteCount, setVoteCount] = useState(topic.vote_count)
  const [hasVoted, setHasVoted] = useState(topic.has_voted)
  const [isPending, startTransition] = useTransition()

  const label = voteCount >= 15 ? 'Alta' : voteCount >= 7 ? 'Média' : 'Baixa'
  const colorMap = {
    Alta:  { bg: '#FEE2E2', text: '#C0392B', dot: '#E03B3B' },
    Média: { bg: '#FEF3C7', text: '#C2681C', dot: '#F59E0B' },
    Baixa: { bg: '#D1FAE5', text: '#2D8A56', dot: '#2D8A56' },
  }
  const colors = colorMap[label]

  function handleVote() {
    setVoteCount(v => hasVoted ? v - 1 : v + 1)
    setHasVoted(v => !v)
    const fd = new FormData()
    fd.append('prediction_id', topic.id)
    fd.append('test_id', topic.test_id)
    startTransition(() => voteOnTopic(fd))
  }

  return (
    <div className="bg-white border border-[#D4E8F2] rounded-2xl p-4 shadow-sm">
      <ActorRow
        actor={actor}
        timestamp={timestamp}
        action={<>sugeriu tópico para <strong className="text-[#0C2233]">{topic.subject}</strong></>}
      />
      <div className="flex items-center gap-3 bg-[#F8FAFC] rounded-xl px-3.5 py-3">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors.dot }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#0C2233] truncate">{topic.topic_name}</p>
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-md mt-1 inline-block"
            style={{ background: colors.bg, color: colors.text }}
          >
            {label}
          </span>
        </div>
        <button
          onClick={handleVote}
          disabled={isPending}
          className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border transition-colors disabled:opacity-50"
          style={{
            background: hasVoted ? '#E0F2FC' : '#F8FAFC',
            borderColor: hasVoted ? '#0369A1' : '#D4E8F2',
          }}
        >
          <span className="text-sm leading-none" style={{ color: hasVoted ? '#0369A1' : '#8AACCB', fontWeight: hasVoted ? 700 : 400 }}>↑</span>
          <span className="text-[11px] font-bold" style={{ color: hasVoted ? '#0369A1' : '#8AACCB' }}>{voteCount}</span>
        </button>
      </div>
    </div>
  )
}
