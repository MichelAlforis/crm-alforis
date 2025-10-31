'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Play, Loader2, CheckCircle, XCircle, Clock, Zap, TrendingUp } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { useQuery } from '@tanstack/react-query'
import type { AutofillJobResult, AutofillOverviewStats } from '@/lib/types'

export default function AutofillJobsPage() {
  const [daysBack, setDaysBack] = useState(7)
  const [maxEmails, setMaxEmails] = useState(100)
  const [threshold, setThreshold] = useState(0.92)
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<AutofillJobResult | null>(null)
  const { toast } = useToast()

  // Fetch stats
  const { data: stats, refetch: refetchStats } = useQuery<AutofillOverviewStats>({
    queryKey: ['autofill-stats'],
    queryFn: async () => {
      const response = await apiClient.get<AutofillOverviewStats>('/autofill-jobs/stats')
      return response.data
    }
  })

  const handleRunJob = async () => {
    setIsRunning(true)
    setResult(null)

    try {
      const response = await apiClient.post<AutofillJobResult>('/autofill-jobs/run-now', {
        days_back: daysBack,
        max_emails: maxEmails,
        auto_apply_threshold: threshold
      })

      setResult(response.data)

      if (response.data.success) {
        toast({
          title: '✅ Job terminé!',
          description: `${response.data.metrics.emails_processed} emails traités avec succès`
        })
        refetchStats()
      } else {
        toast({
          title: '❌ Erreur',
          description: 'Le job a échoué',
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      toast({
        title: '❌ Erreur',
        description: error.response?.data?.detail || 'Impossible de lancer le job',
        variant: 'destructive'
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">🔄 Batch Email Autofill</h1>
        <p className="text-muted-foreground mt-1">
          Pipeline automatique pour traiter les emails en masse
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Job Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration du Job</CardTitle>
            <CardDescription>
              Paramètres pour le traitement batch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Days Back */}
            <div className="space-y-2">
              <Label>Période (jours en arrière): {daysBack}</Label>
              <Slider
                value={[daysBack]}
                onValueChange={(value) => setDaysBack(value[0])}
                min={1}
                max={30}
                step={1}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                Traiter les emails des {daysBack} derniers jours
              </p>
            </div>

            {/* Max Emails */}
            <div className="space-y-2">
              <Label htmlFor="maxEmails">Limite d'emails</Label>
              <Input
                id="maxEmails"
                type="number"
                value={maxEmails}
                onChange={(e) => setMaxEmails(parseInt(e.target.value) || 100)}
                min={1}
                max={1000}
              />
              <p className="text-sm text-muted-foreground">
                Maximum: 1000 emails par job
              </p>
            </div>

            {/* Threshold */}
            <div className="space-y-2">
              <Label>Seuil auto-apply: {(threshold * 100).toFixed(0)}%</Label>
              <Slider
                value={[threshold * 100]}
                onValueChange={(value) => setThreshold(value[0] / 100)}
                min={50}
                max={100}
                step={1}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                Confiance minimale pour application automatique
              </p>
            </div>

            {/* Run Button */}
            <Button
              onClick={handleRunJob}
              disabled={isRunning}
              className="w-full"
              size="lg"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Traitement en cours...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Lancer le Job
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Statistiques Globales</CardTitle>
            <CardDescription>
              Vue d'ensemble du système d'autofill
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Total suggestions</div>
                    <div className="text-2xl font-bold">{stats.total_suggestions}</div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Confiance moyenne</div>
                    <div className="text-2xl font-bold">{(stats.avg_confidence * 100).toFixed(1)}%</div>
                  </div>
                  <Zap className="h-8 w-8 text-green-600" />
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Dernières 24h</div>
                    <div className="text-2xl font-bold">{stats.recent_24h}</div>
                  </div>
                  <Clock className="h-8 w-8 text-purple-600" />
                </div>

                {/* Status Breakdown */}
                {stats.status_breakdown && (
                  <div className="space-y-2 pt-4 border-t">
                    <div className="text-sm font-medium">Répartition par statut</div>
                    {Object.entries(stats.status_breakdown).map(([status, count]) => (
                      <div key={status} className="flex justify-between text-sm">
                        <span className="text-muted-foreground capitalize">{status}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Job Result */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  Résultats du Job
                </>
              ) : (
                <>
                  <XCircle className="h-6 w-6 text-red-600" />
                  Erreur
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <div className="space-y-4">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <div className="text-2xl font-bold">{result.metrics.emails_processed}</div>
                    <div className="text-sm text-muted-foreground">Emails traités</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold">{result.metrics.signatures_parsed}</div>
                    <div className="text-sm text-muted-foreground">Signatures</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold">{result.metrics.intents_detected}</div>
                    <div className="text-sm text-muted-foreground">Intentions</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold">{result.metrics.auto_applied}</div>
                    <div className="text-sm text-muted-foreground">Auto-appliqué</div>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {result.summary}
                  </pre>
                </div>

                {/* Cache Stats */}
                {(result.metrics.signatures_cached > 0 || result.metrics.intents_cached > 0) && (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-600" />
                      <span className="text-muted-foreground">
                        Cache hits: {result.metrics.signatures_cached + result.metrics.intents_cached} (0ms)
                      </span>
                    </div>
                  </div>
                )}

                {/* Errors */}
                {result.metrics.errors > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-800">
                      <XCircle className="h-5 w-5" />
                      <span className="font-medium">{result.metrics.errors} erreur(s) rencontrée(s)</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{result.summary || 'Une erreur est survenue'}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ℹ️ Comment ça marche?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Le pipeline traite les emails en 4 étapes:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>📧 <strong>Fetch</strong> - Récupère les emails non traités</li>
            <li>✍️ <strong>Parse</strong> - Extrait signatures (nom, email, téléphone, société)</li>
            <li>🎯 <strong>Detect</strong> - Détecte l'intention (rendez-vous, devis, relance, etc.)</li>
            <li>✅ <strong>Apply</strong> - Applique automatiquement si confiance ≥ {(threshold * 100).toFixed(0)}%</li>
          </ol>
          <p className="pt-2">
            💡 <strong>Astuce:</strong> Pour production, configurez le cron job sur Hetzner pour exécuter toutes les heures.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
