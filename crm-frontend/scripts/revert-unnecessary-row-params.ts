#!/usr/bin/env ts-node
/**
 * Phase 3D: Remove unnecessary row parameters added by previous scripts
 *
 * Problème: Les scripts précédents ont ajouté systématiquement `row` à toutes
 * les render functions, même quand ce paramètre n'est pas utilisé.
 *
 * Solution: Supprimer `, row` des signatures où il n'est jamais utilisé.
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

function removeUnusedRow(filePath: string): number {
  const fullPath = path.join(process.cwd(), filePath)

  if (!fs.existsSync(fullPath)) {
    return 0
  }

  let content = fs.readFileSync(fullPath, 'utf-8')
  const lines = content.split('\n')
  let fixCount = 0

  // Trouver toutes les render functions avec `, row` à la fin des params
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Cherche: render: (param, row) => ...
    const renderMatch = line.match(/render:\s*\(([^)]+),\s*row\)\s*=>/)

    if (renderMatch) {
      // Chercher dans les 10 lignes suivantes si 'row' est utilisé
      let rowIsUsed = false
      let scopeDepth = 0
      let j = i

      while (j < lines.length && j < i + 20) {
        const nextLine = lines[j]

        // Compter les accolades pour savoir quand on sort de la fonction
        scopeDepth += (nextLine.match(/{/g) || []).length
        scopeDepth -= (nextLine.match(/}/g) || []).length

        // Chercher l'utilisation de 'row' (pas dans les commentaires)
        if (j > i && nextLine.match(/\brow\b/) && !nextLine.trim().startsWith('//')) {
          rowIsUsed = true
          break
        }

        // Si on ferme la scope complètement, arrêter
        if (j > i && scopeDepth <= 0) {
          break
        }

        j++
      }

      // Si row n'est jamais utilisé, le supprimer
      if (!rowIsUsed) {
        const newLine = line.replace(
          /render:\s*\(([^)]+),\s*row\)\s*=>/,
          'render: ($1) =>'
        )
        lines[i] = newLine
        fixCount++
      }
    }
  }

  if (fixCount > 0) {
    fs.writeFileSync(fullPath, lines.join('\n'), 'utf-8')
    console.log(`  ✅ Removed ${fixCount} unused row parameter(s)`)
  }

  return fixCount
}

function main() {
  console.log('🔧 Phase 3D: Removing unnecessary row parameters...\n')

  // Trouver les fichiers avec l'erreur TS6133 pour 'row'
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

  // Extraire les fichiers avec unused 'row'
  const unusedRowErrors = errorOutput
    .split('\n')
    .filter(line => line.includes("TS6133") && line.includes("'row' is declared but"))
    .map(line => {
      const match = line.match(/^([^(]+)\(/)
      return match ? match[1].trim() : null
    })
    .filter(Boolean)

  const uniqueFiles = Array.from(new Set(unusedRowErrors))

  console.log(`📁 Found ${uniqueFiles.length} files with unused row parameters\n`)

  let totalFixed = 0

  uniqueFiles.forEach((file) => {
    if (file) {
      console.log(`📝 ${file}`)
      totalFixed += removeUnusedRow(file)
    }
  })

  console.log(`\n📊 Total row parameters removed: ${totalFixed}`)
  console.log('✅ Done!')
}

main()
