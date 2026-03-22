'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { addTopicPrediction } from '@/app/actions/tests'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50 flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #024F82, #0369A1)' }}
    >
      {pending ? '…' : '+'}
    </button>
  )
}

interface Props {
  testId: string
}

export default function TopicForm({ testId }: Props) {
  const [state, action] = useActionState(addTopicPrediction, null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Clear input on success
  useEffect(() => {
    if (state?.ok && inputRef.current) {
      inputRef.current.value = ''
    }
  }, [state])

  return (
    <div className="mb-3">
      <form action={action} className="flex gap-2">
        <input type="hidden" name="test_id" value={testId} />
        <input
          ref={inputRef}
          name="topic_name"
          type="text"
          required
          placeholder="Sugerir tópico…"
          className="flex-1 px-3 py-2.5 rounded-xl border border-[#D4E8F2] bg-white text-[#0C2233] placeholder:text-[#8AACCB] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/30 focus:border-[#0369A1] text-sm"
        />
        <SubmitButton />
      </form>

      {state?.error && (
        <p className="text-xs text-red-500 mt-1.5 px-1">{state.error}</p>
      )}
      {state?.ok && (
        <p className="text-xs text-[#2D8A56] mt-1.5 px-1 font-medium">✓ Tópico adicionado</p>
      )}
    </div>
  )
}
