#!/usr/bin/env ts-node
/**
 * Phase 3H: Fix unknown type access errors (TS18046)
 *
 * Wraps unknown values with String() when calling string methods
 */

import * as fs from 'fs'
import * as path from 'path'

const FILES = [
  'app/dashboard/demo-table-v2/page.tsx',
]

function fixFile(filePath: string): number {
  const fullPath = path.join(process.cwd(), filePath)
  if (!fs.existsSync(fullPath)) return 0

  let content = fs.readFileSync(fullPath, 'utf-8')
  let fixCount = 0

  // Pattern: {value} where value is unknown → {String(value)}
  // But only in JSX context
  const pattern1 = /{value}/g
  const matches = content.match(pattern1)
  if (matches) {
    // Only replace in render functions after "value: unknown"
    const renderBlocks = content.split('render: (value: unknown')
    for (let i = 1; i < renderBlocks.length; i++) {
      const block = renderBlocks[i]
      const endIndex = block.indexOf('    },')
      if (endIndex > 0) {
        let renderBody = block.substring(0, endIndex)
        const original = renderBody
        renderBody = renderBody.replace(/{value}/g, '{String(value)}')
        if (renderBody !== original) {
          renderBlocks[i] = renderBody + block.substring(endIndex)
          fixCount++
        }
      }
    }
    content = renderBlocks.join('render: (value: unknown')
  }

  // Pattern: value.method() → String(value).method()
  const pattern2 = /\bvalue\.(charAt|toLowerCase|toUpperCase|trim|slice|substring|split|replace|match|includes|startsWith|endsWith)\(/g
  if (content.match(pattern2)) {
    content = content.replace(pattern2, 'String(value).$1(')
    fixCount++
  }

  if (fixCount > 0) {
    fs.writeFileSync(fullPath, content, 'utf-8')
    console.log(`  ✅ Fixed ${fixCount} unknown access`)
  }

  return fixCount
}

function main() {
  console.log('🔧 Phase 3H: Fixing unknown type access...\n')

  let total = 0
  FILES.forEach(file => {
    console.log(`📝 ${file}`)
    total += fixFile(file)
  })

  console.log(`\n📊 Total: ${total}`)
}

main()
