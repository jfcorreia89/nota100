import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { daysUntil, formatDate, getInitials, voteLabel } from '@/lib/utils'
import { logout } from '@/app/actions/auth'
import type { Profile, Test, TopicPrediction, TopicVote, ClassMember, ReactionEmoji } from '@/lib/supabase/types'
import UploadFeedCard, { type FeedUpload } from '@/app/components/UploadFeedCard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  // Class membership
  const { data: membership } = await supabase
    .from('class_members')
    .select('class_id, classes(id, name, subject)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) redirect('/onboarding')
  const classId = membership.class_id

  // Next test
  const { data: nextTest } = await supabase
    .from('tests')
    .select('*')
    .eq('class_id', classId)
    .gte('test_date', new Date().toISOString().split('T')[0])
    .order('test_date', { ascending: true })
    .limit(1)
    .single() as { data: Test | null }

  // Topic predictions + vote counts for next test
  let predictions: (TopicPrediction & { voteCount: number; hasVoted: boolean })[] = []
  if (nextTest) {
    const { data: preds } = await supabase
      .from('topic_predictions')
      .select('*, topic_votes(user_id)')
      .eq('test_id', nextTest.id)
      .order('created_at', { ascending: false })

    predictions = (preds ?? []).map(p => ({
      ...p,
      voteCount: p.topic_votes?.length ?? 0,
      hasVoted: p.topic_votes?.some((v: TopicVote) => v.user_id === user.id) ?? false,
    })).sort((a, b) => b.voteCount - a.voteCount)
  }

  // Class members with profiles
  const { data: members } = await supabase
    .from('class_members')
    .select('user_id, profiles(id, name, streak_count, last_active, avatar_url)')
    .eq('class_id', classId)
    .limit(5) as { data: (ClassMember & { profiles: Profile })[] | null }

  // Feed: latest public uploads from class
  const { data: feedUploads } = await supabase
    .from('uploads')
    .select('id, test_id, file_type, ai_summary, is_public, created_at, profiles(name, avatar_url), tests(subject, topic), upload_reactions(user_id, emoji)')
    .eq('is_public', true)
    .in('test_id',
      (await supabase.from('tests').select('id').eq('class_id', classId)).data?.map(t => t.id) ?? []
    )
    .order('created_at', { ascending: false })
    .limit(10)

  const EMOJIS: ReactionEmoji[] = ['💡', '🔥', '🙏']
  const feedItems: FeedUpload[] = (feedUploads ?? []).map(u => ({
    id: u.id,
    test_id: u.test_id,
    file_type: u.file_type as 'pdf' | 'image',
    ai_summary: u.ai_summary,
    is_public: u.is_public,
    created_at: u.created_at,
    profiles: u.profiles as unknown as { name: string; avatar_url?: string | null } | null,
    tests: u.tests as unknown as { subject: string; topic: string } | null,
    reactions: EMOJIS.map(emoji => ({
      emoji,
      count: (u.upload_reactions as { user_id: string; emoji: string }[]).filter(r => r.emoji === emoji).length,
      hasReacted: (u.upload_reactions as { user_id: string; emoji: string }[]).some(r => r.emoji === emoji && r.user_id === user.id),
    })),
  }))

  // Streak days (last 7 days)
  const today = new Date()
  const streakDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - 6 + i)
    return { label: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][d.getDay()], isToday: i === 6 }
  })

  const firstName = profile?.name?.split(' ')[0] ?? 'Aluno'

  return (
    <div className="bg-[#F0F7FC] min-h-screen">
      {/* Header */}
      <div className="px-6 pt-12 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0C2233] tracking-tight">Nota100</h1>
          <p className="text-sm text-[#5A8AA8] mt-0.5">Olá, {firstName} 👋</p>
        </div>
        <div className="flex items-center gap-2">
          <form action={logout}>
            <button
              type="submit"
              className="w-9 h-9 rounded-xl bg-white border border-[#D4E8F2] flex items-center justify-center text-sm"
              title="Sair"
            >
              👋
            </button>
          </form>
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.name}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #024F82, #0369A1)' }}
            >
              {getInitials(profile?.name ?? 'A')}
            </div>
          )}
        </div>
      </div>

      {/* Streak bar */}
      <div className="mx-6 mb-5 bg-[#E0F2FC] border border-[#B8DEF2] rounded-2xl p-3.5 flex items-center gap-3">
        <span className="text-2xl">🔥</span>
        <div className="flex-1">
          <p className="text-sm font-bold text-[#0C2233]">{profile?.streak_count ?? 0} dias seguidos</p>
          <p className="text-xs text-[#5A8AA8] mt-0.5">Não quebres a sequência hoje!</p>
        </div>
        <div className="flex gap-1">
          {streakDays.map((d, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold"
              style={{
                background: d.isToday ? '#0C2233' : i < 6 && (profile?.streak_count ?? 0) > 6 - i ? 'linear-gradient(135deg, #0369A1, #06B6D4)' : '#B8DEF2',
                color: d.isToday || (i < 6 && (profile?.streak_count ?? 0) > 6 - i) ? 'white' : '#5A8AA8',
              }}
            >
              {d.label}
            </div>
          ))}
        </div>
      </div>

      {/* Next Test */}
      <div className="mx-6 mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest">Próximo Teste</span>
        </div>
        {nextTest ? (
          <Link href={`/test/${nextTest.id}`}>
            <div
              className="rounded-2xl p-5 text-white relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #024F82 0%, #0369A1 50%, #06B6D4 100%)' }}
            >
              <div className="absolute top-[-24px] right-[-24px] w-24 h-24 rounded-full bg-white/10" />
              <div className="absolute bottom-[-16px] right-4 w-16 h-16 rounded-full bg-white/5" />
              <div className="flex justify-between items-start mb-4 relative">
                <div>
                  <p className="text-[10px] font-medium opacity-70 uppercase tracking-wider mb-1">{nextTest.subject}</p>
                  <p className="text-lg font-bold leading-tight">{nextTest.topic}</p>
                </div>
                <span className="bg-white/20 rounded-lg px-2.5 py-1 text-[11px] font-semibold">Turma</span>
              </div>
              <div className="flex items-baseline gap-1.5 relative">
                <span className="text-4xl font-black tracking-tight leading-none">
                  {daysUntil(nextTest.test_date)}
                </span>
                <span className="text-base opacity-75">
                  {daysUntil(nextTest.test_date) === 1 ? 'dia' : 'dias'}
                </span>
              </div>
              <p className="text-xs opacity-70 mt-0.5 relative capitalize">{formatDate(nextTest.test_date)}</p>
            </div>
          </Link>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#B8DEF2] p-6 text-center">
            <p className="text-sm text-[#5A8AA8]">Sem testes agendados</p>
            <Link href={`/test/new?class=${classId}`} className="text-xs text-[#0369A1] font-medium mt-1 block">
              + Adicionar teste
            </Link>
          </div>
        )}
      </div>

      {/* Topic Predictions */}
      {nextTest && predictions.length > 0 && (
        <div className="mx-6 mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest">Probabilidade de Sair</span>
            <Link href={`/test/${nextTest.id}`} className="text-xs text-[#0369A1] font-medium">+ votar</Link>
          </div>
          <div className="space-y-2">
            {predictions.slice(0, 4).map(pred => {
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
                  <p className="flex-1 text-sm font-medium text-[#0C2233] truncate">{pred.topic_name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: colors.bg, color: colors.text }}>
                      {label}
                    </span>
                    <span className="text-xs text-[#8AACCB]">{pred.voteCount}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Class Members */}
      {members && members.length > 0 && (
        <div className="mx-6 mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest">Estado da Turma</span>
          </div>
          <div className="bg-white border border-[#D4E8F2] rounded-2xl overflow-hidden shadow-sm">
            {members.map((m, i) => {
              const p = m.profiles
              if (!p) return null
              const isMe = p.id === user.id
              const lastActive = p.last_active ? new Date(p.last_active) : null
              const hoursAgo = lastActive ? Math.floor((Date.now() - lastActive.getTime()) / 3600000) : null
              const status = isMe ? 'Ativo agora' : hoursAgo === null ? 'Desconhecido' : hoursAgo < 1 ? 'Ativo agora' : hoursAgo < 24 ? `Há ${hoursAgo}h` : `Há ${Math.floor(hoursAgo / 24)}d`
              const avatarColors = ['#024F82', '#0369A1', '#06B6D4', '#5A8AA8', '#0C2233']

              return (
                <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${i < members.length - 1 ? 'border-b border-[#D4E8F2]' : ''}`}>
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={p.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                      style={{ background: avatarColors[i % avatarColors.length] }}
                    >
                      {getInitials(p.name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0C2233]">{p.name}{isMe ? ' (tu)' : ''}</p>
                    <p className="text-xs text-[#5A8AA8]">{status}</p>
                  </div>
                  <span className="text-base">{hoursAgo !== null && hoursAgo < 2 ? '✅' : hoursAgo !== null && hoursAgo > 48 ? '😴' : '📚'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Activity feed */}
      {feedItems.length > 0 && (
        <div className="mx-6 mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest">Atividade da Turma</span>
          </div>
          <div className="space-y-3">
            {feedItems.map(item => (
              <UploadFeedCard
                key={item.id}
                upload={item}
                currentUserId={user.id}
                showTest
              />
            ))}
          </div>
        </div>
      )}

      {/* Add test CTA */}
      <div className="mx-6 mb-5">
        <Link
          href={`/test/new?class=${classId}`}
          className="bg-white border border-[#D4E8F2] rounded-2xl px-4 py-3.5 flex items-center gap-4 shadow-sm"
        >
          <div className="w-11 h-11 rounded-xl bg-[#E0F2FC] flex items-center justify-center text-2xl flex-shrink-0">📝</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#0C2233]">Adicionar Teste</p>
            <p className="text-xs text-[#5A8AA8] mt-0.5">Agenda um novo teste para a turma</p>
          </div>
          <span className="text-lg text-[#0369A1] font-bold">›</span>
        </Link>
      </div>

    </div>
  )
}
