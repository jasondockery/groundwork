export const toolchainContract = Object.freeze({
  authorities: { node: '.node-version', pnpm: 'package.json#packageManager' },
  consumers: [
    { path: '.node-version', tool: 'node', role: 'authority', format: 'plain-version' },
    { path: 'package.json', tool: 'pnpm', role: 'authority', format: 'packageManager' },
    { path: '.nvmrc', tool: 'node', role: 'derived-mirror', format: 'plain-version' },
    { path: 'mise.toml', tool: 'node', role: 'derived-mirror', format: 'tools.node' },
    { path: 'package.json', tool: 'node', role: 'derived-mirror', format: 'engines.node' },
    { path: 'package.json', tool: 'pnpm', role: 'derived-mirror', format: 'engines.pnpm' },
    { path: '.github/workflows/ci.yml', tool: 'node', role: 'reference', format: 'node-version-file' },
  ],
  ignoredGeneratedConsumers: ['pnpm-lock.yaml'],
  classifiedFixtureRoots: ['tools/fixtures', 'tests/fixtures'],
  classifiedHistoricalRoots: ['CHANGELOG.md'],
  classifiedImplementationPaths: [
    'tools/check-toolchain.mjs',
    'tools/sync-toolchain.mjs',
    'tools/show-outdated.mjs',
    'tools/toolchain-contract.mjs',
  ],
})
