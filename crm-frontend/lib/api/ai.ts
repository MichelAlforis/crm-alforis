// lib/api/ai.ts
// ============= AI API MODULE =============
// Command suggestions, autofill, intelligence

import type { BaseApiClient } from './index'

export type CommandSuggestionType =
  | 'person'
  | 'organisation'
  | 'task'
  | 'interaction'
  | 'navigation'
  | 'quick_action'

export type CommandSuggestionAction =
  | 'create'
  | 'view'
  | 'edit'
  | 'search'
  | 'navigate'
  | 'email'
  | 'call'

export interface CommandSuggestion {
  type: CommandSuggestionType
  action: CommandSuggestionAction
  label: string
  description: string
  confidence: number // 0.0 to 1.0
  metadata?: Record<string, any>
  icon: string
}

export interface CommandSuggestResponse {
  query: string
  suggestions: CommandSuggestion[]
  intent?: string
  entities?: Record<string, any>
}

export class AiApi {
  constructor(private client: BaseApiClient) {}

  /**
   * Get AI-powered command suggestions
   * GET /ai/command/suggest?q={query}
   */
  async getCommandSuggestions(
    query: string,
    limit: number = 10
  ): Promise<CommandSuggestResponse> {
    return await this.client['get']<CommandSuggestResponse>('/ai/command/suggest', {
      q: query,
      limit,
    })
  }

  /**
   * Get recent command suggestions based on activity
   * GET /ai/command/recent
   */
  async getRecentSuggestions(limit: number = 10): Promise<CommandSuggestion[]> {
    return await this.client['get']<CommandSuggestion[]>('/ai/command/recent', {
      limit,
    })
  }
}
