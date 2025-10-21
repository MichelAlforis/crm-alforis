"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Mail, Users, Filter, Eye, Send } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { Badge } from "@/components/ui/badge";

interface Template {
  id: number;
  name: string;
  subject: string;
  body_html: string;
  variables: string[];
}

interface RecipientFilters {
  target_type: "organisations" | "contacts";
  languages: string[];
  countries: string[];
  organisation_categories: string[];
  specific_ids: number[];
  exclude_ids: number[];
}

const LANGUAGES = [
  { code: "FR", label: "Français" },
  { code: "EN", label: "English" },
  { code: "DE", label: "Deutsch" },
  { code: "ES", label: "Español" },
  { code: "IT", label: "Italiano" },
];

const COUNTRIES = [
  { code: "FR", label: "France" },
  { code: "LU", label: "Luxembourg" },
  { code: "BE", label: "Belgique" },
  { code: "CH", label: "Suisse" },
  { code: "DE", label: "Allemagne" },
  { code: "GB", label: "Royaume-Uni" },
  { code: "ES", label: "Espagne" },
  { code: "IT", label: "Italie" },
];

const ORG_CATEGORIES = [
  { code: "BANK", label: "Banque" },
  { code: "ASSET_MANAGER", label: "Asset Manager" },
  { code: "INSURANCE", label: "Assurance" },
  { code: "PENSION_FUND", label: "Fonds de Pension" },
  { code: "FAMILY_OFFICE", label: "Family Office" },
  { code: "INVESTMENT_FUND", label: "Fonds d'Investissement" },
  { code: "OTHER", label: "Autre" },
];

export default function NewEmailCampaignPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<Template[]>([]);

  // Form data
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [batchSize, setBatchSize] = useState(600);
  const [delayBetweenBatches, setDelayBetweenBatches] = useState(60);

  // Recipient filters
  const [targetType, setTargetType] = useState<"organisations" | "contacts">("contacts");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Preview
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    // Calculer le nombre de destinataires quand les filtres changent
    if (step === 2) {
      fetchRecipientCount();
    }
  }, [targetType, selectedLanguages, selectedCountries, selectedCategories, step]);

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/v1/email/templates", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const fetchRecipientCount = async () => {
    setLoadingCount(true);
    try {
      const token = localStorage.getItem("token");

      const filters: RecipientFilters = {
        target_type: targetType,
        languages: selectedLanguages,
        countries: selectedCountries,
        organisation_categories: selectedCategories,
        specific_ids: [],
        exclude_ids: [],
      };

      const response = await fetch("/api/v1/email-campaigns/recipients/count", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(filters),
      });

      if (response.ok) {
        const data = await response.json();
        setRecipientCount(data.count);
      }
    } catch (error) {
      console.error("Error fetching recipient count:", error);
    } finally {
      setLoadingCount(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!name || !templateId) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const campaignData = {
        name,
        description,
        template_id: templateId,
        recipient_filters: {
          target_type: targetType,
          languages: selectedLanguages,
          countries: selectedCountries,
          organisation_categories: selectedCategories,
          specific_ids: [],
          exclude_ids: [],
        },
        batch_size: batchSize,
        delay_between_batches: delayBetweenBatches,
      };

      const response = await fetch("/api/v1/email/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(campaignData),
      });

      if (response.ok) {
        const campaign = await response.json();
        toast({
          title: "Succès",
          description: "Campagne créée avec succès",
        });
        router.push(`/dashboard/email-campaigns/${campaign.id}`);
      } else {
        const error = await response.json();
        toast({
          title: "Erreur",
          description: error.detail || "Impossible de créer la campagne",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  const toggleLanguage = (code: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleCountry = (code: string) => {
    setSelectedCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleCategory = (code: string) => {
    setSelectedCategories((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Nouvelle Campagne Email</h1>
        <p className="text-muted-foreground">Créez une nouvelle campagne d'emailing</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center gap-4">
          <div className={`flex items-center ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 1 ? "bg-primary text-white" : "bg-muted"
              }`}
            >
              1
            </div>
            <span className="ml-2">Informations</span>
          </div>
          <div className="w-16 h-0.5 bg-muted" />
          <div className={`flex items-center ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 2 ? "bg-primary text-white" : "bg-muted"
              }`}
            >
              2
            </div>
            <span className="ml-2">Destinataires</span>
          </div>
          <div className="w-16 h-0.5 bg-muted" />
          <div className={`flex items-center ${step >= 3 ? "text-primary" : "text-muted-foreground"}`}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 3 ? "bg-primary text-white" : "bg-muted"
              }`}
            >
              3
            </div>
            <span className="ml-2">Configuration</span>
          </div>
        </div>
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Informations de base</CardTitle>
            <CardDescription>Nommez votre campagne et choisissez un template</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nom de la campagne *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Newsletter Janvier 2025"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description de la campagne..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="template">Template d'email *</Label>
              <Select value={templateId?.toString()} onValueChange={(v) => setTemplateId(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(2)} disabled={!name || !templateId}>
                Suivant
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Recipients */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Sélection des destinataires
            </CardTitle>
            <CardDescription>Choisissez qui recevra cette campagne</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Target type */}
            <div>
              <Label>Type de destinataires</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <Button
                  variant={targetType === "organisations" ? "default" : "outline"}
                  onClick={() => setTargetType("organisations")}
                  className="h-auto py-4"
                >
                  <div className="text-center">
                    <Mail className="h-6 w-6 mx-auto mb-2" />
                    <div className="font-semibold">Organisations</div>
                    <div className="text-xs opacity-70">Email principal de l'organisation</div>
                  </div>
                </Button>
                <Button
                  variant={targetType === "contacts" ? "default" : "outline"}
                  onClick={() => setTargetType("contacts")}
                  className="h-auto py-4"
                >
                  <div className="text-center">
                    <Users className="h-6 w-6 mx-auto mb-2" />
                    <div className="font-semibold">Contacts Principaux</div>
                    <div className="text-xs opacity-70">Contact principal de chaque organisation</div>
                  </div>
                </Button>
              </div>
            </div>

            {/* Languages (only for contacts) */}
            {targetType === "contacts" && (
              <div>
                <Label>Langues</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {LANGUAGES.map((lang) => (
                    <Badge
                      key={lang.code}
                      variant={selectedLanguages.includes(lang.code) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleLanguage(lang.code)}
                    >
                      {lang.label}
                    </Badge>
                  ))}
                </div>
                {selectedLanguages.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Toutes les langues</p>
                )}
              </div>
            )}

            {/* Countries */}
            <div>
              <Label>Pays</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {COUNTRIES.map((country) => (
                  <Badge
                    key={country.code}
                    variant={selectedCountries.includes(country.code) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleCountry(country.code)}
                  >
                    {country.label}
                  </Badge>
                ))}
              </div>
              {selectedCountries.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">Tous les pays</p>
              )}
            </div>

            {/* Organisation categories */}
            <div>
              <Label>Catégories d'organisations</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {ORG_CATEGORIES.map((cat) => (
                  <Badge
                    key={cat.code}
                    variant={selectedCategories.includes(cat.code) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleCategory(cat.code)}
                  >
                    {cat.label}
                  </Badge>
                ))}
              </div>
              {selectedCategories.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">Toutes les catégories</p>
              )}
            </div>

            {/* Recipient count */}
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Destinataires trouvés</div>
                  <div className="text-sm text-muted-foreground">
                    Nombre total de destinataires correspondant aux critères
                  </div>
                </div>
                <div className="text-3xl font-bold">
                  {loadingCount ? "..." : recipientCount ?? 0}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Précédent
              </Button>
              <Button onClick={() => setStep(3)} disabled={recipientCount === 0}>
                Suivant
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Configuration */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Configuration d'envoi</CardTitle>
            <CardDescription>Configurez les paramètres d'envoi par lots</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="batch_size">Taille des lots (batch size)</Label>
              <Input
                id="batch_size"
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value))}
                min={1}
                max={1000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nombre d'emails envoyés par lot (recommandé: 600)
              </p>
            </div>

            <div>
              <Label htmlFor="delay">Délai entre les lots (secondes)</Label>
              <Input
                id="delay"
                type="number"
                value={delayBetweenBatches}
                onChange={(e) => setDelayBetweenBatches(parseInt(e.target.value))}
                min={0}
                max={3600}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Temps d'attente entre chaque lot (recommandé: 60s)
              </p>
            </div>

            {/* Summary */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-semibold mb-2">Résumé</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Campagne:</div>
                <div className="font-medium">{name}</div>

                <div className="text-muted-foreground">Destinataires:</div>
                <div className="font-medium">{recipientCount}</div>

                <div className="text-muted-foreground">Type:</div>
                <div className="font-medium">
                  {targetType === "organisations" ? "Organisations" : "Contacts Principaux"}
                </div>

                <div className="text-muted-foreground">Nombre de lots:</div>
                <div className="font-medium">
                  {recipientCount ? Math.ceil(recipientCount / batchSize) : 0}
                </div>

                <div className="text-muted-foreground">Durée estimée:</div>
                <div className="font-medium">
                  {recipientCount
                    ? `~${Math.ceil((recipientCount / batchSize) * delayBetweenBatches / 60)} min`
                    : "0 min"}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                Précédent
              </Button>
              <Button onClick={handleCreateCampaign}>
                <Send className="h-4 w-4 mr-2" />
                Créer la campagne
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
