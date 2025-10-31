describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/auth/login')
  })

  it('should display login page', () => {
    cy.url().should('include', '/auth/login')
    cy.contains('Connexion').should('be.visible')
    cy.get('input[name="email"]').should('be.visible')
    cy.get('input[name="password"]').should('be.visible')
    cy.get('button[type="submit"]').should('be.visible')
  })

  it('should show validation errors for empty fields', () => {
    cy.get('button[type="submit"]').click()

    // Check for validation messages
    cy.contains(/email|requis/i).should('be.visible')
    cy.contains(/mot de passe|requis/i).should('be.visible')
  })

  it('should show error for invalid credentials', () => {
    cy.get('input[name="email"]').type('wrong@email.com')
    cy.get('input[name="password"]').type('wrongpassword')
    cy.get('button[type="submit"]').click()

    // Should show error message
    cy.contains(/identifiants|invalide/i, { timeout: 10000 }).should('be.visible')

    // Should stay on login page
    cy.url().should('include', '/auth/login')
  })

  it('should login successfully with valid credentials', () => {
    cy.fixture('users').then((users) => {
      cy.get('input[name="email"]').type(users.testUser.email)
      cy.get('input[name="password"]').type(users.testUser.password)
      cy.get('button[type="submit"]').click()

      // Should redirect to dashboard
      cy.url().should('include', '/dashboard', { timeout: 10000 })

      // Should store token in localStorage
      cy.window().then((win) => {
        const token = win.localStorage.getItem('access_token')
        expect(token).to.exist
        expect(token).to.not.be.empty
      })
    })
  })

  it('should logout successfully', () => {
    cy.fixture('users').then((users) => {
      // Login first
      cy.login(users.testUser.email, users.testUser.password)
      cy.visit('/dashboard')

      // Click logout button (adjust selector based on your UI)
      cy.get('[data-testid="user-menu"]').click()
      cy.contains(/déconnexion|logout/i).click()

      // Should redirect to login
      cy.url().should('include', '/auth/login')

      // Token should be removed
      cy.window().then((win) => {
        const token = win.localStorage.getItem('access_token')
        expect(token).to.be.null
      })
    })
  })

  it('should redirect to dashboard if already logged in', () => {
    cy.fixture('users').then((users) => {
      // Login
      cy.login(users.testUser.email, users.testUser.password)

      // Try to visit login page
      cy.visit('/auth/login')

      // Should redirect to dashboard
      cy.url().should('include', '/dashboard')
    })
  })

  it('should protect dashboard route when not authenticated', () => {
    // Make sure we're logged out
    cy.logout()

    // Try to visit dashboard
    cy.visit('/dashboard')

    // Should redirect to login
    cy.url().should('include', '/auth/login')
  })
})
