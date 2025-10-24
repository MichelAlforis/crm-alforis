"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Mail, Edit, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useConfirm } from "@/hooks/useConfirm";

interface Template {
  id: number;
  name: string;
  subject: string;
  body_html: string;
  body_text?: string;
  variables: string[];
  created_at: string;
  updated_at?: string;
}

export default function EmailTemplatesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirm();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [bodyText, setBodyText] = useState("");

  useEffect(() => {
    fetchTemplates();
  }, []);

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
      toast({
        title: "Erreur",
        description: "Impossible de charger les templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!name || !subject || !bodyHtml) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/v1/email/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          subject,
          body_html: bodyHtml,
          body_text: bodyText || null,
        }),
      });

      if (response.ok) {
        toast({
          title: "Succès",
          description: "Template créé avec succès",
        });
        setShowCreateDialog(false);
        resetForm();
        fetchTemplates();
      } else {
        const error = await response.json();
        toast({
          title: "Erreur",
          description: error.detail || "Impossible de créer le template",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating template:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    confirm({
      title: "Supprimer le template",
      message: "Voulez-vous vraiment supprimer ce template ? Cette action est irréversible.",
      type: "danger",
      confirmText: "Supprimer",
      cancelText: "Annuler",
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(`/email/campaigns/templates/${id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            toast({
              title: "Succès",
              description: "Template supprimé",
            });
            fetchTemplates();
          } else {
            toast({
              title: "Erreur",
              description: "Impossible de supprimer le template",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error deleting template:", error);
          toast({
            title: "Erreur",
            description: "Une erreur est survenue",
            variant: "destructive",
          });
        }
      },
    });
  };

  const resetForm = () => {
    setName("");
    setSubject("");
    setBodyHtml("");
    setBodyText("");
  };

  const handlePreview = (template: Template) => {
    setPreviewTemplate(template);
    setShowPreviewDialog(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Templates d'Email</h1>
          <p className="text-muted-foreground">
            Créez et gérez vos templates d'emails réutilisables
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un nouveau template</DialogTitle>
              <DialogDescription>
                Les variables sont automatiquement détectées (format: {`{{variable}}`})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nom du template *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Newsletter mensuelle"
                />
              </div>

              <div>
                <Label htmlFor="subject">Sujet de l'email *</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Bonjour {{first_name}}, voici notre newsletter"
                />
              </div>

              <div>
                <Label htmlFor="body_html">Corps de l'email (HTML) *</Label>
                <Textarea
                  id="body_html"
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  placeholder={`<p>Bonjour {{first_name}},</p>\n<p>Nous sommes ravis de vous présenter...</p>`}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="body_text">Version texte (optionnel)</Label>
                <Textarea
                  id="body_text"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="Version texte brut de l'email"
                  rows={5}
                />
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Variables disponibles</h4>
                <div className="text-sm space-y-1">
                  <p className="text-muted-foreground">Pour les contacts :</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{`{{first_name}}`}</Badge>
                    <Badge variant="outline">{`{{last_name}}`}</Badge>
                    <Badge variant="outline">{`{{full_name}}`}</Badge>
                    <Badge variant="outline">{`{{email}}`}</Badge>
                    <Badge variant="outline">{`{{language}}`}</Badge>
                    <Badge variant="outline">{`{{organisation_name}}`}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-3">Pour les organisations :</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{`{{organisation_name}}`}</Badge>
                    <Badge variant="outline">{`{{organisation_email}}`}</Badge>
                    <Badge variant="outline">{`{{organisation_country}}`}</Badge>
                    <Badge variant="outline">{`{{organisation_city}}`}</Badge>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateTemplate}>Créer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            Chargement...
          </div>
        ) : templates.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-4">Aucun template pour le moment</p>
            <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
              Créer votre premier template
            </Button>
          </div>
        ) : (
          templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {template.subject}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Variables */}
                  {template.variables.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Variables</div>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.slice(0, 3).map((variable) => (
                          <Badge key={variable} variant="secondary" className="text-xs">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                        {template.variables.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{template.variables.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Date */}
                  <div className="text-xs text-muted-foreground">
                    Créé le {new Date(template.created_at).toLocaleDateString("fr-FR")}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handlePreview(template)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Voir
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
            <DialogDescription>Prévisualisation du template</DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div>
                <Label>Sujet</Label>
                <div className="mt-1 p-3 bg-muted rounded">{previewTemplate.subject}</div>
              </div>

              {previewTemplate.variables.length > 0 && (
                <div>
                  <Label>Variables utilisées</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {previewTemplate.variables.map((variable) => (
                      <Badge key={variable} variant="secondary">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Aperçu HTML</Label>
                <div
                  className="mt-1 p-4 bg-white border rounded-lg overflow-auto"
                  dangerouslySetInnerHTML={{ __html: previewTemplate.body_html }}
                />
              </div>

              {previewTemplate.body_text && (
                <div>
                  <Label>Version texte</Label>
                  <div className="mt-1 p-3 bg-muted rounded whitespace-pre-wrap font-mono text-sm">
                    {previewTemplate.body_text}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmDialogComponent />
    </div>
  );
}
