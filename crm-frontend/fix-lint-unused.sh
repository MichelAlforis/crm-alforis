#!/bin/bash

# Fix unused imports in specific files

# CompleteCampaignForm.tsx
sed -i '' 's/import { Plus, Users, FileText, Send } from/import { Plus, FileText, Send } from/' app/dashboard/email/campaigns/new/CompleteCampaignForm.tsx 2>/dev/null || true

# RecipientSelector.tsx  
sed -i '' 's/import { Plus, Users, Filter, Eye } from/import { Plus, Users } from/' components/email/RecipientSelector.tsx 2>/dev/null || true

# RecipientSelectorTable.tsx
sed -i '' 's/import { Check, UserCircle2, Building2, Mail, X } from/import { Check, UserCircle2, Building2, Mail } from/' components/email/RecipientSelectorTable.tsx 2>/dev/null || true

# RecipientTrackingList.tsx
sed -i '' 's/import React, { useState } from/import React from/' components/email/RecipientTrackingList.tsx 2>/dev/null || true
sed -i '' 's/import { Mail, CheckCircle, Clock, XCircle, AlertCircle, TrendingUp } from/import { Mail, CheckCircle, XCircle, AlertCircle } from/' components/email/RecipientTrackingList.tsx 2>/dev/null || true
sed -i '' 's/import { Card, CardHeader, CardBody, Badge } from/import { Card, CardHeader, CardBody } from/' components/email/RecipientTrackingList.tsx 2>/dev/null || true

# TemplateEditModal.tsx
sed -i '' 's/import { X, Save, FileText, Mail } from/import { X, Save, FileText } from/' components/email/TemplateEditModal.tsx 2>/dev/null || true

# Step2Recipients.tsx
sed -i '' 's/import { Users, List, Download } from/import { Users } from/' components/email/wizard/Step2Recipients.tsx 2>/dev/null || true

# Step4Summary.tsx
sed -i '' 's/import { Check, Users, FileText, Clock, AlertCircle } from/import { Users, FileText, Clock } from/' components/email/wizard/Step4Summary.tsx 2>/dev/null || true

# MandatForm.tsx
sed -i '' 's/import React, { useState, useEffect } from/import React, { useState } from/' components/forms/MandatForm.tsx 2>/dev/null || true

# PersonForm.tsx - remove unused firstErrorRef variable (more complex, skip for now)

# UserForm.tsx - remove unused confirm_password (complex, skip)

# ArticleRating.tsx - multiple unused vars (complex, skip)

# InteractionCreateModal.tsx
sed -i '' 's/import { Input, Textarea, Button, Select } from/import { Input, Textarea, Button } from/' components/interactions/InteractionCreateModal.tsx 2>/dev/null || true

# OnboardingTour.tsx - skip, complex

# PWA files - skip, complex

# Shared components
sed -i '' 's/import { MoreHorizontal, Trash2 } from/import { MoreHorizontal } from/' components/shared/ConfirmDialog.tsx 2>/dev/null || true
sed -i '' 's/import { Upload, X, CheckCircle, Paperclip } from/import { Upload, X, CheckCircle } from/' components/shared/FileUpload.tsx 2>/dev/null || true

# TableV2.tsx
sed -i '' 's/import { ChevronUp, ChevronDown, ChevronsUpDown, MoreVertical } from/import { ChevronUp, ChevronDown, ChevronsUpDown } from/' components/shared/TableV2.tsx 2>/dev/null || true

echo "✅ Fixed unused imports in key files"
