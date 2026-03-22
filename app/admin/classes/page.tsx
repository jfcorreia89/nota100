import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { createClass } from '@/app/actions/admin'

export default async function AdminClassesPage() {
  const supabase = await createAdminClient()

  const { data: classes } = await supabase
    .from('classes')
    .select(`
      id, name, subject, created_at,
      class_members(count),
      invite_codes(code, is_active, uses_count)
    `)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0C2233]">Turmas</h1>
          <p className="text-sm text-[#5A8AA8] mt-0.5">{classes?.length ?? 0} turmas criadas</p>
        </div>
      </div>

      {/* Create class form */}
      <div className="bg-white border border-[#D4E8F2] rounded-2xl p-6 mb-8">
        <p className="text-sm font-semibold text-[#0C2233] mb-4">Criar nova turma</p>
        <form action={createClass} className="flex gap-3 flex-wrap">
          <input
            name="name"
            type="text"
            required
            placeholder="Nome da turma (ex: Turma 10A)"
            className="flex-1 min-w-48 px-4 py-2.5 rounded-xl border border-[#D4E8F2] text-sm text-[#0C2233] placeholder:text-[#8AACCB] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/30 focus:border-[#0369A1]"
          />
          <input
            name="subject"
            type="text"
            placeholder="Disciplina (ex: Matemática)"
            className="flex-1 min-w-48 px-4 py-2.5 rounded-xl border border-[#D4E8F2] text-sm text-[#0C2233] placeholder:text-[#8AACCB] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/30 focus:border-[#0369A1]"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm"
            style={{ background: 'linear-gradient(135deg, #024F82, #0369A1)' }}
          >
            + Criar
          </button>
        </form>
      </div>

      {/* Classes table */}
      <div className="bg-white border border-[#D4E8F2] rounded-2xl overflow-hidden">
        {!classes || classes.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#8AACCB]">Nenhuma turma criada ainda</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#D4E8F2]">
                {['Turma', 'Disciplina', 'Alunos', 'Código de Convite', 'Criada', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classes.map((c, i) => {
                const activeCode = (c.invite_codes as { code: string; is_active: boolean; uses_count: number }[])
                  ?.find(ic => ic.is_active)
                const memberCount = (c.class_members as { count: number }[])?.[0]?.count ?? 0

                return (
                  <tr key={c.id} className={i < classes.length - 1 ? 'border-b border-[#D4E8F2]' : ''}>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-[#0C2233]">{c.name}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#5A8AA8]">{c.subject || '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-[#0C2233]">{memberCount}</td>
                    <td className="px-5 py-3.5">
                      {activeCode ? (
                        <span className="font-mono font-bold text-[#0369A1] bg-[#E0F2FC] px-2.5 py-1 rounded-lg text-sm tracking-widest">
                          {activeCode.code}
                        </span>
                      ) : (
                        <span className="text-xs text-[#8AACCB]">Sem código</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#8AACCB]">
                      {new Date(c.created_at).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/classes/${c.id}`}
                        className="text-xs text-[#0369A1] font-semibold hover:underline"
                      >
                        Ver →
                      </Link>
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
