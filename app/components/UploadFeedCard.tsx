'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { getInitials } from '@/lib/utils'
import { toggleReaction, shareUpload } from '@/app/actions/uploads'
import type { ReactionEmoji } from '@/lib/supabase/types'

export interface FeedUpload {
  id: string
  user_id?: string
  test_id: string
  file_type: 'pdf' | 'image'
  ai_summary: string | null
  is_public: boolean
  created_at: string
  profiles: { name: string; avatar_url?: string | null } | null
  tests?: { subject: string; topic: string } | null
  reactions: { emoji: ReactionEmoji; count: number; hasReacted: boolean }[]
}

const REACTION_LABELS: Record<ReactionEmoji, string> = {
  '💡': 'Aprendi',
  '🔥': 'Top',
  '🙏': 'Obrigado',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours}h`
  return `há ${Math.floor(hours / 24)}d`
}

interface Props {
  upload: FeedUpload
  currentUserId: string
  showTest?: boolean
}

export default function UploadFeedCard({ upload, currentUserId, showTest = false }: Props) {
  const [reactions, setReactions] = useState(upload.reactions)
  const [shared, setShared] = useState(upload.is_public)
  const [shareError, setShareError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isOwn = Boolean(upload.user_id) && upload.user_id === currentUserId
  const name = upload.profiles?.name ?? 'Aluno'
  const isImage = upload.file_type === 'image'

  function handleReaction(emoji: ReactionEmoji) {
    setReactions(prev =>
      prev.map(r => {
        if (r.emoji !== emoji) return r
        return r.hasReacted
          ? { ...r, count: r.count - 1, hasReacted: false }
          : { ...r, count: r.count + 1, hasReacted: true }
      })
    )
    startTransition(async () => {
      const res = await toggleReaction(upload.id, emoji)
      if (res?.error) {
        setReactions(upload.reactions) // revert on error
      }
    })
  }

  function handleShare() {
    setShareError(null)
    startTransition(async () => {
      const res = await shareUpload(upload.id)
      if (res?.error) {
        setShareError(res.error)
      } else {
        setShared(true)
      }
    })
  }

  return (
    <div className="bg-white border border-[#D4E8F2] rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        {upload.profiles?.avatar_url ? (
          <img src={upload.profiles.avatar_url} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #024F82, #0369A1)' }}
          >
            {getInitials(name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#0C2233] leading-tight">{name}</p>
          {showTest && upload.tests && (
            <p className="text-xs text-[#5A8AA8] truncate">
              {upload.tests.subject} • {upload.tests.topic}
            </p>
          )}
          {!showTest && (
            <p className="text-xs text-[#8AACCB]">{timeAgo(upload.created_at)}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-base">{isImage ? '📸' : '📄'}</span>
          {showTest && (
            <span className="text-xs text-[#8AACCB]">{timeAgo(upload.created_at)}</span>
          )}
        </div>
      </div>

      {/* Summary */}
      {upload.ai_summary && (
        <p className="text-sm text-[#5A8AA8] leading-relaxed mb-3 line-clamp-3">
          {upload.ai_summary}
        </p>
      )}

      {/* Reactions + quiz link */}
      <div className="flex items-center gap-2 flex-wrap">
        {reactions.map(r => (
          <button
            key={r.emoji}
            onClick={() => handleReaction(r.emoji)}
            disabled={isPending}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors disabled:opacity-50"
            style={{
              background: r.hasReacted ? '#E0F2FC' : '#F8FAFC',
              borderColor: r.hasReacted ? '#0369A1' : '#D4E8F2',
              color: r.hasReacted ? '#0369A1' : '#5A8AA8',
            }}
            title={REACTION_LABELS[r.emoji]}
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

      {/* Share button — only for owner of private uploads */}
      {isOwn && !shared && (
        <button
          onClick={handleShare}
          disabled={isPending}
          className="w-full mt-3 py-2.5 rounded-xl font-semibold text-sm border border-[#0369A1] text-[#0369A1] bg-white disabled:opacity-50"
        >
          {isPending ? 'A partilhar…' : '🌍 Partilhar com a turma'}
        </button>
      )}
      {shareError && (
        <p className="text-xs text-red-500 mt-2 px-1">{shareError}</p>
      )}
    </div>
  )
}
