#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const EXACT = /^\d+\.\d+\.\d+$/

function read(root, file) { return fs.readFileSync(path.join(root, file), 'utf8') }

export function readAuthorities(root = process.cwd()) {
  const node = read(root, '.node-version').trim()
  const manifest = JSON.parse(read(root, 'package.json'))
  const pnpm = /^pnpm@(\d+\.\d+\.\d+)(?:\+.+)?$/.exec(manifest.packageManager ?? '')?.[1]
  if (!EXACT.test(node)) throw new Error('.node-version must contain one exact semantic version in x.y.z form.')
  if (!pnpm) throw new Error('package.json#packageManager must pin pnpm to an exact semantic version.')
  return { node, pnpm }
}

function lineEnding(source, file) {
  if (source.includes('\r\n') && source.replaceAll('\r\n', '').includes('\n')) throw new Error(`${file} mixes CRLF and LF line endings.`)
  return source.includes('\r\n') ? '\r\n' : '\n'
}

export function synchronizeMise(source, node, file = 'mise.toml') {
  const eol = lineEnding(source, file)
  const lines = source.replaceAll('\r\n', '\n').replace(/\n$/, '').split('\n')
  let toolsSections = 0
  let inTools = false
  let nodeKeys = 0
  let pnpmKeys = 0
  const output = []
  for (const line of lines) {
    const section = /^\s*\[([^\]]+)]\s*(?:#.*)?$/.exec(line)
    if (section) {
      inTools = section[1] === 'tools'
      if (inTools) toolsSections += 1
      output.push(line)
      continue
    }
    if (!inTools) { output.push(line); continue }
    if (/^\s*["'](?:node|pnpm)["']\s*=/.test(line)) throw new Error(`${file} does not support quoted tool keys.`)
    if (/^\s*node\s*=/.test(line)) { nodeKeys += 1; output.push(`node = "${node}"`); continue }
    if (/^\s*pnpm\s*=/.test(line)) { pnpmKeys += 1; continue }
    if (line.trim() && !/^\s*#/.test(line)) throw new Error(`${file} contains an unsupported [tools] entry.`)
    output.push(line)
  }
  if (toolsSections !== 1) throw new Error(`${file} must contain exactly one [tools] section.`)
  if (nodeKeys !== 1) throw new Error(`${file} must contain exactly one node key in [tools].`)
  if (pnpmKeys > 1) throw new Error(`${file} contains duplicate pnpm keys in [tools].`)
  return `${output.join(eol)}${eol}`
}

function synchronizeManifest(source, authority, template = false) {
  const manifest = JSON.parse(source)
  if (template) manifest.packageManager = `pnpm@${authority.pnpm}`
  manifest.engines = { ...manifest.engines, node: authority.node, pnpm: authority.pnpm }
  return `${JSON.stringify(manifest, null, 2)}\n`
}

export function plannedToolchainUpdates(root = process.cwd()) {
  const authority = readAuthorities(root)
  const desired = new Map([
    ['.nvmrc', `${authority.node}\n`],
    ['mise.toml', synchronizeMise(read(root, 'mise.toml'), authority.node)],
    ['package.json', synchronizeManifest(read(root, 'package.json'), authority)],
  ])
  const template = 'packages/cli/templates/init'
  if (fs.existsSync(path.join(root, template))) {
    desired.set(`${template}/.node-version`, `${authority.node}\n`)
    desired.set(`${template}/.nvmrc`, `${authority.node}\n`)
    desired.set(`${template}/mise.toml`, synchronizeMise(read(root, `${template}/mise.toml`), authority.node, `${template}/mise.toml`))
    desired.set(`${template}/package.json`, synchronizeManifest(read(root, `${template}/package.json`), authority, true))
  }
  return [...desired].filter(([file, contents]) => read(root, file) !== contents).map(([file, contents]) => ({ file, contents }))
}

const defaultOps = {
  read(file) { return fs.readFileSync(file, 'utf8') },
  write(file, contents, mode) { fs.writeFileSync(file, contents, { mode, flag: 'wx' }) },
  rename(from, to) { fs.renameSync(from, to) },
  remove(file) { fs.rmSync(file, { force: true }) },
  mode(file) { return fs.statSync(file).mode & 0o777 },
}

export function applyUpdatesAtomically(root, updates, ops = defaultOps) {
  if (updates.length === 0) return
  const read = ops.read ?? defaultOps.read
  const transaction = `${process.pid}-${Date.now()}`
  const staged = []
  const replaced = []
  try {
    for (const update of updates) {
      const target = path.join(root, update.file)
      const temporary = `${target}.toolchain-${transaction}.tmp`
      ops.write(temporary, update.contents, ops.mode(target))
      staged.push({ ...update, target, temporary, original: read(target), mode: ops.mode(target) })
    }
    for (const entry of staged) {
      ops.rename(entry.temporary, entry.target)
      replaced.push(entry)
    }
  } catch (error) {
    for (const entry of staged) ops.remove(entry.temporary)
    // A failure while restoring must never replace the failure that caused the
    // rollback: that original error is the one that explains what went wrong.
    // Keep restoring the remaining targets and report what stayed modified.
    const unrestored = []
    for (const entry of [...replaced].reverse()) {
      const restore = `${entry.target}.toolchain-${transaction}.restore`
      try { ops.write(restore, entry.original, entry.mode); ops.rename(restore, entry.target) }
      catch { unrestored.push(entry.file) }
      finally { ops.remove(restore) }
    }
    if (unrestored.length > 0) error.message = `${error.message} (rollback could not restore ${unrestored.join(', ')}; recover those files from Git before retrying)`
    throw error
  }
}

export function syncToolchain(root = process.cwd(), ops = defaultOps) {
  const updates = plannedToolchainUpdates(root)
  applyUpdatesAtomically(root, updates, ops)
  return updates
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : ''
if (invoked && fs.realpathSync(invoked) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  if (process.argv.length !== 2) throw new Error('toolchain:sync accepts no arguments')
  syncToolchain()
}
