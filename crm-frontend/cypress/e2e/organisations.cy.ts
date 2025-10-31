describe('Organisation CRUD Operations', () => {
  beforeEach(() => {
    cy.fixture('users').then((users) => {
      cy.login(users.testUser.email, users.testUser.password)
    })
    cy.visit('/dashboard/organisations')
  })

  it('should display organisations list page', () => {
    cy.url().should('include', '/dashboard/organisations')
    cy.contains(/organisations/i).should('be.visible')
  })

  it('should create a new organisation', () => {
    const timestamp = Date.now()
    const testOrg = {
      name: `Cypress Test Org ${timestamp}`,
      email: `org${timestamp}@example.com`,
      phone: '+33123456789',
      website: 'https://example.com',
      address: '123 Test Street',
      city: 'Paris',
      country: 'FR',
    }

    // Click create button
    cy.contains(/nouvelle organisation|add organisation|créer/i).click()

    // Fill form
    cy.get('input[name="name"]').type(testOrg.name)
    cy.get('input[name="email"]').type(testOrg.email)
    cy.get('input[name="phone"]').type(testOrg.phone)
    cy.get('input[name="website"]').type(testOrg.website)
    cy.get('input[name="address"]').type(testOrg.address)
    cy.get('input[name="city"]').type(testOrg.city)

    // Submit form
    cy.get('button[type="submit"]').click()

    // Should show success message
    cy.contains(/succès|success|créé/i, { timeout: 10000 }).should('be.visible')

    // Should see the new organisation in the list
    cy.visit('/dashboard/organisations')
    cy.contains(testOrg.name).should('be.visible')
  })

  it('should filter organisations by category', () => {
    // Find and click category filter
    cy.contains(/catégorie|category/i).click()

    // Select a category
    cy.contains(/institution|entreprise|client/i).first().click()

    // Wait for results
    cy.wait(500)

    // Should have filtered results
    cy.get('table tbody tr').should('exist')
  })

  it('should search for an organisation', () => {
    // Type in search field
    cy.get('input[type="search"], input[placeholder*="Rechercher"]').type('Test')

    // Results should be filtered
    cy.wait(500) // Wait for debounce
    cy.get('table tbody tr').should('have.length.at.least', 1)
  })

  it('should view organisation details', () => {
    // Click on first organisation in list
    cy.get('table tbody tr').first().click()

    // Should navigate to detail page
    cy.url().should('match', /\/dashboard\/organisations\/\d+/)

    // Should display organisation information
    cy.contains(/informations|détails/i).should('be.visible')
  })

  it('should edit an organisation', () => {
    // Click on first organisation
    cy.get('table tbody tr').first().click()

    // Click edit button
    cy.contains(/modifier|edit/i).click()

    // Update a field
    const newWebsite = `https://updated-${Date.now()}.com`
    cy.get('input[name="website"]').clear().type(newWebsite)

    // Save
    cy.get('button[type="submit"]').contains(/enregistrer|save/i).click()

    // Should show success
    cy.contains(/succès|success|modifié/i, { timeout: 10000 }).should('be.visible')

    // Verify the change
    cy.contains(newWebsite).should('be.visible')
  })

  it('should delete an organisation', () => {
    // Get the first organisation's name
    cy.get('table tbody tr').first().within(() => {
      cy.get('td').first().invoke('text').as('orgName')
    })

    // Click on first organisation
    cy.get('table tbody tr').first().click()

    // Click delete button
    cy.contains(/supprimer|delete/i).click()

    // Confirm deletion (with cascade warning)
    cy.on('window:confirm', (text) => {
      expect(text).to.include('irréversible')
      return true
    })

    // Should redirect to list
    cy.url().should('include', '/dashboard/organisations')

    // Organisation should be removed from list
    cy.get('@orgName').then((name) => {
      cy.contains(name as string).should('not.exist')
    })
  })

  it('should validate required fields', () => {
    // Click create button
    cy.contains(/nouvelle organisation|add organisation|créer/i).click()

    // Submit without filling fields
    cy.get('button[type="submit"]').click()

    // Should show validation errors
    cy.contains(/requis|required/i).should('be.visible')

    // URL should not change
    cy.url().should('include', '/new')
  })

  it('should show organisation contacts', () => {
    // Click on first organisation
    cy.get('table tbody tr').first().click()

    // Navigate to contacts tab
    cy.contains(/contacts/i).click()

    // Should display contacts section
    cy.contains(/contacts/i).should('be.visible')
  })

  it('should show organisation mandats', () => {
    // Click on first organisation
    cy.get('table tbody tr').first().click()

    // Navigate to mandats tab
    cy.contains(/mandats/i).click()

    // Should display mandats section
    cy.contains(/mandats/i).should('be.visible')
  })
})
