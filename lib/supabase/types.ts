export type Role = 'student' | 'admin'
export type FileType = 'pdf' | 'image'

export interface Profile {
  id: string
  name: string
  avatar_url: string | null
  role: Role
  streak_count: number
  last_active: string
  created_at: string
}

export interface Class {
  id: string
  name: string
  subject: string
  created_by: string | null
  created_at: string
}

export interface InviteCode {
  id: string
  class_id: string
  code: string
  created_by: string | null
  is_active: boolean
  uses_count: number
  created_at: string
}

export interface ClassMember {
  class_id: string
  user_id: string
  joined_at: string
}

export interface Test {
  id: string
  class_id: string
  subject: string
  topic: string
  test_date: string
  created_by: string | null
  created_at: string
}

export interface TopicPrediction {
  id: string
  test_id: string
  topic_name: string
  created_by: string | null
  created_at: string
}

export interface TopicVote {
  id: string
  prediction_id: string
  user_id: string
  created_at: string
}

export interface Upload {
  id: string
  test_id: string
  user_id: string
  file_url: string
  file_type: FileType
  ai_summary: string | null
  ai_questions: AIQuestion[] | null
  is_public: boolean
  created_at: string
}

export interface AIQuestion {
  question: string
  options: string[]
  answer: string
}

export type ReactionEmoji = '💡' | '🔥' | '🙏'

export interface UploadReaction {
  id: string
  upload_id: string
  user_id: string
  emoji: ReactionEmoji
  created_at: string
}

export type BadgeSlug = 'perfect' | 'lightning' | 'five_correct' | 'on_fire' | 'completed'

export interface QuizAttempt {
  id: string
  user_id: string
  test_id: string
  score: number
  questions_correct: number
  questions_total: number
  badges: BadgeSlug[]
  completed_at: string
}
