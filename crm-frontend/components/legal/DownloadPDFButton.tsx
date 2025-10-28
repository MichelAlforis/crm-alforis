'use client'

import React, { useState } from 'react'

interface DownloadPDFButtonProps {
  documentType: 'cgu' | 'cgv' | 'dpa' | 'privacy'
  title: string
  description?: string
  className?: string
}

export default function DownloadPDFButton({
  documentType,
  title,
  description,
  className = '',
}: DownloadPDFButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      const response = await fetch(`${API_URL}/legal/documents/${documentType}/pdf`)

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      // Filename mapping
      const filenames = {
        cgu: 'CGU_Alforis_Finance.pdf',
        cgv: 'CGV_Alforis_Finance.pdf',
        dpa: 'DPA_Alforis_Finance.pdf',
        privacy: 'Privacy_Policy_Alforis_Finance.pdf',
      }

      a.download = filenames[documentType]
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error)
      alert('Erreur lors du téléchargement du PDF. Veuillez réessayer.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {description && <p className="text-xs text-gray-600 mt-1">{description}</p>}
        </div>
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {isDownloading ? '⏳ Chargement...' : '📥 Télécharger PDF'}
        </button>
      </div>
    </div>
  )
}
