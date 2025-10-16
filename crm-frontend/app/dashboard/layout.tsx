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
import { Loader2 } from 'lucide-react'

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
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={isSidebarOpen} />

      {/* Main Content Area */}
      <div
        className={`flex flex-col min-h-screen transition-all duration-200 ${
          isSidebarOpen ? 'ml-64' : 'ml-16'
        }`}
      >
        {/* Top Navbar */}
        <Navbar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-50 pt-16">
          <div className="dashboard-content animate-fadeIn">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  )
}
