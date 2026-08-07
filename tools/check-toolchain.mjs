#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { plannedToolchainUpdates, readAuthorities } from './sync-toolchain.mjs'
import { toolchainContract } from './toolchain-contract.mjs'

const FORMATS = new Set(['plain-version', 'packageManager', 'tools.node', 'engines.node', 'engines.pnpm', 'packageManager-and-engines', 'node-version-file'])
const ROLES = new Set(['authority', 'derived-mirror', 'generated-mirror', 'reference'])

function probe(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 10_000, env: { ...process.env, COREPACK_ENABLE_NETWORK: '0' } })
  return { status: result.status, stdout: String(result.stdout ?? '').trim(), error: result.error }
}

function pathIn(relative, roots = []) { return roots.some((root) => relative === root || relative.startsWith(`${root}/`)) }
function versionBearingLine(line) {
  return /\b(?:Node(?:\.js)?|pnpm)(?:\s+(?:version|runtime|requires|requirement|authority|uses|use|pin|pinned|at|>=?)?\s*)v?\d+\.\d+\.\d+\b/i.test(line) ||
    /\b(?:NODE|PNPM)(?:_[A-Z0-9]+)*_VERSION\b\s*[:=]\s*["']?v?\d+\.\d+\.\d+\b/i.test(line) ||
    /\b(?:node-version|node_version|pnpm-version|pnpm_version)\b\s*[:=]\s*["']?v?\d+\.\d+\.\d+\b/i.test(line)
}

export function collectContractInventoryProblems(root) {
  const problems = []
  const seen = new Set()
  for (const consumer of toolchainContract.consumers) {
    const key = `${consumer.path}\0${consumer.tool}\0${consumer.format}`
    if (seen.has(key)) problems.push(`duplicate toolchain consumer declaration: ${consumer.path} ${consumer.tool} ${consumer.format}.`)
    seen.add(key)
    if (!['node', 'pnpm'].includes(consumer.tool) || !ROLES.has(consumer.role) || !FORMATS.has(consumer.format)) problems.push(`${consumer.path} has an unsupported toolchain consumer declaration.`)
    if (!fs.existsSync(path.join(root, consumer.path))) problems.push(`${consumer.path} is a registered toolchain consumer but is missing.`)
  }
  return problems
}

const UNSCANNED_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.turbo', '.next', '.cache'])

// Git is the authority on what a repository tracks, but a checkout without Git
// metadata is still a real tree. A bounded filesystem walk keeps this guard
// observing something rather than returning a silent pass — the exact failure
// it exists to catch. Symlinks are skipped so the walk cannot leave the tree.
function walkRepository(root) {
  const files = []
  const queue = ['']
  while (queue.length > 0) {
    const relativeDirectory = queue.pop()
    let entries
    try { entries = fs.readdirSync(path.join(root, relativeDirectory), { withFileTypes: true }) } catch { continue }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue
      const relative = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name
      if (entry.isDirectory()) { if (!UNSCANNED_DIRECTORIES.has(entry.name)) queue.push(relative) }
      else if (entry.isFile()) files.push(relative)
    }
  }
  return files
}

export function collectUnclassifiedToolchainLiterals(root, inventoryOutput) {
  const problems = []
  const registered = new Set(toolchainContract.consumers.map(({ path: consumerPath }) => consumerPath))
  const ignored = new Set(toolchainContract.ignoredGeneratedConsumers ?? [])
  let inventory
  if (inventoryOutput !== undefined) inventory = String(inventoryOutput).split('\0').filter(Boolean)
  else if (fs.existsSync(path.join(root, '.git'))) {
    const result = spawnSync('git', ['-C', root, 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8', timeout: 10_000 })
    if (result.error || result.status !== 0) return ['could not enumerate repository files for toolchain consumer classification.']
    inventory = String(result.stdout ?? '').split('\0').filter(Boolean)
  } else inventory = walkRepository(root)
  for (const relative of inventory) {
    if (registered.has(relative) || ignored.has(relative) || pathIn(relative, toolchainContract.classifiedFixtureRoots) || pathIn(relative, toolchainContract.classifiedHistoricalRoots) || toolchainContract.classifiedImplementationPaths.includes(relative) || /\.test\.[cm]?[jt]sx?$/.test(relative)) continue
    if (!/\.(?:c?m?js|tsx?|json|ya?ml|toml|md|mdx|html|txt|sh)$/.test(relative) && !/(?:^|\/)Dockerfile$/.test(relative) && relative !== '.tool-versions') continue
    let source
    try { source = fs.readFileSync(path.join(root, relative), 'utf8') } catch { problems.push(`${relative} is an unreadable toolchain consumer candidate.`); continue }
    source.split(/\r?\n/).forEach((line, index) => {
      if (versionBearingLine(line)) problems.push(`${relative}:${index + 1} contains an unclassified Node/pnpm version literal.`)
    })
  }
  return problems
}

export function collectToolchainProblems(root = process.cwd(), run = probe) {
  const problems = [...collectContractInventoryProblems(root)]
  let authority
  try { authority = readAuthorities(root) } catch (error) { return [...problems, error.message] }
  try { for (const update of plannedToolchainUpdates(root)) problems.push(`${update.file} is not synchronized; run pnpm toolchain:sync.`) }
  catch (error) { problems.push(`toolchain mirrors could not be planned: ${error instanceof Error ? error.message : String(error)}`) }
  problems.push(...collectUnclassifiedToolchainLiterals(root))
  const node = run('node', ['--version'], root)
  if (node.status !== 0 || node.stdout.replace(/^v/, '') !== authority.node) problems.push(`bare child-process node must resolve .node-version (${authority.node}).`)
  const pnpm = run('pnpm', ['--version'], root)
  if (pnpm.status !== 0 || pnpm.stdout !== authority.pnpm) problems.push(`bare child-process pnpm must resolve packageManager (${authority.pnpm}) through Corepack.`)
  const pnpmPath = run('node', ['-e', "const {realpathSync}=require('node:fs');const {execFileSync}=require('node:child_process');process.stdout.write(realpathSync(execFileSync(process.platform==='win32'?'where':'which',['pnpm'],{encoding:'utf8'}).trim().split(/\\r?\\n/)[0]))"], root)
  if (pnpmPath.status === 0 && /(?:[\\/]mise[\\/]installs[\\/]pnpm[\\/]|[\\/]Cellar[\\/]pnpm[\\/]|[\\/]homebrew[\\/]bin[\\/]pnpm$)/i.test(pnpmPath.stdout)) problems.push(`active pnpm is owned by a known standalone manager (${pnpmPath.stdout}).`)
  return problems
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : ''
if (invoked && fs.realpathSync(invoked) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const problems = collectToolchainProblems()
  if (problems.length) { console.error(['toolchain check failed:', ...problems.map((problem) => `  - ${problem}`)].join('\n')); process.exitCode = 1 }
}
