'use client'

import React, { useState } from 'react'
import { Plus, Pencil, Trash2, UserX, Search, X } from 'lucide-react'
import { useUsers, useDeleteUser, useCreateUser, useUpdateUser, User } from '@/hooks/useUsers'
import { useConfirm } from '@/hooks/useConfirm'
import { Button } from '@/components/ui/button'
import { UserForm } from '@/components/forms'
import { useToast } from '@/hooks/useToast'

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const { data, isLoading, refetch } = useUsers({ q: search, include_inactive: includeInactive })
  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const deleteMutation = useDeleteUser()
  const { showToast } = useToast()
  const { confirm, ConfirmDialogComponent } = useConfirm()

  const handleOpenCreate = () => {
    setEditingUser(null)
    setShowModal(true)
  }

  const handleOpenEdit = (user: User) => {
    setEditingUser(user)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingUser(null)
  }

  const handleSubmit = async (data: any) => {
    try {
      if (editingUser) {
        // Mode édition
        await updateMutation.mutateAsync({ id: editingUser.id, data })
        showToast({
          type: 'success',
          title: 'Utilisateur mis à jour',
        })
      } else {
        // Mode création
        await createMutation.mutateAsync(data)
        showToast({
          type: 'success',
          title: 'Utilisateur créé',
        })
      }
      handleCloseModal()
      refetch()
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.detail || 'Impossible de sauvegarder l\'utilisateur',
      })
    }
  }

  const handleDelete = async (id: number, email: string, hardDelete: boolean = false) => {
    confirm({
      title: hardDelete ? 'Supprimer définitivement' : 'Désactiver l\'utilisateur',
      message: `Êtes-vous sûr de vouloir ${hardDelete ? 'supprimer définitivement' : 'désactiver'} l'utilisateur ${email} ?`,
      type: 'danger',
      confirmText: hardDelete ? 'Supprimer' : 'Désactiver',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync({ id, hardDelete })
          showToast({
            type: 'success',
            title: hardDelete ? 'Utilisateur supprimé' : 'Utilisateur désactivé',
          })
          refetch()
        } catch (error: any) {
          showToast({
            type: 'error',
            title: 'Erreur',
            message: error.response?.data?.detail || 'Impossible de supprimer l\'utilisateur',
          })
        }
      },
    })
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-ardoise">Gestion des utilisateurs</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1">Créer, modifier et supprimer des comptes utilisateurs</p>
        </div>
        <Button onClick={handleOpenCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nouvel utilisateur
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par email, nom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-bleu focus:border-transparent"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="rounded border-gray-300 dark:border-slate-600 text-bleu focus:ring-bleu"
            />
            Inclure utilisateurs inactifs
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucun utilisateur trouvé</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Équipe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200">
              {data.items.map((user) => (
                <tr key={user.id} className={!user.is_active ? 'bg-gray-50 dark:bg-slate-800 opacity-60' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-bleu text-white rounded-full flex items-center justify-center font-semibold">
                        {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                          {user.full_name || user.username || 'Sans nom'}
                        </div>
                        {user.username && (
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.is_superuser
                        ? 'bg-purple-100 text-purple-800'
                        : user.role_name
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-800'
                    }`}>
                      {user.is_superuser ? 'Superuser' : user.role_name || 'Aucun'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.team_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(user)}
                        className="text-bleu hover:text-blue-900"
                        title="Modifier"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {user.is_active ? (
                        <button
                          onClick={() => handleDelete(user.id, user.email, false)}
                          className="text-orange-600 hover:text-orange-900"
                          title="Désactiver"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDelete(user.id, user.email, true)}
                          className="text-red-600 hover:text-red-900"
                          title="Supprimer définitivement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Stats */}
      {data && (
        <div className="mt-4 text-sm text-gray-600 dark:text-slate-400">
          {data.total} utilisateur{data.total > 1 ? 's' : ''} au total
        </div>
      )}

      {/* Modal Création/Édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-ardoise">
                {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 dark:text-slate-400 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <UserForm
                initialData={editingUser || undefined}
                onSubmit={handleSubmit}
                onCancel={handleCloseModal}
                isLoading={createMutation.isPending || updateMutation.isPending}
                mode={editingUser ? 'edit' : 'create'}
              />
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialogComponent />
    </div>
  )
}
