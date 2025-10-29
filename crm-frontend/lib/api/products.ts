// lib/api/products.ts
// ============= PRODUCTS API MODULE =============
// CRUD produits financiers

import type { BaseApiClient } from './index'
import type {
  Produit,
  ProduitCreate,
  ProduitUpdate,
  ProduitDetail,
  MandatProduit,
  MandatProduitCreate,
  PaginatedResponse,
} from '../types'

export class ProductsApi {
  constructor(private client: BaseApiClient) {}

  /**
   * Lister produits
   * GET /produits
   */
  async list(params?: {
    skip?: number
    limit?: number
    sort_by?: string
    sort_order?: 'asc' | 'desc'
  }): Promise<PaginatedResponse<Produit>> {
    return await this.client['get']<PaginatedResponse<Produit>>('/produits', params)
  }

  /**
   * Détails produit
   * GET /produits/{id}
   */
  async get(id: number): Promise<ProduitDetail> {
    return await this.client['get']<ProduitDetail>(`/produits/${id}`)
  }

  /**
   * Rechercher produits
   * GET /produits/search
   */
  async search(
    query: string,
    skip = 0,
    limit = 100
  ): Promise<PaginatedResponse<Produit>> {
    return await this.client['get']<PaginatedResponse<Produit>>('/produits/search', {
      q: query,
      skip,
      limit,
    })
  }

  /**
   * Rechercher par ISIN
   * GET /produits/by-isin/{isin}
   */
  async getByIsin(isin: string): Promise<Produit> {
    return await this.client['get']<Produit>(`/produits/by-isin/${isin}`)
  }

  /**
   * Produits d'un mandat
   * GET /produits/by-mandat/{mandat_id}
   */
  async getByMandat(mandatId: number): Promise<Produit[]> {
    return await this.client['get']<Produit[]>(`/produits/by-mandat/${mandatId}`)
  }

  /**
   * Créer produit
   * POST /produits
   */
  async create(data: ProduitCreate): Promise<Produit> {
    return await this.client['post']<Produit>('/produits', data)
  }

  /**
   * Mettre à jour produit
   * PUT /produits/{id}
   */
  async update(id: number, data: ProduitUpdate): Promise<Produit> {
    return await this.client['put']<Produit>(`/produits/${id}`, data)
  }

  /**
   * Supprimer produit
   * DELETE /produits/{id}
   */
  async delete(id: number): Promise<void> {
    await this.client['delete']<void>(`/produits/${id}`)
  }

  /**
   * Associer produit à mandat
   * POST /mandats-produits
   */
  async associateToMandat(data: MandatProduitCreate): Promise<MandatProduit> {
    return await this.client['post']<MandatProduit>('/mandats-produits', data)
  }

  /**
   * Supprimer association mandat-produit
   * DELETE /mandats-produits/{association_id}
   */
  async deleteAssociation(associationId: number): Promise<void> {
    await this.client['delete']<void>(`/mandats-produits/${associationId}`)
  }
}
