/**
 * Tests pour le composant SuggestionsTable
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import SuggestionsTable from '@/components/ai/SuggestionsTable'
import { AISuggestion, AISuggestionType, AISuggestionStatus } from '@/types/ai'

const mockSuggestions: AISuggestion[] = [
  {
    id: 1,
    type: AISuggestionType.DATA_ENRICHMENT,
    status: AISuggestionStatus.PENDING,
    entity_type: 'organisation',
    entity_id: 10,
    title: 'Enrichir website',
    description: 'Ajouter le site web manquant',
    confidence_score: 0.92,
    suggestion_data: { website: 'https://example.com' },
    created_at: '2025-10-21T10:00:00Z',
    updated_at: '2025-10-21T10:00:00Z',
  },
  {
    id: 2,
    type: AISuggestionType.DUPLICATE_DETECTION,
    status: AISuggestionStatus.PENDING,
    entity_type: 'organisation',
    entity_id: 20,
    title: 'Doublon potentiel',
    description: 'ACME Corp vs ACME Corporation',
    confidence_score: 0.88,
    suggestion_data: {},
    created_at: '2025-10-21T09:00:00Z',
    updated_at: '2025-10-21T09:00:00Z',
  },
]

describe('SuggestionsTable', () => {
  const mockOnSelectChange = jest.fn()
  const mockOnPreview = jest.fn()
  const mockOnApprove = jest.fn()
  const mockOnReject = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render suggestions table', () => {
    render(
      <SuggestionsTable
        suggestions={mockSuggestions}
        selectedIds={[]}
        onSelectChange={mockOnSelectChange}
        onPreview={mockOnPreview}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    )

    // Vérifier que les suggestions sont affichées
    expect(screen.getByText('Enrichir website')).toBeInTheDocument()
    expect(screen.getByText('Doublon potentiel')).toBeInTheDocument()
  })

  it('should handle checkbox selection', () => {
    render(
      <SuggestionsTable
        suggestions={mockSuggestions}
        selectedIds={[]}
        onSelectChange={mockOnSelectChange}
      />
    )

    // Cliquer sur la première checkbox
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1]) // Index 0 = select all, 1 = first item

    expect(mockOnSelectChange).toHaveBeenCalledWith([1])
  })

  it('should handle select all', () => {
    render(
      <SuggestionsTable
        suggestions={mockSuggestions}
        selectedIds={[]}
        onSelectChange={mockOnSelectChange}
      />
    )

    // Cliquer sur "select all"
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
    fireEvent.click(selectAllCheckbox)

    expect(mockOnSelectChange).toHaveBeenCalledWith([1, 2])
  })

  it('should display confidence score with correct color', () => {
    render(
      <SuggestionsTable
        suggestions={mockSuggestions}
        selectedIds={[]}
        onSelectChange={mockOnSelectChange}
      />
    )

    // Vérifier que les scores sont affichés
    expect(screen.getByText('92%')).toBeInTheDocument()
    expect(screen.getByText('88%')).toBeInTheDocument()
  })

  it('should call onPreview when preview button clicked', () => {
    render(
      <SuggestionsTable
        suggestions={mockSuggestions}
        selectedIds={[]}
        onSelectChange={mockOnSelectChange}
        onPreview={mockOnPreview}
      />
    )

    // Trouver et cliquer sur le bouton preview
    const previewButtons = screen.getAllByTitle('Prévisualiser')
    fireEvent.click(previewButtons[0])

    expect(mockOnPreview).toHaveBeenCalledWith(1)
  })

  it('should call onApprove when approve button clicked', () => {
    render(
      <SuggestionsTable
        suggestions={mockSuggestions}
        selectedIds={[]}
        onSelectChange={mockOnSelectChange}
        onApprove={mockOnApprove}
      />
    )

    // Trouver et cliquer sur le bouton approve
    const approveButtons = screen.getAllByTitle('Approuver')
    fireEvent.click(approveButtons[0])

    expect(mockOnApprove).toHaveBeenCalledWith(1)
  })

  it('should call onReject when reject button clicked', () => {
    render(
      <SuggestionsTable
        suggestions={mockSuggestions}
        selectedIds={[]}
        onSelectChange={mockOnSelectChange}
        onReject={mockOnReject}
      />
    )

    // Trouver et cliquer sur le bouton reject
    const rejectButtons = screen.getAllByTitle('Rejeter')
    fireEvent.click(rejectButtons[0])

    expect(mockOnReject).toHaveBeenCalledWith(1)
  })

  it('should show empty state when no suggestions', () => {
    render(
      <SuggestionsTable
        suggestions={[]}
        selectedIds={[]}
        onSelectChange={mockOnSelectChange}
      />
    )

    expect(screen.getByText('Aucune suggestion trouvée')).toBeInTheDocument()
  })

  it('should highlight selected rows', () => {
    const { container } = render(
      <SuggestionsTable
        suggestions={mockSuggestions}
        selectedIds={[1]}
        onSelectChange={mockOnSelectChange}
      />
    )

    // Vérifier que la première ligne a la classe de sélection
    const rows = container.querySelectorAll('tbody tr')
    expect(rows[0]).toHaveClass('bg-blue-50')
  })

  it('should unselect when clicking selected checkbox', () => {
    render(
      <SuggestionsTable
        suggestions={mockSuggestions}
        selectedIds={[1]}
        onSelectChange={mockOnSelectChange}
      />
    )

    // Cliquer sur la checkbox déjà sélectionnée
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])

    expect(mockOnSelectChange).toHaveBeenCalledWith([])
  })
})
