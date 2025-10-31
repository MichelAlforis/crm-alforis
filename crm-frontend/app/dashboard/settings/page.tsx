'use client'

import { logger } from '@/lib/logger'
import { storage, PREFERENCES_STORAGE_KEYS } from "@/lib/constants"
import { useState } from 'react'
import { Shield } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import { apiClient } from '@/lib/api'
import { useSidebar } from '@/hooks/useSidebar'
import { SIDEBAR_SECTIONS } from '@/config/sidebar.config'
import { useSecurityEvents } from '@/hooks/useSettingsData'
import { usePushNotifications } from '@/hooks/usePushNotifications'

// Composants extraits
import { ProfileSection } from '@/components/settings/ProfileSection'
import { NewsletterCard } from '@/components/settings/NewsletterCard'
import { PushNotificationsSection } from '@/components/settings/PushNotificationsSection'
import { NotificationsSection } from '@/components/settings/NotificationsSection'
import { SecuritySection } from '@/components/settings/SecuritySection'
import { AppearanceSection } from '@/components/settings/AppearanceSection'
import { SidebarCustomizationSection } from '@/components/settings/SidebarCustomizationSection'
import { RGPDSection } from '@/components/settings/RGPDSection'
import { SecurityLogSection } from '@/components/settings/SecurityLogSection'
import { EditProfileModal } from '@/components/settings/EditProfileModal'
import { NewsletterModal } from '@/components/settings/NewsletterModal'

type NotificationOptionKey =
  | 'dailyDigest'
  | 'taskReminders'
  | 'investorUpdates'
  | 'calendarSync'

type SecurityOptionKey = 'twoFactor' | 'loginAlerts'

export default function SettingsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const sidebar = useSidebar(SIDEBAR_SECTIONS)
  const securityEvents = useSecurityEvents()
  const {
    permission: pushPermission,
    isSubscribed: isPushSubscribed,
    isLoading: isPushLoading,
    error: pushError,
    subscribe: subscribeToPush,
    unsubscribe: unsubscribeFromPush,
  } = usePushNotifications()

  // États locaux
  const [notificationOptions, setNotificationOptions] = useState<
    Record<NotificationOptionKey, boolean>
  >({
    dailyDigest: true,
    taskReminders: true,
    investorUpdates: false,
    calendarSync: false,
  })
  const [securityOptions, setSecurityOptions] = useState<
    Record<SecurityOptionKey, boolean>
  >({
    twoFactor: false,
    loginAlerts: true,
  })
  const [preferredTheme, setPreferredTheme] = useState<
    'system' | 'clair' | 'sombre'
  >('system')

  // Modals state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  const [showNewsletterModal, setShowNewsletterModal] = useState(false)

  // Handlers
  const toggleNotification = (key: NotificationOptionKey) => {
    setNotificationOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const toggleSecurity = (key: SecurityOptionKey) => {
    setSecurityOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleConfigureSecurity = () => {
    showToast({
      type: 'info',
      title: 'En développement',
      message: 'La configuration avancée de la sécurité sera disponible prochainement.',
    })
  }

  const handleResetTheme = () => {
    setPreferredTheme('system')
    storage.remove(PREFERENCES_STORAGE_KEYS.THEME)
    showToast({
      type: 'success',
      title: 'Thème réinitialisé',
      message: 'Le thème a été réinitialisé aux valeurs par défaut.',
    })
  }

  const handleSaveTheme = () => {
    storage.set(PREFERENCES_STORAGE_KEYS.THEME, preferredTheme)
    showToast({
      type: 'success',
      title: 'Préférences enregistrées',
      message: `Votre thème "${preferredTheme}" a été sauvegardé.`,
    })
  }

  const handleDownloadSecurityLog = () => {
    const csvContent = [
      'Événement,Détails,Horodatage',
      ...securityEvents.map(
        (event) => `"${event.context}","${event.detail}","${event.time}"`
      ),
    ].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `security_log_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleNewsletterSubmit = async (email: string) => {
    if (!email) {
      showToast({
        type: 'warning',
        title: 'Email requis',
        message: 'Veuillez entrer une adresse email valide.',
      })
      return
    }

    // Simuler un délai réseau
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setShowNewsletterModal(false)
    showToast({
      type: 'success',
      title: 'Inscription réussie',
      message: 'Vous recevrez désormais les actualités du CRM.',
    })
  }

  const handleSaveProfile = async (data: { fullName: string; currentPassword: string; newPassword: string }) => {
    // Validation
    if (data.newPassword && data.newPassword.length < 6) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: 'Le mot de passe doit contenir au moins 6 caractères.',
      })
      throw new Error('Password too short')
    }

    if (data.newPassword && !data.currentPassword) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: 'Veuillez entrer votre mot de passe actuel.',
      })
      throw new Error('Current password required')
    }

    try {
      // Mettre à jour le mot de passe si demandé
      if (data.newPassword && data.currentPassword) {
        await apiClient.changePassword({
          current_password: data.currentPassword,
          new_password: data.newPassword,
        })
      }

      // Mettre à jour le nom si modifié
      if (data.fullName && data.fullName.trim()) {
        await apiClient.updateProfile({ full_name: data.fullName })
      }

      showToast({
        type: 'success',
        title: 'Profil mis à jour',
        message: 'Vos modifications ont été enregistrées avec succès.',
      })

      setShowEditProfileModal(false)
    } catch (error: any) {
      logger.error('Erreur lors de la mise à jour du profil:', error)
      showToast({
        type: 'error',
        title: 'Erreur',
        message: error?.detail || 'Impossible de mettre à jour le profil.',
      })
      throw error
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      <header className="flex flex-col gap-2">
        <span className="inline-flex items-center gap-2 self-start rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-600">
          <Shield className="h-3.5 w-3.5" />
          Paramètres Généraux
        </span>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Profil & Préférences</h1>
        <p className="text-gray-600 dark:text-slate-400 max-w-2xl">
          Gérez votre profil, notifications, sécurité et personnalisez l&apos;apparence de votre CRM.
        </p>
      </header>

      {/* Section Profil & Newsletter */}
      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <ProfileSection
          userEmail={user?.email}
          onEditProfile={() => setShowEditProfileModal(true)}
        />
        <NewsletterCard onSubscribe={() => setShowNewsletterModal(true)} />
      </section>

      {/* Section Push Notifications */}
      <PushNotificationsSection
        isPushSubscribed={isPushSubscribed}
        pushPermission={pushPermission}
        isPushLoading={isPushLoading}
        pushError={pushError}
        onSubscribe={subscribeToPush}
        onUnsubscribe={unsubscribeFromPush}
        onShowToast={showToast}
      />

      {/* Section Notifications & Sécurité */}
      <section className="grid gap-6 lg:grid-cols-2">
        <NotificationsSection
          notificationOptions={notificationOptions}
          onToggle={toggleNotification}
        />
        <SecuritySection
          securityOptions={securityOptions}
          onToggle={toggleSecurity}
          onConfigure={handleConfigureSecurity}
        />
      </section>

      {/* Section Apparence */}
      <AppearanceSection
        preferredTheme={preferredTheme}
        onThemeChange={setPreferredTheme}
        onReset={handleResetTheme}
        onSave={handleSaveTheme}
      />

      {/* Section Sidebar Customization */}
      <SidebarCustomizationSection
        sections={SIDEBAR_SECTIONS}
        isSectionHidden={sidebar.isSectionHidden}
        isFavorite={sidebar.isFavorite}
        toggleSectionVisibility={sidebar.toggleSectionVisibility}
        hiddenSections={sidebar.hiddenSections}
        favorites={sidebar.favorites}
        onShowToast={showToast}
      />

      {/* Section RGPD */}
      <RGPDSection isAdmin={user?.is_admin} />

      {/* Section Journal de sécurité */}
      <SecurityLogSection
        securityEvents={securityEvents}
        onDownloadLog={handleDownloadSecurityLog}
      />

      {/* Modals */}
      <EditProfileModal
        isOpen={showEditProfileModal}
        userName={user?.name}
        onClose={() => setShowEditProfileModal(false)}
        onSave={handleSaveProfile}
      />
      <NewsletterModal
        isOpen={showNewsletterModal}
        defaultEmail={user?.email || ''}
        onClose={() => setShowNewsletterModal(false)}
        onSubscribe={handleNewsletterSubmit}
      />
    </div>
  )
}
