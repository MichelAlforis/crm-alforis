// lib/api/modules/produits.ts
// ============= PRODUITS MODULE =============
// Product CRUD, search by ISIN, mandat associations

import { BaseHttpClient } from '../core/client'
import type {
  Produit,
  ProduitCreate,
  ProduitUpdate,
  ProduitDetail,
  MandatProduit,
  MandatProduitCreate,
  PaginatedResponse,
} from '@/lib/types'

export class ProduitsAPI extends BaseHttpClient {
  /**
   * Get paginated list of produits
   */
  async getProduits(params?: {
    skip?: number
    limit?: number
    type?: string
    status?: string
  }): Promise<PaginatedResponse<Produit>> {
    return this.request<PaginatedResponse<Produit>>('/produits', { params })
  }

  /**
   * Get produit details by ID
   */
  async getProduit(id: number): Promise<ProduitDetail> {
    return this.request<ProduitDetail>(`/produits/${id}`)
  }

  /**
   * Search produits
   */
  async searchProduits(query: string, skip = 0, limit = 100): Promise<PaginatedResponse<Produit>> {
    return this.request<PaginatedResponse<Produit>>('/produits/search', {
      params: { q: query, skip, limit },
    })
  }

  /**
   * Get produit by ISIN
   */
  async getProduitByIsin(isin: string): Promise<Produit> {
    return this.request<Produit>(`/produits/by-isin/${isin}`)
  }

  /**
   * Get produits by mandat ID
   */
  async getProduitsByMandat(mandat_id: number): Promise<Produit[]> {
    return this.request<Produit[]>(`/produits/by-mandat/${mandat_id}`)
  }

  /**
   * Create new produit
   */
  async createProduit(data: ProduitCreate): Promise<Produit> {
    return this.request<Produit>('/produits', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Update produit
   */
  async updateProduit(id: number, data: ProduitUpdate): Promise<Produit> {
    return this.request<Produit>(`/produits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Delete produit
   */
  async deleteProduit(id: number): Promise<void> {
    await this.request<void>(`/produits/${id}`, {
      method: 'DELETE',
    })
  }

  /**
   * Associate produit to mandat
   */
  async associateProduitToMandat(data: MandatProduitCreate): Promise<MandatProduit> {
    return this.request<MandatProduit>('/produits/associate-to-mandat', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Delete mandat-produit association
   */
  async deleteMandatProduitAssociation(association_id: number): Promise<void> {
    await this.request<void>(`/produits/association/${association_id}`, {
      method: 'DELETE',
    })
  }
}

// Singleton instance
export const produitsAPI = new ProduitsAPI()
