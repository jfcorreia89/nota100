'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import ActorRow from './ActorRow'
import { toggleReaction, shareUpload } from '@/app/actions/uploads'
import type { FeedEvent, ReactionEmoji } from '@/lib/supabase/types'

const REACTION_LABELS: Record<ReactionEmoji, string> = {
  '💡': 'Aprendi',
  '🔥': 'Top',
  '🙏': 'Obrigado',
}

type UploadEvent = Extract<FeedEvent, { type: 'upload' }>

interface Props {
  event: UploadEvent
  currentUserId: string
}

export default function UploadEventCard({ event, currentUserId }: Props) {
  const { actor, upload, timestamp } = event
  const [reactions, setReactions] = useState(upload.reactions)
  const [shared, setShared] = useState(upload.is_public)
  const [shareError, setShareError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isOwn = upload.user_id === currentUserId

  function handleReaction(emoji: ReactionEmoji) {
    setReactions(prev =>
      prev.map(r =>
        r.emoji !== emoji ? r : r.hasReacted
          ? { ...r, count: r.count - 1, hasReacted: false }
          : { ...r, count: r.count + 1, hasReacted: true }
      )
    )
    startTransition(async () => {
      const res = await toggleReaction(upload.id, emoji)
      if (res?.error) setReactions(upload.reactions)
    })
  }

  function handleShare() {
    setShareError(null)
    startTransition(async () => {
      const res = await shareUpload(upload.id)
      if (res?.error) setShareError(res.error)
      else setShared(true)
    })
  }

  return (
    <div className="bg-white border border-[#D4E8F2] rounded-2xl p-4 shadow-sm">
      <ActorRow
        actor={actor}
        timestamp={timestamp}
        action={
          <>fez upload para <strong className="text-[#0C2233]">{upload.subject}</strong></>
        }
      />

      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8AACCB] bg-[#F0F7FC] rounded-md px-2 py-0.5 mb-2">
        {upload.file_type === 'image' ? '📸' : '📄'} {upload.file_type === 'image' ? 'Foto' : 'PDF'}
      </span>

      {upload.ai_summary && (
        <p className="text-sm text-[#5A8AA8] leading-relaxed mb-3 line-clamp-3">
          {upload.ai_summary}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {reactions.map(r => (
          <button
            key={r.emoji}
            onClick={() => handleReaction(r.emoji)}
            disabled={isPending}
            title={REACTION_LABELS[r.emoji]}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors disabled:opacity-50"
            style={{
              background: r.hasReacted ? '#E0F2FC' : '#F8FAFC',
              borderColor: r.hasReacted ? '#0369A1' : '#D4E8F2',
              color: r.hasReacted ? '#0369A1' : '#5A8AA8',
            }}
          >
            <span>{r.emoji}</span>
            {r.count > 0 && <span>{r.count}</span>}
          </button>
        ))}

        {shared && (
          <Link
            href={`/test/${upload.test_id}/quiz`}
            className="ml-auto text-xs text-[#0369A1] font-medium hover:underline flex-shrink-0"
          >
            🎮 Quiz →
          </Link>
        )}
      </div>

      {isOwn && !shared && (
        <button
          onClick={handleShare}
          disabled={isPending}
          className="w-full mt-3 py-2.5 rounded-xl font-semibold text-sm border border-[#0369A1] text-[#0369A1] bg-white disabled:opacity-50"
        >
          {isPending ? 'A partilhar…' : '🌍 Partilhar com a turma'}
        </button>
      )}
      {shareError && <p className="text-xs text-red-500 mt-2 px-1">{shareError}</p>}
    </div>
  )
}
