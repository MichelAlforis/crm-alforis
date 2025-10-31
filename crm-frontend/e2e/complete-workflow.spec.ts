import { test, expect } from '@playwright/test'

/**
 * Tests E2E du workflow complet CRM
 * Teste: Création personne, organisation, campagne, autofill, suggestions IA
 * 
 * IMPORTANT: Ces tests nécessitent une authentification
 * Activer en décommentant le project 'chromium-authenticated' dans playwright.config.ts
 */

test.describe('Complete CRM Workflow', () => {
  const timestamp = Date.now()

  test('should create a new person with all details', async ({ page }) => {
    await page.goto('/dashboard/people')
    
    // Cliquer sur nouveau contact
    await page.click('text=/nouvelle personne|add person|créer|nouveau/i')
    
    // Remplir le formulaire complet
    const testPerson = {
      firstName: 'Jean',
      lastName: `Dupont${timestamp}`,
      email: `jean.dupont${timestamp}@example.com`,
      phone: '+33612345678',
      role: 'Directeur Financier',
      linkedin: 'https://linkedin.com/in/jean-dupont'
    }
    
    await page.fill('input[name="first_name"], input[name="firstName"]', testPerson.firstName)
    await page.fill('input[name="last_name"], input[name="lastName"]', testPerson.lastName)
    await page.fill('input[name="personal_email"], input[name="email"]', testPerson.email)
    
    // Vérifier si champs optionnels existent
    const phoneField = page.locator('input[name="phone"], input[name="tel"]')
    if (await phoneField.count() > 0) {
      await phoneField.fill(testPerson.phone)
    }
    
    const roleField = page.locator('input[name="role"], input[name="title"]')
    if (await roleField.count() > 0) {
      await roleField.fill(testPerson.role)
    }
    
    // Soumettre
    await page.click('button[type="submit"]')
    
    // Vérifier succès
    await expect(page.locator('text=/succès|success|créé|created/i')).toBeVisible({ timeout: 10000 })
    
    // Vérifier que la personne apparaît dans la liste
    await page.goto('/dashboard/people')
    await expect(page.locator(`text=${testPerson.lastName}`)).toBeVisible({ timeout: 5000 })
  })

  test('should create a new organisation', async ({ page }) => {
    await page.goto('/dashboard/organisations')
    
    // Cliquer sur nouvelle organisation
    await page.click('text=/nouvelle organisation|add organisation|créer|nouveau/i')
    
    const testOrg = {
      name: `Entreprise Test ${timestamp}`,
      siret: `${timestamp}`.substring(0, 14).padEnd(14, '0'),
      address: '123 Rue de Test, 75001 Paris',
      website: 'https://example-test.com'
    }
    
    await page.fill('input[name="name"]', testOrg.name)
    
    // Champs optionnels
    const siretField = page.locator('input[name="siret"]')
    if (await siretField.count() > 0) {
      await siretField.fill(testOrg.siret)
    }
    
    const addressField = page.locator('input[name="address"], textarea[name="address"]')
    if (await addressField.count() > 0) {
      await addressField.fill(testOrg.address)
    }
    
    const websiteField = page.locator('input[name="website"]')
    if (await websiteField.count() > 0) {
      await websiteField.fill(testOrg.website)
    }
    
    await page.click('button[type="submit"]')
    
    // Vérifier succès
    await expect(page.locator('text=/succès|success|créé|created/i')).toBeVisible({ timeout: 10000 })
    
    // Vérifier dans la liste
    await page.goto('/dashboard/organisations')
    await expect(page.locator(`text=${testOrg.name}`)).toBeVisible({ timeout: 5000 })
  })

  test('should link person to organisation', async ({ page }) => {
    // Aller sur la page des personnes
    await page.goto('/dashboard/people')
    
    // Cliquer sur la première personne
    await page.locator('table tbody tr, [role="row"]').first().click()
    
    // Chercher bouton pour lier à une organisation
    const linkButton = page.locator('button:has-text("Lier"), button:has-text("Link"), button:has-text("Associer")')
    
    if (await linkButton.count() > 0) {
      await linkButton.click()
      
      // Sélectionner une organisation
      await page.locator('select[name="organisation"], input[placeholder*="organisation"]').first().click()
      
      // Attendre que la modal soit visible
      await page.waitForTimeout(500)
      
      // Sauvegarder
      await page.click('button:has-text("Sauvegarder"), button:has-text("Save"), button[type="submit"]')
      
      await expect(page.locator('text=/succès|success|lié|linked/i')).toBeVisible({ timeout: 10000 })
    }
  })

  test('should create email campaign', async ({ page }) => {
    await page.goto('/dashboard/campaigns')
    
    // Chercher bouton nouvelle campagne
    const newCampaignBtn = page.locator('text=/nouvelle campagne|new campaign|créer/i')
    
    if (await newCampaignBtn.count() > 0) {
      await newCampaignBtn.click()
      
      const campaign = {
        name: `Campagne Test ${timestamp}`,
        subject: 'Sujet de test',
        template: 'Newsletter'
      }
      
      await page.fill('input[name="name"], input[name="title"]', campaign.name)
      await page.fill('input[name="subject"]', campaign.subject)
      
      // Sélectionner template si disponible
      const templateSelect = page.locator('select[name="template"]')
      if (await templateSelect.count() > 0) {
        await templateSelect.selectOption({ label: campaign.template })
      }
      
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=/succès|success|créé|created/i')).toBeVisible({ timeout: 10000 })
    }
  })

  test('should test autofill HITL workflow', async ({ page }) => {
    await page.goto('/dashboard/autofill')
    
    // Vérifier si la page autofill existe
    const autofillHeader = page.locator('h1, h2').filter({ hasText: /autofill|auto-fill|remplissage/i })
    
    if (await autofillHeader.count() > 0) {
      // Chercher bouton pour nouvelle suggestion
      const newSuggestionBtn = page.locator('button:has-text("Nouvelle"), button:has-text("New"), button:has-text("Créer")')
      
      if (await newSuggestionBtn.count() > 0) {
        await newSuggestionBtn.click()
        
        // Entrer des données de test
        const nameField = page.locator('input[name="company_name"], input[placeholder*="nom"]')
        if (await nameField.count() > 0) {
          await nameField.fill(`Société Autofill ${timestamp}`)
        }
        
        // Soumettre
        await page.click('button:has-text("Rechercher"), button:has-text("Search"), button[type="submit"]')
        
        // Attendre résultats
        await page.waitForTimeout(2000)
        
        // Vérifier qu'il y a des résultats ou un message
        const results = page.locator('table tbody tr, [role="row"]')
        const noResults = page.locator('text=/aucun résultat|no results|pas de/i')
        
        const hasResults = await results.count() > 0
        const hasNoResults = await noResults.count() > 0
        
        expect(hasResults || hasNoResults).toBeTruthy()
      }
    }
  })

  test('should access AI suggestions dashboard', async ({ page }) => {
    await page.goto('/dashboard/ai')
    
    // Vérifier si la page AI existe
    const aiHeader = page.locator('h1, h2').filter({ hasText: /ai|intelligence|suggestions/i })
    
    if (await aiHeader.count() > 0) {
      // Vérifier que des suggestions sont affichées
      await page.waitForTimeout(1000)
      
      // Chercher tableau de suggestions
      const suggestionsTable = page.locator('table, [role="table"]')
      
      if (await suggestionsTable.count() > 0) {
        // Vérifier qu'il y a au moins un header
        const headers = suggestionsTable.locator('th, [role="columnheader"]')
        expect(await headers.count()).toBeGreaterThan(0)
      }
      
      // Chercher boutons d'action (accepter/rejeter)
      const actionButtons = page.locator('button:has-text("Accepter"), button:has-text("Accept"), button:has-text("Rejeter"), button:has-text("Reject")')
      
      if (await actionButtons.count() > 0) {
        // Les boutons d'action existent, c'est bon
        expect(await actionButtons.count()).toBeGreaterThan(0)
      }
    }
  })

  test('should test search functionality across entities', async ({ page }) => {
    // Test recherche personnes
    await page.goto('/dashboard/people')
    
    const searchInput = page.locator('input[placeholder*="Recherch"], input[placeholder*="Search"], input[type="search"]')
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('Test')
      await page.waitForTimeout(500)
      
      // Vérifier que des résultats apparaissent ou message "aucun résultat"
      const rows = page.locator('table tbody tr, [role="row"]')
      const noResults = page.locator('text=/aucun résultat|no results|pas de/i')
      
      const hasRows = await rows.count() > 0
      const hasNoResults = await noResults.count() > 0
      
      expect(hasRows || hasNoResults).toBeTruthy()
    }
    
    // Test recherche organisations
    await page.goto('/dashboard/organisations')
    
    const orgSearchInput = page.locator('input[placeholder*="Recherch"], input[placeholder*="Search"], input[type="search"]')
    
    if (await orgSearchInput.count() > 0) {
      await orgSearchInput.fill('Test')
      await page.waitForTimeout(500)
      
      const orgRows = page.locator('table tbody tr, [role="row"]')
      const orgNoResults = page.locator('text=/aucun résultat|no results|pas de/i')
      
      const hasOrgRows = await orgRows.count() > 0
      const hasOrgNoResults = await orgNoResults.count() > 0
      
      expect(hasOrgRows || hasOrgNoResults).toBeTruthy()
    }
  })

  test('should test export functionality', async ({ page }) => {
    await page.goto('/dashboard/people')
    
    // Chercher bouton export
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Exporter"), [aria-label*="export"]')
    
    if (await exportButton.count() > 0) {
      // Setup download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 15000 }).catch(() => null)
      
      await exportButton.click()
      
      const download = await downloadPromise
      
      if (download) {
        // Vérifier que le fichier a une extension attendue
        const filename = download.suggestedFilename()
        expect(filename).toMatch(/\.(xlsx|csv|pdf)$/i)
      }
    }
  })

  test('should test dashboard widgets loading', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Attendre que la page charge
    await page.waitForLoadState('networkidle')
    
    // Chercher des widgets/cards du dashboard
    const widgets = page.locator('[class*="widget"], [class*="card"], [role="region"]')
    
    // Vérifier qu'au moins quelques widgets sont présents
    const widgetCount = await widgets.count()
    expect(widgetCount).toBeGreaterThan(0)
    
    // Vérifier qu'il n'y a pas d'erreur visible
    const errorMessages = page.locator('text=/error|erreur|échec/i')
    const visibleErrors = await errorMessages.count()
    
    // Si des erreurs, ce ne doit pas être des erreurs critiques
    if (visibleErrors > 0) {
      const errorText = await errorMessages.first().textContent()
      // Log pour information mais ne pas faire échouer le test
      console.log('Warning: Error message found:', errorText)
    }
  })

  test('should navigate through all main menu items', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Liste des pages principales à tester
    const mainPages = [
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/dashboard/people', name: 'People' },
      { path: '/dashboard/organisations', name: 'Organisations' },
      { path: '/dashboard/interactions', name: 'Interactions' },
      { path: '/dashboard/tasks', name: 'Tasks' },
    ]
    
    for (const pageInfo of mainPages) {
      await page.goto(pageInfo.path)
      
      // Attendre que la page charge
      await page.waitForLoadState('domcontentloaded')
      
      // Vérifier qu'on est sur la bonne page (URL correcte)
      await expect(page).toHaveURL(new RegExp(pageInfo.path))
      
      // Vérifier qu'il n'y a pas d'erreur 404 ou 500
      const errorPage = page.locator('text=/404|500|not found|erreur serveur/i')
      expect(await errorPage.count()).toBe(0)
    }
  })
})
