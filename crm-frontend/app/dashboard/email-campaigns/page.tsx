"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Plus, Send, Users, TrendingUp, Clock } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { logger } from '@/lib/logger'

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
  created_at: string;
  scheduled_at?: string;
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

export default function EmailCampaignsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/v1/email/campaigns", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.items || []);
      }
    } catch (error) {
      logger.error("Error fetching campaigns:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les campagnes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateOpenRate = (campaign: Campaign) => {
    if (campaign.emails_sent === 0) return 0;
    return ((campaign.emails_opened / campaign.emails_sent) * 100).toFixed(1);
  };

  const calculateClickRate = (campaign: Campaign) => {
    if (campaign.emails_sent === 0) return 0;
    return ((campaign.emails_clicked / campaign.emails_sent) * 100).toFixed(1);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Campagnes Email</h1>
          <p className="text-muted-foreground">
            Gérez vos campagnes d'emailing et suivez leurs performances
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/email-campaigns/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Campagne
        </Button>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campagnes</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Envoyés</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.reduce((sum, c) => sum + c.emails_sent, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux d'Ouverture Moyen</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.length > 0
                ? (
                    campaigns.reduce(
                      (sum, c) => sum + (c.emails_sent > 0 ? (c.emails_opened / c.emails_sent) * 100 : 0),
                      0
                    ) / campaigns.filter((c) => c.emails_sent > 0).length
                  ).toFixed(1)
                : 0}
              %
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Clic Moyen</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.length > 0
                ? (
                    campaigns.reduce(
                      (sum, c) => sum + (c.emails_sent > 0 ? (c.emails_clicked / c.emails_sent) * 100 : 0),
                      0
                    ) / campaigns.filter((c) => c.emails_sent > 0).length
                  ).toFixed(1)
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des campagnes */}
      <Card>
        <CardHeader>
          <CardTitle>Campagnes</CardTitle>
          <CardDescription>Vos campagnes d'emailing récentes</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune campagne pour le moment</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/dashboard/email-campaigns/new")}
              >
                Créer votre première campagne
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/email-campaigns/${campaign.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{campaign.name}</h3>
                        <Badge className={STATUS_COLORS[campaign.status]}>
                          {STATUS_LABELS[campaign.status]}
                        </Badge>
                      </div>
                      {campaign.description && (
                        <p className="text-sm text-muted-foreground mb-3">{campaign.description}</p>
                      )}

                      {/* Statistiques */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Destinataires</div>
                          <div className="font-semibold">{campaign.total_recipients}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Envoyés</div>
                          <div className="font-semibold">{campaign.emails_sent}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Ouverts</div>
                          <div className="font-semibold">
                            {campaign.emails_opened} ({calculateOpenRate(campaign)}%)
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Cliqués</div>
                          <div className="font-semibold">
                            {campaign.emails_clicked} ({calculateClickRate(campaign)}%)
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Échecs</div>
                          <div className="font-semibold text-red-600">{campaign.emails_failed}</div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-sm text-muted-foreground">
                      {campaign.scheduled_at && (
                        <div className="flex items-center gap-1 mb-1">
                          <Clock className="h-3 w-3" />
                          {new Date(campaign.scheduled_at).toLocaleDateString("fr-FR")}
                        </div>
                      )}
                      <div>Créée le {new Date(campaign.created_at).toLocaleDateString("fr-FR")}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
