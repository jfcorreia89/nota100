import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { daysUntil, formatDate, getInitials, voteLabel } from '@/lib/utils'
import { voteOnTopic } from '@/app/actions/tests'
import TopicForm from './TopicForm'
import type { TopicVote, ReactionEmoji } from '@/lib/supabase/types'
import UploadFeedCard, { type FeedUpload } from '@/app/components/UploadFeedCard'

export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: test } = await supabase
    .from('tests')
    .select('*')
    .eq('id', id)
    .single()

  if (!test) notFound()

  const days = daysUntil(test.test_date)

  // Topic predictions + votes + author
  const { data: preds } = await supabase
    .from('topic_predictions')
    .select('*, topic_votes(user_id), profiles(name, avatar_url)')
    .eq('test_id', id)
    .order('created_at', { ascending: false })

  const predictions = (preds ?? []).map(p => ({
    ...p,
    voteCount: p.topic_votes?.length ?? 0,
    hasVoted: p.topic_votes?.some((v: TopicVote) => v.user_id === user.id) ?? false,
    authorName: (p.profiles as unknown as { name: string } | null)?.name ?? null,
    authorAvatar: (p.profiles as unknown as { avatar_url: string | null } | null)?.avatar_url ?? null,
  })).sort((a, b) => b.voteCount - a.voteCount)

  // AI uploads: public ones + own private ones
  const { data: rawUploads } = await supabase
    .from('uploads')
    .select('id, test_id, file_type, ai_summary, ai_questions, is_public, created_at, profiles(name, avatar_url), upload_reactions(user_id, emoji)')
    .eq('test_id', id)
    .order('created_at', { ascending: false })

  const EMOJIS: ReactionEmoji[] = ['💡', '🔥', '🙏']
  const uploads: FeedUpload[] = (rawUploads ?? []).map(u => {
    const rawReactions = u.upload_reactions as { user_id: string; emoji: string }[]
    const reactionCounts: Record<string, { count: number; hasReacted: boolean }> = {}
    for (const r of rawReactions) {
      if (!reactionCounts[r.emoji]) reactionCounts[r.emoji] = { count: 0, hasReacted: false }
      reactionCounts[r.emoji].count++
      if (r.user_id === user.id) reactionCounts[r.emoji].hasReacted = true
    }
    return {
      id: u.id,
      test_id: u.test_id,
      file_type: u.file_type as 'pdf' | 'image',
      ai_summary: u.ai_summary,
      is_public: u.is_public,
      created_at: u.created_at,
      profiles: u.profiles as unknown as { name: string; avatar_url?: string | null } | null,
      reactions: EMOJIS.map(emoji => ({
        emoji,
        count: reactionCounts[emoji]?.count ?? 0,
        hasReacted: reactionCounts[emoji]?.hasReacted ?? false,
      })),
    }
  })

  return (
    <div className="min-h-screen bg-[#F0F7FC] pb-24">
      {/* Header */}
      <div className="px-6 pt-12 pb-2 flex items-center gap-4">
        <Link href="/dashboard" className="w-9 h-9 rounded-xl bg-white border border-[#D4E8F2] flex items-center justify-center text-lg flex-shrink-0">
          ‹
        </Link>
        <div className="min-w-0">
          <p className="text-xs text-[#5A8AA8] font-medium uppercase tracking-wider">{test.subject}</p>
          <h1 className="text-lg font-bold text-[#0C2233] leading-tight truncate">{test.topic}</h1>
        </div>
      </div>

      {/* Countdown hero */}
      <div className="mx-6 mt-4 mb-5 rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #024F82 0%, #0369A1 50%, #06B6D4 100%)' }}>
        <div className="absolute top-[-24px] right-[-24px] w-24 h-24 rounded-full bg-white/10" />
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-black tracking-tight leading-none">{days < 0 ? 0 : days}</span>
          <span className="text-lg opacity-75">{days === 1 ? 'dia' : 'dias'}</span>
        </div>
        <p className="text-sm opacity-70 mt-1 capitalize">{formatDate(test.test_date)}</p>
        {days < 0 && <p className="text-xs mt-2 opacity-80 bg-white/20 rounded-lg px-2 py-1 inline-block">Teste realizado</p>}
      </div>

      {/* Topic voting */}
      <div className="mx-6 mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest">Probabilidade de Sair</span>
        </div>

        {/* Vote form */}
        <TopicForm testId={id} />

        {/* Prediction list */}
        <div className="space-y-2">
          {predictions.length === 0 ? (
            <p className="text-sm text-[#8AACCB] text-center py-4">Ainda sem sugestões. Sê o primeiro!</p>
          ) : (
            predictions.map(pred => {
              const label = voteLabel(pred.voteCount)
              const colorMap: Record<string, { bg: string; text: string; dot: string }> = {
                Alta: { bg: '#FEE2E2', text: '#C0392B', dot: '#E03B3B' },
                Média: { bg: '#FEF3C7', text: '#C2681C', dot: '#F59E0B' },
                Baixa: { bg: '#D1FAE5', text: '#2D8A56', dot: '#2D8A56' },
              }
              const colors = colorMap[label]
              const timeAgo = (() => {
                const diff = Date.now() - new Date(pred.created_at).getTime()
                const mins = Math.floor(diff / 60000)
                if (mins < 1) return 'agora'
                if (mins < 60) return `há ${mins}min`
                const h = Math.floor(mins / 60)
                if (h < 24) return `há ${h}h`
                return `há ${Math.floor(h / 24)}d`
              })()

              return (
                <div key={pred.id} className="bg-white border border-[#D4E8F2] rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors.dot }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0C2233]">{pred.topic_name}</p>
                      {pred.authorName && (
                        <p className="text-xs text-[#8AACCB] mt-0.5">
                          {pred.authorAvatar ? (
                            <img src={pred.authorAvatar} alt={pred.authorName} className="w-3.5 h-3.5 rounded-full object-cover inline mr-1 align-middle" />
                          ) : (
                            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#E0F2FC] text-[8px] font-bold text-[#0369A1] mr-1 align-middle">
                              {getInitials(pred.authorName).charAt(0)}
                            </span>
                          )}
                          {pred.authorName} · {timeAgo}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md flex-shrink-0" style={{ background: colors.bg, color: colors.text }}>
                      {label}
                    </span>
                    <span className="text-xs text-[#8AACCB] w-4 text-right flex-shrink-0">{pred.voteCount}</span>
                    <form action={voteOnTopic}>
                      <input type="hidden" name="prediction_id" value={pred.id} />
                      <input type="hidden" name="test_id" value={id} />
                      <button
                        type="submit"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs border transition-colors flex-shrink-0"
                        style={{
                          background: pred.hasVoted ? '#E0F2FC' : '#F8FAFC',
                          borderColor: pred.hasVoted ? '#0369A1' : '#D4E8F2',
                          color: pred.hasVoted ? '#0369A1' : '#8AACCB',
                          fontWeight: pred.hasVoted ? 700 : 400,
                        }}
                      >
                        ↑
                      </button>
                    </form>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Quiz CTA */}
      {uploads.length > 0 && (
        <div className="mx-6 mb-5">
          <Link
            href={`/test/${id}/quiz`}
            className="flex items-center gap-4 rounded-2xl p-4 text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #024F82 0%, #0369A1 60%, #06B6D4 100%)' }}
          >
            <div className="absolute top-[-16px] right-[-16px] w-16 h-16 rounded-full bg-white/10" />
            <span className="text-3xl">🎮</span>
            <div className="flex-1">
              <p className="font-bold text-base leading-tight">Iniciar Quiz</p>
              <p className="text-xs opacity-75 mt-0.5">
                Pool de perguntas da turma
              </p>
            </div>
            <span className="text-xl font-bold opacity-75">›</span>
          </Link>
        </div>
      )}

      {/* AI Uploads */}
      <div className="mx-6 mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest">Apontamentos com IA</span>
          <Link href={`/upload?test=${id}`} className="text-xs text-[#0369A1] font-medium">+ Upload</Link>
        </div>

        {uploads.length > 0 ? (
          <div className="space-y-3">
            {uploads.map(upload => (
              <UploadFeedCard
                key={upload.id}
                upload={upload}
                currentUserId={user.id}
                showTest={false}
              />
            ))}
          </div>
        ) : (
          <Link
            href={`/upload?test=${id}`}
            className="bg-white border border-dashed border-[#B8DEF2] rounded-2xl p-6 flex flex-col items-center gap-2"
          >
            <span className="text-3xl">📸</span>
            <p className="text-sm text-[#5A8AA8] text-center">Faz upload de uma foto ou PDF para gerar resumo e quiz com IA</p>
            <span className="text-xs text-[#0369A1] font-semibold">Upload agora →</span>
          </Link>
        )}
      </div>
    </div>
  )
}
