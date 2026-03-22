import type { FeedEvent } from '@/lib/supabase/types'
import UploadEventCard from './UploadEventCard'
import TestCreatedCard from './TestCreatedCard'
import QuizResultCard from './QuizResultCard'
import TopicSuggestedCard from './TopicSuggestedCard'

interface Props {
  event: FeedEvent
  currentUserId: string
}

export default function FeedEventCard({ event, currentUserId }: Props) {
  switch (event.type) {
    case 'upload':
      return <div data-testid="feed-item"><UploadEventCard event={event} currentUserId={currentUserId} /></div>
    case 'test_created':
      return <div data-testid="feed-item"><TestCreatedCard event={event} /></div>
    case 'quiz_completed':
      return <div data-testid="feed-item"><QuizResultCard event={event} /></div>
    case 'topic_suggested':
      return <div data-testid="feed-item"><TopicSuggestedCard event={event} /></div>
  }
}
