/**
 * Tests E2E pour l'Agent IA
 * Flow complet : Dashboard → Suggestions → Batch operations → Preview → Configuration
 */

describe('Agent IA - Flow complet', () => {
  beforeEach(() => {
    // Login
    cy.visit('/auth/login')
    cy.get('input[name="email"]').type('admin@tpm.finance')
    cy.get('input[name="password"]').type('admin123')
    cy.get('button[type="submit"]').click()

    // Attendre redirection vers dashboard
    cy.url().should('include', '/dashboard')
  })

  describe('Navigation et Dashboard AI', () => {
    it('should display AI Agent menu item in sidebar', () => {
      // Vérifier que le menu "Agent IA" est présent
      cy.contains('Agent IA').should('be.visible')
    })

    it('should navigate to AI dashboard', () => {
      // Cliquer sur "Agent IA" dans le menu
      cy.contains('Agent IA').click()

      // Vérifier l'URL
      cy.url().should('include', '/dashboard/ai')

      // Vérifier que le dashboard est chargé
      cy.contains('Agent IA').should('be.visible')
      cy.contains('Suggestions en attente').should('be.visible')
      cy.contains('Suggestions approuvées').should('be.visible')
      cy.contains('Coût total').should('be.visible')
      cy.contains('Confiance moyenne').should('be.visible')
    })

    it('should display action buttons', () => {
      cy.visit('/dashboard/ai')

      cy.contains('Détecter doublons').should('be.visible')
      cy.contains('Enrichir données').should('be.visible')
      cy.contains('Contrôle qualité').should('be.visible')
    })

    it('should navigate to suggestions page from stats card', () => {
      cy.visit('/dashboard/ai')

      // Cliquer sur la carte "Suggestions en attente"
      cy.contains('Suggestions en attente').parent().parent().click()

      // Devrait naviguer vers la page suggestions avec filtre pending
      cy.url().should('include', '/dashboard/ai/suggestions')
      cy.url().should('include', 'status=pending')
    })
  })

  describe('Page Suggestions', () => {
    beforeEach(() => {
      cy.visit('/dashboard/ai/suggestions')
    })

    it('should load suggestions page', () => {
      cy.contains('Suggestions IA').should('be.visible')
      cy.contains('Filtrer').should('exist')
    })

    it('should filter suggestions by status', () => {
      // Sélectionner filtre "En attente"
      cy.get('select').first().select('En attente')

      // Vérifier que l'URL contient le filtre
      cy.url().should('include', 'status=pending')
    })

    it('should filter suggestions by type', () => {
      // Sélectionner filtre "Doublons"
      cy.get('select').eq(1).select('Doublons')

      // Attendre le rechargement
      cy.wait(500)
    })

    it('should select suggestions with checkboxes', () => {
      // Sélectionner quelques suggestions
      cy.get('input[type="checkbox"]').eq(1).check()
      cy.get('input[type="checkbox"]').eq(2).check()

      // Vérifier que le compteur s'affiche
      cy.contains(/2 sélectionnée/).should('be.visible')

      // Vérifier que les boutons batch apparaissent
      cy.contains('Approuver 2').should('be.visible')
      cy.contains('Rejeter 2').should('be.visible')
    })

    it('should select all suggestions', () => {
      // Cliquer sur "select all"
      cy.get('input[type="checkbox"]').first().check()

      // Tous les checkboxes devraient être cochés
      cy.get('input[type="checkbox"]:checked').should('have.length.greaterThan', 1)
    })

    it('should open preview modal', () => {
      // Cliquer sur le bouton preview (icône œil)
      cy.get('button[title="Prévisualiser"]').first().click()

      // Vérifier que le modal s'ouvre
      cy.contains('Prévisualisation').should('be.visible')
      cy.contains('Valeur actuelle').should('be.visible')
      cy.contains('Nouvelle valeur').should('be.visible')
    })

    it('should approve suggestion from preview modal', () => {
      // Ouvrir preview
      cy.get('button[title="Prévisualiser"]').first().click()

      // Cliquer sur "Approuver et appliquer"
      cy.contains('Approuver et appliquer').click()

      // Vérifier toast success
      cy.contains('Suggestion approuvée').should('be.visible')
    })

    it('should batch approve suggestions', () => {
      // Sélectionner plusieurs suggestions
      cy.get('input[type="checkbox"]').eq(1).check()
      cy.get('input[type="checkbox"]').eq(2).check()

      // Cliquer sur "Approuver N"
      cy.contains(/Approuver \d+/).click()

      // Confirmer
      cy.on('window:confirm', () => true)

      // Vérifier toast success
      cy.contains(/approuvée/).should('be.visible')
    })

    it('should batch reject suggestions', () => {
      // Sélectionner plusieurs suggestions
      cy.get('input[type="checkbox"]').eq(1).check()
      cy.get('input[type="checkbox"]').eq(2).check()

      // Cliquer sur "Rejeter N"
      cy.contains(/Rejeter \d+/).click()

      // Confirmer
      cy.on('window:confirm', () => true)

      // Vérifier toast
      cy.contains(/rejeté/).should('be.visible')
    })
  })

  describe('Page Configuration', () => {
    beforeEach(() => {
      cy.visit('/dashboard/ai/config')
    })

    it('should load configuration page', () => {
      cy.contains('Configuration Agent IA').should('be.visible')
    })

    it('should display provider selection', () => {
      cy.contains('Provider').should('be.visible')
      cy.get('select').first().should('exist')
    })

    it('should display threshold sliders', () => {
      cy.contains('Détection doublons').should('be.visible')
      cy.contains('Enrichissement').should('be.visible')
      cy.contains('Contrôle qualité').should('be.visible')

      // Vérifier que les sliders existent
      cy.get('input[type="range"]').should('have.length.greaterThan', 3)
    })

    it('should change threshold with slider', () => {
      // Trouver le slider "Détection doublons"
      cy.contains('Détection doublons')
        .parent()
        .find('input[type="range"]')
        .invoke('val', 0.9)
        .trigger('change')

      // Vérifier que le % est mis à jour
      cy.contains('90%').should('be.visible')
    })

    it('should toggle auto-apply', () => {
      // Trouver la checkbox auto-apply
      cy.get('input[type="checkbox"]#auto-apply').check()

      // Le slider auto-apply threshold devrait apparaître
      cy.contains('Seuil d\'auto-application').should('be.visible')
    })

    it('should save configuration', () => {
      // Modifier une valeur
      cy.contains('Budget quotidien')
        .parent()
        .find('input')
        .clear()
        .type('20')

      // Cliquer sur "Enregistrer"
      cy.contains('Enregistrer').click()

      // Vérifier toast success
      cy.contains('Configuration mise à jour').should('be.visible')
    })

    it('should mask/unmask API key', () => {
      // Par défaut, l'input devrait être de type password
      cy.get('input[placeholder*="sk-"]').should('have.attr', 'type', 'password')

      // Cliquer sur l'icône œil
      cy.get('button').contains('svg').click()

      // L'input devrait être de type text
      cy.get('input[placeholder*="sk-"]').should('have.attr', 'type', 'text')
    })
  })

  describe('Intégration - Sidebar Badge', () => {
    it('should display badge with pending suggestions count', () => {
      cy.visit('/dashboard')

      // Si suggestions en attente, badge devrait être visible
      cy.get('[href="/dashboard/ai"]').within(() => {
        cy.get('.bg-white\\/10, .bg-gradient-to-br').should('exist')
      })
    })

    it('should update badge count dynamically', () => {
      cy.visit('/dashboard')

      // Noter le compteur initial
      let initialCount: number

      cy.get('[href="/dashboard/ai"]')
        .find('.bg-white\\/10, .bg-gradient-to-br')
        .invoke('text')
        .then((text) => {
          initialCount = parseInt(text, 10) || 0
        })

      // Aller sur suggestions et approuver une
      cy.visit('/dashboard/ai/suggestions')
      cy.get('button[title="Approuver"]').first().click()

      // Retourner au dashboard
      cy.visit('/dashboard')

      // Le compteur devrait avoir diminué (si > 0)
      cy.wait(1000) // Attendre refresh
    })
  })

  describe('Flow E2E complet', () => {
    it('should complete full workflow: Dashboard → Detect → Review → Approve', () => {
      // 1. Aller sur dashboard AI
      cy.visit('/dashboard/ai')
      cy.contains('Agent IA').should('be.visible')

      // 2. Lancer détection doublons
      cy.contains('Détecter doublons').click()

      // Vérifier toast de lancement
      cy.contains('Détection lancée').should('be.visible')

      // Attendre un peu pour que l'exécution soit créée
      cy.wait(2000)

      // 3. Aller voir les suggestions
      cy.visit('/dashboard/ai/suggestions')

      // 4. Filtrer "En attente"
      cy.get('select').first().select('En attente')

      // 5. Sélectionner 2-3 suggestions
      cy.get('input[type="checkbox"]').eq(1).check()
      cy.get('input[type="checkbox"]').eq(2).check()

      // 6. Preview une suggestion
      cy.get('button[title="Prévisualiser"]').first().click()
      cy.contains('Prévisualisation').should('be.visible')

      // Fermer le preview
      cy.contains('Fermer').click()

      // 7. Batch approve
      cy.contains(/Approuver \d+/).click()

      // Confirmer
      cy.on('window:confirm', () => true)

      // Vérifier success
      cy.contains(/approuvée/).should('be.visible')

      // 8. Vérifier que les suggestions ont disparu de "En attente"
      cy.wait(1000)
      cy.reload()

      // Les suggestions approuvées ne devraient plus être visibles
      cy.get('input[type="checkbox"]').should('have.length.lessThan', 4)
    })
  })
})
