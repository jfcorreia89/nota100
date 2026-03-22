import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeStudyMaterial } from '@/lib/gemini'
import type { AIQuestion } from '@/lib/supabase/types'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_PER_TEST = 2                  // max analyses per user per test
const MAX_PER_DAY = 5                   // max analyses per user per day

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    const testId = formData.get('test_id') as string

    if (!file) return NextResponse.json({ error: 'Ficheiro em falta' }, { status: 400 })
    if (!testId) return NextResponse.json({ error: 'ID do teste em falta' }, { status: 400 })

    const isImage = file.type.startsWith('image/')
    const isPdf = file.type === 'application/pdf'
    if (!isImage && !isPdf) {
      return NextResponse.json({ error: 'Tipo de ficheiro não suportado. Usa imagem ou PDF.' }, { status: 400 })
    }

    // Guard: file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Ficheiro demasiado grande. Máximo 10 MB.' }, { status: 400 })
    }

    // Guard: per-test limit — fetch all uploads for this user+test
    const { data: testUploads } = await supabase
      .from('uploads')
      .select('id, ai_summary, ai_questions, created_at')
      .eq('test_id', testId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const uploadCount = testUploads?.length ?? 0

    // Return cached if at or over per-test limit
    if (uploadCount >= MAX_PER_TEST) {
      const latest = testUploads![0]
      return NextResponse.json({
        uploadId: latest.id,
        summary: latest.ai_summary,
        questions: latest.ai_questions ?? [],
        cached: true,
      })
    }

    // Return cached if uploaded to same test in last 2 minutes
    if (uploadCount >= 1) {
      const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
      const recent = testUploads!.find(u => u.created_at >= twoMinsAgo && u.ai_summary)
      if (recent) {
        return NextResponse.json({
          uploadId: recent.id,
          summary: recent.ai_summary,
          questions: recent.ai_questions ?? [],
          cached: true,
        })
      }
    }

    // Guard: daily limit
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: dailyCount } = await supabase
      .from('uploads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', dayAgo)

    if ((dailyCount ?? 0) >= MAX_PER_DAY) {
      return NextResponse.json(
        { error: 'Atingiste o limite diário de análises. Tenta amanhã.' },
        { status: 429 }
      )
    }

    // Upload file to Supabase Storage
    const ext = isImage ? (file.name.split('.').pop() ?? 'jpg') : 'pdf'
    const path = `${user.id}/${testId}/${Date.now()}.${ext}`
    const bytes = await file.arrayBuffer()

    const { error: storageError } = await supabase.storage
      .from('uploads')
      .upload(path, bytes, { contentType: file.type })

    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path)

    // Analyze with Gemini — retry once on 429
    const base64 = Buffer.from(bytes).toString('base64')
    let result
    try {
      result = await analyzeStudyMaterial(base64, file.type)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const isRateLimit = msg.includes('Limite de pedidos') || msg.includes('429') || msg.toLowerCase().includes('quota')
      if (isRateLimit) {
        await sleep(8000)
        try {
          result = await analyzeStudyMaterial(base64, file.type)
        } catch (retryErr) {
          const retryMsg = retryErr instanceof Error ? retryErr.message : 'Limite de pedidos IA atingido. Aguarda um momento e tenta novamente.'
          return NextResponse.json({ error: retryMsg }, { status: 429 })
        }
      } else {
        throw err
      }
    }

    // Guard: non-educational content
    if ('not_educational' in result && result.not_educational) {
      // Clean up the uploaded file
      await supabase.storage.from('uploads').remove([path])
      return NextResponse.json(
        { error: 'O conteúdo não parece ser material de estudo. Faz upload de apontamentos, resumos ou páginas de livro.' },
        { status: 422 }
      )
    }

    const { summary, questions: aiQuestions } = result as { summary: string; questions: AIQuestion[] }

    // Save upload record
    const { data: uploadRecord, error: dbError } = await supabase
      .from('uploads')
      .insert({
        test_id: testId,
        user_id: user.id,
        file_url: publicUrl,
        file_type: isImage ? 'image' : 'pdf',
        ai_summary: summary,
        ai_questions: aiQuestions,
      })
      .select('id')
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ uploadId: uploadRecord.id, summary, questions: aiQuestions })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao processar o ficheiro'
    console.error('AI analyze error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
