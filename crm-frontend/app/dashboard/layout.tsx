/**
 * Dashboard Layout Component
 *
 * Main layout for authenticated dashboard pages
 * Features: Sidebar navigation, top navbar, content area
 * Uses centralized design system from styles/
 */
'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Navbar from '@/components/shared/Navbar'
import Sidebar from '@/components/shared/Sidebar'
import QueryProvider from '@/components/providers/QueryProvider'
import InstallPrompt from '@/components/pwa/InstallPrompt'
import OfflineIndicator from '@/components/pwa/OfflineIndicator'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

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
      <div className="dashboard-layout flex">
        {/* Sidebar Navigation */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Main Content Area */}
        <div
          className={clsx(
            'flex flex-col min-h-screen flex-1 transition-all duration-300 ease-in-out',
            'w-full lg:w-auto'
          )}
        >
          {/* Top Navbar */}
          <Navbar
            onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          />

          {/* Page Content */}
          <main className="flex-1 overflow-auto bg-gray-50">
            <div className="dashboard-content animate-fadeIn">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile Sidebar Backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden animate-in fade-in duration-200"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* PWA Components */}
        <InstallPrompt />
        <OfflineIndicator />
      </div>
    </QueryProvider>
  )
}
