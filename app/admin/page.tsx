import { createAdminClient } from '@/lib/supabase/server'

export default async function AdminOverviewPage() {
  const supabase = await createAdminClient()

  const [
    { count: totalUsers },
    { count: totalClasses },
    { count: totalTests },
    { count: totalUploads },
    { data: recentUsers },
    { data: recentUploads },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('classes').select('*', { count: 'exact', head: true }),
    supabase.from('tests').select('*', { count: 'exact', head: true }),
    supabase.from('uploads').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('id, name, created_at, role').order('created_at', { ascending: false }).limit(5),
    supabase.from('uploads').select('id, file_type, created_at, profiles(name)').order('created_at', { ascending: false }).limit(5),
  ])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count: activeToday } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('last_active', today.toISOString())

  const stats = [
    { label: 'Alunos', value: totalUsers ?? 0, icon: '👥', color: '#E0F2FC' },
    { label: 'Turmas', value: totalClasses ?? 0, icon: '🏫', color: '#D1FAE5' },
    { label: 'Testes', value: totalTests ?? 0, icon: '📝', color: '#FEF3C7' },
    { label: 'Ativos hoje', value: activeToday ?? 0, icon: '🔥', color: '#FEE2E2' },
    { label: 'Uploads IA', value: totalUploads ?? 0, icon: '🤖', color: '#EDE9FE' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0C2233] mb-1">Overview</h1>
      <p className="text-sm text-[#5A8AA8] mb-8">Visão geral da plataforma</p>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-10">
        {stats.map(s => (
          <div key={s.label} className="bg-white border border-[#D4E8F2] rounded-2xl p-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3" style={{ background: s.color }}>
              {s.icon}
            </div>
            <p className="text-2xl font-black text-[#0C2233]">{s.value}</p>
            <p className="text-xs text-[#5A8AA8] font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent signups */}
        <div className="bg-white border border-[#D4E8F2] rounded-2xl p-5">
          <p className="text-xs font-semibold text-[#8AACCB] uppercase tracking-widest mb-4">Últimos Registos</p>
          {recentUsers?.length === 0 ? (
            <p className="text-sm text-[#8AACCB]">Nenhum utilizador ainda</p>
          ) : (
            <div className="space-y-3">
              {recentUsers?.map(u => (
                <div key={u.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#E0F2FC] flex items-center justify-center text-[#0369A1] text-xs font-bold flex-shrink-0">
                    {u.name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0C2233] truncate">{u.name || '(sem nome)'}</p>
                    <p className="text-xs text-[#8AACCB]">
                      {new Date(u.created_at).toLocaleDateString('pt-PT')}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#F0F7FC] text-[#5A8AA8]">{u.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent uploads */}
        <div className="bg-white border border-[#D4E8F2] rounded-2xl p-5">
          <p className="text-xs font-semibold text-[#8AACCB] uppercase tracking-widest mb-4">Últimos Uploads IA</p>
          {recentUploads?.length === 0 ? (
            <p className="text-sm text-[#8AACCB]">Nenhum upload ainda</p>
          ) : (
            <div className="space-y-3">
              {recentUploads?.map(u => (
                <div key={u.id} className="flex items-center gap-3">
                  <span className="text-xl">{u.file_type === 'pdf' ? '📄' : '📸'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0C2233] truncate">
                      {(u.profiles as unknown as { name: string })?.name ?? 'Aluno'}
                    </p>
                    <p className="text-xs text-[#8AACCB]">
                      {new Date(u.created_at).toLocaleDateString('pt-PT')} · {u.file_type.toUpperCase()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
