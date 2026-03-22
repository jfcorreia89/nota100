import { createAdminClient } from '@/lib/supabase/server'
import { getInitials } from '@/lib/utils'

export default async function AdminUsersPage() {
  const supabase = await createAdminClient()

  const [{ data: profiles }, { data: authData }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, role, streak_count, last_active, created_at, class_members(classes(name)), uploads(count)')
      .or('role.neq.admin,role.is.null')
      .order('last_active', { ascending: false, nullsFirst: false }),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const authMap = new Map(authData?.users.map(u => [u.id, u]) ?? [])

  const users = (profiles ?? []).map(p => ({
    ...p,
    email: authMap.get(p.id)?.email ?? '—',
    lastLogin: authMap.get(p.id)?.last_sign_in_at ?? null,
  }))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0C2233]">Utilizadores</h1>
        <p className="text-sm text-[#5A8AA8] mt-0.5">{users.length} alunos registados</p>
      </div>

      <div className="bg-white border border-[#D4E8F2] rounded-2xl overflow-hidden">
        {users.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#8AACCB]">Nenhum utilizador registado ainda</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#D4E8F2]">
                {['Aluno', 'E-mail', 'Turma', 'Último login', 'Streak', 'Uploads'].map(h => (
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
                const lastLoginStr = u.lastLogin
                  ? new Date(u.lastLogin).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '—'

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
                    <td className="px-5 py-3.5 text-sm text-[#5A8AA8]">{u.email}</td>
                    <td className="px-5 py-3.5 text-sm text-[#5A8AA8]">{className}</td>
                    <td className="px-5 py-3.5 text-xs text-[#5A8AA8]">{lastLoginStr}</td>
                    <td className="px-5 py-3.5 text-sm text-[#0C2233]">🔥 {u.streak_count}</td>
                    <td className="px-5 py-3.5 text-sm text-[#0C2233]">📸 {uploadsCount}</td>
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
