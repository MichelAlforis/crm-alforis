/**
 * Footer Component
 *
 * Legal links and compliance information
 * Displayed at the bottom of all dashboard pages
 */
'use client'

import React from 'react'
import Link from 'next/link'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">

          {/* Left: Company Info */}
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-600">
              © {currentYear} <span className="font-semibold text-gray-900">ALFORIS FINANCE</span> - Tous droits réservés
            </p>
            <p className="text-xs text-gray-500 mt-1">
              SIREN: 943 007 229 - SAS au capital de 5 000 €
            </p>
          </div>

          {/* Right: Legal Links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <Link
              href="/legal"
              className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
            >
              Documents Légaux
            </Link>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <Link
              href="/legal/cgu"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              CGU
            </Link>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <Link
              href="/legal#mentions"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Mentions Légales
            </Link>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <a
              href="mailto:rgpd@alforis.fr"
              className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
            >
              <span className="text-xs">🔒</span>
              <span>RGPD</span>
            </a>
          </nav>
        </div>

        {/* Compliance Badge */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="text-green-600">✓</span>
              <span>Conforme RGPD</span>
            </div>
            <span className="text-gray-300">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-green-600">✓</span>
              <span>Hébergement UE (Hetzner)</span>
            </div>
            <span className="text-gray-300">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-green-600">✓</span>
              <span>RC Pro souscrite</span>
            </div>
            <span className="text-gray-300">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-blue-600">🔐</span>
              <span>HTTPS/TLS 1.3</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
