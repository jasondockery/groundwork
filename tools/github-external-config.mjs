import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { analyzeWorkflowExternalConfig } from './workflow-external-config.mjs'

const REGISTRY_PATH = 'tools/github-external-config.json'

export function collectGithubExternalConfigViolations(root) {
  readRegistry(path.join(root, REGISTRY_PATH))
  const analysis = collectUsages(path.join(root, '.github/workflows'), root)
  const violations = [...analysis.violations]
  for (const reference of analysis.usages.keys()) {
    violations.push(`Missing registry entry for workflow reference ${reference}.`)
  }
  return violations
}

function collectUsages(workflowsDir, root) {
  const usages = new Map()
  const violations = []
  if (!fs.existsSync(workflowsDir)) return { usages, violations }
  for (const file of workflowFiles(workflowsDir)) {
    const relative = path.relative(root, file).split(path.sep).join('/')
    const source = fs.readFileSync(file, 'utf8')
    const analysis = analyzeWorkflowExternalConfig(source)
    violations.push(...analysis.violations.map((message) => `${relative}: ${message}`))
    for (const usage of analysis.usages) {
      const values = usages.get(usage.reference) ?? []
      values.push({ ...usage, file: relative })
      usages.set(usage.reference, values)
    }
  }
  return { usages, violations }
}

function workflowFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(dir, entry.name)
      if (entry.isDirectory()) return workflowFiles(entryPath)
      return entry.isFile() && /\.ya?ml$/.test(entry.name) ? [entryPath] : []
    })
    .sort()
}

function readRegistry(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing GitHub external configuration registry: ${file}`)
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
  const topLevelKeys =
    typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? Object.keys(parsed).sort()
      : []
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed) ||
    topLevelKeys.join(',') !== 'capabilities,references' ||
    typeof parsed.capabilities !== 'object' ||
    parsed.capabilities === null ||
    Array.isArray(parsed.capabilities) ||
    Object.keys(parsed.capabilities).length !== 0 ||
    typeof parsed.references !== 'object' ||
    parsed.references === null ||
    Array.isArray(parsed.references) ||
    Object.keys(parsed.references).length !== 0
  ) {
    throw new Error(
      'Groundwork registry must contain exactly empty capabilities and references objects.'
    )
  }
  return parsed
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(import.meta.dirname, '..')
  try {
    const violations = collectGithubExternalConfigViolations(root)
    if (violations.length > 0) {
      for (const violation of violations) process.stderr.write(`${violation}\n`)
      process.exitCode = 1
    } else {
      process.stdout.write('GitHub external configuration registry passed.\n')
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  }
}
