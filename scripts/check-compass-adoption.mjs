#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  checkCompassProjection,
  COMPASS_SKILL_NAMES,
} from '../.compass/check-projection.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sharedSkills = [...COMPASS_SKILL_NAMES]
const discoveryAdapters = ['.claude/skills', '.agents/skills', '.codex/skills']

function inspectGroundworkAdoption() {
  const problems = []
  const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8')
  for (const route of ['.compass/COMPASS.md', '.compass/TERMINOLOGY.md']) {
    if (!agents.includes(route)) problems.push(`AGENTS.md does not route to ${route}`)
  }
  const inclusionDispatcher = 'skills/inclusive-product-foundation'
  if (!agents.includes(inclusionDispatcher)) {
    problems.push(`AGENTS.md does not route user-facing changes through ${inclusionDispatcher}`)
  }

  const skillNames = fs.readdirSync(path.join(root, 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(root, 'skills', entry.name, 'SKILL.md')))
    .map((entry) => entry.name)
    .sort()
  const localSkills = skillNames.filter((name) => !sharedSkills.includes(name))
  if (localSkills.length === 0) problems.push('Groundwork-local skills are missing')

  for (const adapter of discoveryAdapters) {
    const adapterPath = path.join(root, adapter)
    let stat
    try {
      stat = fs.lstatSync(adapterPath)
    } catch {
      problems.push(`Groundwork skill discovery adapter is missing: ${adapter}`)
      continue
    }
    if (!stat.isSymbolicLink() || fs.readlinkSync(adapterPath) !== '../skills') {
      problems.push(`Groundwork skill discovery adapter must point to ../skills: ${adapter}`)
      continue
    }
    for (const skill of skillNames) {
      const canonical = fs.realpathSync.native(path.join(root, 'skills', skill, 'SKILL.md'))
      const discoveredPath = path.join(root, adapter, skill, 'SKILL.md')
      try {
        if (fs.realpathSync.native(discoveredPath) !== canonical) {
          problems.push(`${adapter} does not discover canonical skill ${skill}`)
        }
      } catch {
        problems.push(`${adapter} does not discover skill ${skill}`)
      }
    }
  }
  return problems
}

if (!checkCompassProjection({ root, additionalProblems: inspectGroundworkAdoption() })) {
  process.exitCode = 1
}
