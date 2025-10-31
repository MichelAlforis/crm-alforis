#!/usr/bin/env ts-node
/**
 * Phase 3E: Remove all unused variables/imports (TS6133)
 *
 * Strategy:
 * 1. Get all TS6133 errors from type-check
 * 2. For each error, remove the unused variable/import
 * 3. Handle different patterns: imports, destructuring, function params
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

interface UnusedVar {
  file: string
  line: number
  name: string
}

function parseUnusedVars(): UnusedVar[] {
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

  const unusedVars: UnusedVar[] = []
  const lines = errorOutput.split('\n')

  for (const line of lines) {
    // Format: file.tsx(123,45): error TS6133: 'varName' is declared but its value is never read.
    const match = line.match(/^(.+)\((\d+),\d+\):\s+error TS6133:\s+'([^']+)'/)
    if (match) {
      unusedVars.push({
        file: match[1].trim(),
        line: parseInt(match[2]),
        name: match[3]
      })
    }
  }

  return unusedVars
}

function removeUnusedVar(unused: UnusedVar): boolean {
  const fullPath = path.join(process.cwd(), unused.file)

  if (!fs.existsSync(fullPath)) {
    return false
  }

  let content = fs.readFileSync(fullPath, 'utf-8')
  const lines = content.split('\n')

  if (unused.line < 1 || unused.line > lines.length) {
    return false
  }

  const lineIndex = unused.line - 1
  const line = lines[lineIndex]

  // Pattern 1: Unused import in destructuring: import { A, B, C } from 'x'
  const importDestructMatch = line.match(/import\s+{([^}]+)}\s+from/)
  if (importDestructMatch) {
    const imports = importDestructMatch[1].split(',').map(s => s.trim()).filter(s => s !== unused.name)
    if (imports.length === 0) {
      // Remove entire import line
      lines[lineIndex] = ''
    } else {
      // Remove just this import
      lines[lineIndex] = line.replace(new RegExp(`\\b${unused.name}\\b,?\\s*`), '').replace(/,\s*}/, ' }')
    }
    fs.writeFileSync(fullPath, lines.join('\n'), 'utf-8')
    return true
  }

  // Pattern 2: Unused const destructuring: const { a, b, c } = x
  const constDestructMatch = line.match(/const\s+{([^}]+)}/)
  if (constDestructMatch) {
    const vars = constDestructMatch[1].split(',').map(s => s.trim()).filter(v => {
      const varName = v.split(':')[0].trim()
      return varName !== unused.name
    })

    if (vars.length === 0) {
      // Remove entire line
      lines[lineIndex] = ''
    } else {
      // Remove just this variable
      const newVars = vars.join(', ')
      lines[lineIndex] = line.replace(/{[^}]+}/, `{ ${newVars} }`)
    }
    fs.writeFileSync(fullPath, lines.join('\n'), 'utf-8')
    return true
  }

  // Pattern 3: Unused function parameter (value) => ... or (value, row) => ...
  // Replace with (_) or (_, row)
  if (line.includes(unused.name) && (line.includes('=>') || line.includes('function'))) {
    lines[lineIndex] = line.replace(new RegExp(`\\b${unused.name}\\b`), '_')
    fs.writeFileSync(fullPath, lines.join('\n'), 'utf-8')
    return true
  }

  // Pattern 4: Unused standalone const
  const constMatch = line.match(new RegExp(`const\\s+${unused.name}\\s*=`))
  if (constMatch) {
    lines[lineIndex] = ''
    fs.writeFileSync(fullPath, lines.join('\n'), 'utf-8')
    return true
  }

  return false
}

function main() {
  console.log('🔧 Phase 3E: Removing unused variables (TS6133)...\n')

  const unusedVars = parseUnusedVars()
  console.log(`📁 Found ${unusedVars.length} unused variables\n`)

  // Group by file
  const byFile = new Map<string, UnusedVar[]>()
  for (const uv of unusedVars) {
    if (!byFile.has(uv.file)) {
      byFile.set(uv.file, [])
    }
    byFile.get(uv.file)!.push(uv)
  }

  let totalFixed = 0

  for (const [file, vars] of byFile) {
    console.log(`📝 ${file}`)
    let fileFixed = 0

    // Process in reverse order (bottom to top) to avoid line number shifts
    const sortedVars = vars.sort((a, b) => b.line - a.line)

    for (const uv of sortedVars) {
      if (removeUnusedVar(uv)) {
        fileFixed++
        totalFixed++
      }
    }

    console.log(`  ✅ Removed ${fileFixed} unused variable(s)`)
  }

  console.log(`\n📊 Total removed: ${totalFixed}`)
  console.log('✅ Done!')
}

main()
