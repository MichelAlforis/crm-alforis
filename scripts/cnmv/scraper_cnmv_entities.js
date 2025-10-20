/**
 * Scraper CNMV - Entities Hub
 *
 * Source: https://www.cnmv.es/portal/Consultas/Entidades.aspx
 *
 * Extrait:
 * - Branches EEE (European Economic Area)
 * - LPS (Limited Partnership Schemes)
 * - Délégués (Delegates)
 * - Autres entités financières
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const CNMV_ENTITIES_URL = 'https://www.cnmv.es/portal/Consultas/Entidades.aspx?lang=en';
const OUTPUT_FILE = path.join(__dirname, '../../cnmv_entities_raw.json');

// Entity types to search for
const ENTITY_TYPES = [
    'Investment firms',
    'Investment services firms',
    'Credit institutions',
    'Management companies',
    'Foreign branches',
    'EEA branches',
    'Third country branches',
    'Portfolio management companies',
    'Collective investment schemes'
];

async function scrapeCNMVEntities() {
    console.log('🇪🇸 Starting CNMV Entities Hub scraper...');

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

    const allEntities = [];

    try {
        const page = await browser.newPage();

        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });

        console.log('📡 Loading CNMV Entities Hub...');
        await page.goto(CNMV_ENTITIES_URL, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // Wait for the page to load
        await page.waitForSelector('body', { timeout: 30000 });

        console.log('🔍 Analyzing page structure...');

        // Check for search forms, filters, or entity type selectors
        const pageStructure = await page.evaluate(() => {
            return {
                forms: document.querySelectorAll('form').length,
                selects: Array.from(document.querySelectorAll('select')).map(s => ({
                    id: s.id,
                    name: s.name,
                    options: Array.from(s.options).map(o => o.textContent.trim())
                })),
                links: Array.from(document.querySelectorAll('a')).map(a => ({
                    text: a.textContent.trim(),
                    href: a.href
                })).filter(l => l.text.length > 0 && l.text.length < 100),
                tables: document.querySelectorAll('table').length,
                hasGrid: !!document.querySelector('.grid, .results, .entity-list')
            };
        });

        console.log('📋 Page structure:', JSON.stringify(pageStructure, null, 2));

        // Try to extract entities directly from the page
        console.log('📊 Extracting entities from main page...');

        const mainPageEntities = await page.evaluate(() => {
            const results = [];

            // Look for tables
            const tables = document.querySelectorAll('table');

            tables.forEach(table => {
                const rows = table.querySelectorAll('tr');
                if (rows.length < 2) return;

                // Get headers
                const headerRow = rows[0];
                const headers = Array.from(headerRow.querySelectorAll('th, td')).map(cell =>
                    cell.textContent.trim().toLowerCase()
                );

                // Process data rows
                for (let i = 1; i < rows.length; i++) {
                    const cells = rows[i].querySelectorAll('td');
                    if (cells.length === 0) continue;

                    const entity = {
                        name: '',
                        type: '',
                        register_number: '',
                        status: '',
                        country: 'España',
                        country_code: 'ES',
                        raw_data: []
                    };

                    cells.forEach((cell, idx) => {
                        const text = cell.textContent.trim();
                        entity.raw_data.push(text);

                        // Try to map to fields
                        const header = headers[idx] || '';

                        if (header.includes('nombre') || header.includes('name') || idx === 0) {
                            if (text.length > 3) entity.name = text;
                        } else if (header.includes('tipo') || header.includes('type')) {
                            entity.type = text;
                        } else if (header.includes('registro') || header.includes('register')) {
                            entity.register_number = text;
                        } else if (header.includes('estado') || header.includes('status')) {
                            entity.status = text;
                        }
                    });

                    // Look for detail links
                    const links = rows[i].querySelectorAll('a');
                    if (links.length > 0) {
                        entity.detail_url = links[0].href;
                    }

                    if (entity.name) {
                        results.push(entity);
                    }
                }
            });

            // Also try to find links to different entity categories
            const categoryLinks = [];
            const links = document.querySelectorAll('a');

            links.forEach(link => {
                const text = link.textContent.trim();
                const href = link.href;

                if (text.length > 5 && text.length < 100 && href.includes('Consultas')) {
                    categoryLinks.push({
                        category: text,
                        url: href
                    });
                }
            });

            return { entities: results, categoryLinks };
        });

        console.log(`✅ Found ${mainPageEntities.entities.length} entities on main page`);
        allEntities.push(...mainPageEntities.entities);

        // If we found category links, scrape those too
        if (mainPageEntities.categoryLinks.length > 0) {
            console.log(`🔗 Found ${mainPageEntities.categoryLinks.length} category links`);

            for (const category of mainPageEntities.categoryLinks.slice(0, 10)) {
                try {
                    console.log(`  📂 Scraping category: ${category.category}`);

                    await page.goto(category.url, {
                        waitUntil: 'networkidle2',
                        timeout: 30000
                    });

                    await page.waitForTimeout(2000);

                    const categoryEntities = await page.evaluate((catName) => {
                        const results = [];
                        const tables = document.querySelectorAll('table');

                        tables.forEach(table => {
                            const rows = table.querySelectorAll('tr');
                            if (rows.length < 2) return;

                            for (let i = 1; i < rows.length; i++) {
                                const cells = rows[i].querySelectorAll('td');
                                if (cells.length === 0) continue;

                                const entity = {
                                    name: cells[0]?.textContent.trim() || '',
                                    category: catName,
                                    country: 'España',
                                    country_code: 'ES',
                                    raw_cells: Array.from(cells).map(c => c.textContent.trim())
                                };

                                const links = rows[i].querySelectorAll('a');
                                if (links.length > 0) {
                                    entity.detail_url = links[0].href;
                                }

                                if (entity.name) {
                                    results.push(entity);
                                }
                            }
                        });

                        return results;
                    }, category.category);

                    console.log(`    ✅ Found ${categoryEntities.length} entities`);
                    allEntities.push(...categoryEntities);

                } catch (error) {
                    console.log(`    ⚠️  Error scraping category: ${error.message}`);
                }
            }
        }

        // Deduplicate by name
        const uniqueEntities = [];
        const seen = new Set();

        for (const entity of allEntities) {
            const key = entity.name.toLowerCase().trim();
            if (!seen.has(key) && key.length > 3) {
                seen.add(key);
                uniqueEntities.push(entity);
            }
        }

        console.log(`🔄 Deduplicated: ${allEntities.length} → ${uniqueEntities.length} entities`);

        // Save raw data
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(uniqueEntities, null, 2), 'utf-8');
        console.log(`💾 Saved to ${OUTPUT_FILE}`);

        // Generate summary
        const summary = {
            total_entities: uniqueEntities.length,
            by_category: {},
            with_detail_url: uniqueEntities.filter(e => e.detail_url).length,
            with_register_number: uniqueEntities.filter(e => e.register_number).length
        };

        uniqueEntities.forEach(entity => {
            const cat = entity.type || entity.category || 'Unknown';
            summary.by_category[cat] = (summary.by_category[cat] || 0) + 1;
        });

        console.log('\n📊 Summary:');
        console.log(JSON.stringify(summary, null, 2));

        return uniqueEntities;

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await browser.close();
    }
}

// Run if called directly
if (require.main === module) {
    scrapeCNMVEntities()
        .then(() => {
            console.log('✅ CNMV Entities scraping completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { scrapeCNMVEntities };
