#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { readAuthorities } from './sync-toolchain.mjs'

const EXACT = /^\d+\.\d+\.\d+$/
const COMMAND_TIMEOUT_MS = 30_000
export const EVIDENCE_DEADLINE_MS = 180_000

// Every observation already has a per-command timeout, but this report runs one
// registry lookup per outdated package: N packages inherit N independent
// timeouts and no bound at all on the whole run. The cumulative deadline is the
// operation's real deadline; a per-command timeout is not a substitute for it.
export function evidenceBudget(totalMs = EVIDENCE_DEADLINE_MS, now = () => Date.now()) {
  const start = now()
  return {
    remaining() { return totalMs - (now() - start) },
    slice(perCommandMs = COMMAND_TIMEOUT_MS) {
      const left = this.remaining()
      if (left <= 0) throw new Error(`toolchain evidence exceeded its ${totalMs / 1000}s cumulative deadline before every observation completed.`)
      return Math.min(perCommandMs, left)
    },
  }
}

export function runJsonCommand(command, args, { cwd = process.cwd(), acceptedStatuses = [0], runner = spawnSync, timeout = COMMAND_TIMEOUT_MS } = {}) {
  const result = runner(command, args, { cwd, encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] })
  if (result.error) throw new Error(`${command} ${args.join(' ')} failed: ${result.error.message}`)
  if (result.signal) throw new Error(`${command} ${args.join(' ')} was terminated by ${result.signal}.`)
  if (!acceptedStatuses.includes(result.status)) throw new Error(`${command} ${args.join(' ')} exited ${String(result.status)}: ${String(result.stderr ?? '').trim() || 'no diagnostic'}`)
  const output = String(result.stdout ?? '').trim()
  if (!output) throw new Error(`${command} ${args.join(' ')} returned no JSON evidence.`)
  let parsed
  try { parsed = JSON.parse(output) } catch { throw new Error(`${command} ${args.join(' ')} returned malformed JSON evidence.`) }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error(`${command} ${args.join(' ')} must return a JSON object.`)
  return parsed
}

export function runTextCommand(command, args, { cwd = process.cwd(), runner = spawnSync, timeout = COMMAND_TIMEOUT_MS } = {}) {
  const result = runner(command, args, { cwd, encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] })
  if (result.error) throw new Error(`${command} ${args.join(' ')} failed: ${result.error.message}`)
  if (result.signal) throw new Error(`${command} ${args.join(' ')} was terminated by ${result.signal}.`)
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} exited ${String(result.status)}: ${String(result.stderr ?? '').trim() || 'no diagnostic'}`)
  const output = String(result.stdout ?? '').trim()
  if (!output) throw new Error(`${command} ${args.join(' ')} returned no evidence.`)
  return output
}

function workspaceCatalog(root) {
  const file = path.join(root, 'pnpm-workspace.yaml')
  if (!fs.existsSync(file)) return {}
  const catalog = {}
  let inCatalog = false
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (/^[A-Za-z]/.test(line)) inCatalog = line.trim() === 'catalog:'
    else if (inCatalog) {
      const match = /^\s{2}(?:'([^']+)'|"([^"]+)"|([^:\s]+)):\s*(?:'([^']+)'|"([^"]+)"|([^#\s]+))\s*(?:#.*)?$/.exec(line)
      if (match) catalog[match[1] ?? match[2] ?? match[3]] = match[4] ?? match[5] ?? match[6]
      else if (line.trim() && !/^\s/.test(line)) inCatalog = false
    }
  }
  return catalog
}

export function readDeclaredSpecifications(root = process.cwd(), inventoryOutput) {
  const catalog = workspaceCatalog(root)
  const result = inventoryOutput === undefined ? spawnSync('git', ['-C', root, 'ls-files', '--cached', '--others', '--exclude-standard', '-z', '**/package.json', 'package.json'], { encoding: 'utf8', timeout: 10_000 }) : { status: 0, stdout: inventoryOutput }
  if (result.error || result.status !== 0) throw new Error('could not enumerate package manifests.')
  const specifications = {}
  for (const relative of String(result.stdout ?? '').split('\0').filter(Boolean)) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'))
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies', 'overrides']) {
      for (const [name, raw] of Object.entries(manifest[field] ?? {})) specifications[name] ??= raw === 'catalog:' ? (catalog[name] ?? 'catalog: (unresolved)') : String(raw)
    }
  }
  return specifications
}

function classify(from, to) {
  if (!EXACT.test(String(from)) || !EXACT.test(String(to))) return 'non-semver/unknown'
  const a = from.split('.').map(Number); const b = to.split('.').map(Number)
  return b[0] !== a[0] ? 'major' : b[1] !== a[1] ? 'minor' : b[2] !== a[2] ? 'patch' : 'current'
}

export function formatOutdated(entries, compatibleEntries, metadata = {}, specifications = {}) {
  if (Object.keys(entries).length === 0 && Object.keys(compatibleEntries).length === 0) return ['Package dependencies: pnpm reported no outdated packages in either the mature or compatible view.']
  const names = [...new Set([...Object.keys(entries), ...Object.keys(compatibleEntries)])].sort()
  return names.flatMap((name) => {
    const mature = entries[name] ?? {}
    const compatible = compatibleEntries[name] ?? {}
    const current = mature.current ?? compatible.current ?? 'unknown'
    const lockfileWanted = mature.wanted ?? compatible.wanted ?? 'unknown'
    const compatibleLatest = Object.hasOwn(compatibleEntries, name) ? (compatible.latest ?? 'unknown') : current
    const matureLatest = mature.latest ?? 'unknown'
    const registryNewest = metadata[name]?.['dist-tags']?.latest ?? 'unknown'
    return [
      `Package: ${name}`,
      `  Current: ${current}`,
      `  Lockfile Wanted: ${lockfileWanted}`,
      `  Compatible Latest: ${compatibleLatest}`,
      `  pnpm-mature Latest: ${matureLatest}`,
      `  Registry Newest: ${registryNewest}`,
      `  Declared Specification: ${specifications[name] ?? 'unknown'}`,
      `  Compatible update available: ${compatibleLatest === 'unknown' ? 'unknown' : compatibleLatest === current ? 'no' : 'yes'}`,
      `  Update classification: ${classify(current, registryNewest)}`,
      '  pnpm age status: represented only by pnpm-mature Latest; unavailable data stays unknown.',
      '  Renovate Eligibility: inspect the dependency dashboard; registry and compatible versions do not prove age or schedule eligibility.',
      '',
    ]
  })
}

export function formatToolchain(authority, newest) {
  return [
    'Toolchain authorities',
    `  Node authority: ${authority.node}`,
    `  Node registry newest: ${newest.node}`,
    `  Node classification: ${classify(authority.node, newest.node)}`,
    `  pnpm authority: ${authority.pnpm}`,
    `  pnpm registry newest: ${newest.pnpm}`,
    `  pnpm classification: ${classify(authority.pnpm, newest.pnpm)}`,
    '  Renovate Eligibility: inspect the dependency dashboard; newest is not the same as eligible.',
  ]
}

export function collectOutdatedEvidence(root = process.cwd(), runner = spawnSync, budget = evidenceBudget()) {
  const entries = runJsonCommand('pnpm', ['outdated', '--format', 'json'], { cwd: root, acceptedStatuses: [0, 1], runner, timeout: budget.slice() })
  const compatible = runJsonCommand('pnpm', ['outdated', '--compatible', '--format', 'json'], { cwd: root, acceptedStatuses: [0, 1], runner, timeout: budget.slice() })
  const metadata = {}
  for (const name of new Set([...Object.keys(entries), ...Object.keys(compatible)])) metadata[name] = runJsonCommand('pnpm', ['view', name, 'time', 'dist-tags', '--json'], { cwd: root, runner, timeout: budget.slice() })
  const authority = readAuthorities(root)
  const node = runTextCommand('node', ['--input-type=module', '--eval', "const response=await fetch('https://nodejs.org/dist/index.json');if(!response.ok)throw new Error(`Node release index HTTP ${response.status}`);const releases=await response.json();const stable=releases.find(({version})=>/^v\\d+\\.\\d+\\.\\d+$/.test(version));if(!stable)throw new Error('no stable Node release');process.stdout.write(stable.version.slice(1))"], { cwd: root, runner, timeout: budget.slice() })
  if (!EXACT.test(node)) throw new Error('Node release index returned a non-semver stable release.')
  const pnpmMetadata = runJsonCommand('pnpm', ['view', 'pnpm', 'dist-tags', '--json'], { cwd: root, runner, timeout: budget.slice() })
  const pnpm = pnpmMetadata.latest
  if (!EXACT.test(String(pnpm))) throw new Error('pnpm registry metadata did not contain an exact latest release.')
  return { entries, compatible, metadata, specifications: readDeclaredSpecifications(root), authority, newest: { node, pnpm } }
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : ''
if (invoked && fs.realpathSync(invoked) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const evidence = collectOutdatedEvidence()
  console.log([...formatToolchain(evidence.authority, evidence.newest), '', ...formatOutdated(evidence.entries, evidence.compatible, evidence.metadata, evidence.specifications)].join('\n').trimEnd())
}
