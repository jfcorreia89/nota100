import { createAdminClient } from '@/lib/supabase/server'
import { getInitials } from '@/lib/utils'

export default async function AdminUsersPage() {
  const supabase = await createAdminClient()

  const { data: users } = await supabase
    .from('profiles')
    .select(`
      id, name, role, streak_count, last_active, created_at,
      class_members(class_id, classes(name)),
      uploads(count)
    `)
    .eq('role', 'student')
    .order('last_active', { ascending: false })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0C2233]">Utilizadores</h1>
        <p className="text-sm text-[#5A8AA8] mt-0.5">{users?.length ?? 0} alunos registados</p>
      </div>

      <div className="bg-white border border-[#D4E8F2] rounded-2xl overflow-hidden">
        {!users || users.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#8AACCB]">Nenhum utilizador registado ainda</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#D4E8F2]">
                {['Aluno', 'Turma', 'Streak', 'Uploads', 'Último acesso', 'Registo'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const membership = (u.class_members as unknown as { classes: { name: string } }[])?.[0]
                const className = membership?.classes?.name ?? '—'
                const uploadsCount = (u.uploads as { count: number }[])?.[0]?.count ?? 0
                const hoursAgo = u.last_active
                  ? Math.floor((Date.now() - new Date(u.last_active).getTime()) / 3600000)
                  : null
                const lastActiveStr = hoursAgo === null ? '—' : hoursAgo < 1 ? 'Agora' : hoursAgo < 24 ? `${hoursAgo}h atrás` : `${Math.floor(hoursAgo / 24)}d atrás`

                return (
                  <tr key={u.id} className={i < users.length - 1 ? 'border-b border-[#D4E8F2]' : ''}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#E0F2FC] text-[#0369A1] text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {getInitials(u.name ?? '?')}
                        </div>
                        <p className="text-sm font-medium text-[#0C2233]">{u.name || '(sem nome)'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#5A8AA8]">{className}</td>
                    <td className="px-5 py-3.5 text-sm text-[#0C2233]">🔥 {u.streak_count}</td>
                    <td className="px-5 py-3.5 text-sm text-[#0C2233]">📸 {uploadsCount}</td>
                    <td className="px-5 py-3.5 text-xs text-[#5A8AA8]">{lastActiveStr}</td>
                    <td className="px-5 py-3.5 text-xs text-[#8AACCB]">
                      {new Date(u.created_at).toLocaleDateString('pt-PT')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
