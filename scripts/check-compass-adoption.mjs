#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  checkCompassProjection,
  COMPASS_SKILL_NAMES,
} from '../.compass/check-projection.mjs'
import { generatedLocalSkillAdapters } from './generate-skill-adapters.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sharedSkills = [...COMPASS_SKILL_NAMES]

// Materialized .agents/skills and .claude/skills content for Compass-managed
// skills is already fully validated (exact receipt-bound bytes and shape) by
// checkCompassProjection below. Groundwork-local skills get the same adapter
// treatment via generate-skill-adapters.mjs; verify those bytes here, since
// nothing else does. .codex/skills is a retired route (Compass's current
// artifact routes Codex discovery through .agents/skills instead) — its
// absence is itself the expected, checked state, not an omission.
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

  const skillNames = fs
    .readdirSync(path.join(root, 'skills'), { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && fs.existsSync(path.join(root, 'skills', entry.name, 'SKILL.md'))
    )
    .map((entry) => entry.name)
    .sort()
  const localSkills = skillNames.filter((name) => !sharedSkills.includes(name))
  if (localSkills.length === 0) problems.push('Groundwork-local skills are missing')

  if (fs.existsSync(path.join(root, '.codex', 'skills'))) {
    problems.push('.codex/skills is a retired discovery route and must not exist')
  }

  for (const adapter of generatedLocalSkillAdapters()) {
    const target = path.join(root, ...adapter.relativePath.split('/'))
    const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : undefined
    if (current !== adapter.contents) {
      problems.push(
        `${adapter.relativePath} is missing or stale; run node scripts/generate-skill-adapters.mjs`
      )
    }
  }
  return problems
}

if (!checkCompassProjection({ root, additionalProblems: inspectGroundworkAdoption() })) {
  process.exitCode = 1
}
