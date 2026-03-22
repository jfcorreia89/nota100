import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { generateInviteCode, deactivateInviteCode } from '@/app/actions/admin'
import { getInitials } from '@/lib/utils'

export default async function AdminClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createAdminClient()

  const { data: cls } = await supabase
    .from('classes')
    .select('*')
    .eq('id', id)
    .single()

  if (!cls) notFound()

  const [{ data: members }, { data: tests }, { data: inviteCodes }] = await Promise.all([
    supabase.from('class_members').select('user_id, joined_at, profiles(id, name, streak_count, last_active)').eq('class_id', id),
    supabase.from('tests').select('*').eq('class_id', id).order('test_date', { ascending: true }),
    supabase.from('invite_codes').select('*').eq('class_id', id).order('created_at', { ascending: false }),
  ])

  const availableCodes = inviteCodes?.filter(c => c.is_active) ?? []

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/classes" className="text-sm text-[#5A8AA8] hover:text-[#0369A1]">← Turmas</Link>
        <div>
          <h1 className="text-2xl font-bold text-[#0C2233]">{cls.name}</h1>
          <p className="text-sm text-[#5A8AA8]">{cls.subject || 'Sem disciplina'}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Invite codes summary */}
        <div className="bg-white border border-[#D4E8F2] rounded-2xl p-5">
          <p className="text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest mb-3">Códigos Disponíveis</p>
          <p className="text-4xl font-black text-[#0369A1] mb-3">{availableCodes.length}</p>
          <form action={generateInviteCode}>
            <input type="hidden" name="class_id" value={id} />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg text-xs text-white font-semibold"
              style={{ background: 'linear-gradient(135deg, #024F82, #0369A1)' }}
            >
              + Gerar código
            </button>
          </form>
        </div>

        {/* Members count */}
        <div className="bg-white border border-[#D4E8F2] rounded-2xl p-5">
          <p className="text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest mb-3">Alunos</p>
          <p className="text-4xl font-black text-[#0369A1]">{members?.length ?? 0}</p>
        </div>

        {/* Tests count */}
        <div className="bg-white border border-[#D4E8F2] rounded-2xl p-5">
          <p className="text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest mb-3">Testes</p>
          <p className="text-4xl font-black text-[#0369A1]">{tests?.length ?? 0}</p>
        </div>
      </div>

      {/* Invite codes list */}
      {inviteCodes && inviteCodes.length > 0 && (
        <div className="bg-white border border-[#D4E8F2] rounded-2xl overflow-hidden mb-6">
          <p className="px-5 py-3 text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest border-b border-[#D4E8F2]">
            Códigos de Convite
          </p>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#D4E8F2]">
                {['Código', 'Estado', 'Criado em', ''].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inviteCodes.map((inv, i) => {
                const isUsed = !inv.is_active && inv.used_by
                const isDeactivated = !inv.is_active && !inv.used_by
                return (
                  <tr key={inv.id} className={i < inviteCodes.length - 1 ? 'border-b border-[#D4E8F2]' : ''}>
                    <td className="px-5 py-3">
                      <span
                        className="font-mono font-bold tracking-widest px-2.5 py-1 rounded-lg text-sm"
                        style={{
                          background: inv.is_active ? '#E0F2FC' : '#F0F7FC',
                          color: inv.is_active ? '#0369A1' : '#8AACCB',
                        }}
                      >
                        {inv.code}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={
                          inv.is_active
                            ? { background: '#D1FAE5', color: '#2D8A56' }
                            : isUsed
                            ? { background: '#FEF3C7', color: '#92400E' }
                            : { background: '#F0F7FC', color: '#8AACCB' }
                        }
                      >
                        {inv.is_active ? 'Disponível' : isUsed ? 'Usado' : 'Desativado'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-[#8AACCB]">
                      {new Date(inv.created_at).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="px-5 py-3">
                      {inv.is_active && (
                        <form action={deactivateInviteCode}>
                          <input type="hidden" name="code_id" value={inv.id} />
                          <input type="hidden" name="class_id" value={id} />
                          <button type="submit" className="text-xs text-red-500 hover:text-red-700 font-medium">
                            Desativar
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Members */}
        <div className="bg-white border border-[#D4E8F2] rounded-2xl overflow-hidden">
          <p className="px-5 py-3 text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest border-b border-[#D4E8F2]">
            Membros
          </p>
          {!members || members.length === 0 ? (
            <p className="px-5 py-4 text-sm text-[#8AACCB]">Nenhum aluno ainda</p>
          ) : (
            <div>
              {members.map((m, i) => {
                const p = m.profiles as unknown as { id: string; name: string; streak_count: number; last_active: string }
                if (!p) return null
                const hoursAgo = p.last_active
                  ? Math.floor((Date.now() - new Date(p.last_active).getTime()) / 3600000)
                  : null
                return (
                  <div key={p.id} className={`flex items-center gap-3 px-5 py-3 ${i < members.length - 1 ? 'border-b border-[#D4E8F2]' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-[#E0F2FC] text-[#0369A1] text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {getInitials(p.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0C2233] truncate">{p.name}</p>
                      <p className="text-xs text-[#8AACCB]">
                        {hoursAgo === null ? '—' : hoursAgo < 1 ? 'Ativo agora' : hoursAgo < 24 ? `Há ${hoursAgo}h` : `Há ${Math.floor(hoursAgo / 24)}d`}
                      </p>
                    </div>
                    <span className="text-xs text-[#8AACCB]">🔥 {p.streak_count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Tests */}
        <div className="bg-white border border-[#D4E8F2] rounded-2xl overflow-hidden">
          <p className="px-5 py-3 text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest border-b border-[#D4E8F2]">
            Testes
          </p>
          {!tests || tests.length === 0 ? (
            <p className="px-5 py-4 text-sm text-[#8AACCB]">Nenhum teste ainda</p>
          ) : (
            <div>
              {tests.map((t, i) => (
                <div key={t.id} className={`flex items-center gap-3 px-5 py-3 ${i < tests.length - 1 ? 'border-b border-[#D4E8F2]' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0C2233]">{t.subject}</p>
                    <p className="text-xs text-[#5A8AA8] truncate">{t.topic}</p>
                  </div>
                  <span className="text-xs text-[#8AACCB] whitespace-nowrap">
                    {new Date(t.test_date).toLocaleDateString('pt-PT')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
