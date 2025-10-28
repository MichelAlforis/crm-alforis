// components/shared/FileUpload.tsx
// ============= COMPOSANT UPLOAD MULTI-FICHIERS =============

'use client'

import React, { useState, useRef } from 'react'
import { Upload, X, File, FileText, Image as ImageIcon } from 'lucide-react'

export interface UploadedFile {
  id: string
  file: File
  preview?: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

interface FileUploadProps {
  onFilesChange: (files: UploadedFile[]) => void
  maxFiles?: number
  maxSizeMB?: number
  acceptedTypes?: string[]
  disabled?: boolean
}

export default function FileUpload({
  onFilesChange,
  maxFiles = 10,
  maxSizeMB = 10,
  acceptedTypes = [
    'image/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  disabled = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return

    const newFiles: UploadedFile[] = []

    Array.from(fileList).forEach((file) => {
      // Vérifier la taille
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`Le fichier "${file.name}" dépasse ${maxSizeMB} MB`)
        return
      }

      // Créer l'objet fichier
      const uploadedFile: UploadedFile = {
        id: `${Date.now()}-${file.name}`,
        file,
        progress: 0,
        status: 'pending',
      }

      // Créer une preview pour les images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          uploadedFile.preview = e.target?.result as string
          setFiles((prev) => [...prev])
        }
        reader.readAsDataURL(file)
      }

      newFiles.push(uploadedFile)
    })

    if (files.length + newFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} fichiers autorisés`)
      return
    }

    const updatedFiles = [...files, ...newFiles]
    setFiles(updatedFiles)
    onFilesChange(updatedFiles)
  }

  const removeFile = (id: string) => {
    const updatedFiles = files.filter((f) => f.id !== id)
    setFiles(updatedFiles)
    onFilesChange(updatedFiles)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (!disabled && e.dataTransfer?.files) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-8 w-8 text-blue-500" />
    if (mimeType.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />
    if (mimeType.includes('word') || mimeType.includes('document'))
      return <FileText className="h-8 w-8 text-blue-600" />
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
      return <FileText className="h-8 w-8 text-green-600" />
    return <File className="h-8 w-8 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {/* Zone de drop */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />

        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-sm text-gray-600 mb-2">
          Glissez-déposez vos fichiers ici ou cliquez pour sélectionner
        </p>
        <p className="text-xs text-gray-500">
          Maximum {maxFiles} fichiers • {maxSizeMB} MB par fichier
        </p>
        <p className="text-xs text-gray-500 mt-1">
          PDF, Word, Excel, Images supportés
        </p>
      </div>

      {/* Liste des fichiers */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Fichiers sélectionnés ({files.length})
          </h4>
          {files.map((uploadedFile) => (
            <div
              key={uploadedFile.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              {uploadedFile.preview ? (
                <img
                  src={uploadedFile.preview}
                  alt={uploadedFile.file.name}
                  className="h-12 w-12 object-cover rounded"
                />
              ) : (
                getFileIcon(uploadedFile.file.type)
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {uploadedFile.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(uploadedFile.file.size)}
                </p>

                {uploadedFile.status === 'uploading' && (
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${uploadedFile.progress}%` }}
                    />
                  </div>
                )}

                {uploadedFile.status === 'error' && (
                  <p className="text-xs text-red-600 mt-1">{uploadedFile.error}</p>
                )}
              </div>

              <button
                onClick={() => removeFile(uploadedFile.id)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                disabled={disabled}
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
