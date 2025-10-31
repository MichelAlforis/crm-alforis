describe('Bulk Actions', () => {
  beforeEach(() => {
    cy.fixture('users').then((users) => {
      cy.login(users.testUser.email, users.testUser.password)
    })
  })

  describe('Bulk actions on People', () => {
    beforeEach(() => {
      cy.visit('/dashboard/people')
    })

    it('should select multiple people', () => {
      // Select first 3 people (adjust selector based on your checkbox implementation)
      cy.get('input[type="checkbox"]').eq(1).check()
      cy.get('input[type="checkbox"]').eq(2).check()
      cy.get('input[type="checkbox"]').eq(3).check()

      // Should show bulk action bar
      cy.contains(/sélectionné/i).should('be.visible')
      cy.contains('3').should('be.visible')
    })

    it('should select all people on page', () => {
      // Click select all checkbox (usually in header)
      cy.get('thead input[type="checkbox"]').check()

      // Should show bulk action bar with count
      cy.contains(/sélectionné/i).should('be.visible')
    })

    it('should clear selection', () => {
      // Select some people
      cy.get('input[type="checkbox"]').eq(1).check()
      cy.get('input[type="checkbox"]').eq(2).check()

      // Bulk action bar should be visible
      cy.contains(/sélectionné/i).should('be.visible')

      // Click clear/cancel button
      cy.get('[data-testid="clear-selection"], button').contains(/annuler|clear/i).click()

      // Bulk action bar should disappear
      cy.contains(/sélectionné/i).should('not.exist')

      // Checkboxes should be unchecked
      cy.get('input[type="checkbox"]:checked').should('have.length', 0)
    })

    it('should export selected people to CSV', () => {
      // Select some people
      cy.get('input[type="checkbox"]').eq(1).check()
      cy.get('input[type="checkbox"]').eq(2).check()

      // Click export button
      cy.contains(/exporter/i).click()

      // Should show success message or start download
      cy.contains(/export|lancé/i, { timeout: 5000 }).should('be.visible')
    })

    it('should bulk delete people with confirmation', () => {
      const timestamp = Date.now()

      // First, create test people to delete
      cy.contains(/nouvelle personne|créer/i).click()
      cy.get('input[name="first_name"], input[name="firstName"]').type('BulkDelete')
      cy.get('input[name="last_name"], input[name="lastName"]').type(`Test${timestamp}`)
      cy.get('input[name="personal_email"], input[name="email"]').type(`bulk${timestamp}@test.com`)
      cy.get('button[type="submit"]').click()
      cy.wait(1000)

      // Go back to list
      cy.visit('/dashboard/people')

      // Find and select the test person
      cy.contains(`Test${timestamp}`).parents('tr').find('input[type="checkbox"]').check()

      // Click delete button
      cy.contains(/supprimer/i).click()

      // Confirm deletion
      cy.on('window:confirm', (text) => {
        expect(text).to.include('irréversible')
        return true
      })

      // Should show success message
      cy.contains(/supprimé|deleted/i, { timeout: 10000 }).should('be.visible')

      // Person should be removed from list
      cy.contains(`Test${timestamp}`).should('not.exist')
    })

    it('should cancel bulk delete', () => {
      // Select some people
      cy.get('input[type="checkbox"]').eq(1).check()
      cy.get('input[type="checkbox"]').eq(2).check()

      // Get count before deletion
      cy.get('table tbody tr').its('length').as('initialCount')

      // Click delete button
      cy.contains(/supprimer/i).click()

      // Cancel deletion
      cy.on('window:confirm', () => false)

      // People should still be in the list
      cy.get('@initialCount').then((count) => {
        cy.get('table tbody tr').should('have.length', count)
      })
    })
  })

  describe('Bulk actions on Organisations', () => {
    beforeEach(() => {
      cy.visit('/dashboard/organisations')
    })

    it('should select multiple organisations', () => {
      // Select first 2 organisations
      cy.get('input[type="checkbox"]').eq(1).check()
      cy.get('input[type="checkbox"]').eq(2).check()

      // Should show bulk action bar
      cy.contains(/sélectionné/i).should('be.visible')
      cy.contains('2').should('be.visible')
    })

    it('should export selected organisations to CSV', () => {
      // Select some organisations
      cy.get('input[type="checkbox"]').eq(1).check()
      cy.get('input[type="checkbox"]').eq(2).check()

      // Click export button
      cy.contains(/exporter/i).click()

      // Should show success message
      cy.contains(/export|lancé/i, { timeout: 5000 }).should('be.visible')
    })

    it('should bulk delete organisations with cascade warning', () => {
      const timestamp = Date.now()

      // Create test organisation to delete
      cy.contains(/nouvelle organisation|créer/i).click()
      cy.get('input[name="name"]').type(`BulkDelete Org ${timestamp}`)
      cy.get('input[name="email"]').type(`bulkorg${timestamp}@test.com`)
      cy.get('button[type="submit"]').click()
      cy.wait(1000)

      // Go back to list
      cy.visit('/dashboard/organisations')

      // Find and select the test organisation
      cy.contains(`BulkDelete Org ${timestamp}`).parents('tr').find('input[type="checkbox"]').check()

      // Click delete button
      cy.contains(/supprimer/i).click()

      // Confirm deletion (should mention cascade)
      cy.on('window:confirm', (text) => {
        expect(text).to.include('irréversible')
        expect(text).to.match(/contacts|mandats|interactions/i)
        return true
      })

      // Should show success message
      cy.contains(/supprimé|deleted/i, { timeout: 10000 }).should('be.visible')

      // Organisation should be removed
      cy.contains(`BulkDelete Org ${timestamp}`).should('not.exist')
    })

    it('should handle partial bulk delete failures', () => {
      // Select multiple organisations
      cy.get('input[type="checkbox"]').eq(1).check()
      cy.get('input[type="checkbox"]').eq(2).check()

      // Click delete
      cy.contains(/supprimer/i).click()

      // Confirm
      cy.on('window:confirm', () => true)

      // Should show result (with success/failure count)
      cy.contains(/supprimé|deleted|échec/i, { timeout: 10000 }).should('be.visible')
    })
  })

  describe('Bulk action error handling', () => {
    beforeEach(() => {
      cy.visit('/dashboard/people')
    })

    it('should show error if bulk action fails', () => {
      // Intercept the bulk delete API call to simulate failure
      cy.intercept('POST', '**/api/v1/people/bulk-delete', {
        statusCode: 500,
        body: { error: 'Server error' },
      })

      // Select and try to delete
      cy.get('input[type="checkbox"]').eq(1).check()
      cy.contains(/supprimer/i).click()
      cy.on('window:confirm', () => true)

      // Should show error message
      cy.contains(/erreur|error/i, { timeout: 10000 }).should('be.visible')
    })

    it('should disable bulk actions when no items selected', () => {
      // Bulk action bar should not be visible initially
      cy.contains(/sélectionné/i).should('not.exist')

      // Bulk action buttons should not be accessible
      cy.get('[data-testid="bulk-actions"]').should('not.exist')
    })
  })
})
