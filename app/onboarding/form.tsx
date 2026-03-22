'use client'

import { useActionState } from 'react'
import { joinClass, logout } from '@/app/actions/auth'

const initialState = { error: undefined as string | undefined }

export default function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await joinClass(formData)
      return result ?? initialState
    },
    initialState
  )

  return (
    <div className="min-h-screen bg-[#F0F7FC] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-[#D4E8F2] w-full max-w-sm p-8">
        <div
          className="w-12 h-12 rounded-xl mb-6 flex items-center justify-center text-white font-bold text-lg"
          style={{ background: 'linear-gradient(135deg, #024F82, #0369A1, #06B6D4)' }}
        >
          N
        </div>

        <h1 className="text-2xl font-bold text-[#0C2233] mb-1">Entra na tua turma</h1>
        <p className="text-[#5A8AA8] text-sm mb-8">
          Pede o código ao teu professor ou colega.
        </p>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-[#0C2233] mb-1.5">
              Código da turma
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              maxLength={6}
              placeholder="ABC123"
              className="w-full px-4 py-3 rounded-xl border border-[#D4E8F2] bg-[#F0F7FC] text-[#0C2233] placeholder-[#8AACCB] font-mono text-lg tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-[#0369A1] focus:border-transparent"
            />
          </div>

          {state?.error && (
            <p className="text-red-500 text-sm">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #024F82, #0369A1, #06B6D4)' }}
          >
            {pending ? 'A entrar…' : 'Entrar na turma'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#D4E8F2]">
          <form action={logout}>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl border border-[#D4E8F2] text-[#5A8AA8] text-sm font-medium hover:bg-[#F0F7FC] transition-colors"
            >
              Sair da conta
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
