#!/usr/bin/env ts-node
/**
 * Script autorisé pour fixer les signatures TableV2 render functions
 *
 * Transforme:
 *   render: (value: string) => <span>{value}</span>
 *
 * En:
 *   render: (value: unknown, row: T) => <span>{String(value)}</span>
 *
 * Usage: npx ts-node scripts/fix-table-v2-signatures.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// Fichiers à corriger (liste générée depuis l'analyse TypeScript)
const FILES_TO_FIX = [
  'app/dashboard/campaigns/page.tsx',
  'app/dashboard/demo-table-v2/page.tsx',
  'app/dashboard/people/page.tsx',
  'app/dashboard/organisations/page.tsx',
  'app/dashboard/marketing/mailing-lists/page.tsx',
  'app/dashboard/kpis/page.tsx',
  'app/dashboard/mailing-lists/page.tsx',
  'app/dashboard/produits/page.tsx',
  'app/dashboard/mandats/page.tsx',
]

interface Fix {
  pattern: RegExp
  replacement: string
  description: string
}

// Patterns de correction
const FIXES: Fix[] = [
  {
    pattern: /render:\s*\(value:\s*string\)\s*=>/g,
    replacement: 'render: (value: unknown, row)',
    description: 'Fix (value: string) => to (value: unknown, row)'
  },
  {
    pattern: /render:\s*\(value:\s*number\)\s*=>/g,
    replacement: 'render: (value: unknown, row)',
    description: 'Fix (value: number) => to (value: unknown, row)'
  },
  {
    pattern: /render:\s*\(_value:\s*\w+,\s*row/g,
    replacement: 'render: (value: unknown, row',
    description: 'Fix (_value: type, row) to (value: unknown, row)'
  },
  {
    pattern: /render:\s*\(id:\s*number\)\s*=>/g,
    replacement: 'render: (value: unknown, row)',
    description: 'Fix (id: number) => to (value: unknown, row)'
  },
]

function fixFile(filePath: string): { fixed: number; errors: string[] } {
  const fullPath = path.join(process.cwd(), filePath)

  if (!fs.existsSync(fullPath)) {
    return { fixed: 0, errors: [`File not found: ${filePath}`] }
  }

  let content = fs.readFileSync(fullPath, 'utf-8')
  let fixCount = 0
  const errors: string[] = []

  FIXES.forEach((fix) => {
    const matches = content.match(fix.pattern)
    if (matches) {
      content = content.replace(fix.pattern, fix.replacement)
      fixCount += matches.length
      console.log(`  ✓ ${fix.description}: ${matches.length} occurrences`)
    }
  })

  if (fixCount > 0) {
    fs.writeFileSync(fullPath, content, 'utf-8')
  }

  return { fixed: fixCount, errors }
}

function main() {
  console.log('🔧 Fixing TableV2 render function signatures...\n')

  let totalFixed = 0
  const allErrors: string[] = []

  FILES_TO_FIX.forEach((file) => {
    console.log(`\n📝 Processing: ${file}`)
    const { fixed, errors } = fixFile(file)

    if (fixed > 0) {
      console.log(`  ✅ Fixed ${fixed} signatures`)
      totalFixed += fixed
    } else {
      console.log(`  ⏭️  No changes needed`)
    }

    if (errors.length > 0) {
      allErrors.push(...errors)
      errors.forEach((err) => console.log(`  ❌ ${err}`))
    }
  })

  console.log(`\n\n📊 SUMMARY:`)
  console.log(`  Total files processed: ${FILES_TO_FIX.length}`)
  console.log(`  Total signatures fixed: ${totalFixed}`)
  console.log(`  Errors: ${allErrors.length}`)

  if (allErrors.length > 0) {
    console.log(`\n⚠️  ERRORS:`)
    allErrors.forEach((err) => console.log(`  - ${err}`))
  }

  console.log(`\n✅ Done! Run 'npm run type-check' to verify.`)
}

main()
