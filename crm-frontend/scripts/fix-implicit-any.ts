#!/usr/bin/env ts-node
/**
 * Phase 3: Fix implicit any parameters in TableV2 callbacks
 *
 * Transforme:
 *   render: (value, row) => ...
 *
 * En:
 *   render: (value: unknown, row: T) => ...
 */

import * as fs from 'fs'
import * as path from 'path'

const FILES_TO_FIX = [
  'app/dashboard/people/page.tsx',
  'app/dashboard/organisations/page.tsx',
  'app/dashboard/people/page-example.tsx',
  'app/dashboard/marketing/mailing-lists/page.tsx',
  'app/dashboard/organisations/[id]/page.tsx',
]

function fixFile(filePath: string): number {
  const fullPath = path.join(process.cwd(), filePath)

  if (!fs.existsSync(fullPath)) {
    console.log(`  ⏭️  File not found: ${filePath}`)
    return 0
  }

  let content = fs.readFileSync(fullPath, 'utf-8')
  let fixCount = 0

  // Fix: render: (value) => ... (manque row)
  const pattern1 = /render:\s*\(value:\s*unknown\)\s*=>/g
  if (content.match(pattern1)) {
    content = content.replace(pattern1, 'render: (value: unknown, row) =>')
    fixCount += (content.match(/render: \(value: unknown, row\) =>/g) || []).length
  }

  // Fix: render: (value, row) => ... (manque types)
  const pattern2 = /render:\s*\(value,\s*row\)\s*=>/g
  if (content.match(pattern2)) {
    content = content.replace(pattern2, 'render: (value: unknown, row) =>')
    fixCount++
  }

  // Fix: render: (_, row) => ... (manque types)
  const pattern3 = /render:\s*\(_,\s*row\)\s*=>/g
  if (content.match(pattern3)) {
    content = content.replace(pattern3, 'render: (_: unknown, row) =>')
    fixCount++
  }

  // Fix: .find((option) => ...) dans getCountryLabel/getLanguageLabel
  const pattern4 = /\.find\(\(option\)\s*=>/g
  if (content.match(pattern4)) {
    content = content.replace(pattern4, '.find((option: any) =>')
    fixCount++
  }

  if (fixCount > 0) {
    fs.writeFileSync(fullPath, content, 'utf-8')
    console.log(`  ✅ Fixed ${fixCount} implicit any`)
  } else {
    console.log(`  ⏭️  No changes needed`)
  }

  return fixCount
}

function main() {
  console.log('🔧 Phase 3: Fixing implicit any parameters...\n')

  let totalFixed = 0

  FILES_TO_FIX.forEach((file) => {
    console.log(`📝 ${file}`)
    totalFixed += fixFile(file)
  })

  console.log(`\n📊 Total fixed: ${totalFixed}`)
  console.log('✅ Done!')
}

main()
