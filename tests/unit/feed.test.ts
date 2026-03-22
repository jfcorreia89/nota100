import { describe, it, expect } from 'vitest'
import {
  buildReactions,
  transformUpload,
  transformTest,
  transformQuiz,
  transformTopicPrediction,
  mergeFeedEvents,
  type RawUpload,
  type RawTest,
  type RawQuizAttempt,
  type RawTopicPrediction,
} from '@/lib/feed'

const USER_A = 'user-a'
const USER_B = 'user-b'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const rawUpload: RawUpload = {
  id: 'upload-1',
  user_id: USER_B,
  test_id: 'test-1',
  file_type: 'image',
  ai_summary: 'Resumo sobre derivadas',
  is_public: true,
  created_at: '2026-03-22T10:00:00Z',
  profiles: { id: USER_B, name: 'Maria Rodrigues', avatar_url: null },
  tests: { subject: 'Matemática A', topic: 'Cálculo' },
  upload_reactions: [
    { user_id: USER_A, emoji: '💡' },
    { user_id: USER_B, emoji: '💡' },
    { user_id: USER_A, emoji: '🔥' },
  ],
}

const rawTest: RawTest = {
  id: 'test-1',
  subject: 'Física',
  topic: 'Eletromagnetismo',
  test_date: '2026-04-01',
  created_at: '2026-03-20T09:00:00Z',
  created_by: USER_A,
  profiles: { id: USER_A, name: 'João Silva', avatar_url: null },
}

const rawQuiz: RawQuizAttempt = {
  id: 'quiz-1',
  user_id: USER_A,
  test_id: 'test-1',
  score: 95,
  questions_correct: 9,
  questions_total: 10,
  badges: ['perfect', 'completed'],
  completed_at: '2026-03-21T15:00:00Z',
  profiles: { id: USER_A, name: 'João Silva', avatar_url: null },
  tests: { subject: 'Física', topic: 'Eletromagnetismo' },
}

const rawTopic: RawTopicPrediction = {
  id: 'topic-1',
  topic_name: 'Derivadas compostas',
  test_id: 'test-1',
  created_by: USER_B,
  created_at: '2026-03-21T08:00:00Z',
  profiles: { id: USER_B, name: 'Maria Rodrigues', avatar_url: null },
  tests: { subject: 'Matemática A' },
  topic_votes: [{ user_id: USER_A }, { user_id: USER_B }],
}

// ── buildReactions ────────────────────────────────────────────────────────────

describe('buildReactions', () => {
  it('counts reactions per emoji', () => {
    const result = buildReactions(rawUpload.upload_reactions, USER_A)
    const fire = result.find(r => r.emoji === '🔥')!
    expect(fire.count).toBe(1)
    const bulb = result.find(r => r.emoji === '💡')!
    expect(bulb.count).toBe(2)
  })

  it('marks hasReacted correctly for current user', () => {
    const result = buildReactions(rawUpload.upload_reactions, USER_A)
    expect(result.find(r => r.emoji === '💡')!.hasReacted).toBe(true)
    expect(result.find(r => r.emoji === '🔥')!.hasReacted).toBe(true)
    expect(result.find(r => r.emoji === '🙏')!.hasReacted).toBe(false)
  })

  it('returns 0 count for emoji with no reactions', () => {
    const result = buildReactions(rawUpload.upload_reactions, USER_A)
    expect(result.find(r => r.emoji === '🙏')!.count).toBe(0)
  })

  it('returns all 3 emojis even with empty input', () => {
    const result = buildReactions([], USER_A)
    expect(result).toHaveLength(3)
    expect(result.every(r => r.count === 0 && !r.hasReacted)).toBe(true)
  })
})

// ── transformUpload ───────────────────────────────────────────────────────────

describe('transformUpload', () => {
  it('produces type "upload"', () => {
    const event = transformUpload(rawUpload, USER_A)
    expect(event.type).toBe('upload')
  })

  it('sets actor from profiles', () => {
    const event = transformUpload(rawUpload, USER_A)
    expect(event.actor.name).toBe('Maria Rodrigues')
    expect(event.actor.id).toBe(USER_B)
  })

  it('sets timestamp to created_at', () => {
    const event = transformUpload(rawUpload, USER_A)
    expect(event.timestamp).toBe('2026-03-22T10:00:00Z')
  })

  it('includes reactions', () => {
    const event = transformUpload(rawUpload, USER_A)
    if (event.type !== 'upload') throw new Error('wrong type')
    expect(event.upload.reactions).toHaveLength(3)
  })

  it('falls back to unknown actor when profiles is null', () => {
    const event = transformUpload({ ...rawUpload, profiles: null }, USER_A)
    expect(event.actor.name).toBe('Aluno')
  })
})

// ── transformTest ─────────────────────────────────────────────────────────────

describe('transformTest', () => {
  it('produces type "test_created"', () => {
    const event = transformTest(rawTest)
    expect(event.type).toBe('test_created')
  })

  it('prefixes id to avoid collisions', () => {
    const event = transformTest(rawTest)
    expect(event.id).toBe('test-test-1')
  })

  it('sets subject and topic correctly', () => {
    const event = transformTest(rawTest)
    if (event.type !== 'test_created') throw new Error('wrong type')
    expect(event.test.subject).toBe('Física')
    expect(event.test.topic).toBe('Eletromagnetismo')
  })
})

// ── transformQuiz ─────────────────────────────────────────────────────────────

describe('transformQuiz', () => {
  it('produces type "quiz_completed"', () => {
    const event = transformQuiz(rawQuiz)
    expect(event.type).toBe('quiz_completed')
  })

  it('sets score and accuracy data', () => {
    const event = transformQuiz(rawQuiz)
    if (event.type !== 'quiz_completed') throw new Error('wrong type')
    expect(event.quiz.score).toBe(95)
    expect(event.quiz.questions_correct).toBe(9)
    expect(event.quiz.questions_total).toBe(10)
  })

  it('sets timestamp to completed_at', () => {
    const event = transformQuiz(rawQuiz)
    expect(event.timestamp).toBe('2026-03-21T15:00:00Z')
  })
})

// ── transformTopicPrediction ──────────────────────────────────────────────────

describe('transformTopicPrediction', () => {
  it('produces type "topic_suggested"', () => {
    const event = transformTopicPrediction(rawTopic, USER_A)
    expect(event.type).toBe('topic_suggested')
  })

  it('counts votes correctly', () => {
    const event = transformTopicPrediction(rawTopic, USER_A)
    if (event.type !== 'topic_suggested') throw new Error('wrong type')
    expect(event.topic.vote_count).toBe(2)
  })

  it('marks has_voted when current user voted', () => {
    const event = transformTopicPrediction(rawTopic, USER_A)
    if (event.type !== 'topic_suggested') throw new Error('wrong type')
    expect(event.topic.has_voted).toBe(true)
  })

  it('marks has_voted false when user has not voted', () => {
    const event = transformTopicPrediction(rawTopic, 'other-user')
    if (event.type !== 'topic_suggested') throw new Error('wrong type')
    expect(event.topic.has_voted).toBe(false)
  })
})

// ── mergeFeedEvents ───────────────────────────────────────────────────────────

describe('mergeFeedEvents', () => {
  it('merges all event types into one array', () => {
    const events = mergeFeedEvents([rawUpload], [rawTest], [rawQuiz], [rawTopic], USER_A)
    const types = events.map(e => e.type)
    expect(types).toContain('upload')
    expect(types).toContain('test_created')
    expect(types).toContain('quiz_completed')
    expect(types).toContain('topic_suggested')
  })

  it('sorts by timestamp descending (newest first)', () => {
    const events = mergeFeedEvents([rawUpload], [rawTest], [rawQuiz], [rawTopic], USER_A)
    for (let i = 0; i < events.length - 1; i++) {
      expect(new Date(events[i].timestamp).getTime())
        .toBeGreaterThanOrEqual(new Date(events[i + 1].timestamp).getTime())
    }
  })

  it('respects the limit', () => {
    // duplicate uploads to exceed default limit
    const manyUploads = Array.from({ length: 50 }, (_, i) => ({
      ...rawUpload,
      id: `upload-${i}`,
      created_at: new Date(Date.now() - i * 1000).toISOString(),
    }))
    const events = mergeFeedEvents(manyUploads, [], [], [], USER_A, 10)
    expect(events).toHaveLength(10)
  })

  it('handles all empty sources gracefully', () => {
    const events = mergeFeedEvents([], [], [], [], USER_A)
    expect(events).toHaveLength(0)
  })

  it('deduplicates by using type-prefixed ids', () => {
    const events = mergeFeedEvents([rawUpload], [rawTest], [], [], USER_A)
    const ids = events.map(e => e.id)
    // upload id is 'upload-1', test id is 'test-test-1' — no collision
    expect(new Set(ids).size).toBe(ids.length)
  })
})
