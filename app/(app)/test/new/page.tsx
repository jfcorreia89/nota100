'use client'

import { useActionState, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createTest } from '@/app/actions/tests'
import { Suspense } from 'react'

function NewTestForm() {
  const params = useSearchParams()
  const classId = params.get('class') ?? ''

  const [dateDisplay, setDateDisplay] = useState('')
  const [dateValue, setDateValue] = useState('')   // YYYY-MM-DD sent to server
  const [dateError, setDateError] = useState('')

  const [state, action, pending] = useActionState<{ error?: string } | null, FormData>(
    async (_prev, formData) => {
      if (!dateValue) return { error: dateError || 'Introduz uma data válida' }
      try {
        await createTest(formData)
        return null
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Erro desconhecido' }
      }
    },
    null
  )

  function handleDateInput(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8)

    // Auto-format DD/MM/YYYY
    let display = digits
    if (digits.length > 4) display = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4)
    else if (digits.length > 2) display = digits.slice(0, 2) + '/' + digits.slice(2)
    setDateDisplay(display)

    if (digits.length < 8) {
      setDateValue('')
      setDateError('')
      return
    }

    const dd = parseInt(digits.slice(0, 2), 10)
    const mm = parseInt(digits.slice(2, 4), 10) - 1
    const yyyy = parseInt(digits.slice(4, 8), 10)
    const date = new Date(yyyy, mm, dd)

    if (date.getDate() !== dd || date.getMonth() !== mm || date.getFullYear() !== yyyy) {
      setDateValue('')
      setDateError('Data inválida')
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date <= today) {
      setDateValue('')
      setDateError('A data tem de ser futura')
      return
    }

    setDateError('')
    setDateValue(date.toISOString().split('T')[0])
  }

  return (
    <div className="min-h-screen bg-[#F0F7FC] pb-24">
      <div className="px-6 pt-12 pb-4 flex items-center gap-4">
        <Link href="/dashboard" className="w-9 h-9 rounded-xl bg-white border border-[#D4E8F2] flex items-center justify-center text-lg">
          ‹
        </Link>
        <h1 className="text-xl font-bold text-[#0C2233]">Novo Teste</h1>
      </div>

      <form action={action} className="px-6 space-y-4">
        <input type="hidden" name="class_id" value={classId} />
        <input type="hidden" name="test_date" value={dateValue} />

        <div>
          <label className="block text-sm font-medium text-[#0C2233] mb-1.5">Disciplina</label>
          <input
            name="subject"
            type="text"
            required
            placeholder="ex: Matemática A"
            className="w-full px-4 py-3 rounded-xl border border-[#D4E8F2] bg-white text-[#0C2233] placeholder:text-[#8AACCB] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/30 focus:border-[#0369A1] text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#0C2233] mb-1.5">Tópico / Matéria</label>
          <input
            name="topic"
            type="text"
            required
            placeholder="ex: Funções e Derivadas"
            className="w-full px-4 py-3 rounded-xl border border-[#D4E8F2] bg-white text-[#0C2233] placeholder:text-[#8AACCB] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/30 focus:border-[#0369A1] text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#0C2233] mb-1.5">
            Data do Teste
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={dateDisplay}
            onChange={handleDateInput}
            placeholder="DD/MM/AAAA"
            maxLength={10}
            className="w-full px-4 py-3 rounded-xl border bg-white text-[#0C2233] placeholder:text-[#8AACCB] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/30 focus:border-[#0369A1] text-sm font-mono tracking-wider"
            style={{ borderColor: dateError ? '#C0392B' : '#D4E8F2' }}
          />
          {dateError && (
            <p className="text-xs text-red-600 mt-1">{dateError}</p>
          )}
          {dateValue && !dateError && (
            <p className="text-xs text-[#2D8A56] mt-1">✓ Data válida</p>
          )}
        </div>

        {state?.error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending || !dateValue}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #024F82, #0369A1)' }}
        >
          {pending ? 'A criar…' : 'Criar Teste'}
        </button>
      </form>
    </div>
  )
}

export default function NewTestPage() {
  return (
    <Suspense>
      <NewTestForm />
    </Suspense>
  )
}
