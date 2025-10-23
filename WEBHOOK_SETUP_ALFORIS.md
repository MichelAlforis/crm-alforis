# Configuration Webhooks CRM → alforis.fr

## 📋 Résumé

Ce document explique comment configurer les webhooks entre **Resend**, votre **site web alforis.fr** et le **CRM** pour :
1. Recevoir les événements Resend (ouvertures, clics, rebonds, etc.)
2. Gérer les désabonnements depuis le site web

---

## 🔐 Clé API CRM (WEBHOOK_SECRET)

**Clé générée** : `24TznbWkGUmfbdAAlzqee6aRtbswy5q3ZTAuxdmI4MI=`

### Où l'ajouter ?

#### 1. Sur le serveur alforis.fr

Ajouter dans `/root/alforis/.env.local` :

```bash
# CRM Webhook Secret (pour authentifier les requêtes vers crm.alforis.fr)
CRM_WEBHOOK_SECRET=24TznbWkGUmfbdAAlzqee6aRtbswy5q3ZTAuxdmI4MI=
CRM_API_URL=https://crm.alforis.fr/api/v1
```

#### 2. Redémarrer PM2

```bash
cd /root/alforis
pm2 restart alforis-site --update-env
pm2 logs alforis-site --lines 50
```

---

## 📥 Endpoints CRM créés

### 1. POST `/api/v1/webhooks/resend`

**URL complète** : `https://crm.alforis.fr/api/v1/webhooks/resend`

**Authentification** : Header `Authorization: Bearer 24TznbWkGUmfbdAAlzqee6aRtbswy5q3ZTAuxdmI4MI=`

**Body JSON** :
```json
{
  "event_type": "email.delivered",
  "status": "delivered",
  "email_id": "abc123xyz",
  "to": "contact@example.com",
  "from": "no-reply@alforis.fr",
  "subject": "Votre rendez-vous",
  "timestamp": "2025-10-23T15:30:00Z",
  "created_at": "2025-10-23T15:29:55Z",
  "data": {
    // Payload complet de Resend
  }
}
```

**Les 9 événements supportés** :
- `email.sent` → PROCESSED
- `email.delivered` → DELIVERED
- `email.delivery_delayed` → DEFERRED
- `email.failed` → DROPPED
- `email.bounced` → BOUNCED
- `email.opened` → OPENED ⭐
- `email.clicked` → CLICKED ⭐
- `email.complained` → SPAM_REPORT
- `email.scheduled` → PROCESSED

**Réponse** :
```json
{
  "success": true,
  "message": "Event recorded successfully",
  "event_id": 123
}
```

---

### 2. POST `/api/v1/webhooks/unsubscribe`

**URL complète** : `https://crm.alforis.fr/api/v1/webhooks/unsubscribe`

**Authentification** : Header `Authorization: Bearer 24TznbWkGUmfbdAAlzqee6aRtbswy5q3ZTAuxdmI4MI=`

**Body JSON** :
```json
{
  "email": "contact@example.com",
  "unsubscribed_at": "2025-10-23T15:30:00Z",
  "source": "web",
  "reason": "Ne souhaite plus recevoir de newsletters"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Email contact@example.com successfully unsubscribed",
  "email": "contact@example.com"
}
```

**Actions effectuées** :
1. Ajout à la table `unsubscribed_emails` (liste noire globale)
2. Mise à jour `email_unsubscribed = TRUE` dans `people` et `organisations`
3. Aucun email ne sera plus envoyé à cet email

---

## 🔗 Configuration Resend

### 1. Ajouter le webhook dans Resend

URL du panneau : https://resend.com/webhooks

**Créer un nouveau webhook** :
- **Endpoint URL** : `https://www.alforis.fr/api/webhooks/resend` ✅ (déjà configuré)
- **Secret** : `whsec_F0X3iqLtkpKVOVzet5smD5vjWAv4zHVM` ✅
- **Events** : Cocher tous les événements :
  - `email.sent`
  - `email.delivered`
  - `email.delivery_delayed`
  - `email.failed`
  - `email.bounced`
  - `email.opened` ⭐
  - `email.clicked` ⭐
  - `email.complained`

### 2. Récupérer le signing secret

✅ **Signing Secret Resend** : `whsec_F0X3iqLtkpKVOVzet5smD5vjWAv4zHVM`

**Déjà configuré dans `/root/alforis/.env.local`** :
```bash
RESEND_WEBHOOK_SECRET=whsec_F0X3iqLtkpKVOVzet5smD5vjWAv4zHVM
```

---

## 🚀 Implémentation sur alforis.fr

### Route à créer : `/api/webhook/resend` (POST)

**Fichier** : `/root/alforis/app/api/webhook/resend/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { svix } from '@svix/svix-js';

export async function POST(req: NextRequest) {
  try {
    // 1. Vérifier la signature Resend avec Svix
    const payload = await req.text();
    const headers = {
      'svix-id': req.headers.get('svix-id') || '',
      'svix-timestamp': req.headers.get('svix-timestamp') || '',
      'svix-signature': req.headers.get('svix-signature') || '',
    };

    const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET!);
    const event = wh.verify(payload, headers);

    // 2. Forwarder vers le CRM
    const crmResponse = await fetch(`${process.env.CRM_API_URL}/webhooks/resend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRM_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify({
        event_type: event.type,
        status: event.data.status || event.type.split('.')[1],
        email_id: event.data.email_id,
        to: event.data.to,
        from: event.data.from,
        subject: event.data.subject,
        timestamp: event.data.timestamp || new Date().toISOString(),
        created_at: event.data.created_at || new Date().toISOString(),
        data: event.data,
      }),
    });

    if (!crmResponse.ok) {
      console.error('CRM webhook error:', await crmResponse.text());
      return NextResponse.json({ error: 'CRM webhook failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resend webhook error:', error);
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 400 });
  }
}
```

---

### Route à créer : `/api/unsubscribe` (POST)

**Fichier** : `/root/alforis/app/api/unsubscribe/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // Envoyer au CRM
    const crmResponse = await fetch(`${process.env.CRM_API_URL}/webhooks/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRM_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify({
        email: email.toLowerCase(),
        unsubscribed_at: new Date().toISOString(),
        source: 'web',
        reason: null,
      }),
    });

    if (!crmResponse.ok) {
      console.error('CRM unsubscribe error:', await crmResponse.text());
      return NextResponse.json({ error: 'Unsubscribe failed' }, { status: 500 });
    }

    const result = await crmResponse.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

### Page de désabonnement : `/unsubscribe`

**Fichier** : `/root/alforis/app/unsubscribe/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [searchParams]);

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Échec du désabonnement');
      }

      setSuccess(true);
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">✅ Désabonnement réussi</h1>
        <p>Vous ne recevrez plus d'emails de notre part.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8 text-center">Se désabonner</h1>
      <form onSubmit={handleUnsubscribe} className="max-w-md mx-auto">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="votre@email.com"
          required
          className="w-full px-4 py-2 border rounded mb-4"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700"
        >
          {loading ? 'En cours...' : 'Me désabonner'}
        </button>
        {error && <p className="text-red-600 mt-4">{error}</p>}
      </form>
    </div>
  );
}
```

---

## ✅ Checklist de déploiement

### Sur le serveur alforis.fr

- [ ] Ajouter `CRM_WEBHOOK_SECRET` et `CRM_API_URL` dans `.env.local`
- [ ] Ajouter `RESEND_WEBHOOK_SECRET` dans `.env.local`
- [ ] Créer `/app/api/webhook/resend/route.ts`
- [ ] Créer `/app/api/unsubscribe/route.ts`
- [ ] Créer `/app/unsubscribe/page.tsx`
- [ ] Installer `@svix/svix-js` : `npm install @svix/svix-js`
- [ ] Redémarrer PM2 : `pm2 restart alforis-site --update-env`

### Dans Resend

- [ ] Aller sur https://resend.com/webhooks
- [ ] Créer un nouveau webhook pointant vers `https://alforis.fr/api/webhook/resend`
- [ ] Cocher tous les événements
- [ ] Copier le Signing Secret et l'ajouter dans `.env.local`

### Tests

- [ ] Envoyer un email test depuis le CRM
- [ ] Vérifier que les événements Resend arrivent dans le CRM
- [ ] Tester la page de désabonnement : `https://alforis.fr/unsubscribe?email=test@example.com`
- [ ] Vérifier que l'email est ajouté à la table `unsubscribed_emails` dans le CRM

---

## 📊 KPIs disponibles après configuration

Une fois configuré, vous pourrez suivre dans le CRM :

- **Taux de délivrabilité** : `delivered / sent`
- **Taux d'ouverture** : `opened / delivered`
- **Taux de clic (CTR)** : `clicked / delivered`
- **Taux de bounce** : `bounced / sent`
- **Taux de spam** : `complained / sent`

Ces statistiques seront calculées automatiquement pour chaque batch d'envoi et visible dans le dashboard des campagnes.

---

## 🔒 Sécurité

- ✅ Authentification Bearer Token pour tous les endpoints CRM
- ✅ Vérification de signature Svix pour les webhooks Resend
- ✅ Clé secrète stockée dans `.env.local` (non commitée)
- ✅ HTTPS obligatoire en production
- ✅ Rate limiting recommandé sur le proxy alforis.fr

---

## 📞 Support

En cas de problème, vérifier dans l'ordre :

1. **Logs du serveur alforis.fr** : `pm2 logs alforis-site`
2. **Logs du CRM** : `docker-compose logs api -f`
3. **Logs Resend** : https://resend.com/webhooks (onglet "Logs")
4. **Table `unsubscribed_emails`** : `SELECT * FROM unsubscribed_emails ORDER BY created_at DESC LIMIT 10;`
5. **Table `email_events`** : `SELECT * FROM email_events ORDER BY created_at DESC LIMIT 10;`
