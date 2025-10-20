/**
 * Scraper CNMV - SGIIC (Collective Investment Scheme Management Companies)
 *
 * Source: https://www.cnmv.es/portal/Consultas/IIC/SGIICsRegistro.aspx
 *
 * Extrait:
 * - Nom des sociétés de gestion (SGIIC)
 * - Numéros de registre CNMV
 * - Dates d'enregistrement
 * - Adresses
 * - Contacts
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const CNMV_SGIIC_URL = 'https://www.cnmv.es/portal/Consultas/IIC/SGIICsRegistro.aspx?lang=en';
const OUTPUT_FILE = path.join(__dirname, '../../cnmv_sgiic_raw.json');

async function scrapeCNMVSGIIC() {
    console.log('🇪🇸 Starting CNMV SGIIC scraper...');

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

    try {
        const page = await browser.newPage();

        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });

        console.log('📡 Loading CNMV SGIIC page...');
        await page.goto(CNMV_SGIIC_URL, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // Wait for the main content to load
        await page.waitForSelector('table, .grid, .results, #contenido', { timeout: 30000 });

        console.log('🔍 Extracting SGIIC data...');

        // Extract data from the page
        const sgiicData = await page.evaluate(() => {
            const results = [];

            // Try to find the main table with SGIIC data
            const tables = document.querySelectorAll('table');

            for (const table of tables) {
                const rows = table.querySelectorAll('tr');

                // Skip if no data rows
                if (rows.length < 2) continue;

                // Try to detect header row
                const headerCells = rows[0].querySelectorAll('th, td');
                const headers = Array.from(headerCells).map(cell =>
                    cell.textContent.trim().toLowerCase()
                );

                // Look for typical SGIIC columns
                const hasRelevantColumns = headers.some(h =>
                    h.includes('nombre') ||
                    h.includes('name') ||
                    h.includes('registro') ||
                    h.includes('register') ||
                    h.includes('fecha') ||
                    h.includes('date')
                );

                if (!hasRelevantColumns) continue;

                // Process data rows
                for (let i = 1; i < rows.length; i++) {
                    const cells = rows[i].querySelectorAll('td');
                    if (cells.length === 0) continue;

                    const rowData = {
                        name: '',
                        register_number: '',
                        register_date: '',
                        address: '',
                        city: '',
                        postal_code: '',
                        phone: '',
                        email: '',
                        website: '',
                        raw_cells: []
                    };

                    // Extract all cell contents
                    cells.forEach((cell, idx) => {
                        const text = cell.textContent.trim();
                        rowData.raw_cells.push(text);

                        // Try to identify content by position or pattern
                        if (idx === 0 && text.length > 3) {
                            rowData.name = text;
                        } else if (text.match(/^\d+$/)) {
                            rowData.register_number = text;
                        } else if (text.match(/\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}/)) {
                            rowData.register_date = text;
                        } else if (text.includes('@')) {
                            rowData.email = text;
                        } else if (text.match(/^[\d\s\+\-\(\)]+$/) && text.length > 8) {
                            rowData.phone = text;
                        } else if (text.match(/^https?:\/\//) || text.match(/www\./)) {
                            rowData.website = text;
                        }
                    });

                    // Check for links in the row (might lead to detail pages)
                    const links = rows[i].querySelectorAll('a');
                    links.forEach(link => {
                        const href = link.href;
                        if (href && !rowData.detail_url) {
                            rowData.detail_url = href;
                        }
                    });

                    if (rowData.name) {
                        results.push(rowData);
                    }
                }
            }

            return results;
        });

        console.log(`✅ Found ${sgiicData.length} SGIIC companies`);

        // If we have detail URLs, scrape those for more information
        if (sgiicData.some(item => item.detail_url)) {
            console.log('🔗 Scraping detail pages...');

            for (let i = 0; i < Math.min(sgiicData.length, 50); i++) {
                const item = sgiicData[i];
                if (!item.detail_url) continue;

                try {
                    console.log(`  [${i + 1}/${sgiicData.length}] ${item.name}`);

                    await page.goto(item.detail_url, {
                        waitUntil: 'networkidle2',
                        timeout: 30000
                    });

                    await page.waitForTimeout(1000);

                    const details = await page.evaluate(() => {
                        const data = {
                            full_address: '',
                            contacts: [],
                            additional_info: {}
                        };

                        // Try to find address information
                        const addressLabels = ['dirección', 'domicilio', 'address'];
                        const phoneLabels = ['teléfono', 'telefono', 'phone'];
                        const emailLabels = ['correo', 'email', 'e-mail'];

                        const allText = document.body.innerText;
                        const lines = allText.split('\n');

                        lines.forEach(line => {
                            const lower = line.toLowerCase();

                            if (addressLabels.some(label => lower.includes(label))) {
                                data.full_address = line.replace(/^[^:]*:\s*/, '').trim();
                            }

                            if (line.includes('@')) {
                                const emailMatch = line.match(/[\w\.-]+@[\w\.-]+\.\w+/);
                                if (emailMatch) data.additional_info.email = emailMatch[0];
                            }

                            if (line.match(/[\d\s\+\-\(\)]{9,}/)) {
                                const phoneMatch = line.match(/[\d\s\+\-\(\)]{9,}/);
                                if (phoneMatch) data.additional_info.phone = phoneMatch[0].trim();
                            }
                        });

                        return data;
                    });

                    // Merge details
                    Object.assign(sgiicData[i], details);

                } catch (error) {
                    console.log(`    ⚠️  Error scraping detail page: ${error.message}`);
                }
            }
        }

        // Save raw data
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(sgiicData, null, 2), 'utf-8');
        console.log(`💾 Saved to ${OUTPUT_FILE}`);

        // Generate summary
        const summary = {
            total_companies: sgiicData.length,
            with_register_number: sgiicData.filter(s => s.register_number).length,
            with_email: sgiicData.filter(s => s.email).length,
            with_phone: sgiicData.filter(s => s.phone).length,
            with_website: sgiicData.filter(s => s.website).length,
            with_detail_url: sgiicData.filter(s => s.detail_url).length
        };

        console.log('\n📊 Summary:');
        console.log(JSON.stringify(summary, null, 2));

        return sgiicData;

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await browser.close();
    }
}

// Run if called directly
if (require.main === module) {
    scrapeCNMVSGIIC()
        .then(() => {
            console.log('✅ CNMV SGIIC scraping completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { scrapeCNMVSGIIC };
