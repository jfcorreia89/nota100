import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { getInitials } from '@/lib/utils'
import type { BadgeSlug } from '@/lib/supabase/types'

const BADGE_META: Record<BadgeSlug, { emoji: string; label: string }> = {
  perfect:     { emoji: '🎯', label: 'Pontaria Perfeita' },
  lightning:   { emoji: '⚡', label: 'Relâmpago' },
  five_correct:{ emoji: '🧠', label: 'Primeira Tentativa' },
  on_fire:     { emoji: '🔥', label: 'Em Chamas' },
  completed:   { emoji: '🏅', label: 'Dedicado' },
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: membership } = await supabase
    .from('class_members')
    .select('class_id, classes(name, subject)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const { count: uploadCount } = await supabase
    .from('uploads')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { data: quizAttempts } = await supabase
    .from('quiz_attempts')
    .select('score, badges')
    .eq('user_id', user.id)
    .order('score', { ascending: false })

  const quizCount = quizAttempts?.length ?? 0
  const bestScore = quizAttempts?.[0]?.score ?? null

  // Collect unique badges across all attempts
  const allBadges = quizAttempts?.flatMap(a => a.badges as BadgeSlug[]) ?? []
  const uniqueBadges = [...new Set(allBadges)] as BadgeSlug[]

  return (
    <div className="min-h-screen bg-[#F0F7FC] pb-24">
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-[#0C2233] tracking-tight">Perfil</h1>
      </div>

      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
          style={{ background: 'linear-gradient(135deg, #024F82, #0369A1)' }}
        >
          {getInitials(profile?.name ?? 'A')}
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-[#0C2233]">{profile?.name}</p>
          <p className="text-sm text-[#5A8AA8]">{user.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-6 grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white border border-[#D4E8F2] rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-[#0369A1]">🔥 {profile?.streak_count ?? 0}</p>
          <p className="text-xs text-[#5A8AA8] mt-1 font-medium">Dias seguidos</p>
        </div>
        <div className="bg-white border border-[#D4E8F2] rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-[#0369A1]">📸 {uploadCount ?? 0}</p>
          <p className="text-xs text-[#5A8AA8] mt-1 font-medium">Uploads feitos</p>
        </div>
        <div className="bg-white border border-[#D4E8F2] rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-[#0369A1]">🎮 {quizCount}</p>
          <p className="text-xs text-[#5A8AA8] mt-1 font-medium">Quizzes feitos</p>
        </div>
        {bestScore !== null && (
          <div className="bg-white border border-[#D4E8F2] rounded-2xl p-4 text-center">
            <p className="text-3xl font-black text-[#0369A1]">⭐ {bestScore}</p>
            <p className="text-xs text-[#5A8AA8] mt-1 font-medium">Melhor score XP</p>
          </div>
        )}
      </div>

      {/* Badges */}
      {uniqueBadges.length > 0 && (
        <div className="mx-6 mb-6">
          <p className="text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest mb-3">Conquistas</p>
          <div className="flex flex-wrap gap-2">
            {uniqueBadges.map(slug => {
              const b = BADGE_META[slug]
              return (
                <div
                  key={slug}
                  className="flex items-center gap-1.5 bg-white border border-[#D4E8F2] rounded-xl px-3 py-2 shadow-sm"
                >
                  <span className="text-lg">{b.emoji}</span>
                  <span className="text-sm font-semibold text-[#0C2233]">{b.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Class info */}
      {membership && (
        <div className="mx-6 mb-6 bg-white border border-[#D4E8F2] rounded-2xl p-4">
          <p className="text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest mb-2">Turma</p>
          <p className="text-base font-bold text-[#0C2233]">{(membership.classes as unknown as { name: string })?.name}</p>
          <p className="text-sm text-[#5A8AA8]">{(membership.classes as unknown as { subject: string })?.subject}</p>
        </div>
      )}

      {/* Logout */}
      <div className="mx-6">
        <form action={logout}>
          <button
            type="submit"
            className="w-full py-3 rounded-xl border border-red-200 text-red-600 font-semibold text-sm bg-white"
          >
            Sair da conta
          </button>
        </form>
      </div>
    </div>
  )
}
