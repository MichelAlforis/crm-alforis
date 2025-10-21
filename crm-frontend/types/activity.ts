// Types pour les activités avec participants

export interface ActivityParticipant {
  id?: number
  activity_id?: number
  person_id?: number
  organisation_id?: number

  // Participants externes
  external_name?: string
  external_email?: string
  external_role?: string

  // Métadonnées
  is_organizer: boolean
  attendance_status?: 'confirmed' | 'tentative' | 'declined'
  notes?: string

  // Relations enrichies
  display_name?: string

  created_at?: string
  updated_at?: string
}

export interface ActivityWithParticipants {
  id: number
  organisation_id: number
  type: 'appel' | 'email' | 'reunion' | 'dejeuner' | 'note' | 'autre'
  title: string
  description?: string
  metadata?: Record<string, any>
  occurred_at: string
  created_at: string
  updated_at?: string

  participants: ActivityParticipant[]
  attachments_count: number
}

export interface CreateActivityWithParticipants {
  organisation_id: number
  type: string
  title: string
  description?: string
  metadata?: Record<string, any>
  occurred_at?: string
  participants: Omit<ActivityParticipant, 'id' | 'activity_id' | 'created_at' | 'updated_at' | 'display_name'>[]
}
