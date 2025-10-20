#!/usr/bin/env node
/**
 * LinkedIn Sales Directors Scraper - Luxembourg (CSSF)
 *
 * Extrait les directeurs commerciaux des sociétés de gestion luxembourgeoises
 * depuis LinkedIn en utilisant les recherches ciblées
 *
 * Adapté du scraper CNMV pour le marché luxembourgeois
 *
 * Usage:
 *   node scripts/cssf/scraper_linkedin_sales_directors.js
 *
 * Environment variables:
 *   LINKEDIN_EMAIL (optional) - LinkedIn login for authenticated scraping
 *   LINKEDIN_PASSWORD (optional) - LinkedIn password
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '../..');
const INPUT_FILE = path.join(PROJECT_ROOT, 'data/cssf/cssf_companies_enriched.json');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'data/cssf/cssf_sales_directors_linkedin.json');

const LINKEDIN_EMAIL = process.env.LINKEDIN_EMAIL;
const LINKEDIN_PASSWORD = process.env.LINKEDIN_PASSWORD;

// Job titles to search for (French, English, German)
const SALES_TITLES = [
  // French (primary)
  'Directeur Commercial',
  'Directrice Commerciale',
  'Responsable Commercial',
  'Directeur Développement',
  'Head of Sales',
  'Sales Director',
  'Business Development Director',

  // German (common in Luxembourg)
  'Vertriebsleiter',
  'Vertriebsdirektor',

  // Senior roles
  'Chief Commercial Officer',
  'CCO',
  'VP Sales',
];

// Rate limiting
const DELAY_BETWEEN_SEARCHES = 5000; // 5 seconds
const DELAY_BETWEEN_COMPANIES = 10000; // 10 seconds
const MAX_RESULTS_PER_COMPANY = 3;

/**
 * Main scraper class
 */
class LinkedInSalesScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = [];
    this.stats = {
      total_companies: 0,
      companies_processed: 0,
      contacts_found: 0,
      errors: 0
    };
  }

  /**
   * Initialize browser
   */
  async init() {
    console.log('🚀 Initializing LinkedIn scraper for Luxembourg...\n');

    this.browser = await puppeteer.launch({
      headless: false, // Set to true for production
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    this.page = await this.browser.newPage();

    // Set user agent
    await this.page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Set viewport
    await this.page.setViewport({ width: 1920, height: 1080 });

    console.log('✅ Browser initialized\n');
  }

  /**
   * Login to LinkedIn (if credentials provided)
   */
  async login() {
    if (!LINKEDIN_EMAIL || !LINKEDIN_PASSWORD) {
      console.log('⚠️  No LinkedIn credentials - using anonymous mode');
      console.log('   Limited to ~3 results per search\n');
      return false;
    }

    console.log('🔐 Logging into LinkedIn...');

    try {
      await this.page.goto('https://www.linkedin.com/login', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Fill login form
      await this.page.type('#username', LINKEDIN_EMAIL);
      await this.page.type('#password', LINKEDIN_PASSWORD);

      // Click login button
      await this.page.click('button[type="submit"]');

      // Wait for navigation
      await this.page.waitForNavigation({
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      console.log('✅ Logged in successfully\n');
      return true;

    } catch (error) {
      console.error('❌ Login failed:', error.message);
      console.log('   Continuing in anonymous mode\n');
      return false;
    }
  }

  /**
   * Load enriched companies data
   */
  async loadCompanies() {
    try {
      const data = await fs.readFile(INPUT_FILE, 'utf-8');
      const companies = JSON.parse(data);

      // Filter Tier 1 and Tier 2 with AUM > 1 billion
      const filtered = companies.filter(c => {
        const tier = c.company_tier || c.tier_strategique;
        const aum = c.company_aum || c.aum || 0;

        return (tier === 'Tier 1' || tier === 1) && aum >= 1000;
      });

      console.log(`📊 Loaded ${companies.length} companies`);
      console.log(`🎯 Filtered: ${filtered.length} Tier 1 companies with AUM > 1Bn€\n`);

      this.stats.total_companies = filtered.length;

      return filtered;

    } catch (error) {
      console.error('❌ Error loading companies:', error.message);
      console.log('\n💡 Tip: Run enrichment first:');
      console.log('   ./scripts/cssf/demo_cssf.sh --tier 1 --dry-run\n');
      throw error;
    }
  }

  /**
   * Search for sales directors at a company
   */
  async searchCompany(company) {
    const companyName = company.nom || company.name || '';
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`🏢 ${companyName}`);
    console.log(`   AUM: ${(company.aum || 0).toLocaleString()}M€`);
    console.log(`${'─'.repeat(70)}`);

    const contacts = [];

    // Build search queries
    const searchQueries = SALES_TITLES.slice(0, 3).map(title =>
      `${title} ${companyName} Luxembourg`
    );

    for (const query of searchQueries) {
      console.log(`\n🔍 Searching: "${query}"`);

      try {
        // Navigate to LinkedIn search
        const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`;

        await this.page.goto(searchUrl, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // Wait for results
        await this.page.waitForTimeout(3000);

        // Extract profile cards
        const profiles = await this.page.evaluate(() => {
          const cards = document.querySelectorAll('.entity-result__item');
          const results = [];

          cards.forEach(card => {
            try {
              const nameEl = card.querySelector('.entity-result__title-text a');
              const titleEl = card.querySelector('.entity-result__primary-subtitle');
              const locationEl = card.querySelector('.entity-result__secondary-subtitle');

              if (nameEl) {
                results.push({
                  name: nameEl.innerText.trim(),
                  profile_url: nameEl.href,
                  job_title: titleEl ? titleEl.innerText.trim() : '',
                  location: locationEl ? locationEl.innerText.trim() : ''
                });
              }
            } catch (e) {
              // Skip invalid cards
            }
          });

          return results;
        });

        console.log(`   Found ${profiles.length} profiles`);

        // Filter and add to contacts
        for (const profile of profiles.slice(0, MAX_RESULTS_PER_COMPANY)) {
          // Verify location is Luxembourg
          if (profile.location.toLowerCase().includes('luxembourg')) {
            // Split name
            const nameParts = profile.name.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            contacts.push({
              first_name: firstName,
              last_name: lastName,
              name: profile.name,
              job_title: profile.job_title,
              company_name: companyName,
              company_tier: company.tier_strategique || 'Tier 1',
              company_aum: company.aum || 0,
              country_code: 'LU',
              language: 'FR',
              linkedin_url: profile.profile_url,
              source: 'linkedin',
              notes: `Trouvé via: ${query}`
            });

            console.log(`   ✓ ${profile.name} - ${profile.job_title}`);
          }
        }

        // Rate limiting
        await this.page.waitForTimeout(DELAY_BETWEEN_SEARCHES);

      } catch (error) {
        console.error(`   ❌ Error searching: ${error.message}`);
        this.stats.errors++;
      }
    }

    this.stats.companies_processed++;
    this.stats.contacts_found += contacts.length;

    return contacts;
  }

  /**
   * Run scraper for all companies
   */
  async scrapeAll() {
    const companies = await this.loadCompanies();

    console.log('🏃 Starting scraping process...\n');

    for (const company of companies) {
      const contacts = await this.searchCompany(company);
      this.results.push(...contacts);

      // Rate limiting between companies
      await this.page.waitForTimeout(DELAY_BETWEEN_COMPANIES);

      // Progress
      console.log(`\n📊 Progress: ${this.stats.companies_processed}/${this.stats.total_companies}`);
      console.log(`   Contacts found: ${this.stats.contacts_found}`);
    }
  }

  /**
   * Save results
   */
  async saveResults() {
    console.log('\n💾 Saving results...');

    // Ensure output directory exists
    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });

    // Save JSON
    await fs.writeFile(
      OUTPUT_FILE,
      JSON.stringify(this.results, null, 2),
      'utf-8'
    );

    console.log(`✅ Saved ${this.results.length} contacts to:`);
    console.log(`   ${OUTPUT_FILE}\n`);
  }

  /**
   * Print summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 SCRAPING SUMMARY - LinkedIn Luxembourg');
    console.log('='.repeat(70));
    console.log(`\nCompanies processed: ${this.stats.companies_processed}/${this.stats.total_companies}`);
    console.log(`Contacts found: ${this.stats.contacts_found}`);
    console.log(`Errors: ${this.stats.errors}`);

    if (this.results.length > 0) {
      // Group by company
      const byCompany = {};
      this.results.forEach(c => {
        byCompany[c.company_name] = (byCompany[c.company_name] || 0) + 1;
      });

      console.log('\nTop companies by contacts:');
      Object.entries(byCompany)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([company, count]) => {
          console.log(`  ${company}: ${count}`);
        });
    }

    console.log('\n' + '='.repeat(70) + '\n');
  }

  /**
   * Cleanup
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const scraper = new LinkedInSalesScraper();

  try {
    await scraper.init();
    await scraper.login();
    await scraper.scrapeAll();
    await scraper.saveResults();
    scraper.printSummary();

    console.log('✅ LinkedIn scraping completed successfully!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);

  } finally {
    await scraper.close();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = LinkedInSalesScraper;
