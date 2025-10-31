#!/usr/bin/env ts-node
/**
 * Phase 3G: Fix implicit any parameters (TS7006)
 *
 * Simple replacements:
 * - (value) => change to (value: any) =>
 * - (row) => change to (row: any) =>
 * - (_, row) => change to (_: any, row: any) =>
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

interface ImplicitAny {
  file: string
  line: number
  param: string
}

function parseImplicitAny(): ImplicitAny[] {
  let errorOutput: string
  try {
    execSync('npm run type-check', {
      encoding: 'utf-8',
      cwd: process.cwd(),
      stdio: 'pipe'
    })
    errorOutput = ''
  } catch (error: any) {
    errorOutput = error.stdout || ''
  }

  const errors: ImplicitAny[] = []
  const lines = errorOutput.split('\n')

  for (const line of lines) {
    // Format: file.tsx(123,45): error TS7006: Parameter 'value' implicitly has an 'any' type.
    const match = line.match(/^(.+)\((\d+),\d+\):\s+error TS7006:\s+Parameter '([^']+)'/)
    if (match) {
      errors.push({
        file: match[1].trim(),
        line: parseInt(match[2]),
        param: match[3]
      })
    }
  }

  return errors
}

function fixImplicitAny(error: ImplicitAny): boolean {
  const fullPath = path.join(process.cwd(), error.file)

  if (!fs.existsSync(fullPath)) {
    return false
  }

  let content = fs.readFileSync(fullPath, 'utf-8')
  const lines = content.split('\n')

  if (error.line < 1 || error.line > lines.length) {
    return false
  }

  const lineIndex = error.line - 1
  let line = lines[lineIndex]

  // Pattern: (paramName) => or (paramName, ...) =>
  // Replace with: (paramName: any) => or (paramName: any, ...) =>
  const regex = new RegExp(`\\b${error.param}\\b(?!:)`)

  if (regex.test(line)) {
    lines[lineIndex] = line.replace(regex, `${error.param}: any`)
    fs.writeFileSync(fullPath, lines.join('\n'), 'utf-8')
    return true
  }

  return false
}

function main() {
  console.log('🔧 Phase 3G: Fixing implicit any parameters (TS7006)...\n')

  const errors = parseImplicitAny()
  console.log(`📁 Found ${errors.length} implicit any parameters\n`)

  // Group by file
  const byFile = new Map<string, ImplicitAny[]>()
  for (const err of errors) {
    if (!byFile.has(err.file)) {
      byFile.set(err.file, [])
    }
    byFile.get(err.file)!.push(err)
  }

  let totalFixed = 0

  for (const [file, errs] of byFile) {
    console.log(`📝 ${file}`)
    let fileFixed = 0

    // Process in reverse order
    const sorted = errs.sort((a, b) => b.line - a.line)

    for (const err of sorted) {
      if (fixImplicitAny(err)) {
        fileFixed++
        totalFixed++
      }
    }

    console.log(`  ✅ Fixed ${fileFixed} implicit any`)
  }

  console.log(`\n📊 Total fixed: ${totalFixed}`)
  console.log('✅ Done!')
}

main()
