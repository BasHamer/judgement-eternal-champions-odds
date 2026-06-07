import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..')
const docsFile = join(repoRoot, 'docs', 'artefacts.md')
const outFile = join(__dirname, '..', 'src', 'data', 'artefacts.json')

function parseIntValue(raw) {
  const numeric = Number(String(raw).trim())
  return Number.isFinite(numeric) ? numeric : 0
}

function parseArtefacts(content) {
  const artefacts = []
  const sections = content.split(/^## /m).slice(1)

  for (const section of sections) {
    const lines = section.split('\n')
    const header = lines[0].trim()
    const match = header.match(/^(.+?) \(([^)]+)\)$/)
    if (!match) continue

    const name = match[1].trim()
    const slug = match[2].trim()
    const meta = { slot: '', cost: '', category: '' }
    const effects = {
      melBonus: 0,
      magBonus: 0,
      rngBonus: 0,
      agiBonus: 0,
      resBonus: 0,
      armourPiercing: 0,
      damageBonus: 0,
      extraDice: 0,
    }
    const descriptionLines = []
    let inDescription = false

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.startsWith('slot: ')) meta.slot = line.slice(6).trim()
      if (line.startsWith('cost: ')) meta.cost = line.slice(6).trim()
      if (line.startsWith('category: ')) meta.category = line.slice(10).trim()

      if (line.startsWith('### Description')) {
        inDescription = true
        continue
      }
      if (inDescription) {
        if (line.startsWith('## ')) break
        descriptionLines.push(line)
      }

      if (line.startsWith('|') && !line.includes('Effect') && !line.includes('---')) {
        const cells = line.split('|').map(c => c.trim()).filter(Boolean)
        if (cells.length >= 2) {
          const key = cells[0]
          const value = parseIntValue(cells[1])
          if (key === 'mel_bonus') effects.melBonus = value
          if (key === 'mag_bonus') effects.magBonus = value
          if (key === 'rng_bonus') effects.rngBonus = value
          if (key === 'agi_bonus') effects.agiBonus = value
          if (key === 'res_bonus') effects.resBonus = value
          if (key === 'armour_piercing') effects.armourPiercing = value
          if (key === 'damage_bonus') effects.damageBonus = value
          if (key === 'extra_dice') effects.extraDice = value
        }
      }
    }

    artefacts.push({
      id: slug,
      name,
      ...meta,
      effects,
      description: descriptionLines.join('\n').trim(),
      hasSimEffects: Object.values(effects).some(v => v !== 0),
    })
  }

  return artefacts
}

const artefacts = parseArtefacts(readFileSync(docsFile, 'utf8'))
  .sort((a, b) => a.name.localeCompare(b.name))

mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), artefacts }, null, 2))
console.log(`Wrote ${artefacts.length} artefacts`)

export { parseArtefacts }
