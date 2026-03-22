import type { FeedEvent, FeedActor, FeedReaction, ReactionEmoji, BadgeSlug, FileType } from './supabase/types'

// ── Raw shapes returned by Supabase ──────────────────────────────────────────

export interface RawUpload {
  id: string
  user_id: string
  test_id: string
  file_type: string
  ai_summary: string | null
  is_public: boolean
  created_at: string
  profiles: { id?: string; name: string; avatar_url: string | null } | null
  tests: { subject: string; topic: string } | null
  upload_reactions: { user_id: string; emoji: string }[]
}

export interface RawTest {
  id: string
  subject: string
  topic: string
  test_date: string
  created_at: string
  created_by: string | null
  profiles: { id?: string; name: string; avatar_url: string | null } | null
}

export interface RawQuizAttempt {
  id: string
  user_id: string
  test_id: string
  score: number
  questions_correct: number
  questions_total: number
  badges: string[]
  completed_at: string
  profiles: { id?: string; name: string; avatar_url: string | null } | null
  tests: { subject: string; topic: string } | null
}

export interface RawTopicPrediction {
  id: string
  topic_name: string
  test_id: string
  created_by: string | null
  created_at: string
  profiles: { id?: string; name: string; avatar_url: string | null } | null
  tests: { subject: string } | null
  topic_votes: { user_id: string }[]
}

// ── Pure transformation helpers ───────────────────────────────────────────────

const EMOJIS: ReactionEmoji[] = ['💡', '🔥', '🙏']

export function buildReactions(
  raw: { user_id: string; emoji: string }[],
  currentUserId: string,
): FeedReaction[] {
  const counts: Record<string, { count: number; hasReacted: boolean }> = {}
  for (const r of raw) {
    if (!counts[r.emoji]) counts[r.emoji] = { count: 0, hasReacted: false }
    counts[r.emoji].count++
    if (r.user_id === currentUserId) counts[r.emoji].hasReacted = true
  }
  return EMOJIS.map(emoji => ({
    emoji,
    count: counts[emoji]?.count ?? 0,
    hasReacted: counts[emoji]?.hasReacted ?? false,
  }))
}

function unknownActor(id: string): FeedActor {
  return { id, name: 'Aluno', avatar_url: null }
}

export function transformUpload(u: RawUpload, currentUserId: string): FeedEvent {
  const actor: FeedActor = u.profiles
    ? { id: u.user_id, name: u.profiles.name, avatar_url: u.profiles.avatar_url }
    : unknownActor(u.user_id)
  return {
    type: 'upload',
    id: u.id,
    timestamp: u.created_at,
    actor,
    upload: {
      id: u.id,
      test_id: u.test_id,
      file_type: u.file_type as FileType,
      ai_summary: u.ai_summary,
      is_public: u.is_public,
      user_id: u.user_id,
      subject: u.tests?.subject ?? '',
      topic: u.tests?.topic ?? '',
      reactions: buildReactions(u.upload_reactions ?? [], currentUserId),
    },
  }
}

export function transformTest(t: RawTest): FeedEvent {
  const actor: FeedActor = t.profiles && t.created_by
    ? { id: t.created_by, name: t.profiles.name, avatar_url: t.profiles.avatar_url }
    : unknownActor(t.created_by ?? t.id)
  return {
    type: 'test_created',
    id: `test-${t.id}`,
    timestamp: t.created_at,
    actor,
    test: {
      id: t.id,
      subject: t.subject,
      topic: t.topic,
      test_date: t.test_date,
    },
  }
}

export function transformQuiz(q: RawQuizAttempt): FeedEvent {
  const actor: FeedActor = q.profiles
    ? { id: q.user_id, name: q.profiles.name, avatar_url: q.profiles.avatar_url }
    : unknownActor(q.user_id)
  return {
    type: 'quiz_completed',
    id: q.id,
    timestamp: q.completed_at,
    actor,
    quiz: {
      test_id: q.test_id,
      subject: q.tests?.subject ?? '',
      topic: q.tests?.topic ?? '',
      score: q.score,
      questions_correct: q.questions_correct,
      questions_total: q.questions_total,
      badges: q.badges as BadgeSlug[],
    },
  }
}

export function transformTopicPrediction(
  p: RawTopicPrediction,
  currentUserId: string,
): FeedEvent {
  const actor: FeedActor = p.profiles && p.created_by
    ? { id: p.created_by, name: p.profiles.name, avatar_url: p.profiles.avatar_url }
    : unknownActor(p.created_by ?? p.id)
  return {
    type: 'topic_suggested',
    id: `topic-${p.id}`,
    timestamp: p.created_at,
    actor,
    topic: {
      id: p.id,
      topic_name: p.topic_name,
      test_id: p.test_id,
      subject: p.tests?.subject ?? '',
      vote_count: p.topic_votes?.length ?? 0,
      has_voted: p.topic_votes?.some(v => v.user_id === currentUserId) ?? false,
    },
  }
}

// ── Merge + sort ──────────────────────────────────────────────────────────────

export function mergeFeedEvents(
  uploads: RawUpload[],
  tests: RawTest[],
  quizzes: RawQuizAttempt[],
  topics: RawTopicPrediction[],
  currentUserId: string,
  limit = 30,
): FeedEvent[] {
  const events: FeedEvent[] = [
    ...uploads.map(u => transformUpload(u, currentUserId)),
    ...tests.map(t => transformTest(t)),
    ...quizzes.map(q => transformQuiz(q)),
    ...topics.map(p => transformTopicPrediction(p, currentUserId)),
  ]
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return events.slice(0, limit)
}
