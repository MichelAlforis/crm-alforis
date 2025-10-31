'use client'

import { useEffect, useState } from 'react'
import { AI_INTENT_LABELS } from "@/lib/enums/labels"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Activity, TrendingUp, Target, Zap, Brain, Clock, BarChart3, PieChart } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

interface EmailIntelligenceMetrics {
  total_emails_processed: number
  total_signatures_parsed: number
  total_intents_detected: number
  total_suggestions_created: number
  total_auto_applied: number
  signature_success_rate: number
  intent_detection_rate: number
  auto_apply_rate: number
  cache_hit_rate: number
  avg_confidence_signature: number
  avg_confidence_intent: number
  avg_processing_time_ms: number
}

interface IntentDistribution {
  intent: string
  count: number
  percentage: number
}

interface ModelUsage {
  model: string
  provider: string
  count: number
  avg_processing_time_ms: number
}

interface TopSender {
  email: string
  count: number
  signatures_parsed: number
  intents_detected: number
}

interface TimelineDataPoint {
  date: string
  signatures: number
  intents: number
  auto_applied: number
}

export default function EmailIntelligencePage() {
  const [timeWindow, setTimeWindow] = useState('30')
  const [metrics, setMetrics] = useState<EmailIntelligenceMetrics | null>(null)
  const [intents, setIntents] = useState<IntentDistribution[]>([])
  const [models, setModels] = useState<ModelUsage[]>([])
  const [topSenders, setTopSenders] = useState<TopSender[]>([])
  const [timeline, setTimeline] = useState<TimelineDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    try {
      const [metricsRes, intentsRes, modelsRes, sendersRes, timelineRes] = await Promise.all([
        apiClient.get<EmailIntelligenceMetrics>(`/email-intelligence/metrics?days=${timeWindow}`),
        apiClient.get<IntentDistribution[]>(`/email-intelligence/intents?days=${timeWindow}`),
        apiClient.get<ModelUsage[]>(`/email-intelligence/models?days=${timeWindow}`),
        apiClient.get<TopSender[]>(`/email-intelligence/top-senders?days=${timeWindow}&limit=10`),
        apiClient.get<TimelineDataPoint[]>(`/email-intelligence/timeline?days=${timeWindow}`)
      ])

      setMetrics(metricsRes.data)
      setIntents(intentsRes.data)
      setModels(modelsRes.data)
      setTopSenders(sendersRes.data)
      setTimeline(timelineRes.data)
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible de charger les métriques',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [timeWindow])

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Brain className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement des métriques IA...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">📊 Dashboard Email Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            Métriques et KPIs de la couche IA
          </p>
        </div>

        <Select value={timeWindow} onValueChange={setTimeWindow}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 derniers jours</SelectItem>
            <SelectItem value="30">30 derniers jours</SelectItem>
            <SelectItem value="90">90 derniers jours</SelectItem>
            <SelectItem value="365">1 an</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Traités</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_emails_processed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.total_signatures_parsed} signatures · {metrics.total_intents_detected} intents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Succès</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.signature_success_rate * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Signatures parsées avec succès
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Applied</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_auto_applied}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {(metrics.auto_apply_rate * 100).toFixed(1)}% des suggestions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.cache_hit_rate * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Résultats instantanés (0ms)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="intents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="intents">
            <PieChart className="h-4 w-4 mr-2" />
            Intentions
          </TabsTrigger>
          <TabsTrigger value="models">
            <Brain className="h-4 w-4 mr-2" />
            Modèles IA
          </TabsTrigger>
          <TabsTrigger value="senders">
            <BarChart3 className="h-4 w-4 mr-2" />
            Top Expéditeurs
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Clock className="h-4 w-4 mr-2" />
            Timeline
          </TabsTrigger>
        </TabsList>

        {/* Intents Tab */}
        <TabsContent value="intents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Répartition des Intentions Détectées</CardTitle>
              <CardDescription>
                Distribution des {intents.reduce((sum, i) => sum + i.count, 0)} intentions détectées
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {intents.map((intent) => (
                  <div key={intent.intent}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {AI_INTENT_LABELS[intent.intent] || intent.intent}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {intent.count} ({intent.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${intent.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Utilisation des Modèles IA</CardTitle>
              <CardDescription>
                Performance et utilisation par modèle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {models.map((model) => (
                  <div key={`${model.provider}-${model.model}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{model.model}</div>
                      <div className="text-sm text-muted-foreground">
                        {model.provider === 'ollama' && '🏠 Local (RGPD)'}
                        {model.provider === 'mistral' && '🇪🇺 Mistral AI (EU)'}
                        {model.provider === 'openai' && '🇺🇸 OpenAI'}
                        {model.provider === 'anthropic' && '🧠 Claude'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{model.count} appels</div>
                      <div className="text-sm text-muted-foreground">
                        ~{(model.avg_processing_time_ms / 1000).toFixed(1)}s moy.
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Confiance Moyenne</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Signatures</span>
                      <span className="font-medium">{(metrics.avg_confidence_signature * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${metrics.avg_confidence_signature * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Intentions</span>
                      <span className="font-medium">{(metrics.avg_confidence_intent * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${metrics.avg_confidence_intent * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Temps moyen</span>
                    <span className="font-medium">{(metrics.avg_processing_time_ms / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Détection d'intent</span>
                    <span className="font-medium">{(metrics.intent_detection_rate * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Top Senders Tab */}
        <TabsContent value="senders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Expéditeurs Traités</CardTitle>
              <CardDescription>
                Classement par nombre d'emails reçus
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topSenders.map((sender, index) => (
                  <div key={sender.email} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{sender.email}</div>
                        <div className="text-sm text-muted-foreground">
                          {sender.signatures_parsed} signatures · {sender.intents_detected} intents
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{sender.count}</div>
                      <div className="text-sm text-muted-foreground">emails</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Timeline d'Activité IA</CardTitle>
              <CardDescription>
                Évolution quotidienne du traitement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {timeline.slice(-14).map((point) => (
                  <div key={point.date} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{new Date(point.date).toLocaleDateString('fr-FR')}</span>
                      <span className="text-muted-foreground">
                        {point.signatures + point.intents + point.auto_applied} actions
                      </span>
                    </div>
                    <div className="flex gap-1 w-full h-6">
                      {point.signatures > 0 && (
                        <div
                          className="bg-orange-500 rounded flex items-center justify-center text-xs text-white"
                          style={{ width: `${(point.signatures / (point.signatures + point.intents + point.auto_applied + 1)) * 100}%` }}
                          title={`${point.signatures} signatures`}
                        >
                          {point.signatures > 2 && point.signatures}
                        </div>
                      )}
                      {point.intents > 0 && (
                        <div
                          className="bg-blue-500 rounded flex items-center justify-center text-xs text-white"
                          style={{ width: `${(point.intents / (point.signatures + point.intents + point.auto_applied + 1)) * 100}%` }}
                          title={`${point.intents} intents`}
                        >
                          {point.intents > 2 && point.intents}
                        </div>
                      )}
                      {point.auto_applied > 0 && (
                        <div
                          className="bg-green-500 rounded flex items-center justify-center text-xs text-white"
                          style={{ width: `${(point.auto_applied / (point.signatures + point.intents + point.auto_applied + 1)) * 100}%` }}
                          title={`${point.auto_applied} auto-applied`}
                        >
                          {point.auto_applied > 2 && point.auto_applied}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 mt-6 pt-4 border-t text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded" />
                  <span>Signatures</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded" />
                  <span>Intentions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span>Auto-applied</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
