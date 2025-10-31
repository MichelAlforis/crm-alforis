// Cypress E2E support file
import '@testing-library/cypress/add-commands'

// Custom commands
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/auth/login')
    cy.get('input[name="email"]').type(email)
    cy.get('input[name="password"]').type(password)
    cy.get('button[type="submit"]').click()

    // Wait for redirect to dashboard
    cy.url().should('include', '/dashboard')

    // Store token from localStorage
    cy.window().then((win) => {
      const token = win.localStorage.getItem('access_token')
      expect(token).to.exist
    })
  })
})

Cypress.Commands.add('logout', () => {
  cy.window().then((win) => {
    win.localStorage.removeItem('access_token')
    win.localStorage.removeItem('refresh_token')
  })
  cy.visit('/auth/login')
})

// Add TypeScript definitions
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>
      logout(): Chainable<void>
    }
  }
}

export {}
