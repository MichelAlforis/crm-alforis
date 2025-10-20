/**
 * Scraper CNMV - Contacts & People
 *
 * Extrait les personnes associées aux entités CNMV:
 * - Directeurs généraux / CEOs
 * - Directeurs commerciaux
 * - Contacts clés
 *
 * Sources:
 * - Pages de détail CNMV
 * - LinkedIn Spain
 * - Sites web des sociétés
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const INPUT_FILE_SGIIC = path.join(__dirname, '../../cnmv_sgiic_raw.json');
const INPUT_FILE_ENTITIES = path.join(__dirname, '../../cnmv_entities_raw.json');
const OUTPUT_FILE = path.join(__dirname, '../../cnmv_contacts_raw.json');

async function scrapeCNMVContacts() {
    console.log('🇪🇸 Starting CNMV Contacts scraper...');

    // Load input files
    let companies = [];
    try {
        const sgiicData = await fs.readFile(INPUT_FILE_SGIIC, 'utf-8');
        companies = JSON.parse(sgiicData);
        console.log(`📁 Loaded ${companies.length} SGIIC companies`);
    } catch (error) {
        console.log('⚠️  Could not load SGIIC data:', error.message);
    }

    // Also try to load entities
    try {
        const entitiesData = await fs.readFile(INPUT_FILE_ENTITIES, 'utf-8');
        const entities = JSON.parse(entitiesData);
        console.log(`📁 Loaded ${entities.length} entities`);
        companies = [...companies, ...entities];
    } catch (error) {
        console.log('⚠️  Could not load entities data:', error.message);
    }

    if (companies.length === 0) {
        console.error('❌ No companies to process. Run scrapers first.');
        return [];
    }

    console.log(`📊 Total companies to process: ${companies.length}`);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1920x1080'
        ]
    });

    const allContacts = [];

    try {
        const page = await browser.newPage();

        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });

        // Process companies with websites
        const companiesWithWebsites = companies.filter(c => c.website);
        console.log(`🌐 Found ${companiesWithWebsites.length} companies with websites`);

        // Limit to top 30 companies for now
        const toProcess = companiesWithWebsites.slice(0, 30);

        for (let i = 0; i < toProcess.length; i++) {
            const company = toProcess[i];
            console.log(`\n[${i + 1}/${toProcess.length}] ${company.name}`);

            try {
                // Try to find contact page
                let websiteUrl = company.website;

                // Ensure URL has protocol
                if (!websiteUrl.match(/^https?:\/\//)) {
                    websiteUrl = 'https://' + websiteUrl;
                }

                console.log(`  🌐 Visiting: ${websiteUrl}`);

                await page.goto(websiteUrl, {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });

                await page.waitForTimeout(2000);

                // Look for contact/team/about pages
                const links = await page.evaluate(() => {
                    const contactKeywords = [
                        'contact', 'contacto', 'equipo', 'team',
                        'about', 'nosotros', 'quienes', 'management',
                        'dirección', 'direccion', 'liderazgo'
                    ];

                    const allLinks = Array.from(document.querySelectorAll('a'));
                    const relevantLinks = [];

                    allLinks.forEach(link => {
                        const text = link.textContent.toLowerCase().trim();
                        const href = link.href;

                        if (contactKeywords.some(kw => text.includes(kw) || href.toLowerCase().includes(kw))) {
                            relevantLinks.push({
                                text,
                                href
                            });
                        }
                    });

                    return relevantLinks;
                });

                console.log(`  📋 Found ${links.length} relevant links`);

                // Try to extract contacts from main page first
                const mainPageContacts = await page.evaluate((companyName) => {
                    const contacts = [];
                    const text = document.body.innerText;

                    // Look for email patterns
                    const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/g;
                    const emails = text.match(emailRegex) || [];

                    emails.forEach(email => {
                        if (!email.includes('example') && !email.includes('test')) {
                            contacts.push({
                                company_name: companyName,
                                email: email,
                                source: 'website_main',
                                first_name: '',
                                last_name: '',
                                job_title: '',
                                phone: ''
                            });
                        }
                    });

                    // Look for phone numbers
                    const phoneRegex = /(\+34|0034)?\s*\d{2,3}\s*\d{3}\s*\d{3}\s*\d{3}/g;
                    const phones = text.match(phoneRegex) || [];

                    if (phones.length > 0 && contacts.length > 0) {
                        contacts[0].phone = phones[0].trim();
                    }

                    return contacts;
                }, company.name);

                if (mainPageContacts.length > 0) {
                    console.log(`  ✅ Found ${mainPageContacts.length} contacts on main page`);
                    allContacts.push(...mainPageContacts);
                }

                // Visit contact/team pages
                for (const link of links.slice(0, 3)) {
                    try {
                        console.log(`    📄 Visiting: ${link.text}`);

                        await page.goto(link.href, {
                            waitUntil: 'networkidle2',
                            timeout: 20000
                        });

                        await page.waitForTimeout(1500);

                        const pageContacts = await page.evaluate((companyName) => {
                            const contacts = [];
                            const text = document.body.innerText;

                            // Look for people sections
                            const sections = document.querySelectorAll(
                                '.team-member, .contact-person, .staff, .employee, .management, .executive'
                            );

                            sections.forEach(section => {
                                const contact = {
                                    company_name: companyName,
                                    first_name: '',
                                    last_name: '',
                                    job_title: '',
                                    email: '',
                                    phone: '',
                                    source: 'website_team'
                                };

                                // Try to extract name
                                const nameEl = section.querySelector('.name, h3, h4, strong');
                                if (nameEl) {
                                    const fullName = nameEl.textContent.trim();
                                    const parts = fullName.split(' ');
                                    if (parts.length >= 2) {
                                        contact.first_name = parts[0];
                                        contact.last_name = parts.slice(1).join(' ');
                                    }
                                }

                                // Try to extract job title
                                const titleEl = section.querySelector('.title, .position, .role');
                                if (titleEl) {
                                    contact.job_title = titleEl.textContent.trim();
                                }

                                // Extract email
                                const emailMatch = section.innerText.match(/[\w\.-]+@[\w\.-]+\.\w+/);
                                if (emailMatch) {
                                    contact.email = emailMatch[0];
                                }

                                if (contact.first_name || contact.email) {
                                    contacts.push(contact);
                                }
                            });

                            // If no structured sections, look for general patterns
                            if (contacts.length === 0) {
                                const emails = text.match(/[\w\.-]+@[\w\.-]+\.\w+/g) || [];

                                emails.forEach(email => {
                                    if (!email.includes('example') && !email.includes('info@')) {
                                        contacts.push({
                                            company_name: companyName,
                                            email: email,
                                            source: 'website_contact',
                                            first_name: '',
                                            last_name: '',
                                            job_title: '',
                                            phone: ''
                                        });
                                    }
                                });
                            }

                            return contacts;
                        }, company.name);

                        if (pageContacts.length > 0) {
                            console.log(`      ✅ Found ${pageContacts.length} contacts`);
                            allContacts.push(...pageContacts);
                        }

                    } catch (error) {
                        console.log(`      ⚠️  Error: ${error.message}`);
                    }
                }

            } catch (error) {
                console.log(`  ❌ Error processing ${company.name}: ${error.message}`);
            }

            // Rate limiting
            await page.waitForTimeout(2000 + Math.random() * 2000);
        }

        // Deduplicate contacts by email
        const uniqueContacts = [];
        const seenEmails = new Set();

        for (const contact of allContacts) {
            const key = contact.email.toLowerCase().trim();
            if (!seenEmails.has(key) && key.length > 0) {
                seenEmails.add(key);
                uniqueContacts.push(contact);
            }
        }

        console.log(`\n🔄 Deduplicated: ${allContacts.length} → ${uniqueContacts.length} contacts`);

        // Save results
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(uniqueContacts, null, 2), 'utf-8');
        console.log(`💾 Saved to ${OUTPUT_FILE}`);

        // Generate summary
        const summary = {
            total_contacts: uniqueContacts.length,
            with_full_name: uniqueContacts.filter(c => c.first_name && c.last_name).length,
            with_job_title: uniqueContacts.filter(c => c.job_title).length,
            with_phone: uniqueContacts.filter(c => c.phone).length,
            by_source: {}
        };

        uniqueContacts.forEach(contact => {
            const src = contact.source || 'unknown';
            summary.by_source[src] = (summary.by_source[src] || 0) + 1;
        });

        console.log('\n📊 Summary:');
        console.log(JSON.stringify(summary, null, 2));

        return uniqueContacts;

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await browser.close();
    }
}

// Run if called directly
if (require.main === module) {
    scrapeCNMVContacts()
        .then(() => {
            console.log('✅ CNMV Contacts scraping completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { scrapeCNMVContacts };
