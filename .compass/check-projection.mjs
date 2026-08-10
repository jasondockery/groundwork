#!/usr/bin/env node
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

export const COMPASS_REPOSITORY = 'jasondockery/compass'
export const COMPASS_SKILL_NAMES = Object.freeze([
  'dependency-change',
  'field-failure-backpressure',
  'performance-sensitive-change',
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

const SHA256 = /^[0-9a-f]{64}$/u
const COMMIT = /^[0-9a-f]{40}$/u
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

function walkFiles(directory, root = directory) {
  if (!fs.existsSync(directory)) return []
  const found = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(directory, entry.name)
    const relative = path.relative(root, absolute).split(path.sep).join('/')
    if (entry.isDirectory()) found.push(...walkFiles(absolute, root))
    else if (entry.isFile()) found.push(relative)
    else found.push(`UNSUPPORTED:${relative}`)
  }
  return found
}

function readRegularFile(root, relative, problems) {
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
  try {
    return fs.readFileSync(absolute)
  } catch (error) {
    problems.push(`projected Compass file is unreadable: ${relative}: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

function validateManagedNamespaces(root, problems) {
  const compassDirectory = path.join(root, '.compass')
  let compassStat
  try {
    compassStat = fs.lstatSync(compassDirectory)
  } catch (error) {
    problems.push(error?.code === 'ENOENT'
      ? 'Compass managed directory is missing: .compass'
      : `Compass managed directory is unreadable: ${error instanceof Error ? error.message : String(error)}`)
    return
  }
  if (compassStat.isSymbolicLink() || !compassStat.isDirectory()) {
    problems.push('Compass managed directory must be a regular non-symlink directory: .compass')
    return
  }
  const expectedCompass = ['COMPASS.md', 'TERMINOLOGY.md', 'check-projection.mjs', 'receipt.json'].sort()
  const actualCompass = walkFiles(compassDirectory).sort()
  if (JSON.stringify(actualCompass) !== JSON.stringify(expectedCompass)) {
    problems.push(`unexpected Compass managed files in .compass: expected ${expectedCompass.join(', ')}; observed ${actualCompass.join(', ') || 'none'}`)
  }

  for (const name of COMPASS_SKILL_NAMES) {
    const relativeDirectory = `skills/${name}`
    const directory = path.join(root, relativeDirectory)
    let stat
    try {
      stat = fs.lstatSync(directory)
    } catch (error) {
      problems.push(error?.code === 'ENOENT'
        ? `Compass managed skill directory is missing: ${relativeDirectory}`
        : `Compass managed skill directory is unreadable: ${relativeDirectory}`)
      continue
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      problems.push(`Compass managed skill directory must be a regular non-symlink directory: ${relativeDirectory}`)
      continue
    }
    const expected = ['SKILL.md', 'agents/openai.yaml']
    const actual = walkFiles(directory).sort()
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      problems.push(`unexpected files in Compass managed skill ${name}: expected ${expected.join(', ')}; observed ${actual.join(', ') || 'none'}`)
    }
  }
}

function validateReceiptShape(receipt, problems, expectedPaths) {
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
  if (!SHA256.test(receipt.artifactSha256 ?? '') || !Number.isSafeInteger(receipt.artifactBytes) || receipt.artifactBytes <= 0) {
    problems.push('Compass receipt has an invalid artifact identity')
  }
  if (receipt.validation?.result !== 'passed' || !SHA256.test(receipt.validation?.receiptSha256 ?? '')) {
    problems.push('Compass receipt does not bind passing source validation')
  }
  if (!Array.isArray(receipt.includedFiles)) {
    problems.push('Compass receipt includedFiles inventory is missing')
    return false
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
  return true
}

export function inspectCompassProjection(root = defaultConsumerRoot, {
  expectedPaths = COMPASS_SHAREABLE_PATHS,
  checkManagedNamespaces = true,
} = {}) {
  const consumerRoot = path.resolve(root)
  const problems = []
  const receiptBytes = readRegularFile(consumerRoot, '.compass/receipt.json', problems)
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
    if (!SHA256.test(entry.sha256 ?? '') || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0) {
      problems.push(`Compass receipt inventory metadata is invalid: ${sourcePath}`)
      continue
    }
    const projectedPath = compassProjectionPath(sourcePath)
    const bytes = readRegularFile(consumerRoot, projectedPath, problems)
    if (!bytes) continue
    if (bytes.length !== entry.bytes) problems.push(`projected Compass byte count differs: ${projectedPath}`)
    if (sha256(bytes) !== entry.sha256) problems.push(`projected Compass digest differs: ${projectedPath}`)
    artifactFiles.push({
      path: sourcePath,
      sha256: sha256(bytes),
      bytes: bytes.length,
      contentBase64: bytes.toString('base64'),
    })
  }

  if (checkManagedNamespaces) validateManagedNamespaces(consumerRoot, problems)
  if (artifactFiles.length === shareablePaths.length) {
    const canonicalSource = {
      repository: receipt.source.repository,
      commit: receipt.source.commit,
      tree: receipt.source.tree,
      fingerprintSha256: receipt.source.fingerprintSha256,
      dirty: receipt.source.dirty,
    }
    const reconstructed = Buffer.from(`${JSON.stringify({
      schema: 'compass.artifact',
      schemaVersion: 1,
      source: canonicalSource,
      files: artifactFiles,
    }, null, 2)}\n`)
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
