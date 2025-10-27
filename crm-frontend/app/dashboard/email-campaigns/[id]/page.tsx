"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Mail,
  Users,
  Send,
  Eye,
  Pause,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";

interface Campaign {
  id: number;
  name: string;
  description?: string;
  status: "draft" | "scheduled" | "sending" | "completed" | "paused" | "cancelled";
  total_recipients: number;
  emails_sent: number;
  emails_failed: number;
  emails_opened: number;
  emails_clicked: number;
  batch_size: number;
  delay_between_batches: number;
  created_at: string;
  scheduled_at?: string;
  template: {
    id: number;
    name: string;
    subject: string;
  };
}

interface EmailPreview {
  recipient: {
    id: number;
    type: string;
    name: string;
    email: string;
    personalization_data: Record<string, any>;
  };
  subject: string;
  body_html: string;
  body_text?: string;
}

const STATUS_COLORS = {
  draft: "bg-gray-500",
  scheduled: "bg-blue-500",
  sending: "bg-yellow-500",
  completed: "bg-green-500",
  paused: "bg-orange-500",
  cancelled: "bg-red-500",
};

const STATUS_LABELS = {
  draft: "Brouillon",
  scheduled: "Planifiée",
  sending: "En cours",
  completed: "Terminée",
  paused: "En pause",
  cancelled: "Annulée",
};

export default function EmailCampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const campaignId = parseInt(params.id as string);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  // Preview
  const [previews, setPreviews] = useState<EmailPreview[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [totalPreviews, setTotalPreviews] = useState(0);
  const [previewPage, setPreviewPage] = useState(1);
  const [loadingPreviews, setLoadingPreviews] = useState(false);

  useEffect(() => {
    fetchCampaign();
  }, [campaignId]);

  const fetchCampaign = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/v1/email/campaigns/${campaignId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCampaign(data);
      } else {
        toast({
          title: "Erreur",
          description: "Campagne introuvable",
          variant: "destructive",
        });
        router.back();
      }
    } catch (error) {
      console.error("Error fetching campaign:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la campagne",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviews = async (page: number = 1) => {
    setLoadingPreviews(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/email/campaigns/campaigns/${campaignId}/preview?page=${page}&page_size=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPreviews(data.previews);
        setTotalPreviews(data.total);
        setCurrentPreviewIndex(0);
        setPreviewPage(page);
      }
    } catch (error) {
      console.error("Error fetching previews:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les prévisualisations",
        variant: "destructive",
      });
    } finally {
      setLoadingPreviews(false);
    }
  };

  const handlePrepareCampaign = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/email/campaigns/campaigns/${campaignId}/prepare`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Succès",
          description: `${data.emails_prepared} emails préparés`,
        });
        fetchCampaign();
      } else {
        const error = await response.json();
        toast({
          title: "Erreur",
          description: error.detail || "Impossible de préparer la campagne",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error preparing campaign:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  const handleStartCampaign = async () => {
    toast({
      title: "Fonction à implémenter",
      description: "Le démarrage de la campagne sera disponible prochainement",
    });
  };

  const calculateOpenRate = () => {
    if (!campaign || campaign.emails_sent === 0) return 0;
    return ((campaign.emails_opened / campaign.emails_sent) * 100).toFixed(1);
  };

  const calculateClickRate = () => {
    if (!campaign || campaign.emails_sent === 0) return 0;
    return ((campaign.emails_clicked / campaign.emails_sent) * 100).toFixed(1);
  };

  const calculateFailureRate = () => {
    if (!campaign || campaign.total_recipients === 0) return 0;
    return ((campaign.emails_failed / campaign.total_recipients) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  const currentPreview = previews[currentPreviewIndex];
  const totalPages = Math.ceil(totalPreviews / 10);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{campaign.name}</h1>
              <Badge className={STATUS_COLORS[campaign.status]}>{STATUS_LABELS[campaign.status]}</Badge>
            </div>
            {campaign.description && (
              <p className="text-muted-foreground mt-1">{campaign.description}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {campaign.status === "draft" && (
            <>
              <Button variant="outline" onClick={() => fetchPreviews()}>
                <Eye className="h-4 w-4 mr-2" />
                Prévisualiser
              </Button>
              <Button onClick={handlePrepareCampaign}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Préparer
              </Button>
            </>
          )}
          {campaign.status === "scheduled" && (
            <Button onClick={handleStartCampaign}>
              <Send className="h-4 w-4 mr-2" />
              Démarrer
            </Button>
          )}
          {campaign.status === "sending" && (
            <Button variant="outline">
              <Pause className="h-4 w-4 mr-2" />
              Mettre en pause
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Destinataires</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.total_recipients}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Envoyés</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.emails_sent}</div>
            <p className="text-xs text-muted-foreground">
              {campaign.total_recipients > 0
                ? `${((campaign.emails_sent / campaign.total_recipients) * 100).toFixed(0)}%`
                : "0%"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux d'ouverture</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateOpenRate()}%</div>
            <p className="text-xs text-muted-foreground">{campaign.emails_opened} ouvertures</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de clic</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateClickRate()}%</div>
            <p className="text-xs text-muted-foreground">{campaign.emails_clicked} clics</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Échecs</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{campaign.emails_failed}</div>
            <p className="text-xs text-muted-foreground">{calculateFailureRate()}% d'échec</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="preview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="preview">Prévisualisation</TabsTrigger>
          <TabsTrigger value="details">Détails</TabsTrigger>
          <TabsTrigger value="sends">Envois</TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          {previews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-4">
                  Aucune prévisualisation chargée
                </p>
                <Button onClick={() => fetchPreviews()}>
                  <Eye className="h-4 w-4 mr-2" />
                  Charger les prévisualisations
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Preview navigation */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Prévisualisation des emails</CardTitle>
                      <CardDescription>
                        Email {currentPreviewIndex + 1 + (previewPage - 1) * 10} sur {totalPreviews}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (currentPreviewIndex > 0) {
                            setCurrentPreviewIndex(currentPreviewIndex - 1);
                          } else if (previewPage > 1) {
                            fetchPreviews(previewPage - 1);
                          }
                        }}
                        disabled={previewPage === 1 && currentPreviewIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {previewPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (currentPreviewIndex < previews.length - 1) {
                            setCurrentPreviewIndex(currentPreviewIndex + 1);
                          } else if (previewPage < totalPages) {
                            fetchPreviews(previewPage + 1);
                          }
                        }}
                        disabled={previewPage === totalPages && currentPreviewIndex === previews.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentPreview && (
                    <>
                      {/* Recipient info */}
                      <div className="bg-muted p-4 rounded-lg space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-muted-foreground">Destinataire:</div>
                          <div className="font-medium">{currentPreview.recipient.name}</div>

                          <div className="text-muted-foreground">Email:</div>
                          <div className="font-medium">{currentPreview.recipient.email}</div>

                          <div className="text-muted-foreground">Type:</div>
                          <div className="font-medium capitalize">{currentPreview.recipient.type}</div>
                        </div>
                      </div>

                      {/* Email subject */}
                      <div>
                        <Label className="text-sm font-medium">Sujet</Label>
                        <div className="mt-1 p-3 bg-muted rounded">{currentPreview.subject}</div>
                      </div>

                      {/* Email preview */}
                      <div>
                        <Label className="text-sm font-medium">Corps de l'email</Label>
                        <div
                          className="mt-1 p-4 bg-white border rounded-lg overflow-auto max-h-96"
                          dangerouslySetInnerHTML={{ __html: currentPreview.body_html }}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Détails de la campagne</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Template</div>
                  <div className="font-medium">{campaign.template.name}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Taille des lots</div>
                  <div className="font-medium">{campaign.batch_size} emails</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Délai entre les lots</div>
                  <div className="font-medium">{campaign.delay_between_batches} secondes</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Nombre de lots</div>
                  <div className="font-medium">
                    {Math.ceil(campaign.total_recipients / campaign.batch_size)}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Date de création</div>
                  <div className="font-medium">
                    {new Date(campaign.created_at).toLocaleString("fr-FR")}
                  </div>
                </div>

                {campaign.scheduled_at && (
                  <div>
                    <div className="text-sm text-muted-foreground">Planifiée pour</div>
                    <div className="font-medium">
                      {new Date(campaign.scheduled_at).toLocaleString("fr-FR")}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sends Tab */}
        <TabsContent value="sends">
          <Card>
            <CardHeader>
              <CardTitle>Liste des envois</CardTitle>
              <CardDescription>Détail de chaque email envoyé</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Fonctionnalité à implémenter
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm font-medium ${className || ""}`}>{children}</div>;
}
