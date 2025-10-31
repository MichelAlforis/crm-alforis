// hooks/useCampaignStats.ts
// Calculate campaign statistics from campaigns array

import { useMemo } from 'react'
import type { EmailCampaign } from '@/lib/types'

export interface CampaignStats {
  total: number
  draft: number
  scheduled: number
  sent: number
  failed: number
  sending: number
}

export function useCampaignStats(campaigns: EmailCampaign[]): CampaignStats {
  return useMemo(() => {
    const total = campaigns.length
    const draft = campaigns.filter(c => c.status === 'draft').length
    const scheduled = campaigns.filter(c => c.status === 'scheduled').length
    const sent = campaigns.filter(c => c.status === 'sent').length
    const failed = campaigns.filter(c => c.status === 'failed').length
    const sending = campaigns.filter(c => c.status === 'sending').length

    return {
      total,
      draft,
      scheduled,
      sent,
      failed,
      sending,
    }
  }, [campaigns])
}
