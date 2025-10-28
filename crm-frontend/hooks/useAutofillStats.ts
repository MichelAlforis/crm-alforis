import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type {
  AutofillStats,
  AutofillTimelineResponse,
  AutofillLeaderboardResponse,
} from '@/lib/types'

const autofillStatsKeys = {
  all: ['autofill', 'stats'] as const,
  summary: (days: number) => [...autofillStatsKeys.all, 'summary', days] as const,
  timeline: (days: number) => [...autofillStatsKeys.all, 'timeline', days] as const,
  leaderboard: ['autofill', 'leaderboard'] as const,
}

export function useAutofillStats(days = 7) {
  return useQuery({
    queryKey: autofillStatsKeys.summary(days),
    queryFn: () => apiClient.getAutofillStats({ days }),
  })
}

export function useAutofillTimeline(days = 7) {
  return useQuery({
    queryKey: autofillStatsKeys.timeline(days),
    queryFn: () => apiClient.getAutofillTimeline({ days }),
  })
}

export function useAutofillLeaderboard() {
  return useQuery({
    queryKey: autofillStatsKeys.leaderboard,
    queryFn: () => apiClient.getAutofillLeaderboard(),
  })
}
