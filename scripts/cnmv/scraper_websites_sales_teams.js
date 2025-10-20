/**
 * Scraper Websites - Sales Teams
 *
 * Extrait les équipes commerciales depuis les sites web des sociétés de gestion
 *
 * Pages cibles :
 * - /equipo
 * - /team
 * - /management
 * - /contacto
 * - /distribucion
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const INPUT_COMPANIES = path.join(__dirname, '../../cnmv_enriched_with_aum.json');
const OUTPUT_FILE = path.join(__dirname, '../../cnmv_sales_teams_websites.json');

// Sales-related keywords (Spanish + English)
const SALES_KEYWORDS = [
    'comercial', 'ventas', 'distribución', 'distribucion',
    'sales', 'distribution', 'business development',
    'desarrollo de negocio', 'relaciones con inversores'
];

// Common URL patterns for team pages
const TEAM_URL_PATTERNS = [
    '/equipo',
    '/team',
    '/nuestro-equipo',
    '/our-team',
    '/management',
    '/direccion',
    '/about/team',
    '/quienes-somos/equipo',
    '/company/team',
    '/contacto',
    '/contact'
];

async function findTeamPages(page, baseUrl) {
    console.log(`  🔍 Looking for team pages...`);

    const teamUrls = [];

    try {
        await page.goto(baseUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await page.waitForTimeout(2000);

        // Extract all links
        const allLinks = await page.evaluate(() => {
            const links = [];
            document.querySelectorAll('a').forEach(link => {
                links.push({
                    text: link.textContent.trim().toLowerCase(),
                    href: link.href
                });
            });
            return links;
        });

        // Filter team-related links
        for (const link of allLinks) {
            const text = link.text;
            const href = link.href.toLowerCase();

            // Check if link text or URL contains team-related keywords
            const isTeamLink =
                text.includes('equipo') || text.includes('team') ||
                text.includes('management') || text.includes('dirección') ||
                text.includes('quiénes somos') || text.includes('about') ||
                href.includes('/equipo') || href.includes('/team') ||
                href.includes('/management') || href.includes('/about');

            if (isTeamLink && !teamUrls.includes(link.href)) {
                teamUrls.push(link.href);
            }
        }

        // Also try common URL patterns
        const urlObj = new URL(baseUrl);
        const baseOrigin = urlObj.origin;

        for (const pattern of TEAM_URL_PATTERNS) {
            const testUrl = baseOrigin + pattern;
            if (!teamUrls.includes(testUrl)) {
                teamUrls.push(testUrl);
            }
        }

    } catch (error) {
        console.log(`    ⚠️  Error finding team pages: ${error.message}`);
    }

    console.log(`    Found ${teamUrls.length} potential team pages`);
    return teamUrls;
}

async function extractSalesContacts(page, url) {
    console.log(`  📄 Scraping: ${url}`);

    const contacts = [];

    try {
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await page.waitForTimeout(2000);

        // Extract structured team members
        const teamMembers = await page.evaluate((salesKeywords) => {
            const members = [];

            // Try to find team member cards/sections
            const selectors = [
                '.team-member', '.equipo-miembro', '.member', '.person',
                '.staff', '.employee', '.executive', '.management-team'
            ];

            let foundMembers = [];
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    foundMembers = Array.from(elements);
                    break;
                }
            }

            // If no structured elements, try to find by heading + content pattern
            if (foundMembers.length === 0) {
                // Look for sections with people names (capitalized words)
                const allText = document.body.innerText;
                const lines = allText.split('\n');

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();

                    // Check if line looks like a name (2+ capitalized words)
                    const namePattern = /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+/;
                    if (namePattern.test(line)) {
                        // Check next lines for job title
                        const nextLines = lines.slice(i + 1, i + 4).join(' ').toLowerCase();

                        // Check if contains sales keywords
                        if (salesKeywords.some(kw => nextLines.includes(kw))) {
                            members.push({
                                name: line,
                                title: lines[i + 1]?.trim() || '',
                                context: nextLines
                            });
                        }
                    }
                }
            } else {
                // Extract from structured elements
                foundMembers.forEach(member => {
                    const nameEl = member.querySelector('h2, h3, h4, .name, .nombre');
                    const titleEl = member.querySelector('.title, .position, .cargo, .puesto');
                    const emailEl = member.querySelector('a[href^="mailto:"]');

                    const name = nameEl ? nameEl.textContent.trim() : '';
                    const title = titleEl ? titleEl.textContent.trim() : '';
                    const email = emailEl ? emailEl.textContent.trim() : '';

                    // Check if title contains sales keywords
                    const titleLower = title.toLowerCase();
                    if (salesKeywords.some(kw => titleLower.includes(kw))) {
                        members.push({
                            name: name,
                            title: title,
                            email: email || null
                        });
                    }
                });
            }

            return members;
        }, SALES_KEYWORDS);

        if (teamMembers.length > 0) {
            console.log(`    ✅ Found ${teamMembers.length} sales contacts`);
            contacts.push(...teamMembers);
        }

    } catch (error) {
        console.log(`    ⚠️  Error scraping page: ${error.message}`);
    }

    return contacts;
}

async function scrapeCompanySalesTeam(page, company) {
    console.log(`\n🏢 ${company.name}`);
    console.log(`  Tier: ${company.tier} | AUM: ${company.aum} Bn€`);

    if (!company.original_data?.website) {
        console.log(`  ⚠️  No website available`);
        return [];
    }

    let website = company.original_data.website;

    // Ensure URL has protocol
    if (!website.match(/^https?:\/\//)) {
        website = 'https://' + website;
    }

    console.log(`  🌐 Website: ${website}`);

    const allContacts = [];

    try {
        // Find team pages
        const teamUrls = await findTeamPages(page, website);

        // Scrape each team page
        for (const teamUrl of teamUrls.slice(0, 5)) {  // Limit to 5 pages per company
            const contacts = await extractSalesContacts(page, teamUrl);

            contacts.forEach(contact => {
                contact.source_url = teamUrl;
            });

            allContacts.push(...contacts);

            // Rate limiting
            await page.waitForTimeout(1500);
        }

        // Deduplicate by name
        const unique = [];
        const seen = new Set();

        for (const contact of allContacts) {
            const key = contact.name.toLowerCase().trim();
            if (key && !seen.has(key)) {
                seen.add(key);
                unique.push(contact);
            }
        }

        return unique;

    } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        return [];
    }
}

async function scrapeWebsitesSalesTeams() {
    console.log('🇪🇸 Website Sales Teams Scraper');
    console.log('='*60);

    // Load companies (Tier 1 and 2)
    let companies = [];
    try {
        const data = await fs.readFile(INPUT_COMPANIES, 'utf-8');
        const allCompanies = JSON.parse(data);

        // Filter Tier 1 and 2 with websites
        companies = allCompanies.filter(c =>
            (c.tier === 'Tier 1' || c.tier === 'Tier 2') &&
            c.original_data?.website
        );

        console.log(`\n📊 Loaded ${companies.length} Tier 1-2 companies with websites`);

    } catch (error) {
        console.error('❌ Error loading companies:', error.message);
        return;
    }

    if (companies.length === 0) {
        console.log('❌ No companies to process');
        return;
    }

    const browser = await puppeteer.launch({
        headless: 'new',
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

        // Process companies
        let processed = 0;

        for (const company of companies) {
            processed++;
            console.log(`\n[${processed}/${companies.length}]`);

            const contacts = await scrapeCompanySalesTeam(page, company);

            if (contacts.length > 0) {
                console.log(`  ✅ Extracted ${contacts.length} sales contacts`);

                // Add company metadata
                contacts.forEach(contact => {
                    contact.company_name = company.name;
                    contact.company_tier = company.tier;
                    contact.company_aum = company.aum;
                    contact.company_website = company.original_data.website;
                    contact.country_code = 'ES';
                    contact.language = 'ES';
                    contact.source = 'Website';
                    contact.scraped_at = new Date().toISOString();
                });

                allContacts.push(...contacts);
            }

            // Rate limiting
            await page.waitForTimeout(3000 + Math.random() * 2000);
        }

        // Save results
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(allContacts, null, 2), 'utf-8');
        console.log(`\n💾 Saved ${allContacts.length} contacts to ${OUTPUT_FILE}`);

        // Summary
        console.log('\n' + '='*60);
        console.log('📊 SUMMARY');
        console.log('='*60);
        console.log(`Total companies processed: ${processed}`);
        console.log(`Total sales contacts found: ${allContacts.length}`);
        console.log(`Average per company: ${(allContacts.length / processed).toFixed(1)}`);

        const withEmail = allContacts.filter(c => c.email).length;
        console.log(`\nWith email: ${withEmail}`);

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
    scrapeWebsitesSalesTeams()
        .then(() => {
            console.log('\n✅ Website scraping completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { scrapeWebsitesSalesTeams };
