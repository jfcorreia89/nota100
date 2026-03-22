import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { daysUntil, formatDate, getInitials, voteLabel } from '@/lib/utils'
import { addTopicPrediction, voteOnTopic } from '@/app/actions/tests'
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

  // Topic predictions + votes
  const { data: preds } = await supabase
    .from('topic_predictions')
    .select('*, topic_votes(user_id)')
    .eq('test_id', id)
    .order('created_at', { ascending: false })

  const predictions = (preds ?? []).map(p => ({
    ...p,
    voteCount: p.topic_votes?.length ?? 0,
    hasVoted: p.topic_votes?.some((v: TopicVote) => v.user_id === user.id) ?? false,
  })).sort((a, b) => b.voteCount - a.voteCount)

  // AI uploads: public ones + own private ones
  const { data: rawUploads } = await supabase
    .from('uploads')
    .select('id, test_id, file_type, ai_summary, ai_questions, is_public, created_at, profiles(name), upload_reactions(user_id, emoji)')
    .eq('test_id', id)
    .order('created_at', { ascending: false })

  const EMOJIS: ReactionEmoji[] = ['💡', '🔥', '🙏']
  const uploads: FeedUpload[] = (rawUploads ?? []).map(u => ({
    id: u.id,
    test_id: u.test_id,
    file_type: u.file_type as 'pdf' | 'image',
    ai_summary: u.ai_summary,
    is_public: u.is_public,
    created_at: u.created_at,
    profiles: u.profiles as unknown as { name: string } | null,
    reactions: EMOJIS.map(emoji => ({
      emoji,
      count: (u.upload_reactions as { user_id: string; emoji: string }[]).filter(r => r.emoji === emoji).length,
      hasReacted: (u.upload_reactions as { user_id: string; emoji: string }[]).some(r => r.emoji === emoji && r.user_id === user.id),
    })),
  }))

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
        <form action={addTopicPrediction} className="flex gap-2 mb-3">
          <input type="hidden" name="test_id" value={id} />
          <input
            name="topic_name"
            type="text"
            required
            placeholder="Sugerir tópico…"
            className="flex-1 px-3 py-2.5 rounded-xl border border-[#D4E8F2] bg-white text-[#0C2233] placeholder:text-[#8AACCB] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/30 focus:border-[#0369A1] text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl text-white font-semibold text-sm"
            style={{ background: 'linear-gradient(135deg, #024F82, #0369A1)' }}
          >
            +
          </button>
        </form>

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

              return (
                <div key={pred.id} className="bg-white border border-[#D4E8F2] rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors.dot }} />
                  <p className="flex-1 text-sm font-medium text-[#0C2233]">{pred.topic_name}</p>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: colors.bg, color: colors.text }}>
                    {label}
                  </span>
                  <span className="text-xs text-[#8AACCB] w-4 text-right">{pred.voteCount}</span>
                  <form action={voteOnTopic}>
                    <input type="hidden" name="prediction_id" value={pred.id} />
                    <input type="hidden" name="test_id" value={id} />
                    <button
                      type="submit"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs border transition-colors"
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
