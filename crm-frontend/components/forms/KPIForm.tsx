// components/forms/KPIForm.tsx
// ============= KPI FORM - RÉUTILISABLE =============

'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { Input, Button, Alert } from '@/components/shared'
import { KPI, KPICreate } from '@/lib/types'
import { useFormToast } from '@/hooks/useFormToast'

interface KPIFormProps {
  initialData?: KPI
  onSubmit: (data: KPICreate) => Promise<void>
  isLoading?: boolean
  error?: string
}

export function KPIForm({
  initialData,
  onSubmit,
  isLoading,
  error,
}: KPIFormProps) {
  const toast = useFormToast({ entityName: 'KPI', gender: 'm' })

  const defaultValues: Partial<KPICreate> | undefined = initialData
    ? {
        year: initialData.year,
        month: initialData.month,
        rdv_count: initialData.rdv_count,
        pitchs: initialData.pitchs,
        due_diligences: initialData.due_diligences,
        closings: initialData.closings,
        revenue: initialData.revenue,
        commission_rate: initialData.commission_rate ?? undefined,
        notes: initialData.notes,
      }
    : undefined

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<KPICreate>({
    defaultValues,
    mode: 'onBlur',
  })

  const handleFormSubmit = async (data: KPICreate) => {
    try {
      await onSubmit(data)
      toast.success(!!initialData)
    } catch (err: any) {
      toast.error(err)
      throw err
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {error && <Alert type="error" message={error} />}

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Année"
          type="number"
          {...register('year', { 
            required: 'Année requise',
            valueAsNumber: true 
          })}
          error={errors.year?.message}
          placeholder="2024"
        />

        <Input
          label="Mois"
          type="number"
          {...register('month', { 
            required: 'Mois requis',
            valueAsNumber: true,
            min: { value: 1, message: 'Min 1' },
            max: { value: 12, message: 'Max 12' },
          })}
          error={errors.month?.message}
          placeholder="1-12"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nombre RDV"
          type="number"
          {...register('rdv_count', { valueAsNumber: true })}
          error={errors.rdv_count?.message}
          placeholder="0"
        />

        <Input
          label="Pitchs"
          type="number"
          {...register('pitchs', { valueAsNumber: true })}
          error={errors.pitchs?.message}
          placeholder="0"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Due Diligences"
          type="number"
          {...register('due_diligences', { valueAsNumber: true })}
          error={errors.due_diligences?.message}
          placeholder="0"
        />

        <Input
          label="Closings"
          type="number"
          {...register('closings', { valueAsNumber: true })}
          error={errors.closings?.message}
          placeholder="0"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Revenu (€)"
          type="number"
          {...register('revenue', { valueAsNumber: true })}
          error={errors.revenue?.message}
          placeholder="0"
        />

        <Input
          label="Taux commission (%)"
          type="number"
          {...register('commission_rate', { valueAsNumber: true })}
          error={errors.commission_rate?.message}
          placeholder="0"
          step="0.01"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          {...register('notes')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bleu"
          rows={3}
          placeholder="Notes supplémentaires..."
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        className="w-full"
      >
        Enregistrer KPI
      </Button>
    </form>
  )
}
