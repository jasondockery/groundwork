#!/usr/bin/env node
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

export const COMPASS_REPOSITORY = 'jasondockery/compass'
export const COMPASS_SKILL_NAMES = Object.freeze([
  'accessible-product-development',
  'dependency-change',
  'field-failure-backpressure',
  'inclusive-content-design',
  'inclusive-product-foundation',
  'internationalization-first',
  'performance-sensitive-change',
  'privacy-by-design',
  'secure-by-design',
  'verification-selection',
])
export const COMPASS_SHAREABLE_PATHS = Object.freeze([
  'COMPASS.md',
  'TERMINOLOGY.md',
  'scripts/check-projection.mjs',
  ...COMPASS_SKILL_NAMES.flatMap((name) => [
    `skills/${name}/SKILL.md`,
    `skills/${name}/agents/openai.yaml`,
  ]),
].sort())
export const MAX_MANAGED_FILE_BYTES = 1024 * 1024
export const MAX_INCLUDED_FILE_COUNT = 256
export const MAX_PROJECTED_BYTES = 32 * 1024 * 1024
export const MAX_ARTIFACT_BYTES = 64 * 1024 * 1024
export const MAX_RECONSTRUCTED_ARTIFACT_BYTES = 64 * 1024 * 1024

const SHA256 = /^[0-9a-f]{64}$/u
const COMMIT = /^[0-9a-f]{40}$/u
const MAX_RECEIPT_BYTES = 256 * 1024
const modulePath = fileURLToPath(import.meta.url)
const defaultConsumerRoot = path.resolve(path.dirname(modulePath), '..')

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function isMainModule(argvPath = process.argv[1]) {
  if (!argvPath) return false
  try {
    return fs.realpathSync.native(path.resolve(argvPath)) === fs.realpathSync.native(modulePath)
  } catch {
    return false
  }
}

function safeRelativePath(value) {
  return typeof value === 'string' && value.length > 0 && !value.includes('\\') &&
    !path.posix.isAbsolute(value) && path.posix.normalize(value) === value &&
    !value.split('/').includes('..')
}

export function compassProjectionPath(sourcePath) {
  if (sourcePath === 'COMPASS.md' || sourcePath === 'TERMINOLOGY.md') {
    return `.compass/${sourcePath}`
  }
  if (sourcePath === 'scripts/check-projection.mjs') return '.compass/check-projection.mjs'
  return sourcePath
}

function inspectExactDirectory(root, relative, expectedNames, problems) {
  const absolute = path.join(root, relative)
  let stat
  try {
    stat = fs.lstatSync(absolute)
  } catch (error) {
    problems.push(error?.code === 'ENOENT'
      ? `Compass managed directory is missing: ${relative}`
      : `Compass managed directory is unreadable: ${relative}: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    problems.push(`Compass managed directory must be a regular non-symlink directory: ${relative}`)
    return false
  }

  const expected = new Set(expectedNames)
  const seen = new Set()
  const directory = fs.opendirSync(absolute)
  try {
    while (true) {
      const entry = directory.readSync()
      if (!entry) break
      if (!expected.has(entry.name)) {
        problems.push(`unexpected entry in Compass managed directory ${relative}: ${entry.name}`)
        return false
      }
      seen.add(entry.name)
    }
  } catch (error) {
    problems.push(`Compass managed directory is unreadable: ${relative}: ${error instanceof Error ? error.message : String(error)}`)
    return false
  } finally {
    try { directory.closeSync() } catch {}
  }
  const missing = expectedNames.filter((name) => !seen.has(name))
  if (missing.length > 0) {
    problems.push(`Compass managed directory ${relative} is missing: ${missing.join(', ')}`)
    return false
  }
  return true
}

function sameFile(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.mode === right.mode &&
    left.size === right.size && left.mtimeMs === right.mtimeMs
}

function readRegularFile(root, relative, problems, {
  expectedBytes,
  maximumBytes = MAX_MANAGED_FILE_BYTES,
} = {}) {
  if (!safeRelativePath(relative)) {
    problems.push(`unsafe projected path: ${String(relative)}`)
    return null
  }
  let parent = root
  for (const segment of path.dirname(relative).split('/').filter((value) => value && value !== '.')) {
    parent = path.join(parent, segment)
    let parentStat
    try {
      parentStat = fs.lstatSync(parent)
    } catch (error) {
      problems.push(error?.code === 'ENOENT'
        ? `projected Compass parent is missing: ${path.relative(root, parent)}`
        : `projected Compass parent is unreadable: ${path.relative(root, parent)}`)
      return null
    }
    if (parentStat.isSymbolicLink() || !parentStat.isDirectory()) {
      problems.push(`projected Compass parent must be a regular non-symlink directory: ${path.relative(root, parent)}`)
      return null
    }
  }
  const absolute = path.join(root, relative)
  let stat
  try {
    stat = fs.lstatSync(absolute)
  } catch (error) {
    problems.push(error?.code === 'ENOENT'
      ? `projected Compass file is missing: ${relative}`
      : `projected Compass file is unreadable: ${relative}: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    problems.push(`projected Compass file must be a regular non-symlink file: ${relative}`)
    return null
  }
  if (!Number.isSafeInteger(stat.size) || stat.size < 0 || stat.size > maximumBytes) {
    problems.push(`projected Compass file exceeds the ${maximumBytes}-byte bound: ${relative}`)
    return null
  }
  if (expectedBytes !== undefined) {
    if (!Number.isSafeInteger(expectedBytes) || expectedBytes < 0 || expectedBytes > maximumBytes) {
      problems.push(`Compass receipt byte count exceeds the ${maximumBytes}-byte bound: ${relative}`)
      return null
    }
    if (stat.size !== expectedBytes) {
      problems.push(`projected Compass byte count differs: ${relative}`)
      return null
    }
  }

  let descriptor
  try {
    descriptor = fs.openSync(absolute, 'r')
    const opened = fs.fstatSync(descriptor)
    if (!sameFile(stat, opened)) {
      problems.push(`projected Compass file changed before bounded read: ${relative}`)
      return null
    }
    const bytes = Buffer.allocUnsafe(stat.size)
    let offset = 0
    while (offset < bytes.length) {
      const count = fs.readSync(descriptor, bytes, offset, bytes.length - offset, offset)
      if (count === 0) break
      offset += count
    }
    const extra = Buffer.allocUnsafe(1)
    const extraBytes = fs.readSync(descriptor, extra, 0, 1, offset)
    const after = fs.fstatSync(descriptor)
    if (offset !== stat.size || extraBytes !== 0 || !sameFile(opened, after)) {
      problems.push(`projected Compass file changed during bounded read: ${relative}`)
      return null
    }
    return bytes
  } catch (error) {
    problems.push(`projected Compass file is unreadable: ${relative}: ${error instanceof Error ? error.message : String(error)}`)
    return null
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor)
  }
}

function validateManagedNamespaces(root, problems) {
  if (!inspectExactDirectory(
    root,
    '.compass',
    ['COMPASS.md', 'TERMINOLOGY.md', 'check-projection.mjs', 'receipt.json'],
    problems
  )) return false

  for (const name of COMPASS_SKILL_NAMES) {
    const relativeDirectory = `skills/${name}`
    if (!inspectExactDirectory(root, relativeDirectory, ['SKILL.md', 'agents'], problems)) return false
    if (!inspectExactDirectory(root, `${relativeDirectory}/agents`, ['openai.yaml'], problems)) return false
  }
  return true
}

function validateReceiptShape(receipt, problems, expectedPaths) {
  const initialProblemCount = problems.length
  if (receipt?.schema !== 'compass.artifact-receipt' || receipt.schemaVersion !== 1) {
    problems.push('Compass receipt has an unsupported schema or version')
    return false
  }
  if (
    receipt.source?.repository !== COMPASS_REPOSITORY ||
    !COMMIT.test(receipt.source?.commit ?? '') ||
    !COMMIT.test(receipt.source?.tree ?? '') ||
    !SHA256.test(receipt.source?.fingerprintSha256 ?? '') ||
    receipt.source?.dirty !== false
  ) problems.push('Compass receipt does not bind a complete clean source identity')
  if (
    !SHA256.test(receipt.artifactSha256 ?? '') ||
    !Number.isSafeInteger(receipt.artifactBytes) ||
    receipt.artifactBytes <= 0 ||
    receipt.artifactBytes > MAX_ARTIFACT_BYTES
  ) {
    problems.push('Compass receipt has an invalid artifact identity')
  }
  if (receipt.validation?.result !== 'passed' || !SHA256.test(receipt.validation?.receiptSha256 ?? '')) {
    problems.push('Compass receipt does not bind passing source validation')
  }
  if (!Array.isArray(receipt.includedFiles)) {
    problems.push('Compass receipt includedFiles inventory is missing')
    return false
  }
  if (receipt.includedFiles.length > MAX_INCLUDED_FILE_COUNT) {
    problems.push(`Compass receipt exceeds the ${MAX_INCLUDED_FILE_COUNT}-file inventory bound`)
  }
  const paths = receipt.includedFiles.map((entry) => entry?.path)
  if (expectedPaths === null) {
    const sorted = [...paths].sort()
    if (
      paths.length === 0 ||
      paths.some((entry) => !safeRelativePath(entry)) ||
      new Set(paths).size !== paths.length ||
      JSON.stringify(paths) !== JSON.stringify(sorted)
    ) problems.push('Compass receipt includedFiles inventory is unsafe, duplicated, or out of canonical order')
  } else if (JSON.stringify(paths) !== JSON.stringify(expectedPaths)) {
    problems.push('Compass receipt includedFiles inventory is not the exact canonical path order')
  }

  let projectedBytes = 0
  let encodedBytes = 0
  for (const entry of receipt.includedFiles) {
    if (!SHA256.test(entry?.sha256 ?? '') || !Number.isSafeInteger(entry?.bytes) || entry.bytes < 0) {
      problems.push(`Compass receipt inventory metadata is invalid: ${String(entry?.path)}`)
      continue
    }
    if (entry.bytes > MAX_MANAGED_FILE_BYTES) {
      problems.push(`Compass receipt byte count exceeds the ${MAX_MANAGED_FILE_BYTES}-byte bound: ${String(entry.path)}`)
      continue
    }
    if (projectedBytes > MAX_PROJECTED_BYTES - entry.bytes) {
      problems.push(`Compass receipt exceeds the ${MAX_PROJECTED_BYTES}-byte aggregate projected-content bound`)
      continue
    }
    projectedBytes += entry.bytes
    encodedBytes += 4 * Math.ceil(entry.bytes / 3)
  }

  if (problems.length === initialProblemCount) {
    const reconstructionSkeleton = `${JSON.stringify({
      schema: 'compass.artifact',
      schemaVersion: 1,
      source: {
        repository: receipt.source.repository,
        commit: receipt.source.commit,
        tree: receipt.source.tree,
        fingerprintSha256: receipt.source.fingerprintSha256,
        dirty: receipt.source.dirty,
      },
      files: receipt.includedFiles.map((entry) => ({
        path: entry.path,
        sha256: entry.sha256,
        bytes: entry.bytes,
        contentBase64: '',
      })),
    }, null, 2)}\n`
    const reconstructedBytes = Buffer.byteLength(reconstructionSkeleton) + encodedBytes
    if (reconstructedBytes > MAX_RECONSTRUCTED_ARTIFACT_BYTES) {
      problems.push(
        `Compass receipt exceeds the ${MAX_RECONSTRUCTED_ARTIFACT_BYTES}-byte reconstructed-artifact bound`
      )
    }
  }
  return problems.length === initialProblemCount
}

export function inspectCompassProjection(root = defaultConsumerRoot, {
  expectedPaths = COMPASS_SHAREABLE_PATHS,
  checkManagedNamespaces = true,
} = {}) {
  const consumerRoot = path.resolve(root)
  const problems = []
  if (checkManagedNamespaces && !validateManagedNamespaces(consumerRoot, problems)) {
    return { root: consumerRoot, receipt: null, problems }
  }
  const receiptBytes = readRegularFile(
    consumerRoot,
    '.compass/receipt.json',
    problems,
    { maximumBytes: MAX_RECEIPT_BYTES }
  )
  if (!receiptBytes) return { root: consumerRoot, receipt: null, problems }

  let receipt
  try {
    receipt = JSON.parse(receiptBytes.toString('utf8'))
  } catch (error) {
    problems.push(`Compass receipt is malformed JSON: ${error instanceof Error ? error.message : String(error)}`)
    return { root: consumerRoot, receipt: null, problems }
  }
  if (!validateReceiptShape(receipt, problems, expectedPaths)) {
    return { root: consumerRoot, receipt, problems }
  }

  const shareablePaths = expectedPaths ?? receipt.includedFiles.map(({ path: sourcePath }) => sourcePath)
  const artifactFiles = []
  for (let index = 0; index < shareablePaths.length; index += 1) {
    const sourcePath = shareablePaths[index]
    const entry = receipt.includedFiles[index]
    if (!entry || entry.path !== sourcePath || !safeRelativePath(entry.path)) continue
    const projectedPath = compassProjectionPath(sourcePath)
    const bytes = readRegularFile(
      consumerRoot,
      projectedPath,
      problems,
      { expectedBytes: entry.bytes }
    )
    if (!bytes) continue
    if (sha256(bytes) !== entry.sha256) problems.push(`projected Compass digest differs: ${projectedPath}`)
    artifactFiles.push({
      path: sourcePath,
      sha256: sha256(bytes),
      bytes: bytes.length,
      contentBase64: bytes.toString('base64'),
    })
  }

  if (artifactFiles.length === shareablePaths.length) {
    const canonicalSource = {
      repository: receipt.source.repository,
      commit: receipt.source.commit,
      tree: receipt.source.tree,
      fingerprintSha256: receipt.source.fingerprintSha256,
      dirty: receipt.source.dirty,
    }
    const reconstructedText = `${JSON.stringify({
      schema: 'compass.artifact',
      schemaVersion: 1,
      source: canonicalSource,
      files: artifactFiles,
    }, null, 2)}\n`
    if (Buffer.byteLength(reconstructedText) > MAX_RECONSTRUCTED_ARTIFACT_BYTES) {
      problems.push('projected Compass reconstruction exceeds its bounded allocation')
      return { root: consumerRoot, receipt, problems }
    }
    const reconstructed = Buffer.from(reconstructedText)
    if (reconstructed.length !== receipt.artifactBytes || sha256(reconstructed) !== receipt.artifactSha256) {
      problems.push('projected Compass bytes do not reconstruct the receipt-bound artifact identity')
    }
  }
  return { root: consumerRoot, receipt, problems }
}

export function checkCompassProjection({
  root = defaultConsumerRoot,
  additionalProblems = [],
  write = (value) => process.stdout.write(value),
  writeError = (value) => process.stderr.write(value),
} = {}) {
  const inspected = inspectCompassProjection(root)
  const problems = [...inspected.problems, ...additionalProblems]
  if (problems.length > 0) {
    writeError(`Compass projection check failed:\n- ${problems.join('\n- ')}\n`)
    writeError('Recovery: rerun the accepted Compass projection command with --replace, then rerun this checker.\n')
    return false
  }
  write(`Compass projection matches ${inspected.receipt.source.commit} (${inspected.receipt.artifactSha256}).\n`)
  return true
}

if (isMainModule() && !checkCompassProjection()) process.exitCode = 1
