import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { collectToolchainProblems, collectUnclassifiedToolchainLiterals } from './check-toolchain.mjs'
import { formatOutdated, runJsonCommand } from './show-outdated.mjs'
import { applyUpdatesAtomically, plannedToolchainUpdates, syncToolchain, synchronizeMise } from './sync-toolchain.mjs'

function fixture(context, mise = '[tools]\nnode = "18.20.4"\npnpm = "9.15.5"\n') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'groundwork-toolchain-'))
  context.after(() => fs.rmSync(root, { recursive: true, force: true }))
  fs.writeFileSync(path.join(root, '.node-version'), '20.11.1\n')
  fs.writeFileSync(path.join(root, '.nvmrc'), '18.20.4\n')
  fs.writeFileSync(path.join(root, 'mise.toml'), mise)
  fs.writeFileSync(path.join(root, 'package.json'), `${JSON.stringify({ packageManager: 'pnpm@9.15.5', engines: {} }, null, 2)}\n`)
  return root
}

test('sync derives mirrors atomically and a second run is byte-for-byte inert', (context) => {
  const root = fixture(context)
  assert.equal(plannedToolchainUpdates(root).length, 3)
  syncToolchain(root)
  const snapshot = ['.nvmrc', 'mise.toml', 'package.json'].map((file) => fs.readFileSync(path.join(root, file), 'utf8'))
  assert.deepEqual(syncToolchain(root), [])
  assert.deepEqual(['.nvmrc', 'mise.toml', 'package.json'].map((file) => fs.readFileSync(path.join(root, file), 'utf8')), snapshot)
  assert.doesNotMatch(snapshot[1], /^pnpm\s*=/m)
})

test('sync rejects unsupported TOML and preserves canonical CRLF', () => {
  assert.throws(() => synchronizeMise('[tools]\nnode = "1.2.3"\nnode = "1.2.4"\n', '2.0.0'), /exactly one node/)
  assert.throws(() => synchronizeMise('[tools]\nnode = "1.2.3"\nnot valid toml\n', '2.0.0'), /unsupported \[tools] entry/)
  assert.throws(() => synchronizeMise('[tools]\n"node" = "1.2.3"\n', '2.0.0'), /quoted tool keys/)
  assert.throws(() => synchronizeMise('[tools]\nnode = "1.2.3"\npnpm = "1.0.0"\npnpm = "1.0.1"\n', '2.0.0'), /duplicate pnpm/)
  assert.throws(() => synchronizeMise('[tools]\nnode = "1.2.3"\n[tools]\nnode = "1.2.3"\n', '2.0.0'), /exactly one \[tools]/)
  assert.equal(synchronizeMise('[tools]\r\nnode = "1.2.3"\r\n[settings]\r\nexperimental = true\r\n', '2.0.0'), '[tools]\r\nnode = "2.0.0"\r\n[settings]\r\nexperimental = true\r\n')
})

test('planning fails before writes when any mirror or JSON input is invalid', (context) => {
  const missing = fixture(context); fs.rmSync(path.join(missing, '.nvmrc'))
  assert.throws(() => syncToolchain(missing), /ENOENT/)
  assert.equal(fs.readFileSync(path.join(missing, 'mise.toml'), 'utf8'), '[tools]\nnode = "18.20.4"\npnpm = "9.15.5"\n')
  const malformed = fixture(context); fs.writeFileSync(path.join(malformed, 'package.json'), '{')
  assert.throws(() => syncToolchain(malformed), /JSON/)
  assert.equal(fs.readFileSync(path.join(malformed, '.nvmrc'), 'utf8'), '18.20.4\n')
})

test('atomic application restores earlier files after a later rename failure', (context) => {
  const root = fixture(context)
  const original = fs.readFileSync(path.join(root, '.nvmrc'), 'utf8')
  let renames = 0
  const ops = {
    write(file, contents, mode) { fs.writeFileSync(file, contents, { mode, flag: 'wx' }) },
    rename(from, to) { renames += 1; if (renames === 2) throw new Error('injected rename failure'); fs.renameSync(from, to) },
    remove(file) { fs.rmSync(file, { force: true }) },
    mode(file) { return fs.statSync(file).mode & 0o777 },
  }
  assert.throws(() => applyUpdatesAtomically(root, plannedToolchainUpdates(root), ops), /injected rename failure/)
  assert.equal(fs.readFileSync(path.join(root, '.nvmrc'), 'utf8'), original)
})

test('the checker reports an unplannable mirror instead of discarding every diagnostic', (context) => {
  const root = fixture(context)
  fs.rmSync(path.join(root, 'mise.toml'))
  const problems = collectToolchainProblems(root, () => ({ status: 0, stdout: 'unused' })).join('\n')
  assert.match(problems, /mise\.toml is a registered toolchain consumer but is missing/)
  assert.match(problems, /toolchain mirrors could not be planned/)
})

test('a [tools] header with a trailing comment stays synchronizable', (context) => {
  const root = fixture(context, '[tools] # pinned by policy\nnode = "20.11.1"\n')
  fs.writeFileSync(path.join(root, '.nvmrc'), '20.11.1\n')
  fs.writeFileSync(path.join(root, 'package.json'), `${JSON.stringify({ packageManager: 'pnpm@9.15.5', engines: { node: '20.11.1', pnpm: '9.15.5' } }, null, 2)}\n`)
  assert.deepEqual(plannedToolchainUpdates(root), [])
})

test('literals are classified from the filesystem when Git metadata is absent', (context) => {
  const root = fixture(context)
  fs.writeFileSync(path.join(root, 'README.md'), 'Requires Node 20.10.0.\n')
  assert.match(collectUnclassifiedToolchainLiterals(root).join('\n'), /README\.md:1/)
})

test('a failed rollback reports what stayed modified without hiding the original failure', (context) => {
  const root = fixture(context)
  let renames = 0
  const ops = {
    write(file, contents, mode) { if (file.endsWith('.restore')) throw new Error('injected restore failure'); fs.writeFileSync(file, contents, { mode, flag: 'wx' }) },
    rename(from, to) { renames += 1; if (renames === 2) throw new Error('injected rename failure'); fs.renameSync(from, to) },
    remove(file) { fs.rmSync(file, { force: true }) },
    mode(file) { return fs.statSync(file).mode & 0o777 },
  }
  let thrown
  try { applyUpdatesAtomically(root, plannedToolchainUpdates(root), ops) } catch (error) { thrown = error }
  assert.match(thrown?.message ?? '', /injected rename failure/)
  assert.match(thrown?.message ?? '', /rollback could not restore/)
})

test('former production versions and new assignment surfaces are rejected', (context) => {
  const root = fixture(context)
  fs.writeFileSync(path.join(root, 'README.md'), 'Requires Node 20.10.0.\n')
  fs.writeFileSync(path.join(root, '.tool-versions'), 'node 20.10.0\n')
  const problems = collectUnclassifiedToolchainLiterals(root, 'README.md\0.tool-versions\0')
  assert.match(problems.join('\n'), /README\.md:1/)
  assert.match(problems.join('\n'), /\.tool-versions:1/)
})

test('outdated process handling fails closed and compatible evidence is independent', () => {
  const runner = () => ({ status: 2, stdout: '{}', stderr: 'network failure' })
  assert.throws(() => runJsonCommand('pnpm', ['outdated'], { runner, acceptedStatuses: [0, 1] }), /exited 2/)
  assert.throws(() => runJsonCommand('pnpm', ['outdated'], { runner: () => ({ status: 1, stdout: '', stderr: '' }), acceptedStatuses: [0, 1] }), /no JSON evidence/)
  assert.throws(() => runJsonCommand('pnpm', ['outdated'], { runner: () => ({ status: 1, stdout: '{', stderr: '' }), acceptedStatuses: [0, 1] }), /malformed JSON/)
  assert.throws(() => runJsonCommand('pnpm', ['outdated'], { runner: () => ({ status: null, signal: 'SIGTERM', stdout: '{}', stderr: '' }), acceptedStatuses: [0, 1] }), /terminated/)
  const report = formatOutdated(
    { demo: { current: '1.0.0', wanted: '1.0.0', latest: '1.0.0' } },
    { demo: { current: '1.0.0', wanted: '1.0.0', latest: '1.1.0' } },
    { demo: { 'dist-tags': { latest: '2.0.0' } } },
    { demo: '^1.0.0' },
  ).join('\n')
  assert.match(report, /Lockfile Wanted: 1\.0\.0/)
  assert.match(report, /Compatible Latest: 1\.1\.0/)
  assert.match(report, /Compatible update available: yes/)
  assert.match(report, /Declared Specification: \^1\.0\.0/)
})
