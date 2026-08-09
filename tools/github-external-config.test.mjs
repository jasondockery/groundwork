import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { collectGithubExternalConfigViolations } from './github-external-config.mjs'

const root = path.resolve(import.meta.dirname, '..')

test('Groundwork requires no externally supplied GitHub configuration', () => {
  assert.deepEqual(collectGithubExternalConfigViolations(root), [])
})

test('an invented workflow secret fails the empty-by-design contract', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'groundwork-github-config-'))
  try {
    fs.mkdirSync(path.join(fixture, '.github/workflows'), { recursive: true })
    fs.mkdirSync(path.join(fixture, 'tools'), { recursive: true })
    fs.writeFileSync(
      path.join(fixture, '.github/workflows/ci.yml'),
      'jobs:\n  test:\n    env:\n      TOKEN: ${{ secrets.INVENTED_TOKEN }}\n'
    )
    fs.writeFileSync(
      path.join(fixture, 'tools/github-external-config.json'),
      '{"capabilities":{},"references":{}}\n'
    )
    assert.deepEqual(collectGithubExternalConfigViolations(fixture), [
      'Missing registry entry for workflow reference secrets.INVENTED_TOKEN.',
    ])
  } finally {
    fs.rmSync(fixture, { force: true, recursive: true })
  }
})

test('the empty registry is still a required, structurally valid authority', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'groundwork-github-config-'))
  try {
    fs.mkdirSync(path.join(fixture, '.github/workflows'), { recursive: true })
    fs.mkdirSync(path.join(fixture, 'tools'), { recursive: true })
    fs.writeFileSync(
      path.join(fixture, '.github/workflows/ci.yml'),
      'jobs:\n  test:\n    runs-on: ubuntu-latest\n'
    )
    fs.writeFileSync(
      path.join(fixture, 'tools/github-external-config.json'),
      '{"capabilities":{},"references":{}}\n'
    )
    assert.deepEqual(collectGithubExternalConfigViolations(fixture), [])

    fs.rmSync(path.join(fixture, 'tools/github-external-config.json'))
    assert.throws(
      () => collectGithubExternalConfigViolations(fixture),
      /Missing GitHub external configuration registry/
    )

    for (const invalid of [
      '{}',
      '{"capabilities":[],"references":{}}',
      '{"capabilities":{},"references":{},"unexpected":true}',
      '{"capabilities":{"invented":{}},"references":{}}',
    ]) {
      fs.writeFileSync(path.join(fixture, 'tools/github-external-config.json'), `${invalid}\n`)
      assert.throws(
        () => collectGithubExternalConfigViolations(fixture),
        /Groundwork registry must contain exactly empty capabilities and references objects/
      )
    }

    fs.writeFileSync(path.join(fixture, 'tools/github-external-config.json'), '{bad json\n')
    assert.throws(() => collectGithubExternalConfigViolations(fixture), SyntaxError)
  } finally {
    fs.rmSync(fixture, { force: true, recursive: true })
  }
})
