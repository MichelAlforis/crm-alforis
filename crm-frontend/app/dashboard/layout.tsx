/**
 * Dashboard Layout Component
 *
 * Main layout for authenticated dashboard pages
 * Features: Sidebar navigation, top navbar, content area
 * Uses centralized design system from styles/
 */
'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Navbar from '@/components/shared/Navbar'
import Sidebar from '@/components/shared/Sidebar'
import Footer from '@/components/shared/Footer'
import NavigationProgress from '@/components/shared/NavigationProgress'
import QueryProvider from '@/components/providers/QueryProvider'
import OfflineIndicator from '@/components/pwa/OfflineIndicator'
import { BannerManager } from '@/components/pwa/BannerManager'
import { OnboardingTour } from '@/components/onboarding/OnboardingTour'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Chargement
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Veuillez patienter...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Not authenticated - return null while redirecting
  if (!isAuthenticated) {
    return null
  }

  // Main dashboard layout
  return (
    <QueryProvider>
      <SidebarProvider>
        <OnboardingTour>
          {/* Global Navigation Progress Bar */}
          <NavigationProgress />

          <div className="dashboard-layout flex h-screen overflow-hidden">
            {/* Sidebar Navigation - Fixed, always visible */}
            <Sidebar />

            {/* Main Content Area - Scrollable */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
              {/* Top Navbar - Fixed at top */}
              <Navbar />

              {/* Page Content - Scrollable */}
              <main className="flex-1 bg-gray-50 overflow-y-auto">
                <div className="dashboard-content animate-fadeIn">
                  {children}
                </div>
              </main>

              {/* Footer - Scrolls with content */}
              <Footer />
            </div>

            {/* PWA Components */}
            <OfflineIndicator />
            <BannerManager />
          </div>
        </OnboardingTour>
      </SidebarProvider>
    </QueryProvider>
  )
}
