import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..')
const docsDir = join(repoRoot, 'docs')
const outFile = join(__dirname, '..', 'src', 'data', 'combatants.json')

function parseStatValue(raw) {
  const trimmed = raw.trim()
  if (trimmed === '—' || trimmed === '-' || trimmed === '') return null
  const numeric = Number(trimmed)
  return Number.isFinite(numeric) ? numeric : null
}

function parseSection(lines, startIndex) {
  const stats = {}
  let i = startIndex
  while (i < lines.length && lines[i].startsWith('|')) {
    const row = lines[i]
    if (row.includes('Stat') || row.includes('---') || row.includes('Field') || row.includes('Health')) {
      i++
      continue
    }
    const cells = row.split('|').map((c) => c.trim()).filter(Boolean)
    if (cells.length >= 2) {
      const key = cells[0].toLowerCase()
      if (['mov', 'agi', 'mel', 'mag', 'rng', 'res'].includes(key)) {
        stats[key] = parseStatValue(cells[1])
      }
    }
    i++
  }
  return { stats, nextIndex: i }
}

function parseWeapons(lines, startIndex) {
  const weapons = []
  let i = startIndex
  while (i < lines.length) {
    if (lines[i].startsWith('## ') || lines[i].startsWith('### ') && !lines[i].includes('Weapons')) {
      break
    }
    if (lines[i].startsWith('|') && !lines[i].includes('Name') && !lines[i].includes('---')) {
      const cells = lines[i].split('|').map((c) => c.trim()).filter(Boolean)
      if (cells.length >= 7 && cells[0] !== '—') {
        weapons.push({
          name: cells[0],
          type: cells[1],
          reach: Number(cells[2]),
          cost: cells[3],
          crit: Number(cells[4]),
          solid: Number(cells[5]),
          glance: Number(cells[6]),
        })
      }
    }
    i++
  }
  return weapons
}

function parseFile(content, kind) {
  const combatants = []
  const sections = content.split(/^## /m).slice(1)

  for (const section of sections) {
    const lines = section.split('\n')
    const header = lines[0].trim()
    const match = header.match(/^(.+?) \(([^)]+)\)$/)
    if (!match) continue

    const name = match[1].trim()
    const slug = match[2].trim()
    let stats = { mov: null, agi: null, mel: null, mag: null, rng: null, res: 0 }
    let weapons = []
    let dualWield = false
    let dualWieldName = null

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].startsWith('dual_wield:')) {
        dualWield = lines[i].includes('true')
      }
      if (lines[i].startsWith('dual_wield_name:')) {
        dualWieldName = lines[i].slice('dual_wield_name:'.length).trim()
      }
      if (lines[i].startsWith('| Stat |')) {
        const parsed = parseSection(lines, i + 1)
        stats = { ...stats, ...parsed.stats }
        i = parsed.nextIndex
      }
      if (lines[i].startsWith('### Weapons')) {
        weapons = parseWeapons(lines, i + 2)
        break
      }
    }

    if (weapons.length === 0) continue

    combatants.push({
      id: slug,
      name,
      kind,
      stats,
      weapons,
      ...(kind === 'hero' ? { dualWield, dualWieldName } : {}),
    })
  }

  return combatants
}

const heroes = parseFile(readFileSync(join(docsDir, 'heroes.md'), 'utf8'), 'hero')
const monsters = parseFile(readFileSync(join(docsDir, 'monsters.md'), 'utf8'), 'monster')
const combatants = [...heroes, ...monsters].sort((a, b) => a.name.localeCompare(b.name))

mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), combatants }, null, 2))
console.log(`Wrote ${combatants.length} combatants (${heroes.length} heroes, ${monsters.length} monsters)`)
