import { getInitials, timeAgo } from '@/lib/utils'
import type { FeedActor } from '@/lib/supabase/types'

const AVATAR_COLORS = ['#024F82', '#0369A1', '#06B6D4', '#5A8AA8', '#0C2233', '#0D9488', '#C2681C']

function colorForId(id: string) {
  let hash = 0
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

interface Props {
  actor: FeedActor
  action: React.ReactNode
  timestamp: string
}

export default function ActorRow({ actor, action, timestamp }: Props) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      {actor.avatar_url ? (
        <img
          src={actor.avatar_url}
          alt={actor.name}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ background: colorForId(actor.id) }}
        >
          {getInitials(actor.name)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#0C2233] leading-tight">{actor.name}</p>
        <p className="text-xs text-[#5A8AA8] mt-0.5 leading-tight">{action}</p>
      </div>
      <span className="text-[11px] text-[#8AACCB] flex-shrink-0">{timeAgo(timestamp)}</span>
    </div>
  )
}
