'use client'

import { useActionState } from 'react'
import { generateInviteCode } from '@/app/actions/admin'

type State = { ok: boolean; code: string } | { error: string } | null

export default function GenerateInviteForm({ classes }: { classes: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<State, FormData>(
    async (_prev, formData) => generateInviteCode(formData),
    null,
  )

  return (
    <div className="bg-white border border-[#D4E8F2] rounded-2xl p-6 mb-8">
      <p className="text-sm font-semibold text-[#0C2233] mb-4">Gerar novo código</p>
      <form action={action} className="flex gap-3">
        <select
          name="class_id"
          required
          className="flex-1 px-4 py-2.5 rounded-xl border border-[#D4E8F2] text-sm text-[#0C2233] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/30 focus:border-[#0369A1] bg-white"
        >
          <option value="">Selecionar turma…</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm whitespace-nowrap disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #024F82, #0369A1)' }}
        >
          {pending ? 'A gerar…' : '🎫 Gerar código'}
        </button>
      </form>

      {state && 'ok' in state && state.ok && (
        <div className="mt-3 flex items-center gap-3 bg-[#D1FAE5] border border-[#2D8A56]/30 rounded-xl px-4 py-3">
          <span className="text-sm text-[#2D8A56] font-medium">Código gerado:</span>
          <span className="font-mono font-bold text-lg tracking-widest text-[#2D8A56] bg-white rounded-lg px-3 py-1">
            {state.code}
          </span>
        </div>
      )}

      {state && 'error' in state && (
        <p className="mt-3 text-sm text-red-500 font-medium">{state.error}</p>
      )}

      <p className="text-xs text-[#8AACCB] mt-3">Cada código é de uso único — fica inativo assim que um aluno o utiliza.</p>
    </div>
  )
}
