import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeWorkflowExternalConfig } from './workflow-external-config.mjs'

test('detects top-level, dot, and literal bracket references while ignoring YAML comments', () => {
  const result = analyzeWorkflowExternalConfig(`
env:
  TOP_SECRET: \${{ secrets.TOP_SECRET }}
  TOP_VAR: \${{ vars['TOP_VAR'] }}
# \${{ secrets.COMMENT_ONLY }}
jobs:
  "quoted-job":
    environment:
      name: dev
      url: https://example.invalid
    runs-on: ubuntu-latest
    steps:
      - run: echo \${{ secrets["BRACKET_SECRET"] }} \${{ vars.DOT_VAR }}
`)

  assert.deepEqual(result.violations, [])
  assert.deepEqual(
    result.usages.map(({ reference, environment }) => [reference, environment]),
    [
      ['secrets.TOP_SECRET', undefined],
      ['vars.TOP_VAR', undefined],
      ['secrets.BRACKET_SECRET', 'dev'],
      ['vars.DOT_VAR', 'dev'],
    ]
  )
})

test('detects scalar environments and keeps expressions in block scalars active', () => {
  const result = analyzeWorkflowExternalConfig(`
jobs:
  test:
    environment: "renovate"
    runs-on: ubuntu-latest
    steps:
      - run: |
          # GitHub still evaluates this expression before the shell sees a comment.
          echo \${{ secrets.BLOCK_SECRET }}
`)

  assert.deepEqual(result.violations, [])
  assert.deepEqual(result.usages, [
    {
      environment: 'renovate',
      reference: 'secrets.BLOCK_SECRET',
      workflowCallInput: false,
    },
  ])
})

test('rejects dynamic access and malformed or unsupported workflow structure', () => {
  const dynamic = analyzeWorkflowExternalConfig(`
jobs:
  test:
    runs-on: ubuntu-latest
    env:
      TOKEN: \${{ secrets[some_expression] }}
`)
  assert.deepEqual(dynamic.violations, [
    'line 6: dynamic secrets/vars bracket access is forbidden.',
  ])

  const malformed = analyzeWorkflowExternalConfig('jobs:\n  broken job\n')
  assert.deepEqual(malformed.violations, [
    'line 2: unsupported or malformed job mapping.',
    'workflow jobs mapping contains no supported jobs.',
  ])
})

test('scans brace-free if expressions and rejects whole or indirect contexts', () => {
  const result = analyzeWorkflowExternalConfig(`
jobs:
  test:
    if: vars.RUN_JOB == 'true' && secrets['JOB_TOKEN'] != ''
    runs-on: ubuntu-latest
    steps:
      - if: >
          vars.RUN_STEP == 'true' &&
          secrets.STEP_TOKEN != ''
        run: echo ok
      - env:
          ALL_VARIABLES: \${{ toJSON(vars) }}
          INDIRECT_SECRET: \${{ (secrets).TOKEN }}
          LABEL: \${{ 'secrets and vars are words here' }}
        run: echo ok
`)

  assert.deepEqual(
    result.usages.map(({ reference }) => reference),
    ['vars.RUN_JOB', 'secrets.JOB_TOKEN', 'vars.RUN_STEP', 'secrets.STEP_TOKEN']
  )
  assert.deepEqual(result.violations, [
    'line 12: bare or indirect secrets/vars context access is forbidden.',
    'line 13: bare or indirect secrets/vars context access is forbidden.',
  ])
})

test('scans single- and double-quoted brace-free if expressions', () => {
  const result = analyzeWorkflowExternalConfig(`
jobs:
  test:
    if: "vars.RUN_JOB == 'true' && secrets.DEPLOY_TOKEN != ''"
    runs-on: ubuntu-latest
    steps:
      - if: 'secrets.STEP_TOKEN != "" && vars.RUN_STEP == "true"'
        run: echo ok
`)

  assert.deepEqual(
    result.usages.map(({ reference }) => reference),
    ['vars.RUN_JOB', 'secrets.DEPLOY_TOKEN', 'secrets.STEP_TOKEN', 'vars.RUN_STEP']
  )
  assert.deepEqual(result.violations, [])
})

test('forbids YAML anchors and aliases instead of resolving external configuration through them', () => {
  const result = analyzeWorkflowExternalConfig(`
name: &.condition vars.RUN_JOB == 'true'
env: &shared
  SAFE_VALUE: fixed
jobs:
  test:
    if: *.condition
    runs-on: ubuntu-latest
    env: *shared
`)

  assert.deepEqual(result.usages, [])
  assert.deepEqual(result.violations, [
    'line 2: YAML anchors are forbidden in Groundwork workflows.',
    'line 3: YAML anchors are forbidden in Groundwork workflows.',
    'line 7: YAML aliases are forbidden in Groundwork workflows.',
    'line 9: YAML aliases are forbidden in Groundwork workflows.',
  ])
})

test('does not confuse inline command characters with YAML anchors or aliases', () => {
  const result = analyzeWorkflowExternalConfig(`
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo *literal &background
      - uses: actions/download-artifact@0123456789012345678901234567890123456789
        with:
          pattern: groundwork-job-*-\${{ github.run_id }}
`)

  assert.deepEqual(result.usages, [])
  assert.deepEqual(result.violations, [])
})

test('treats block-scalar payload as text except for GitHub expressions', () => {
  const result = analyzeWorkflowExternalConfig(`
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: |
          cat <<'EOF'
          secrets: inherit
          if: vars.NOT_A_GITHUB_CONDITION
          echo \${{ secrets.BLOCK_SECRET }}
          EOF
`)

  assert.deepEqual(result.usages, [
    {
      environment: undefined,
      reference: 'secrets.BLOCK_SECRET',
      workflowCallInput: false,
    },
  ])
  assert.deepEqual(result.violations, [])
})

test('ends block-scalar payload at its actual content indentation', () => {
  const result = analyzeWorkflowExternalConfig(`
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - if: >
          github.ref == 'refs/heads/main'
        run: echo ok # \${{ secrets.COMMENT_ONLY }}
`)

  assert.deepEqual(result.usages, [])
  assert.deepEqual(result.violations, [])
})

test('scans both legal YAML block-scalar indicator orders and fails closed on unknown forms', () => {
  const result = analyzeWorkflowExternalConfig(`
jobs:
  test:
    if: >+2
      vars.RUN_JOB == 'true' &&
      secrets.JOB_TOKEN != ''
    runs-on: ubuntu-latest
    steps:
      - if: |-2
          vars.RUN_STEP == 'true' &&
          secrets.STEP_TOKEN != ''
        run: echo ok
      - if: >2+
          vars.RUN_NORMAL == 'true'
        run: echo ok
      - if: |2-
          secrets.NORMAL_TOKEN != ''
        run: echo ok
`)

  assert.deepEqual(
    result.usages.map(({ reference }) => reference),
    [
      'vars.RUN_JOB',
      'secrets.JOB_TOKEN',
      'vars.RUN_STEP',
      'secrets.STEP_TOKEN',
      'vars.RUN_NORMAL',
      'secrets.NORMAL_TOKEN',
    ]
  )
  assert.deepEqual(result.violations, [])

  const unsupported = analyzeWorkflowExternalConfig(`
jobs:
  test:
    if: >++2
      secrets.ESCAPED_TOKEN != ''
    runs-on: ubuntu-latest
`)
  assert.deepEqual(unsupported.usages, [])
  assert.deepEqual(unsupported.violations, [
    'line 4: unsupported YAML block scalar header >++2.',
  ])
})

test('forbids reusable-workflow secret inheritance', () => {
  const result = analyzeWorkflowExternalConfig(`
jobs:
  delegated:
    uses: owner/repository/.github/workflows/reusable.yml@0123456789012345678901234567890123456789
    secrets: inherit
`)

  assert.deepEqual(result.usages, [])
  assert.deepEqual(result.violations, [
    'line 5: secrets: inherit is forbidden; declare every external secret explicitly.',
  ])
})

test('does not borrow an environment name from a later job property', () => {
  const result = analyzeWorkflowExternalConfig(`
jobs:
  deploy:
    environment:
      url: https://example.invalid
    strategy:
      name: dev
    env:
      TOKEN: \${{ secrets.DEPLOY_TOKEN }}
`)

  assert.deepEqual(result.violations, ['line 4: environment mapping must contain a name.'])
  assert.deepEqual(result.usages, [
    {
      environment: undefined,
      reference: 'secrets.DEPLOY_TOKEN',
      workflowCallInput: false,
    },
  ])
})
