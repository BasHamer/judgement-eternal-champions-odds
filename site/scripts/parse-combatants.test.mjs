import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const siteRoot = join(__dirname, '..')
const dataFile = join(siteRoot, 'src', 'data', 'combatants.json')

describe('parse-combatants', () => {
  it('C1: generates 68 combatants from docs', () => {
    execSync('node scripts/parse-combatants.mjs', { cwd: siteRoot, stdio: 'pipe' })
    expect(existsSync(dataFile)).toBe(true)

    const data = JSON.parse(readFileSync(dataFile, 'utf8'))
    expect(data.combatants).toHaveLength(68)
    expect(data.combatants.filter(c => c.kind === 'hero')).toHaveLength(60)
    expect(data.combatants.filter(c => c.kind === 'monster')).toHaveLength(8)
  })

  it('C2: includes Abhothas Sabre weapon profile', () => {
    const data = JSON.parse(readFileSync(dataFile, 'utf8'))
    const abhothas = data.combatants.find(c => c.id === 'abhothas')
    expect(abhothas).toBeDefined()
    const sabre = abhothas.weapons.find(w => w.name === 'Sabre')
    expect(sabre).toMatchObject({ type: 'MEL', crit: 4, solid: 2, glance: 1 })
  })

  it('C3: includes Algarath monster stats', () => {
    const data = JSON.parse(readFileSync(dataFile, 'utf8'))
    const algarath = data.combatants.find(c => c.id === 'algarath')
    expect(algarath).toMatchObject({
      kind: 'monster',
      stats: { mel: 8, agi: 3, res: 0 },
    })
  })
})
