import { GoogleGenerativeAI, GoogleGenerativeAIResponseError } from '@google/generative-ai'
import type { AIQuestion } from './supabase/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const PROMPT = `Analisa este material de estudo em português.

IMPORTANTE: Se o conteúdo NÃO for material de estudo escolar (apontamentos, resumos, páginas de livro, exercícios, etc.), responde APENAS com: {"not_educational": true}

Se for material de estudo:
1. Escreve um resumo conciso dos tópicos principais (máx 200 palavras).
2. Gera exatamente 5 perguntas de escolha múltipla com 4 opções cada.

Responde APENAS com JSON válido neste formato, sem markdown:
{
  "summary": "...",
  "questions": [
    {
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "answer": "A"
    }
  ]
}`

export async function analyzeStudyMaterial(
  fileBase64: string,
  mimeType: string
): Promise<{ summary: string; questions: AIQuestion[] } | { not_educational: true }> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

  let result
  try {
    result = await model.generateContent([
      { inlineData: { data: fileBase64, mimeType } },
      PROMPT,
    ])
  } catch (err: unknown) {
    // Surface rate limit errors clearly instead of a generic 500
    if (err instanceof GoogleGenerativeAIResponseError) {
      const status = (err as unknown as { status?: number }).status
      if (status === 429) {
        throw new Error('Limite de pedidos IA atingido. Aguarda um minuto e tenta novamente.')
      }
    }
    // Check error message for quota/rate limit keywords
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate')) {
      throw new Error('Limite de pedidos IA atingido. Aguarda um minuto e tenta novamente.')
    }
    throw err
  }

  const text = result.response.text().trim()
  // Strip markdown code fences if present
  const json = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')

  try {
    const parsed = JSON.parse(json)
    if (parsed.not_educational === true) return { not_educational: true }
    return parsed
  } catch {
    throw new Error('A IA devolveu uma resposta inválida. Tenta novamente.')
  }
}
