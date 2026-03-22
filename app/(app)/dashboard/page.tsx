import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { daysUntil, getInitials } from '@/lib/utils'
import { logout } from '@/app/actions/auth'
import { mergeFeedEvents } from '@/lib/feed'
import type { Profile, Test, ClassMember } from '@/lib/supabase/types'
import FeedEventCard from '@/app/components/feed/FeedEventCard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Phase 1: profile + membership
  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single() as unknown as Promise<{ data: Profile | null }>,
    supabase.from('class_members').select('class_id').eq('user_id', user.id).limit(1).single(),
  ])

  if (!membership) redirect('/onboarding')
  const classId = membership.class_id
  const todayStr = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString()
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400_000).toISOString()

  // Phase 2: next test + members + all class test IDs
  const [{ data: nextTest }, { data: members }, { data: classTests }] = await Promise.all([
    supabase.from('tests').select('*').eq('class_id', classId).gte('test_date', todayStr).order('test_date', { ascending: true }).limit(1).single() as unknown as Promise<{ data: Test | null }>,
    supabase.from('class_members').select('user_id, profiles(id, name, streak_count, last_active, avatar_url)').eq('class_id', classId).limit(5) as unknown as Promise<{ data: (ClassMember & { profiles: Profile })[] | null }>,
    supabase.from('tests').select('id').eq('class_id', classId),
  ])

  const testIds = classTests?.map(t => t.id) ?? []

  // Phase 3: all feed sources in parallel
  const [uploadsRes, recentTestsRes, quizzesRes, topicsRes] = await Promise.all([
    testIds.length > 0
      ? supabase.from('uploads')
          .select('id, user_id, test_id, file_type, ai_summary, is_public, created_at, profiles(id, name, avatar_url), tests(subject, topic), upload_reactions(user_id, emoji)')
          .eq('is_public', true)
          .in('test_id', testIds)
          .gte('created_at', fourteenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
    supabase.from('tests')
      .select('id, subject, topic, test_date, created_at, created_by, profiles(id, name, avatar_url)')
      .eq('class_id', classId)
      .gte('created_at', fourteenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(10),
    testIds.length > 0
      ? supabase.from('quiz_attempts')
          .select('id, user_id, test_id, score, questions_correct, questions_total, badges, completed_at, profiles(id, name, avatar_url), tests(subject, topic)')
          .in('test_id', testIds)
          .gte('completed_at', sevenDaysAgo)
          .order('completed_at', { ascending: false })
          .limit(15)
      : Promise.resolve({ data: [] }),
    testIds.length > 0
      ? supabase.from('topic_predictions')
          .select('id, topic_name, test_id, created_by, created_at, profiles(id, name, avatar_url), tests(subject), topic_votes(user_id)')
          .in('test_id', testIds)
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
  ])

  const feedEvents = mergeFeedEvents(
    (uploadsRes.data ?? []) as any[],
    (recentTestsRes.data ?? []) as any[],
    (quizzesRes.data ?? []) as any[],
    (topicsRes.data ?? []) as any[],
    user.id,
  )

  const days = nextTest ? daysUntil(nextTest.test_date) : null
  const firstName = profile?.name?.split(' ')[0] ?? 'Aluno'

  return (
    <div className="min-h-screen bg-[#F0F7FC]">
      {/* Header */}
      <div className="px-5 pt-12 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0C2233] tracking-tight">Olá, {firstName} 👋</h1>
          <p className="text-xs text-[#5A8AA8] mt-0.5">
            {(profile?.streak_count ?? 0) > 0 ? `🔥 ${profile?.streak_count} dias seguidos` : 'Bom estudo!'}
          </p>
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
            <img src={profile.avatar_url} alt={profile.name} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #024F82, #0369A1)' }}
            >
              {getInitials(profile?.name ?? 'A')}
            </div>
          )}
        </div>
      </div>

      {/* Compact next-test banner */}
      {nextTest ? (
        <Link href={`/test/${nextTest.id}`}>
          <div
            className="mx-5 mb-4 rounded-2xl px-4 py-3.5 flex items-center gap-3 text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #024F82 0%, #0369A1 60%, #06B6D4 100%)' }}
          >
            <div className="absolute top-[-16px] right-[-16px] w-16 h-16 rounded-full bg-white/10" />
            <div className="text-center flex-shrink-0 w-10">
              <p className="text-2xl font-black leading-none">{days! < 0 ? 0 : days}</p>
              <p className="text-[10px] opacity-70">{days === 1 ? 'dia' : 'dias'}</p>
            </div>
            <div className="w-px h-8 bg-white/25 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium opacity-75 uppercase tracking-wide">{nextTest.subject}</p>
              <p className="text-sm font-bold leading-tight truncate">{nextTest.topic}</p>
            </div>
            <span className="text-lg opacity-60 flex-shrink-0">›</span>
          </div>
        </Link>
      ) : (
        <Link
          href={`/test/new?class=${classId}`}
          className="mx-5 mb-4 rounded-2xl border border-dashed border-[#B8DEF2] px-4 py-3 flex items-center gap-3"
        >
          <span className="text-xl">📝</span>
          <p className="text-sm text-[#5A8AA8]">Adicionar primeiro teste da turma</p>
          <span className="ml-auto text-[#0369A1] font-bold">›</span>
        </Link>
      )}

      {/* Feed label */}
      <p className="px-5 mb-2 text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest">
        Atividade da turma
      </p>

      {/* Unified feed */}
      <div className="px-5 space-y-3 pb-4">
        {feedEvents.length === 0 ? (
          <div className="bg-white border border-dashed border-[#B8DEF2] rounded-2xl p-8 text-center">
            <p className="text-2xl mb-2">📚</p>
            <p className="text-sm font-medium text-[#0C2233]">Sem atividade recente</p>
            <p className="text-xs text-[#5A8AA8] mt-1">Faz upload de apontamentos para começar</p>
          </div>
        ) : (
          feedEvents.map(event => (
            <FeedEventCard key={event.id} event={event} currentUserId={user.id} />
          ))
        )}
      </div>

      {/* Members strip */}
      {members && members.length > 0 && (
        <div className="px-5 mb-4">
          <p className="text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest mb-2">Estado da turma</p>
          <div className="bg-white border border-[#D4E8F2] rounded-2xl overflow-hidden shadow-sm">
            {members.map((m, i) => {
              const p = m.profiles
              if (!p) return null
              const hoursAgo = p.last_active
                ? Math.floor((Date.now() - new Date(p.last_active).getTime()) / 3_600_000)
                : null
              const status = hoursAgo === null ? '—' : hoursAgo < 1 ? 'Ativo agora' : hoursAgo < 24 ? `Há ${hoursAgo}h` : `Há ${Math.floor(hoursAgo / 24)}d`
              const avatarColors = ['#024F82', '#0369A1', '#06B6D4', '#5A8AA8', '#0C2233']
              return (
                <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${i < members.length - 1 ? 'border-b border-[#D4E8F2]' : ''}`}>
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={p.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: avatarColors[i % avatarColors.length] }}
                    >
                      {getInitials(p.name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0C2233]">{p.name}{p.id === user.id ? ' (tu)' : ''}</p>
                    <p className="text-xs text-[#5A8AA8]">{status}</p>
                  </div>
                  <span className="text-xs text-[#5A8AA8]">🔥 {p.streak_count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
