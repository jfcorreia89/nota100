'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { login } from '@/app/actions/auth'

export default function LoginPage() {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await login(formData)
      return result ?? null
    },
    null
  )

  return (
    <div className="min-h-screen bg-[#F0F7FC] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white text-2xl font-bold mb-4"
            style={{ background: 'linear-gradient(135deg, #024F82, #0369A1, #06B6D4)' }}
          >
            N
          </div>
          <h1 className="text-2xl font-bold text-[#0C2233] tracking-tight">Nota100</h1>
          <p className="text-sm text-[#5A8AA8] mt-1">Entra na tua conta</p>
        </div>

        <form action={action} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0C2233] mb-1.5">Email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="o.teu@email.com"
              className="w-full px-4 py-3 rounded-xl border border-[#D4E8F2] bg-white text-[#0C2233] placeholder:text-[#8AACCB] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/30 focus:border-[#0369A1] text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0C2233] mb-1.5">Password</label>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-[#D4E8F2] bg-white text-[#0C2233] placeholder:text-[#8AACCB] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/30 focus:border-[#0369A1] text-sm"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #024F82, #0369A1)' }}
          >
            {pending ? 'A entrar…' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm text-[#5A8AA8] mt-6">
          Não tens conta?{' '}
          <Link href="/register" className="text-[#0369A1] font-semibold">
            Registar
          </Link>
        </p>
      </div>
    </div>
  )
}
