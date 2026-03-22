'use client'

import { useState, useRef, useTransition } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { AIQuestion } from '@/lib/supabase/types'
import { Suspense } from 'react'
import { shareUpload } from '@/app/actions/uploads'

interface Result {
  summary: string
  questions: AIQuestion[]
  uploadId: string
}

function UploadForm() {
  const params = useSearchParams()
  const testId = params.get('test') ?? ''
  const router = useRouter()

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({})
  const [shared, setShared] = useState(false)
  const [, startTransition] = useTransition()

  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    setFile(f)
    setResult(null)
    setError(null)
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f)
      setPreview(url)
    } else {
      setPreview(null)
    }
  }

  async function handleSubmit() {
    if (!file) return

    if (!testId) {
      setError('Navega para um teste específico antes de fazer upload.')
      return
    }

    if (loading) return  // prevent double submit

    setLoading(true)
    setError(null)

    // Jitter: spread burst traffic across 0–2s to stay within Gemini RPM limit
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000))

    const formData = new FormData()
    formData.append('file', file)
    formData.append('test_id', testId)

    try {
      const res = await fetch('/api/ai/analyze', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      setResult(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao processar')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="min-h-screen bg-[#F0F7FC] pb-24">
        <div className="px-6 pt-12 pb-4 flex items-center gap-4">
          <button
            onClick={() => setResult(null)}
            className="w-9 h-9 rounded-xl bg-white border border-[#D4E8F2] flex items-center justify-center text-lg"
          >
            ‹
          </button>
          <h1 className="text-xl font-bold text-[#0C2233]">Resultado IA</h1>
        </div>

        {/* Summary */}
        <div className="mx-6 mb-5 bg-white border border-[#D4E8F2] rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest mb-2">Resumo</p>
          <p className="text-sm text-[#5A8AA8] leading-relaxed">{result.summary}</p>
        </div>

        {/* Questions */}
        <div className="mx-6 mb-5">
          <p className="text-[10px] font-semibold text-[#8AACCB] uppercase tracking-widest mb-3">5 Perguntas Rápidas</p>
          <div className="space-y-4">
            {result.questions.map((q, qi) => (
              <div key={qi} className="bg-white border border-[#D4E8F2] rounded-2xl p-4 shadow-sm">
                <div className="flex items-start gap-2 mb-3">
                  <span className="w-6 h-6 rounded-lg bg-[#E0F2FC] text-[#0369A1] flex-shrink-0 flex items-center justify-center text-xs font-bold">
                    {qi + 1}
                  </span>
                  <p className="text-sm font-semibold text-[#0C2233] leading-snug">{q.question}</p>
                </div>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => {
                    const letter = opt.charAt(0)
                    const selected = selectedAnswers[qi] === letter
                    const isCorrect = letter === q.answer
                    const showResult = selectedAnswers[qi] !== undefined

                    return (
                      <button
                        key={oi}
                        onClick={() => setSelectedAnswers(prev => ({ ...prev, [qi]: letter }))}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors border"
                        style={{
                          background: showResult && isCorrect ? '#D1FAE5' : showResult && selected && !isCorrect ? '#FEE2E2' : selected ? '#E0F2FC' : '#F0F7FC',
                          borderColor: showResult && isCorrect ? '#2D8A56' : showResult && selected && !isCorrect ? '#C0392B' : selected ? '#0369A1' : '#D4E8F2',
                          color: showResult && isCorrect ? '#2D8A56' : showResult && selected && !isCorrect ? '#C0392B' : selected ? '#0369A1' : '#5A8AA8',
                          fontWeight: selected ? 600 : 400,
                        }}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {testId && (
          <div className="mx-6 space-y-3">
            <button
              onClick={() => router.push(`/test/${testId}`)}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm"
              style={{ background: 'linear-gradient(135deg, #024F82, #0369A1)' }}
            >
              Ver teste completo →
            </button>
            {!shared ? (
              <button
                onClick={() => {
                  startTransition(async () => {
                    await shareUpload(result!.uploadId)
                    setShared(true)
                  })
                }}
                className="w-full py-3 rounded-xl font-semibold text-sm border border-[#0369A1] text-[#0369A1] bg-white"
              >
                🌍 Partilhar com a turma
              </button>
            ) : (
              <div className="w-full py-3 rounded-xl text-center text-sm font-semibold text-[#2D8A56] bg-[#D1FAE5]">
                ✓ Partilhado com a turma
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F0F7FC] pb-24">
      <div className="px-6 pt-12 pb-4 flex items-center gap-4">
        <Link
          href={testId ? `/test/${testId}` : '/dashboard'}
          className="w-9 h-9 rounded-xl bg-white border border-[#D4E8F2] flex items-center justify-center text-lg"
        >
          ‹
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#0C2233]">Upload de Apontamentos</h1>
          <p className="text-xs text-[#5A8AA8]">Foto do caderno ou PDF → IA gera resumo + quiz</p>
        </div>
      </div>

      <div className="mx-6 space-y-4">
        {/* No test warning */}
        {!testId && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <p className="text-sm text-amber-800 font-medium">Sem teste associado</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Vai a um teste e clica em &quot;+ Upload&quot; para ligar o upload a um teste.
            </p>
          </div>
        )}

        {/* Drop zone */}
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 transition-colors"
          style={{ borderColor: file ? '#0369A1' : '#B8DEF2', background: file ? '#E0F2FC' : 'white' }}
        >
          {preview ? (
            <img src={preview} alt="preview" className="max-h-40 rounded-xl object-contain" />
          ) : (
            <>
              <span className="text-4xl">{file ? '📄' : '📸'}</span>
              <div className="text-center">
                <p className="text-sm font-semibold text-[#0C2233]">
                  {file ? file.name : 'Toca para selecionar'}
                </p>
                <p className="text-xs text-[#5A8AA8] mt-1">
                  {file ? `${(file.size / 1024).toFixed(0)} KB` : 'Foto do caderno, scan ou PDF'}
                </p>
              </div>
            </>
          )}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {/* Camera / file shortcut */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              if (inputRef.current) {
                inputRef.current.accept = 'image/*'
                inputRef.current.setAttribute('capture', 'environment')
                inputRef.current.click()
              }
            }}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-[#D4E8F2] text-sm font-medium text-[#0C2233]"
          >
            <span>📷</span> Câmara
          </button>
          <button
            onClick={() => {
              if (inputRef.current) {
                inputRef.current.accept = 'image/*,application/pdf'
                inputRef.current.removeAttribute('capture')
                inputRef.current.click()
              }
            }}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-[#D4E8F2] text-sm font-medium text-[#0C2233]"
          >
            <span>📁</span> Ficheiros
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!file || loading || !testId}
          className="w-full py-3.5 rounded-xl text-white font-semibold text-sm disabled:opacity-40 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #024F82, #0369A1)' }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin inline-block">⏳</span> A analisar com IA… pode demorar ~10s
            </span>
          ) : (
            '🤖 Analisar com IA'
          )}
        </button>
      </div>
    </div>
  )
}

export default function UploadPage() {
  return (
    <Suspense>
      <UploadForm />
    </Suspense>
  )
}
