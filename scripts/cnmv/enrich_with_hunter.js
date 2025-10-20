/**
 * Hunter.io Email Enrichment
 *
 * Enrichit les contacts avec des emails trouvés via Hunter.io API
 *
 * API: https://hunter.io/api-documentation/v2
 * Nécessite: HUNTER_API_KEY dans l'environnement
 *
 * Endpoints utilisés:
 * - Domain Search: Trouve tous les emails d'un domaine
 * - Email Finder: Trouve l'email d'une personne spécifique
 */

const fs = require('fs').promises;
const path = require('path');

const INPUT_COMPANIES = path.join(__dirname, '../../cnmv_enriched_with_aum.json');
const INPUT_CONTACTS = path.join(__dirname, '../../cnmv_sales_teams_websites.json');
const OUTPUT_FILE = path.join(__dirname, '../../cnmv_contacts_enriched_hunter.json');

const HUNTER_API_KEY = process.env.HUNTER_API_KEY || '';
const HUNTER_API_BASE = 'https://api.hunter.io/v2';

async function callHunterAPI(endpoint, params) {
    const url = new URL(endpoint, HUNTER_API_BASE);

    // Add API key
    params.api_key = HUNTER_API_KEY;

    // Build query string
    Object.keys(params).forEach(key => {
        if (params[key]) {
            url.searchParams.append(key, params[key]);
        }
    });

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data.data;

    } catch (error) {
        console.log(`    ⚠️  Hunter API error: ${error.message}`);
        return null;
    }
}

async function findEmailWithHunter(firstName, lastName, domain) {
    console.log(`  🔍 Hunter.io: ${firstName} ${lastName} @ ${domain}`);

    if (!HUNTER_API_KEY) {
        console.log('    ⚠️  HUNTER_API_KEY not set');
        return null;
    }

    const params = {
        domain: domain,
        first_name: firstName,
        last_name: lastName
    };

    const result = await callHunterAPI('/email-finder', params);

    if (result && result.email) {
        console.log(`    ✅ Found: ${result.email} (confidence: ${result.score}%)`);

        return {
            email: result.email,
            confidence: result.score,
            sources: result.sources?.length || 0,
            verified: result.verification?.status === 'valid'
        };
    } else {
        console.log(`    ⚠️  No email found`);
        return null;
    }
}

async function searchDomainEmails(domain) {
    console.log(`  🔍 Hunter.io Domain Search: ${domain}`);

    if (!HUNTER_API_KEY) {
        return [];
    }

    const params = {
        domain: domain,
        type: 'personal',  // Personal emails (not generic)
        limit: 100
    };

    const result = await callHunterAPI('/domain-search', params);

    if (result && result.emails) {
        console.log(`    ✅ Found ${result.emails.length} emails`);

        return result.emails.map(e => ({
            email: e.value,
            first_name: e.first_name,
            last_name: e.last_name,
            job_title: e.position,
            confidence: e.confidence,
            verified: e.verification?.status === 'valid',
            sources: e.sources?.length || 0
        }));
    } else {
        console.log(`    ⚠️  No emails found`);
        return [];
    }
}

function extractDomain(website) {
    if (!website) return null;

    try {
        const url = website.match(/^https?:\/\//) ? website : 'https://' + website;
        const domain = new URL(url).hostname.replace(/^www\./, '');
        return domain;
    } catch {
        return null;
    }
}

function splitName(fullName) {
    const parts = fullName.trim().split(/\s+/);

    if (parts.length === 0) {
        return { firstName: '', lastName: '' };
    } else if (parts.length === 1) {
        return { firstName: parts[0], lastName: '' };
    } else {
        return {
            firstName: parts[0],
            lastName: parts.slice(1).join(' ')
        };
    }
}

async function enrichContactsWithHunter() {
    console.log('🔍 Hunter.io Email Enrichment');
    console.log('='*60);

    if (!HUNTER_API_KEY) {
        console.log('\n⚠️  HUNTER_API_KEY not set in environment');
        console.log('   Get your API key from: https://hunter.io');
        console.log('   Then set: export HUNTER_API_KEY="your_key_here"');
        console.log('\n   Enrichment will be skipped.');
        return;
    }

    // Load companies
    let companies = [];
    try {
        const data = await fs.readFile(INPUT_COMPANIES, 'utf-8');
        const allCompanies = JSON.parse(data);

        companies = allCompanies.filter(c =>
            (c.tier === 'Tier 1' || c.tier === 'Tier 2') &&
            c.original_data?.website
        );

        console.log(`\n📊 Loaded ${companies.length} Tier 1-2 companies`);
    } catch (error) {
        console.error('❌ Error loading companies:', error.message);
        return;
    }

    // Load existing contacts (if any)
    let existingContacts = [];
    try {
        const data = await fs.readFile(INPUT_CONTACTS, 'utf-8');
        existingContacts = JSON.parse(data);
        console.log(`📊 Loaded ${existingContacts.length} existing contacts`);
    } catch (error) {
        console.log('📊 No existing contacts file found');
    }

    const allEnrichedContacts = [];

    // Process companies
    let processed = 0;
    const limit = 10;  // Limit to avoid exhausting API quota

    for (const company of companies.slice(0, limit)) {
        processed++;
        console.log(`\n[${processed}/${Math.min(limit, companies.length)}] ${company.name}`);

        const domain = extractDomain(company.original_data.website);

        if (!domain) {
            console.log(`  ⚠️  Invalid website: ${company.original_data.website}`);
            continue;
        }

        console.log(`  🌐 Domain: ${domain}`);

        // Strategy 1: Enrich existing contacts
        const companyContacts = existingContacts.filter(c =>
            c.company_name === company.name
        );

        console.log(`  📇 Existing contacts: ${companyContacts.length}`);

        for (const contact of companyContacts) {
            if (contact.email) {
                console.log(`    ✓ ${contact.name} already has email`);
                allEnrichedContacts.push(contact);
                continue;
            }

            const { firstName, lastName } = splitName(contact.name);

            if (!firstName || !lastName) {
                console.log(`    ⚠️  Cannot split name: ${contact.name}`);
                allEnrichedContacts.push(contact);
                continue;
            }

            const hunterResult = await findEmailWithHunter(firstName, lastName, domain);

            if (hunterResult) {
                contact.email = hunterResult.email;
                contact.email_confidence = hunterResult.confidence;
                contact.email_verified = hunterResult.verified;
                contact.email_source = 'Hunter.io';
            }

            allEnrichedContacts.push(contact);

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Strategy 2: Domain search for sales roles
        console.log(`\n  🔍 Domain search for sales directors...`);

        const domainEmails = await searchDomainEmails(domain);

        // Filter for sales-related roles
        const salesEmails = domainEmails.filter(e => {
            const titleLower = (e.job_title || '').toLowerCase();
            return titleLower.includes('comercial') ||
                   titleLower.includes('ventas') ||
                   titleLower.includes('sales') ||
                   titleLower.includes('distribution') ||
                   titleLower.includes('desarrollo');
        });

        console.log(`  ✅ Found ${salesEmails.length} sales-related emails`);

        salesEmails.forEach(e => {
            // Check if already exists
            const exists = allEnrichedContacts.some(c =>
                c.email === e.email ||
                (c.first_name === e.first_name && c.last_name === e.last_name)
            );

            if (!exists) {
                allEnrichedContacts.push({
                    company_name: company.name,
                    company_tier: company.tier,
                    company_aum: company.aum,
                    first_name: e.first_name,
                    last_name: e.last_name,
                    name: `${e.first_name} ${e.last_name}`,
                    email: e.email,
                    job_title: e.job_title,
                    email_confidence: e.confidence,
                    email_verified: e.verified,
                    email_source: 'Hunter.io Domain Search',
                    country_code: 'ES',
                    language: 'ES',
                    source: 'Hunter.io',
                    scraped_at: new Date().toISOString()
                });
            }
        });

        // Rate limiting between companies
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Save enriched contacts
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(allEnrichedContacts, null, 2), 'utf-8');
    console.log(`\n💾 Saved ${allEnrichedContacts.length} enriched contacts to ${OUTPUT_FILE}`);

    // Summary
    console.log('\n' + '='*60);
    console.log('📊 HUNTER.IO ENRICHMENT SUMMARY');
    console.log('='*60);
    console.log(`Total contacts: ${allEnrichedContacts.length}`);

    const withEmail = allEnrichedContacts.filter(c => c.email).length;
    const fromHunter = allEnrichedContacts.filter(c => c.email_source?.includes('Hunter')).length;
    const verified = allEnrichedContacts.filter(c => c.email_verified).length;

    console.log(`\nWith email: ${withEmail} (${((withEmail/allEnrichedContacts.length)*100).toFixed(1)}%)`);
    console.log(`From Hunter.io: ${fromHunter}`);
    console.log(`Verified: ${verified}`);

    const tier1 = allEnrichedContacts.filter(c => c.company_tier === 'Tier 1').length;
    const tier2 = allEnrichedContacts.filter(c => c.company_tier === 'Tier 2').length;

    console.log(`\nTier 1 contacts: ${tier1}`);
    console.log(`Tier 2 contacts: ${tier2}`);

    console.log('\n✅ Hunter.io enrichment completed');
}

// Run if called directly
if (require.main === module) {
    enrichContactsWithHunter()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('❌ Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { enrichContactsWithHunter };
