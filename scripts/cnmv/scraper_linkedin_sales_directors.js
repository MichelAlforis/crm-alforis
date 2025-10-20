/**
 * Scraper LinkedIn - Sales Directors
 *
 * Extrait les directeurs commerciaux des sociétés de gestion espagnoles
 *
 * Postes recherchés (en espagnol) :
 * - Director Comercial
 * - Director de Ventas
 * - Director de Distribución
 * - Head of Sales
 * - Head of Distribution
 * - Responsable Comercial
 *
 * IMPORTANT: Nécessite LinkedIn Sales Navigator ou compte LinkedIn Premium
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const INPUT_COMPANIES = path.join(__dirname, '../../cnmv_enriched_with_aum.json');
const OUTPUT_FILE = path.join(__dirname, '../../cnmv_sales_directors.json');

// Job titles to search for (Spanish)
const SALES_TITLES = [
    'Director Comercial',
    'Director de Ventas',
    'Director de Distribución',
    'Directora Comercial',
    'Head of Sales',
    'Head of Distribution',
    'Responsable Comercial',
    'Director de Desarrollo de Negocio',
    'Chief Commercial Officer',
    'CCO',
    'VP Sales',
    'VP Ventas'
];

// LinkedIn login credentials (from environment)
const LINKEDIN_EMAIL = process.env.LINKEDIN_EMAIL || '';
const LINKEDIN_PASSWORD = process.env.LINKEDIN_PASSWORD || '';

async function loginToLinkedIn(page) {
    console.log('🔐 Logging into LinkedIn...');

    if (!LINKEDIN_EMAIL || !LINKEDIN_PASSWORD) {
        console.log('⚠️  LinkedIn credentials not set in environment');
        console.log('   Set LINKEDIN_EMAIL and LINKEDIN_PASSWORD');
        console.log('   Or login will be skipped (rate limited results)');
        return false;
    }

    try {
        await page.goto('https://www.linkedin.com/login', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Fill email
        await page.type('#username', LINKEDIN_EMAIL);
        await page.type('#password', LINKEDIN_PASSWORD);

        // Click login
        await page.click('button[type="submit"]');

        // Wait for redirect
        await page.waitForNavigation({ timeout: 30000 });

        console.log('✓ Logged into LinkedIn');
        return true;

    } catch (error) {
        console.log(`⚠️  LinkedIn login failed: ${error.message}`);
        return false;
    }
}

async function searchSalesDirector(page, companyName, loggedIn) {
    console.log(`\n🔍 Searching sales directors for: ${companyName}`);

    const contacts = [];

    for (const title of SALES_TITLES) {
        try {
            // Build LinkedIn search URL
            const searchQuery = `${title} ${companyName}`;
            const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchQuery)}`;

            console.log(`  Trying: "${title}"`);

            await page.goto(searchUrl, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            await page.waitForTimeout(2000);

            // Extract results
            const results = await page.evaluate(() => {
                const people = [];

                // LinkedIn result selectors
                const resultCards = document.querySelectorAll('.entity-result');

                resultCards.forEach(card => {
                    const nameEl = card.querySelector('.entity-result__title-text a');
                    const titleEl = card.querySelector('.entity-result__primary-subtitle');
                    const locationEl = card.querySelector('.entity-result__secondary-subtitle');

                    if (nameEl) {
                        const person = {
                            name: nameEl.textContent.trim(),
                            linkedin_url: nameEl.href,
                            job_title: titleEl ? titleEl.textContent.trim() : '',
                            location: locationEl ? locationEl.textContent.trim() : ''
                        };

                        people.push(person);
                    }
                });

                return people;
            });

            if (results.length > 0) {
                console.log(`    ✓ Found ${results.length} results`);
                contacts.push(...results);

                // Stop after first successful search
                break;
            }

        } catch (error) {
            console.log(`    ⚠️  Error: ${error.message}`);
        }

        // Rate limiting
        await page.waitForTimeout(3000 + Math.random() * 2000);
    }

    // Deduplicate by LinkedIn URL
    const unique = [];
    const seen = new Set();

    for (const contact of contacts) {
        if (!seen.has(contact.linkedin_url)) {
            seen.add(contact.linkedin_url);
            unique.push(contact);
        }
    }

    return unique;
}

async function scrapeLinkedInSalesDirectors() {
    console.log('🇪🇸 LinkedIn Sales Directors Scraper');
    console.log('='*60);

    // Load companies (prioritize Tier 1 and 2)
    let companies = [];
    try {
        const data = await fs.readFile(INPUT_COMPANIES, 'utf-8');
        const allCompanies = JSON.parse(data);

        // Filter Tier 1 and 2 (most important)
        companies = allCompanies.filter(c => c.tier === 'Tier 1' || c.tier === 'Tier 2');

        console.log(`\n📊 Loaded ${companies.length} Tier 1-2 companies`);

    } catch (error) {
        console.error('❌ Error loading companies:', error.message);
        console.log('   Make sure to run enrichment first');
        return;
    }

    if (companies.length === 0) {
        console.log('❌ No companies to process');
        return;
    }

    const browser = await puppeteer.launch({
        headless: false,  // Show browser for LinkedIn (CAPTCHA may appear)
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1920,1080'
        ]
    });

    const allContacts = [];

    try {
        const page = await browser.newPage();

        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        // Try to login
        const loggedIn = await loginToLinkedIn(page);

        if (!loggedIn) {
            console.log('\n⚠️  WARNING: Not logged in to LinkedIn');
            console.log('   Results will be limited (max 2-3 per search)');
            console.log('   Set LINKEDIN_EMAIL and LINKEDIN_PASSWORD for better results\n');
        }

        // Process companies
        let processed = 0;
        const limit = 20;  // Limit to avoid rate limiting

        for (const company of companies.slice(0, limit)) {
            processed++;
            console.log(`\n[${processed}/${Math.min(limit, companies.length)}] ${company.name}`);
            console.log(`  Tier: ${company.tier} | AUM: ${company.aum} Bn€`);

            const contacts = await searchSalesDirector(page, company.name, loggedIn);

            if (contacts.length > 0) {
                console.log(`  ✅ Found ${contacts.length} sales directors`);

                // Add company info
                contacts.forEach(contact => {
                    contact.company_name = company.name;
                    contact.company_tier = company.tier;
                    contact.company_aum = company.aum;
                    contact.source = 'LinkedIn';
                    contact.scraped_at = new Date().toISOString();
                });

                allContacts.push(...contacts);
            } else {
                console.log(`  ⚠️  No sales directors found`);
            }

            // Rate limiting
            await page.waitForTimeout(5000 + Math.random() * 3000);
        }

        // Save results
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(allContacts, null, 2), 'utf-8');
        console.log(`\n💾 Saved ${allContacts.length} contacts to ${OUTPUT_FILE}`);

        // Summary
        console.log('\n' + '='*60);
        console.log('📊 SUMMARY');
        console.log('='*60);
        console.log(`Total companies processed: ${processed}`);
        console.log(`Total sales directors found: ${allContacts.length}`);
        console.log(`Average per company: ${(allContacts.length / processed).toFixed(1)}`);

        // By tier
        const tier1 = allContacts.filter(c => c.company_tier === 'Tier 1').length;
        const tier2 = allContacts.filter(c => c.company_tier === 'Tier 2').length;

        console.log(`\nTier 1 contacts: ${tier1}`);
        console.log(`Tier 2 contacts: ${tier2}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
    }
}

// Run if called directly
if (require.main === module) {
    scrapeLinkedInSalesDirectors()
        .then(() => {
            console.log('\n✅ LinkedIn scraping completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { scrapeLinkedInSalesDirectors };
