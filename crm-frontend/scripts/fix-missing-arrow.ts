#!/usr/bin/env ts-node
/**
 * Phase 3B: Fix missing => in render functions
 *
 * Transforme:
 *   render: (value: unknown, row) {
 *   render: (value: unknown, row) (
 *   render: (value: unknown, row) new Date(...)
 *
 * En:
 *   render: (value: unknown, row) => {
 *   render: (value: unknown, row) => (
 *   render: (value: unknown, row) => new Date(...)
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

function fixFile(filePath: string): number {
  const fullPath = path.join(process.cwd(), filePath)

  if (!fs.existsSync(fullPath)) {
    console.log(`  ⏭️  File not found: ${filePath}`)
    return 0
  }

  let content = fs.readFileSync(fullPath, 'utf-8')
  let fixCount = 0

  // Pattern 1: render: (...params) { (missing =>)
  const pattern1 = /render:\s*\(([^)]+)\)\s+\{/g
  const matches1 = content.match(pattern1)
  if (matches1) {
    content = content.replace(pattern1, 'render: ($1) => {')
    fixCount += matches1.length
  }

  // Pattern 2: render: (...params) ( (missing =>)
  const pattern2 = /render:\s*\(([^)]+)\)\s+\(/g
  const matches2 = content.match(pattern2)
  if (matches2) {
    content = content.replace(pattern2, 'render: ($1) => (')
    fixCount += matches2.length
  }

  // Pattern 3: render: (...params) new/return/etc (missing =>)
  // Match render: (...) followed by word character (not =>)
  const pattern3 = /render:\s*\(([^)]+)\)\s+(?!=>)([a-zA-Z<])/g
  const matches3 = content.match(pattern3)
  if (matches3) {
    content = content.replace(pattern3, 'render: ($1) => $2')
    fixCount += matches3.length
  }

  // Pattern 4: render: (...params) ` (template literal, missing =>)
  const pattern4 = /render:\s*\(([^)]+)\)\s+`/g
  const matches4 = content.match(pattern4)
  if (matches4) {
    content = content.replace(pattern4, 'render: ($1) => `')
    fixCount += matches4.length
  }

  if (fixCount > 0) {
    fs.writeFileSync(fullPath, content, 'utf-8')
    console.log(`  ✅ Fixed ${fixCount} missing arrow(s)`)
  } else {
    console.log(`  ⏭️  No changes needed`)
  }

  return fixCount
}

function main() {
  console.log('🔧 Phase 3B: Fixing missing => in render functions...\n')

  // Find all .tsx files in app/dashboard
  const filesOutput = execSync(
    'find app/dashboard -type f -name "*.tsx" ! -path "*/node_modules/*"',
    { encoding: 'utf-8', cwd: process.cwd() }
  )

  const files = filesOutput.trim().split('\n').filter(Boolean)
  console.log(`📁 Found ${files.length} files to scan\n`)

  let totalFixed = 0

  files.forEach((file) => {
    const fixed = fixFile(file)
    if (fixed > 0) {
      console.log(`📝 ${file}`)
      totalFixed += fixed
    }
  })

  console.log(`\n📊 Total fixed: ${totalFixed}`)
  console.log('✅ Done!')
}

main()
