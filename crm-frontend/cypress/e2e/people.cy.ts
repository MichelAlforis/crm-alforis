describe('People CRUD Operations', () => {
  beforeEach(() => {
    cy.fixture('users').then((users) => {
      cy.login(users.testUser.email, users.testUser.password)
    })
    cy.visit('/dashboard/people')
  })

  it('should display people list page', () => {
    cy.url().should('include', '/dashboard/people')
    cy.contains(/personnes|people/i).should('be.visible')
  })

  it('should create a new person', () => {
    const timestamp = Date.now()
    const testPerson = {
      firstName: `Cypress`,
      lastName: `Test${timestamp}`,
      email: `cypress.test${timestamp}@example.com`,
      phone: '+33612345678',
      role: 'Directeur',
    }

    // Click create button
    cy.contains(/nouvelle personne|add person|créer/i).click()

    // Fill form
    cy.get('input[name="first_name"], input[name="firstName"]').type(testPerson.firstName)
    cy.get('input[name="last_name"], input[name="lastName"]').type(testPerson.lastName)
    cy.get('input[name="personal_email"], input[name="email"]').type(testPerson.email)
    cy.get('input[name="phone"]').type(testPerson.phone)
    cy.get('input[name="role"]').type(testPerson.role)

    // Submit form
    cy.get('button[type="submit"]').click()

    // Should show success message or redirect
    cy.contains(/succès|success|créé/i, { timeout: 10000 }).should('be.visible')

    // Should see the new person in the list
    cy.visit('/dashboard/people')
    cy.contains(testPerson.lastName).should('be.visible')
  })

  it('should search for a person', () => {
    // Type in search field
    cy.get('input[type="search"], input[placeholder*="Rechercher"]').type('Test')

    // Results should be filtered
    cy.wait(500) // Wait for debounce
    cy.get('table tbody tr').should('have.length.at.least', 1)
  })

  it('should view person details', () => {
    // Click on first person in list
    cy.get('table tbody tr').first().click()

    // Should navigate to detail page
    cy.url().should('match', /\/dashboard\/people\/\d+/)

    // Should display person information
    cy.contains(/informations|détails/i).should('be.visible')
  })

  it('should edit a person', () => {
    // Click on first person
    cy.get('table tbody tr').first().click()

    // Click edit button
    cy.contains(/modifier|edit/i).click()

    // Update a field
    const newRole = `Updated Role ${Date.now()}`
    cy.get('input[name="role"]').clear().type(newRole)

    // Save
    cy.get('button[type="submit"]').contains(/enregistrer|save/i).click()

    // Should show success
    cy.contains(/succès|success|modifié/i, { timeout: 10000 }).should('be.visible')

    // Verify the change
    cy.contains(newRole).should('be.visible')
  })

  it('should delete a person', () => {
    // Get the first person's name
    cy.get('table tbody tr').first().within(() => {
      cy.get('td').first().invoke('text').as('personName')
    })

    // Click on first person
    cy.get('table tbody tr').first().click()

    // Click delete button
    cy.contains(/supprimer|delete/i).click()

    // Confirm deletion
    cy.on('window:confirm', () => true)

    // Should redirect to list
    cy.url().should('include', '/dashboard/people')

    // Person should be removed from list
    cy.get('@personName').then((name) => {
      cy.contains(name as string).should('not.exist')
    })
  })

  it('should validate required fields', () => {
    // Click create button
    cy.contains(/nouvelle personne|add person|créer/i).click()

    // Submit without filling fields
    cy.get('button[type="submit"]').click()

    // Should show validation errors
    cy.contains(/requis|required/i).should('be.visible')

    // URL should not change
    cy.url().should('include', '/new')
  })

  it('should cancel person creation', () => {
    // Click create button
    cy.contains(/nouvelle personne|add person|créer/i).click()

    // Start filling form
    cy.get('input[name="first_name"], input[name="firstName"]').type('Test')

    // Click cancel
    cy.contains(/annuler|cancel/i).click()

    // Should go back to list
    cy.url().should('include', '/dashboard/people')
    cy.url().should('not.include', '/new')
  })
})
