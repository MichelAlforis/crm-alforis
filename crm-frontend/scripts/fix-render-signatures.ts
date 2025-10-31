#!/usr/bin/env ts-node
/**
 * Phase 3F: Fix render function signatures to match TableV2
 *
 * TableV2 expects: render?: (value: unknown, row: T, index: number) => ReactNode
 *
 * Common issues:
 * 1. Missing index parameter: (value, row) => needs (value, row, index) =>
 * 2. Wrong value type: (value: string, row) => needs (value: unknown, row) =>
 * 3. Missing row parameter: (value) => needs (value, row, index) =>
 */

import * as fs from 'fs'
import * as path from 'path'

const FILES_TO_FIX = [
  'app/dashboard/campaigns/page.tsx',
  'app/dashboard/demo-table-v2/page.tsx',
  'app/dashboard/kpis/page.tsx',
  'app/dashboard/mailing-lists/page.tsx',
  'app/dashboard/mandats/[id]/page.tsx',
  'app/dashboard/marketing/mailing-lists/page.tsx',
  'app/dashboard/marketing/campaigns/page.tsx',
]

function fixFile(filePath: string): number {
  const fullPath = path.join(process.cwd(), filePath)

  if (!fs.existsSync(fullPath)) {
    console.log(`  ⏭️  File not found`)
    return 0
  }

  let content = fs.readFileSync(fullPath, 'utf-8')
  let fixCount = 0

  // Fix 1: (value: specific_type, row: Type) => ...
  // Change to: (value: unknown, row: Type) => ...
  const pattern1 = /render:\s*\(\s*value:\s*(?:string|number|boolean|any|\w+\s*\|\s*\w+|\w+\[\]|"[^"]+"\s*\|\s*"[^"]+"\s*\|\s*"[^"]+")\s*,\s*row:/g
  const matches1 = content.match(pattern1)
  if (matches1) {
    content = content.replace(pattern1, 'render: (value: unknown, row:')
    fixCount += matches1.length
  }

  // Fix 2: (value: unknown, row: Type) => ...
  // Change to: (value: unknown, row: Type, _index: number) => ...
  // Only if there's NO index already
  const pattern2 = /render:\s*\(\s*value:\s*unknown\s*,\s*row:\s*(\w+)\s*\)\s*=>/g
  const matches2 = content.match(pattern2)
  if (matches2) {
    content = content.replace(pattern2, 'render: (value: unknown, row: $1, _index: number) =>')
    fixCount += matches2.length
  }

  // Fix 3: (_: unknown, row: Type) => ...
  // Change to: (_: unknown, row: Type, _index: number) => ...
  const pattern3 = /render:\s*\(\s*_:\s*unknown\s*,\s*row:\s*(\w+)\s*\)\s*=>/g
  const matches3 = content.match(pattern3)
  if (matches3) {
    content = content.replace(pattern3, 'render: (_: unknown, row: $1, _index: number) =>')
    fixCount += matches3.length
  }

  // Fix 4: (id: number, row: Type) => ...
  // Change to: (id: unknown, row: Type, _index: number) => ...
  const pattern4 = /render:\s*\(\s*id:\s*number\s*,\s*row:\s*(\w+)\s*\)\s*=>/g
  const matches4 = content.match(pattern4)
  if (matches4) {
    content = content.replace(pattern4, 'render: (id: unknown, row: $1, _index: number) =>')
    fixCount += matches4.length
  }

  // Fix 5: (value: Type) => ... (missing row and index)
  // Change to: (value: unknown, _row, _index: number) => ...
  const pattern5 = /render:\s*\(\s*value:\s*(?:string|number|boolean|any|\w+\s*\|\s*\w+|\w+\[\]|"[^"]+"\s*\|\s*"[^"]+"\s*\|\s*"[^"]+")\s*\)\s*=>/g
  const matches5 = content.match(pattern5)
  if (matches5) {
    content = content.replace(pattern5, 'render: (value: unknown, _row, _index: number) =>')
    fixCount += matches5.length
  }

  // Fix 6: (value: number | null) => ...
  // This pattern handles complex union types
  const pattern6 = /render:\s*\(\s*value:\s*number\s*\|\s*null\s*\)\s*=>/g
  const matches6 = content.match(pattern6)
  if (matches6) {
    content = content.replace(pattern6, 'render: (value: unknown, _row, _index: number) =>')
    fixCount += matches6.length
  }

  if (fixCount > 0) {
    fs.writeFileSync(fullPath, content, 'utf-8')
    console.log(`  ✅ Fixed ${fixCount} signature(s)`)
  } else {
    console.log(`  ⏭️  No changes needed`)
  }

  return fixCount
}

function main() {
  console.log('🔧 Phase 3F: Fixing render function signatures...\n')

  let totalFixed = 0

  FILES_TO_FIX.forEach((file) => {
    console.log(`📝 ${file}`)
    totalFixed += fixFile(file)
  })

  console.log(`\n📊 Total fixed: ${totalFixed}`)
  console.log('✅ Done!')
}

main()
