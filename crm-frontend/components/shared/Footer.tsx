/**
 * Footer Component - Compact with Hover Expansion
 *
 * Ultra-minimal footer that expands on hover to show legal links
 * Saves vertical space while keeping info accessible
 */
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ChevronUp, Shield, Lock, Server, FileCheck } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <footer
      className="relative bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-t border-gray-200/50 dark:border-slate-700/50 mt-auto transition-all duration-300 overflow-hidden"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Animated gradient line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300"
        style={{
          paddingTop: isExpanded ? '1rem' : '0.5rem',
          paddingBottom: isExpanded ? '1rem' : '0.5rem'
        }}
      >
        {/* Compact View - Always Visible */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">
              © {currentYear} <span className="font-semibold text-slate-700 dark:text-slate-300">ALFORIS FINANCE</span>
            </span>
            <span className="hidden sm:inline text-slate-400 dark:text-slate-500">•</span>
            <span className="hidden sm:inline text-slate-400 dark:text-slate-500 text-[10px]">
              SIREN: 943 007 229
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick badges - compact */}
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <Shield className="w-3 h-3" />
                <span className="text-[10px] font-medium">RGPD</span>
              </div>
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <Lock className="w-3 h-3" />
                <span className="text-[10px] font-medium">TLS 1.3</span>
              </div>
            </div>

            {/* Expand indicator */}
            <ChevronUp
              className={`w-3 h-3 text-slate-400 dark:text-slate-500 transition-transform duration-300 ${
                isExpanded ? 'rotate-180' : 'rotate-0'
              }`}
            />
          </div>
        </div>

        {/* Expanded View - On Hover */}
        <div
          className="grid transition-all duration-300 ease-in-out"
          style={{
            gridTemplateRows: isExpanded ? '1fr' : '0fr',
            opacity: isExpanded ? 1 : 0,
          }}
        >
          <div className="overflow-hidden">
            <div className="pt-3 mt-3 border-t border-gray-200/50 dark:border-slate-700/50">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                {/* Legal Links */}
                <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
                  <Link
                    href="/legal"
                    className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium flex items-center gap-1.5 group"
                  >
                    <FileCheck className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    <span>Documents Légaux</span>
                  </Link>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <Link
                    href="/legal/cgu"
                    className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    CGU
                  </Link>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <Link
                    href="/legal#mentions"
                    className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Mentions Légales
                  </Link>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <a
                    href="mailto:rgpd@alforis.fr"
                    className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>RGPD</span>
                  </a>
                </nav>

                {/* Compliance Badges */}
                <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-500/10 rounded-md">
                    <Shield className="w-3 h-3 text-green-600 dark:text-green-400" />
                    <span>RGPD</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-500/10 rounded-md">
                    <Server className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    <span>Hetzner UE</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 dark:bg-purple-500/10 rounded-md">
                    <FileCheck className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    <span>RC Pro</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-500/10 rounded-md">
                    <Lock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    <span>TLS 1.3</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
