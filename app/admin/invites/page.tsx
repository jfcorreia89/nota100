import { createAdminClient } from '@/lib/supabase/server'
import { deactivateInviteCode } from '@/app/actions/admin'
import GenerateInviteForm from './GenerateInviteForm'

export default async function AdminInvitesPage() {
  const supabase = await createAdminClient()

  const [{ data: invites }, { data: classes }] = await Promise.all([
    supabase
      .from('invite_codes')
      .select('*, classes(name, subject), profiles(name)')
      .order('created_at', { ascending: false }),
    supabase.from('classes').select('id, name').order('name'),
  ])

  function statusLabel(inv: { is_active: boolean; used_by: string | null }) {
    if (inv.is_active) return { label: 'Disponível', bg: '#D1FAE5', color: '#2D8A56' }
    if (inv.used_by)   return { label: 'Usado',      bg: '#FEF3C7', color: '#92400E' }
    return                    { label: 'Desativado', bg: '#F0F7FC', color: '#8AACCB' }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0C2233]">Códigos de Convite</h1>
        <p className="text-sm text-[#5A8AA8] mt-0.5">Gera e gere códigos individuais para cada aluno</p>
      </div>

      {/* Generate new code */}
      <GenerateInviteForm classes={classes ?? []} />

      {/* Codes table */}
      <div className="bg-white border border-[#D4E8F2] rounded-2xl overflow-hidden">
        {!invites || invites.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#8AACCB]">Nenhum código criado ainda</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#D4E8F2]">
                {['Código', 'Turma', 'Estado', 'Utilizado por', 'Criado', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invites.map((inv, i) => {
                const status = statusLabel(inv)
                const usedByProfile = inv.profiles as { name: string } | null
                return (
                  <tr key={inv.id} className={i < invites.length - 1 ? 'border-b border-[#D4E8F2]' : ''}>
                    <td className="px-5 py-3.5">
                      <span
                        className="font-mono font-bold text-base tracking-widest px-3 py-1 rounded-lg"
                        style={{
                          background: inv.is_active ? '#E0F2FC' : '#F0F7FC',
                          color: inv.is_active ? '#0369A1' : '#8AACCB',
                        }}
                      >
                        {inv.code}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#0C2233]">
                      {(inv.classes as { name: string })?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: status.bg, color: status.color }}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#5A8AA8]">
                      {usedByProfile?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#8AACCB]">
                      {new Date(inv.created_at).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="px-5 py-3.5">
                      {inv.is_active && (
                        <form action={deactivateInviteCode}>
                          <input type="hidden" name="code_id" value={inv.id} />
                          <input type="hidden" name="class_id" value={inv.class_id} />
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
        )}
      </div>
    </div>
  )
}
