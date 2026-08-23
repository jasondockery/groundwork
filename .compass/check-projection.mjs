#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

export const COMPASS_REPOSITORY = 'jasondockery/compass'
export const COMPASS_PROOF_IDENTITY_DIMENSIONS = Object.freeze([
  Object.freeze({ name: 'contentIdentity', requiredFields: Object.freeze(['repository', 'sourceTree', 'toolchainSha256', 'commandContractSha256', 'environmentSha256', 'inputSetSha256']) }),
  Object.freeze({ name: 'provenanceIdentity', requiredFields: Object.freeze(['repository', 'sourceCommit', 'sourceTree', 'reference']) }),
  Object.freeze({ name: 'platformIdentity', requiredFields: Object.freeze(['os', 'architecture', 'platformInputsSha256']) }),
  Object.freeze({ name: 'artifactIdentity', requiredFields: Object.freeze(['sha256', 'bytes', 'sourceCommit', 'sourceTree', 'buildContractSha256']) }),
  Object.freeze({ name: 'deploymentIdentity', requiredFields: Object.freeze(['environment', 'deploymentId', 'sourceCommit', 'sourceTree', 'artifactSha256']) }),
])
export const COMPASS_PROOF_CLAIM_CONTRACTS = Object.freeze([
  Object.freeze({ claim: 'tree-verification', requiredIdentities: Object.freeze(['contentIdentity', 'platformIdentity']), acceptedEvidenceKinds: Object.freeze(['local-full', 'hosted-full']) }),
  Object.freeze({ claim: 'provenance-verification', requiredIdentities: Object.freeze(['provenanceIdentity']), acceptedEvidenceKinds: Object.freeze(['provenance-check']) }),
  Object.freeze({ claim: 'platform-release', requiredIdentities: Object.freeze(['contentIdentity', 'provenanceIdentity', 'platformIdentity']), acceptedEvidenceKinds: Object.freeze(['hosted-full']) }),
  Object.freeze({ claim: 'artifact-generation', requiredIdentities: Object.freeze(['contentIdentity', 'provenanceIdentity', 'platformIdentity', 'artifactIdentity']), acceptedEvidenceKinds: Object.freeze(['artifact-build']) }),
  Object.freeze({ claim: 'deployment-acceptance', requiredIdentities: Object.freeze(['provenanceIdentity', 'platformIdentity', 'artifactIdentity', 'deploymentIdentity']), acceptedEvidenceKinds: Object.freeze(['deployment-check']) }),
])
export const COMPASS_HEAVY_PROOF_REPORT_FIELDS = Object.freeze(['claim', 'evidenceIdentity', 'reusableEvidence', 'missingEvidence', 'whyCheaperCheckInsufficient'])
export const COMPASS_SKILL_NAMES = Object.freeze([
  'accessible-product-development',
  'ai-backend-change',
  'concurrent-agent-runtimes',
  'dependency-change',
  'developer-tool-change',
  'field-failure-backpressure',
  'inclusive-content-design',
  'inclusive-product-foundation',
  'internationalization-first',
  'performance-sensitive-change',
  'privacy-by-design',
  'repeatable-agent-execution',
  'reviewable-agent-workspaces',
  'secure-by-design',
  'shift-to-authority',
  'verification-selection',
])
// A nominated Shift to Authority candidate is reviewable in source but is not
// projected, routed, or discoverable by a consumer. Consumer movement begins
// only after an issued identity-bound handoff, so distribution waits for
// issuance rather than following the draft.
export const COMPASS_PRE_ISSUANCE_SKILL_NAMES = Object.freeze([])
export const COMPASS_AGENT_ROUTING_AUTHORITIES = Object.freeze([
  Object.freeze({ candidateId: 'sta-compass-reviewable-agent-workspaces', canonicalSkillPath: 'skills/reviewable-agent-workspaces/SKILL.md', canonicalSkillSha256: 'cc663ed8100e3049a4f1d4f7261dcb429ece04bf22ec4224a2341f9a7d757edb', versionBinding: 'canonical-skill-sha256-and-receipt-source-identity' }),
  Object.freeze({ candidateId: 'sta-compass-concurrent-agent-runtimes', canonicalSkillPath: 'skills/concurrent-agent-runtimes/SKILL.md', canonicalSkillSha256: 'bd48f511a5c6a6e7af64d7613113c018be68206aba5ff23d2198cea32a818158', versionBinding: 'canonical-skill-sha256-and-receipt-source-identity' }),
])
export const COMPASS_AGENT_ROUTING_SKILLS = Object.freeze([
  Object.freeze({ name: 'accessible-product-development', canonicalSkillPath: 'skills/accessible-product-development/SKILL.md', canonicalSkillSha256: '8e0a028672244ce54010b81d3fdd6c8bd08eede93954f6d27a8b629d226fb379' }),
  Object.freeze({ name: 'ai-backend-change', canonicalSkillPath: 'skills/ai-backend-change/SKILL.md', canonicalSkillSha256: 'acffcdb98ea7341dc6d74bc63e8ed7e91e14a1dcacefa9533c3d064e42457fe2' }),
  Object.freeze({ name: 'concurrent-agent-runtimes', canonicalSkillPath: 'skills/concurrent-agent-runtimes/SKILL.md', canonicalSkillSha256: 'bd48f511a5c6a6e7af64d7613113c018be68206aba5ff23d2198cea32a818158' }),
  Object.freeze({ name: 'dependency-change', canonicalSkillPath: 'skills/dependency-change/SKILL.md', canonicalSkillSha256: 'd116dace49983c8baa46f5d0ebcbd26d0f935cd8814ade8c0fdc64c43b7321ae' }),
  Object.freeze({ name: 'developer-tool-change', canonicalSkillPath: 'skills/developer-tool-change/SKILL.md', canonicalSkillSha256: 'ec297f228885038b88cf4877afce6d9d5d51267c0d0a4c1dad471448766ced4e' }),
  Object.freeze({ name: 'field-failure-backpressure', canonicalSkillPath: 'skills/field-failure-backpressure/SKILL.md', canonicalSkillSha256: '42c69bfda8da84f5c0d5f7d546808dd4eba2cbcd4b13dd8f4b837bb22c7c1bc7' }),
  Object.freeze({ name: 'inclusive-content-design', canonicalSkillPath: 'skills/inclusive-content-design/SKILL.md', canonicalSkillSha256: '6dee58a6e49c45cbbf3eebdde1b794d38b6d1c62f0922a8e878ad1f62a059e0b' }),
  Object.freeze({ name: 'inclusive-product-foundation', canonicalSkillPath: 'skills/inclusive-product-foundation/SKILL.md', canonicalSkillSha256: '3bc3f64694a6f2dcca1723c88e337ebaa91ac92f5df3e96aaa5b1436a40c8590' }),
  Object.freeze({ name: 'internationalization-first', canonicalSkillPath: 'skills/internationalization-first/SKILL.md', canonicalSkillSha256: '8d3916165311db1afd23fe01567decd4c14da5e8bded0de66d5889c67017c99f' }),
  Object.freeze({ name: 'performance-sensitive-change', canonicalSkillPath: 'skills/performance-sensitive-change/SKILL.md', canonicalSkillSha256: '7ba39bdba1a07077e367d81e167de7db1ad4cc5e74226c43e70345e7f349802a' }),
  Object.freeze({ name: 'privacy-by-design', canonicalSkillPath: 'skills/privacy-by-design/SKILL.md', canonicalSkillSha256: '86939dc78d5410c163cd540e514534ca2240558fc0736ab20a47f5c05d73f493' }),
  Object.freeze({ name: 'repeatable-agent-execution', canonicalSkillPath: 'skills/repeatable-agent-execution/SKILL.md', canonicalSkillSha256: 'cb94cf5a877a32703f20da73dd08ab5a38b6e8c5fe29b4bc626be4161b84abb1' }),
  Object.freeze({ name: 'reviewable-agent-workspaces', canonicalSkillPath: 'skills/reviewable-agent-workspaces/SKILL.md', canonicalSkillSha256: 'cc663ed8100e3049a4f1d4f7261dcb429ece04bf22ec4224a2341f9a7d757edb' }),
  Object.freeze({ name: 'secure-by-design', canonicalSkillPath: 'skills/secure-by-design/SKILL.md', canonicalSkillSha256: '031c59c6fbcd6209d6d07fa5ae46e800b14ad6540c3af6e3ab750bc6df57d8fe' }),
  Object.freeze({ name: 'shift-to-authority', canonicalSkillPath: 'skills/shift-to-authority/SKILL.md', canonicalSkillSha256: '4a28d226a46510671f2692e2e66e7c25499bfc8d36f5f41c2282fc13d5413af8' }),
  Object.freeze({ name: 'verification-selection', canonicalSkillPath: 'skills/verification-selection/SKILL.md', canonicalSkillSha256: '04f06cd97b173a7ab0e5df6c52c77e92f40a1f42ca3da901b89d8a386a9bc0b0' }),
])
export const COMPASS_AGENT_ROUTING_AUTHORITY = COMPASS_AGENT_ROUTING_AUTHORITIES[1]
export const COMPASS_AGENT_ROUTED_SKILLS = COMPASS_SKILL_NAMES
const COMPASS_AGENT_INSTRUCTION_SKILLS = Object.freeze(['reviewable-agent-workspaces', 'concurrent-agent-runtimes', 'repeatable-agent-execution'])
const COMPASS_INSTRUCTION_COPIED_POLICY_PHRASES = Object.freeze({
  'reviewable-agent-workspaces': 'Assign exactly one active writable ownership principal and its declared process tree to each worktree.',
  'concurrent-agent-runtimes': 'Correctness must never require an otherwise idle host.',
  'repeatable-agent-execution': 'A repository teaches its execution contract once, mechanically.',
})
export const COMPASS_AGENT_ROUTING_PHYSICAL_ROUTES = Object.freeze([
  Object.freeze({ id: 'agents-md', canonicalPaths: Object.freeze(['AGENTS.md']), routingMechanism: 'instruction-pointer', ownership: 'consumer-owned-route-only', distribution: 'consumer-reconciliation', routedSkills: COMPASS_AGENT_INSTRUCTION_SKILLS, exactValidation: 'compass-simulated-consumer-instruction-discovery' }),
  Object.freeze({ id: 'agents-skills', canonicalPaths: Object.freeze(COMPASS_SKILL_NAMES.map((name) => `.agents/skills/${name}/SKILL.md`)), routingMechanism: 'skill-directory-adapter', ownership: 'compass-projected-route-only', distribution: 'projected', routedSkills: COMPASS_AGENT_ROUTED_SKILLS, exactValidation: 'receipt-bound-executable-discovery' }),
  Object.freeze({ id: 'claude-skills', canonicalPaths: Object.freeze(COMPASS_SKILL_NAMES.map((name) => `.claude/skills/${name}/SKILL.md`)), routingMechanism: 'skill-directory-adapter', ownership: 'compass-projected-route-only', distribution: 'projected', routedSkills: COMPASS_AGENT_ROUTED_SKILLS, exactValidation: 'receipt-bound-executable-discovery' }),
])
export const COMPASS_AGENT_ROUTING_ECOSYSTEMS = Object.freeze([
  Object.freeze({ id: 'claude', toolOrEcosystem: 'Claude project skills', physicalRouteIds: Object.freeze(['claude-skills']), support: 'supported', exactValidation: 'compass-simulated-discover-each-canonical-skill-once', evidence: Object.freeze({ kind: 'declared-tool-contract', locator: '.claude/skills', limitation: 'Compass simulates the declared filesystem discovery contract; it does not invoke the tool.' }) }),
  Object.freeze({ id: 'codex', toolOrEcosystem: 'Codex project skills', physicalRouteIds: Object.freeze(['agents-skills']), support: 'supported', exactValidation: 'compass-simulated-discover-each-canonical-skill-once', evidence: Object.freeze({ kind: 'official-documentation', locator: 'https://developers.openai.com/codex/build-skills', limitation: 'Compass simulates the documented .agents/skills discovery contract; each adopting environment retains an exact tool-native smoke.' }) }),
  Object.freeze({ id: 'cursor', toolOrEcosystem: 'Cursor project instructions', physicalRouteIds: Object.freeze(['agents-md']), support: 'supported-consumer-reconciliation-required', exactValidation: 'compass-simulated-load-each-consumer-pointer-once', evidence: Object.freeze({ kind: 'official-documentation', locator: 'https://docs.cursor.com/context/rules-for-ai', limitation: 'The consumer checker validates the root AGENTS pointer; Compass does not invoke Cursor.' }) }),
  Object.freeze({ id: 'github-copilot', toolOrEcosystem: 'GitHub Copilot project skills', physicalRouteIds: Object.freeze(['agents-skills', 'claude-skills']), duplicateSkillPolicy: 'byte-identical-routes-collapse-to-one-logical-skill-for-compass-preflight-only', support: 'supported-consumer-native-smoke-required', exactValidation: 'compass-simulated-discovery-plus-consumer-native-smoke', evidence: Object.freeze({ kind: 'official-documentation', locator: 'https://docs.github.com/en/copilot/concepts/agents/about-agent-skills', limitation: 'Compass simulates both documented filesystem roots and rejects divergent duplicate routes; official documentation does not establish native same-name deduplication, so each adopter must run an exact consumer-native smoke.' }) }),
  Object.freeze({ id: 'opencode', toolOrEcosystem: 'OpenCode project skills', physicalRouteIds: Object.freeze(['agents-skills', 'claude-skills']), duplicateSkillPolicy: 'byte-identical-routes-collapse-to-one-logical-skill-for-compass-preflight-only', support: 'supported-consumer-native-smoke-required', exactValidation: 'compass-simulated-discovery-plus-consumer-native-smoke', evidence: Object.freeze({ kind: 'official-documentation', locator: 'https://opencode.ai/docs/skills/', limitation: 'Compass simulates both documented filesystem roots and rejects divergent duplicate routes; official documentation does not establish native same-name deduplication, so each adopter must run an exact consumer-native smoke.' }) }),
])
export const COMPASS_AGENT_ROUTING_UNMATERIALIZED_ROOTS = Object.freeze([
  Object.freeze({ path: '.codex/skills', recognizedBy: Object.freeze(['codex']), disposition: 'retired-unproven-compatibility', reason: 'Current official Codex repository discovery uses .agents/skills; the earlier .codex compatibility route lacked controlled fresh-session proof.' }),
  Object.freeze({ path: '.github/skills', recognizedBy: Object.freeze(['github-copilot']), disposition: 'intentionally-unmaterialized', reason: 'GitHub Copilot uses the shared .claude/skills route for these canonical skills.' }),
  Object.freeze({ path: '.opencode/skills', recognizedBy: Object.freeze(['opencode']), disposition: 'intentionally-unmaterialized', reason: 'OpenCode uses the shared .claude/skills route for these canonical skills.' }),
  Object.freeze({ path: '.cursor/rules', recognizedBy: Object.freeze(['cursor']), disposition: 'intentionally-unmaterialized', reason: 'Cursor uses the repository root AGENTS.md pointer for these canonical skills.' }),
])
export const COMPASS_AGENT_ROUTING_SURFACES = COMPASS_AGENT_ROUTING_ECOSYSTEMS
export const COMPASS_DISCOVERY_ADAPTER_PATHS = Object.freeze([...new Set(
  COMPASS_AGENT_ROUTING_PHYSICAL_ROUTES
    .filter(({ distribution }) => distribution === 'projected')
    .flatMap(({ canonicalPaths }) => canonicalPaths)
)].sort())
export const COMPASS_SHAREABLE_PATHS = Object.freeze([
  'COMPASS.md',
  'TERMINOLOGY.md',
  'agent-routing-surfaces.json',
  'ai-workload-policy.json',
  'authority-policy.json',
  'authority-registry.json',
  'authority-registry.schema.json',
  'consumer-hosted-adoption-receipt.schema.json',
  'consumer-reconciliation.schema.json',
  'managed-retirements.json',
  'proof-evidence-policy.json',
  'proof-selection.schema.json',
  'reviewable-workspace-handoff.schema.json',
  'scripts/check-authority-record.mjs',
  'scripts/check-projection.mjs',
  'scripts/validate-json-schema.mjs',
  ...COMPASS_DISCOVERY_ADAPTER_PATHS,
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
  return typeof value === 'string' && /^(?!\/)(?!.*\/\/)(?!\.{1,2}$)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\\)[A-Za-z0-9._/-]+$/u.test(value) &&
    path.posix.normalize(value) === value
}

function hasExactKeys(value, expected) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort())
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.length > 0
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function validateProofEvidencePolicy(policy, problems = []) {
  const initialProblemCount = problems.length
  const topLevelKeys = ['authority', 'claimContracts', 'heavyProofReportFields', 'identityDimensions', 'invalidationRule', 'schema', 'schemaVersion']
  if (!hasExactKeys(policy, topLevelKeys) || policy.schema !== 'compass.proof-evidence-policy' || policy.schemaVersion !== 1 || policy.authority !== 'verification-selection') {
    problems.push('proof evidence policy identity is invalid')
    return false
  }
  if (!Array.isArray(policy.identityDimensions) || policy.identityDimensions.length !== COMPASS_PROOF_IDENTITY_DIMENSIONS.length) {
    problems.push('proof evidence identity dimension inventory is invalid')
  } else {
    for (let index = 0; index < COMPASS_PROOF_IDENTITY_DIMENSIONS.length; index += 1) {
      const actual = policy.identityDimensions[index]
      const expected = COMPASS_PROOF_IDENTITY_DIMENSIONS[index]
      if (!hasExactKeys(actual, ['meaning', 'name', 'requiredFields']) || actual.name !== expected.name || !nonEmptyString(actual.meaning) || JSON.stringify(actual.requiredFields) !== JSON.stringify(expected.requiredFields)) {
        problems.push(`proof evidence identity dimension is invalid at index ${index}`)
      }
    }
  }
  if (!Array.isArray(policy.claimContracts) || policy.claimContracts.length !== COMPASS_PROOF_CLAIM_CONTRACTS.length) {
    problems.push('proof evidence claim contract inventory is invalid')
  } else {
    for (let index = 0; index < COMPASS_PROOF_CLAIM_CONTRACTS.length; index += 1) {
      const actual = policy.claimContracts[index]
      const expected = COMPASS_PROOF_CLAIM_CONTRACTS[index]
      if (!hasExactKeys(actual, ['acceptedEvidenceKinds', 'claim', 'note', 'requiredIdentities', 'reuseRule']) ||
          actual.claim !== expected.claim || actual.reuseRule !== 'exact-required-identities' || !nonEmptyString(actual.note) ||
          JSON.stringify(actual.requiredIdentities) !== JSON.stringify(expected.requiredIdentities) ||
          JSON.stringify(actual.acceptedEvidenceKinds) !== JSON.stringify(expected.acceptedEvidenceKinds)) {
        problems.push(`proof evidence claim contract is invalid at index ${index}`)
      }
    }
  }
  if (JSON.stringify(policy.heavyProofReportFields) !== JSON.stringify(COMPASS_HEAVY_PROOF_REPORT_FIELDS)) problems.push('heavy proof report field inventory is invalid')
  if (policy.invalidationRule !== 'A changed actual input invalidates only evidence whose policy-required identity includes that changed dimension.') problems.push('proof evidence invalidation rule is invalid')
  return problems.length === initialProblemCount
}

function validSha256(value) {
  return typeof value === 'string' && SHA256.test(value)
}

function validCommit(value) {
  return typeof value === 'string' && COMMIT.test(value)
}

function validateEvidenceIdentity(identity, contract, label, problems, allowedMissingIdentities = new Set()) {
  const identityNames = COMPASS_PROOF_IDENTITY_DIMENSIONS.map(({ name }) => name)
  if (!hasExactKeys(identity, identityNames)) {
    problems.push(`${label} must separate exactly the five proof identity dimensions`)
    return false
  }
  const required = new Set(contract.requiredIdentities)
  for (const dimension of COMPASS_PROOF_IDENTITY_DIMENSIONS) {
    const value = identity[dimension.name]
    if (!required.has(dimension.name)) {
      if (value !== null) problems.push(`${label} ${dimension.name} must be null because the claim does not depend on it`)
      continue
    }
    if (value === null && allowedMissingIdentities.has(dimension.name)) continue
    if (!hasExactKeys(value, dimension.requiredFields)) {
      problems.push(`${label} ${dimension.name} is missing or structurally invalid`)
      continue
    }
    for (const field of dimension.requiredFields) {
      if (field === 'bytes') {
        if (!Number.isSafeInteger(value[field]) || value[field] < 1) problems.push(`${label} ${dimension.name}.${field} is invalid`)
      } else if (field === 'sourceCommit' || field === 'sourceTree') {
        if (!validCommit(value[field])) problems.push(`${label} ${dimension.name}.${field} is invalid`)
      } else if (field.endsWith('Sha256') || field === 'sha256') {
        if (!validSha256(value[field])) problems.push(`${label} ${dimension.name}.${field} is invalid`)
      } else if (field === 'reference') {
        if (!hasExactKeys(value.reference, ['kind', 'name', 'resolvedCommit']) || !['commit', 'branch', 'tag'].includes(value.reference?.kind) || !nonEmptyString(value.reference?.name) || !validCommit(value.reference?.resolvedCommit)) problems.push(`${label} provenanceIdentity.reference is invalid`)
      } else if (field === 'repository') {
        if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(value[field])) problems.push(`${label} ${dimension.name}.${field} is invalid`)
      } else if (!nonEmptyString(value[field])) problems.push(`${label} ${dimension.name}.${field} is invalid`)
    }
  }
  const content = identity.contentIdentity
  const provenance = identity.provenanceIdentity
  const artifact = identity.artifactIdentity
  const deployment = identity.deploymentIdentity
  if (provenance && provenance.reference?.resolvedCommit !== provenance.sourceCommit) problems.push(`${label} provenance reference does not resolve to its source commit`)
  if (content && provenance && (content.repository !== provenance.repository || content.sourceTree !== provenance.sourceTree)) problems.push(`${label} content and provenance identities do not bind the same repository tree`)
  if (artifact && provenance && (artifact.sourceCommit !== provenance.sourceCommit || artifact.sourceTree !== provenance.sourceTree)) problems.push(`${label} artifact and provenance identities do not bind the same source`)
  if (deployment && provenance && (deployment.sourceCommit !== provenance.sourceCommit || deployment.sourceTree !== provenance.sourceTree)) problems.push(`${label} deployment and provenance identities do not bind the same source`)
  if (deployment && artifact && deployment.artifactSha256 !== artifact.sha256) problems.push(`${label} deployment does not bind the selected artifact digest`)
  return true
}

export function assessProofEvidenceReuse(currentIdentity, priorIdentity, requiredIdentities) {
  return requiredIdentities.filter((name) => canonicalJson(currentIdentity?.[name]) !== canonicalJson(priorIdentity?.[name]))
}

export function validateProofSelection(record, policy, problems = []) {
  const initialProblemCount = problems.length
  if (!validateProofEvidencePolicy(policy, problems)) return false
  if (!hasExactKeys(record, ['claim', 'evidenceIdentity', 'missingEvidence', 'reusableEvidence', 'schema', 'schemaVersion', 'selectedEvidence', 'whyCheaperCheckInsufficient']) || record.schema !== 'compass.proof-selection' || record.schemaVersion !== 1) {
    problems.push('proof selection record identity is invalid')
    return false
  }
  if (!hasExactKeys(record.claim, ['kind', 'statement']) || !nonEmptyString(record.claim?.statement)) problems.push('proof selection claim is invalid')
  const contract = policy.claimContracts.find(({ claim }) => claim === record.claim?.kind)
  if (!contract) {
    problems.push('proof selection claim is not governed by policy')
    return false
  }
  if (!hasExactKeys(record.selectedEvidence, ['command', 'kind', 'result']) || !contract.acceptedEvidenceKinds.includes(record.selectedEvidence?.kind) || !nonEmptyString(record.selectedEvidence?.command) || !['planned', 'passed', 'failed'].includes(record.selectedEvidence?.result)) problems.push('selected proof kind, command, or result is invalid for the claim')
  const allowedMissingIdentities = new Set()
  if (record.selectedEvidence?.result === 'planned' && Array.isArray(record.missingEvidence)) {
    for (const missing of record.missingEvidence) {
      if (missing?.claim === record.claim.kind && contract.requiredIdentities.includes(missing.identity)) allowedMissingIdentities.add(missing.identity)
    }
  }
  validateEvidenceIdentity(record.evidenceIdentity, contract, 'selected evidence identity', problems, allowedMissingIdentities)
  if (record.claim.kind === 'platform-release' && (record.selectedEvidence?.kind !== 'hosted-full' || record.evidenceIdentity?.provenanceIdentity?.reference?.kind !== 'branch')) problems.push('platform release requires hosted Full bound to a landed branch commit')
  if (!Array.isArray(record.reusableEvidence)) problems.push('reusable evidence must be an array')
  else {
    const ids = new Set()
    for (const [index, evidence] of record.reusableEvidence.entries()) {
      const label = `reusable evidence ${index}`
      const evidenceContract = policy.claimContracts.find(({ claim }) => claim === evidence?.claim)
      if (!hasExactKeys(evidence, ['claim', 'evidenceId', 'evidenceIdentity', 'kind', 'result']) || !nonEmptyString(evidence.evidenceId) || ids.has(evidence.evidenceId) || evidence.result !== 'passed' || !evidenceContract?.acceptedEvidenceKinds.includes(evidence.kind)) {
        problems.push(`${label} identity, claim, kind, or result is invalid`)
        continue
      }
      ids.add(evidence.evidenceId)
      validateEvidenceIdentity(evidence.evidenceIdentity, evidenceContract, label, problems)
      const differences = assessProofEvidenceReuse(record.evidenceIdentity, evidence.evidenceIdentity, evidenceContract.requiredIdentities)
      if (differences.length > 0) problems.push(`${label} cannot be reused because ${differences.join(', ')} changed`)
    }
  }
  if (!Array.isArray(record.missingEvidence)) problems.push('missing evidence must be an array')
  else {
    const seen = new Set()
    for (const [index, missing] of record.missingEvidence.entries()) {
      const key = canonicalJson(missing)
      const missingContract = policy.claimContracts.find(({ claim }) => claim === missing?.claim)
      if (!hasExactKeys(missing, ['claim', 'identity', 'reason']) || !missingContract?.requiredIdentities.includes(missing.identity) || !nonEmptyString(missing.reason) || seen.has(key)) problems.push(`missing evidence ${index} is invalid, unrelated, or duplicated`)
      seen.add(key)
    }
  }
  if (record.selectedEvidence?.result === 'passed' && record.missingEvidence?.length > 0) problems.push('passed proof selection cannot retain missing evidence')
  if (!nonEmptyString(record.whyCheaperCheckInsufficient)) problems.push('heavy proof selection must explain why a cheaper check is insufficient')
  return problems.length === initialProblemCount
}

export function validateAgentRoutingInventory(inventory, problems = []) {
  const initialProblemCount = problems.length
  const topLevelKeys = ['authorities', 'ecosystems', 'physicalRoutes', 'recognizedUnmaterializedRoots', 'schema', 'schemaVersion', 'skills']
  const authorityKeys = ['candidateId', 'canonicalSkillPath', 'canonicalSkillSha256', 'versionBinding']
  const skillKeys = ['canonicalSkillPath', 'canonicalSkillSha256', 'name']
  const routeKeys = ['canonicalPaths', 'distribution', 'exactValidation', 'id', 'ownership', 'routedSkills', 'routingMechanism']
  const ecosystemKeys = ['evidence', 'exactValidation', 'id', 'physicalRouteIds', 'support', 'toolOrEcosystem']
  const unmaterializedKeys = ['disposition', 'path', 'reason', 'recognizedBy']
  if (!hasExactKeys(inventory, topLevelKeys) ||
      inventory.schema !== 'compass.agent-routing-surfaces' ||
      inventory.schemaVersion !== 3 ||
      !Array.isArray(inventory.authorities) ||
      inventory.authorities.length !== COMPASS_AGENT_ROUTING_AUTHORITIES.length ||
      !Array.isArray(inventory.skills) ||
      inventory.skills.length !== COMPASS_AGENT_ROUTING_SKILLS.length ||
      !Array.isArray(inventory.physicalRoutes) ||
      inventory.physicalRoutes.length !== COMPASS_AGENT_ROUTING_PHYSICAL_ROUTES.length ||
      !Array.isArray(inventory.ecosystems) ||
      inventory.ecosystems.length !== COMPASS_AGENT_ROUTING_ECOSYSTEMS.length ||
      !Array.isArray(inventory.recognizedUnmaterializedRoots) ||
      inventory.recognizedUnmaterializedRoots.length !== COMPASS_AGENT_ROUTING_UNMATERIALIZED_ROOTS.length) {
    problems.push('agent routing surface inventory is invalid: authorities or top-level contract')
    return problems.length === initialProblemCount
  }
  for (let index = 0; index < COMPASS_AGENT_ROUTING_AUTHORITIES.length; index += 1) {
    const actual = inventory.authorities[index]
    const expected = COMPASS_AGENT_ROUTING_AUTHORITIES[index]
    if (!hasExactKeys(actual, authorityKeys) ||
        actual.candidateId !== expected.candidateId ||
        actual.canonicalSkillPath !== expected.canonicalSkillPath ||
        actual.versionBinding !== expected.versionBinding ||
        actual.canonicalSkillSha256 !== expected.canonicalSkillSha256) {
      problems.push(`agent routing authority inventory is invalid, incomplete, duplicated, stale, or orphaned at index ${index}`)
    }
  }
  for (let index = 0; index < COMPASS_AGENT_ROUTING_SKILLS.length; index += 1) {
    const actual = inventory.skills[index]
    const expected = COMPASS_AGENT_ROUTING_SKILLS[index]
    if (!hasExactKeys(actual, skillKeys) || JSON.stringify(actual) !== JSON.stringify(expected)) problems.push(`agent routing canonical skill inventory is invalid, incomplete, duplicated, stale, or orphaned at index ${index}`)
  }
  for (let index = 0; index < COMPASS_AGENT_ROUTING_PHYSICAL_ROUTES.length; index += 1) {
    const actual = inventory.physicalRoutes[index]
    const expected = COMPASS_AGENT_ROUTING_PHYSICAL_ROUTES[index]
    const scalarKeys = routeKeys.filter((key) => !['canonicalPaths', 'routedSkills'].includes(key))
    if (!hasExactKeys(actual, routeKeys) ||
        scalarKeys.some((key) => actual[key] !== expected[key]) ||
        JSON.stringify(actual?.canonicalPaths) !== JSON.stringify(expected.canonicalPaths) ||
        JSON.stringify(actual?.routedSkills) !== JSON.stringify(expected.routedSkills) ||
        new Set(actual?.canonicalPaths ?? []).size !== (actual?.canonicalPaths ?? []).length ||
        new Set(actual?.routedSkills ?? []).size !== (actual?.routedSkills ?? []).length) {
      problems.push(`agent routing physical route is invalid, incomplete, duplicated, stale, or orphaned at index ${index}`)
    }
  }
  for (let index = 0; index < COMPASS_AGENT_ROUTING_ECOSYSTEMS.length; index += 1) {
    const actual = inventory.ecosystems[index]
    const expected = COMPASS_AGENT_ROUTING_ECOSYSTEMS[index]
    const expectedKeys = Object.hasOwn(expected, 'duplicateSkillPolicy') ? [...ecosystemKeys, 'duplicateSkillPolicy'] : ecosystemKeys
    const scalarKeys = expectedKeys.filter((key) => !['evidence', 'physicalRouteIds'].includes(key))
    if (!hasExactKeys(actual, expectedKeys) || scalarKeys.some((key) => actual[key] !== expected[key]) || JSON.stringify(actual?.evidence) !== JSON.stringify(expected.evidence) || JSON.stringify(actual?.physicalRouteIds) !== JSON.stringify(expected.physicalRouteIds) || new Set(actual?.physicalRouteIds ?? []).size !== (actual?.physicalRouteIds ?? []).length) {
      problems.push(`agent routing ecosystem is invalid, incomplete, duplicated, stale, or orphaned at index ${index}`)
    }
  }
  for (let index = 0; index < COMPASS_AGENT_ROUTING_UNMATERIALIZED_ROOTS.length; index += 1) {
    const actual = inventory.recognizedUnmaterializedRoots[index]
    const expected = COMPASS_AGENT_ROUTING_UNMATERIALIZED_ROOTS[index]
    const scalarKeys = unmaterializedKeys.filter((key) => key !== 'recognizedBy')
    if (!hasExactKeys(actual, unmaterializedKeys) || scalarKeys.some((key) => actual[key] !== expected[key]) || JSON.stringify(actual?.recognizedBy) !== JSON.stringify(expected.recognizedBy) || new Set(actual?.recognizedBy ?? []).size !== (actual?.recognizedBy ?? []).length) {
      problems.push(`recognized unmaterialized agent root is invalid, duplicated, stale, or orphaned at index ${index}`)
    }
  }
  return problems.length === initialProblemCount
}

const reviewableWorkspaceRetirement = Object.freeze({ sourcePath: '.codex/skills/reviewable-agent-workspaces/SKILL.md', projectedPath: '.codex/skills/reviewable-agent-workspaces/SKILL.md', priorSha256: '3ead92f66c1be8e4fe8f12e9597a69a5454f15e7cb9ee30ae5ff7dfdc5e499c1', priorBytes: 331, disposition: 'remove-on-exact-replace' })
const concurrentRuntimeRetirement = Object.freeze({ sourcePath: '.codex/skills/concurrent-agent-runtimes/SKILL.md', projectedPath: '.codex/skills/concurrent-agent-runtimes/SKILL.md', priorSha256: 'dfd9f2100e333b069db3df9d66785872caac37049bd035b1c8359b57484733e9', priorBytes: 330, disposition: 'remove-on-exact-replace' })
const agentsSkillsRouteTransition = Object.freeze({ projectedPath: '.agents/skills', priorEntryType: 'symbolic-link', priorLinkTarget: '../skills', priorTargetSha256: 'c1aefaccb300698f4b7ae764e1fa857f93c0609ba47b078e4806d926f289c23b', priorTargetBytes: 9, disposition: 'replace-exact-route-on-exact-replace' })
const claudeSkillsRouteTransition = Object.freeze({ projectedPath: '.claude/skills', priorEntryType: 'symbolic-link', priorLinkTarget: '../skills', priorTargetSha256: 'c1aefaccb300698f4b7ae764e1fa857f93c0609ba47b078e4806d926f289c23b', priorTargetBytes: 9, disposition: 'replace-exact-route-on-exact-replace' })
const codexSkillsRouteTransition = Object.freeze({ projectedPath: '.codex/skills', priorEntryType: 'symbolic-link', priorLinkTarget: '../skills', priorTargetSha256: 'c1aefaccb300698f4b7ae764e1fa857f93c0609ba47b078e4806d926f289c23b', priorTargetBytes: 9, disposition: 'remove-exact-unmaterialized-route-on-exact-replace' })

export const COMPASS_MANAGED_RETIREMENT_MIGRATIONS = Object.freeze([
  Object.freeze({
    predecessor: Object.freeze({
      repository: 'jasondockery/compass',
      sourceCommit: '8ccfcff351dfb8c652f8eba75b77980b602bf4c8',
      sourceTree: 'd813b73cd6326a8d89d186a1cac85deac6cb6f77',
      sourceFingerprintSha256: 'e38e516d7107dd676b87ec877f56fb1572b7ccb03f44041ad0753eb2ca06b4fa',
      artifactSha256: '9d698caaf6f579f42381d45b7fc2cf421ee6436d81eb84680bbbd53ba3a121ba',
      artifactBytes: 336889,
      validationReceiptSha256: 'ba01f6bee5dc23af1be5f47a4b0529cdc270143b9d83a5d0d94a3edee80d260a',
      artifactReceiptSha256: 'df4f1bc09d4ae697b00f5dbf2685076f6006ea35dede5f4c1eb2386ea1f38647',
    }),
    retirements: Object.freeze([reviewableWorkspaceRetirement]),
    routeTransitions: Object.freeze([]),
  }),
  Object.freeze({
    predecessor: Object.freeze({
      repository: 'jasondockery/compass',
      sourceCommit: 'bb087147c0ab60095b12b6f64da5862d583476ad',
      sourceTree: '811e78cd4dcc9a6a48ad24cc976e1e8e70b2918e',
      sourceFingerprintSha256: 'bc956e0a9755b62acf9fabfed715c6e71a40173f8902547767579a670c771232',
      artifactSha256: 'b8c1642aaf540ea03012b6a6fdccd8f1d0bb96ad97c5d1d521522e361e48486c',
      artifactBytes: 371290,
      validationReceiptSha256: '25c3566578ced3c148456db7b8369b2724e4502fb2dcffe7ccf945b8f64eaaff',
      artifactReceiptSha256: '8a578029ad119c8ac756ee49b718a3438cf09dd96ed9bbe79ff4adca73556b49',
    }),
    retirements: Object.freeze([concurrentRuntimeRetirement, reviewableWorkspaceRetirement]),
    routeTransitions: Object.freeze([]),
  }),
  Object.freeze({
    predecessor: Object.freeze({
      repository: 'jasondockery/compass',
      sourceCommit: '0b6911dbf66240fe7dfeee2808e1d51663dcdfaa',
      sourceTree: 'f6a218049ee60667101ca4f5b56767002dc6acf3',
      sourceFingerprintSha256: 'd0ef4a00ff39bd0b3829527a788fd1c640799cd78505fc9ff08c73741a5c114d',
      artifactSha256: '63fa100f36c5392d6a8536363cc31bbb9c6cd8c74eb159ba80ecd8fc7d706541',
      artifactBytes: 314639,
      validationReceiptSha256: '3501e8944be9ecba1133fdfd0a56e036fdd3b5d0613f322dec10e73f391c28bb',
      artifactReceiptSha256: 'bf2be1851c006a2a7276ccb521ffa5862f97e5b51be5f08c27352fa32105c5d5',
    }),
    retirements: Object.freeze([]),
    routeTransitions: Object.freeze([agentsSkillsRouteTransition, claudeSkillsRouteTransition]),
  }),
  Object.freeze({
    predecessor: Object.freeze({
      repository: 'jasondockery/compass',
      sourceCommit: 'c0a45d8a9c8db0e4dcaa5e2d543c48ac208289a0',
      sourceTree: '42cd8d33e7e0d1a21acf642c98dd146b54f896f8',
      sourceFingerprintSha256: '116bdd9d0e7515339a2eaa0b9a561f0aadd6301e9422226b0a77d06c721fe8ee',
      artifactSha256: '636a96690a5e13c3d69cf98be78fa4c6c2b6f944b96e62438a055c54fc82744a',
      artifactBytes: 101807,
      validationReceiptSha256: 'fc77bd55c55bf050defa635cb8bb1957bb5aa9174ad27d324cfe7dd62a34bd10',
      artifactReceiptSha256: '3fed0ea564079a4c676d37f18b3266d8263537260057c69da3cec4f23bf4c005',
    }),
    retirements: Object.freeze([]),
    routeTransitions: Object.freeze([agentsSkillsRouteTransition, claudeSkillsRouteTransition, codexSkillsRouteTransition]),
  }),
])
export const COMPASS_MANAGED_RETIREMENTS = Object.freeze([concurrentRuntimeRetirement, reviewableWorkspaceRetirement])
export const COMPASS_MANAGED_ROUTE_TRANSITIONS = Object.freeze([agentsSkillsRouteTransition, claudeSkillsRouteTransition, codexSkillsRouteTransition])

export function validateManagedRetirementManifest(manifest, problems = []) {
  const initialProblemCount = problems.length
  if (!hasExactKeys(manifest, ['migrationPaths', 'schema', 'schemaVersion']) || manifest.schema !== 'compass.managed-retirements' || manifest.schemaVersion !== 3) {
    problems.push('managed retirement manifest identity is invalid')
    return false
  }
  if (!Array.isArray(manifest.migrationPaths) || manifest.migrationPaths.length !== COMPASS_MANAGED_RETIREMENT_MIGRATIONS.length) {
    problems.push('managed retirement migration path inventory is invalid')
    return false
  }
  for (let index = 0; index < COMPASS_MANAGED_RETIREMENT_MIGRATIONS.length; index += 1) {
    const actual = manifest.migrationPaths[index]
    const expected = COMPASS_MANAGED_RETIREMENT_MIGRATIONS[index]
    if (!hasExactKeys(actual, ['predecessor', 'retirements', 'routeTransitions']) || JSON.stringify(actual) !== JSON.stringify(expected)) problems.push(`managed retirement migration path is invalid at index ${index}`)
  }
  return problems.length === initialProblemCount
}

export const COMPASS_REVIEWABLE_WORKSPACE_MODES = Object.freeze(['read-only', 'implementation', 'proof', 'integration'])
export const COMPASS_REVIEWABLE_WORKSPACE_COMMON_HANDOFF_FIELDS = Object.freeze([
  'schema', 'schemaVersion', 'platform', 'repository', 'mode', 'baseSha', 'branch',
  'worktreeUri', 'owner', 'reviewSurface', 'commit', 'tree', 'verification',
  'worktreeCleanliness', 'consumerEvidence',
])
export const COMPASS_REVIEWABLE_WORKSPACE_TRANSFER_FIELDS = Object.freeze([
  ...COMPASS_REVIEWABLE_WORKSPACE_COMMON_HANDOFF_FIELDS,
  'writableScope', 'runtimeNamespace', 'integrationOwner', 'changedPaths',
  'remoteCheckpoint', 'ownedResourceClosure', 'cleanupOwner',
])
export const COMPASS_REVIEWABLE_WORKSPACE_PROOF_FIELDS = Object.freeze([
  ...COMPASS_REVIEWABLE_WORKSPACE_COMMON_HANDOFF_FIELDS,
  'runtimeNamespace', 'ownedResourceClosure', 'cleanupOwner',
])
export const COMPASS_REVIEWABLE_WORKSPACE_HANDOFF_FIELDS = COMPASS_REVIEWABLE_WORKSPACE_TRANSFER_FIELDS

export function validateReviewableWorkspaceHandoff(record, problems = []) {
  const initialProblemCount = problems.length
  if (!COMPASS_REVIEWABLE_WORKSPACE_MODES.includes(record?.mode)) {
    problems.push('reviewable workspace handoff mode is invalid')
    return false
  }
  const expectedFields = ['implementation', 'integration'].includes(record.mode)
    ? COMPASS_REVIEWABLE_WORKSPACE_TRANSFER_FIELDS
    : record.mode === 'proof' ? COMPASS_REVIEWABLE_WORKSPACE_PROOF_FIELDS : COMPASS_REVIEWABLE_WORKSPACE_COMMON_HANDOFF_FIELDS
  if (!hasExactKeys(record, expectedFields)) {
    problems.push(`reviewable workspace ${record.mode} handoff fields are invalid`)
    return false
  }
  if (record.schema !== 'compass.reviewable-workspace-handoff' || record.schemaVersion !== 4 || record.platform !== 'posix') problems.push('reviewable workspace handoff schema or platform is invalid')
  for (const key of ['repository', 'owner']) {
    if (typeof record[key] !== 'string' || record[key].trim().length === 0) problems.push(`reviewable workspace handoff ${key} must be a non-empty string`)
  }
  if (!COMMIT.test(record.baseSha ?? '') || !COMMIT.test(record.commit ?? '') || !COMMIT.test(record.tree ?? '')) problems.push('reviewable workspace handoff Git identity is invalid')
  if (record.branch?.state === 'attached') {
    if (!hasExactKeys(record.branch, ['name', 'state']) || typeof record.branch.name !== 'string' || record.branch.name.trim().length === 0) problems.push('reviewable workspace attached branch state is invalid')
  } else if (record.branch?.state === 'detached') {
    if (!hasExactKeys(record.branch, ['commit', 'state']) || !COMMIT.test(record.branch.commit ?? '')) problems.push('reviewable workspace detached branch state is invalid')
    else if (record.branch.commit !== record.commit) problems.push('reviewable workspace detached branch commit must equal the handoff commit')
  } else problems.push('reviewable workspace handoff branch state is invalid')
  if (['implementation', 'integration'].includes(record.mode) && record.branch?.state !== 'attached') problems.push('reviewable workspace writable handoff requires an attached branch')
  if (record.mode === 'proof' && record.branch?.state !== 'detached') problems.push('reviewable workspace proof handoff requires a detached branch state')
  let worktreePathname = ''
  try {
    const worktree = new URL(record.worktreeUri)
    if (worktree.protocol !== 'file:' || worktree.username || worktree.password || worktree.host || worktree.search || worktree.hash || worktree.href !== record.worktreeUri || !worktree.pathname.startsWith('/')) throw new Error('not normalized')
    worktreePathname = decodeURIComponent(worktree.pathname)
  } catch { problems.push('reviewable workspace handoff worktreeUri must be a normalized local file URI') }
  if (['implementation', 'integration'].includes(record.mode) && /^\/(?:private\/)?tmp(?:\/|$)/u.test(worktreePathname)) problems.push('reviewable workspace implementation handoff cannot use a proof-only temporary worktree')
  if (['implementation', 'integration'].includes(record.mode)) {
    if (record.integrationOwner !== null && (typeof record.integrationOwner !== 'string' || record.integrationOwner.trim().length === 0)) problems.push('reviewable workspace handoff integrationOwner must be null or a non-empty string')
    if (record.mode === 'integration' && record.integrationOwner === null) problems.push('reviewable workspace integration handoff requires integrationOwner')
    for (const key of ['writableScope', 'changedPaths']) {
      const values = record[key]
      if (!Array.isArray(values) || values.length === 0 || values.some((value) => !safeRelativePath(value)) || new Set(values).size !== values.length) problems.push(`reviewable workspace handoff ${key} must be a unique non-empty safe path list`)
    }
    if (Array.isArray(record.changedPaths) && Array.isArray(record.writableScope)) {
      for (const changedPath of record.changedPaths) if (!record.writableScope.some((scope) => changedPath === scope || changedPath.startsWith(`${scope}/`))) problems.push(`reviewable workspace changed path is outside writable scope: ${changedPath}`)
    }
  }
  if (!Array.isArray(record.verification) || record.verification.length === 0 || record.verification.some((value) => typeof value !== 'string' || value.trim().length === 0) || new Set(record.verification).size !== record.verification.length) problems.push('reviewable workspace handoff verification must be a unique non-empty string list')
  if (!hasExactKeys(record.worktreeCleanliness, ['sourceReadOnly', 'state']) || !['clean', 'dirty'].includes(record.worktreeCleanliness?.state) || typeof record.worktreeCleanliness?.sourceReadOnly !== 'boolean') problems.push('reviewable workspace handoff worktreeCleanliness is invalid')
  if (record.mode === 'proof' && (record.worktreeCleanliness?.state !== 'clean' || record.worktreeCleanliness?.sourceReadOnly !== true)) problems.push('reviewable workspace proof handoff must be clean and source-read-only')
  if (record.mode === 'read-only' && record.worktreeCleanliness?.sourceReadOnly !== true) problems.push('reviewable workspace read-only handoff must be source-read-only')
  if (['implementation', 'integration'].includes(record.mode) && (record.worktreeCleanliness?.state !== 'clean' || record.worktreeCleanliness?.sourceReadOnly !== false)) problems.push('reviewable workspace writable handoff requires a clean writable checkpoint')
  const reviewKinds = ['visible-workspace-diff', 'native-session-diff', 'branch', 'draft-pr']
  if (!hasExactKeys(record.reviewSurface, ['kind', 'locator']) || !reviewKinds.includes(record.reviewSurface?.kind) || typeof record.reviewSurface?.locator !== 'string' || record.reviewSurface.locator.trim().length === 0) problems.push('reviewable workspace handoff reviewSurface is invalid')
  const validateApplicable = (value, label, applicableState, valueKey) => {
    if (value?.state === 'not-applicable') {
      if (!hasExactKeys(value, ['reason', 'state']) || typeof value.reason !== 'string' || value.reason.trim().length === 0) problems.push(`${label} not-applicable state requires a reason`)
    } else if (!hasExactKeys(value, ['state', valueKey]) || value?.state !== applicableState || typeof value[valueKey] !== 'string' || value[valueKey].trim().length === 0) {
      problems.push(`${label} applicable state is invalid`)
    }
  }
  if (record.mode !== 'read-only') {
    validateApplicable(record.runtimeNamespace, 'reviewable workspace handoff runtimeNamespace', 'declared', 'value')
    validateApplicable(record.ownedResourceClosure, 'reviewable workspace handoff ownedResourceClosure', 'complete', 'evidence')
    if (typeof record.cleanupOwner !== 'string' || record.cleanupOwner.trim().length === 0) problems.push('reviewable workspace handoff cleanupOwner must be a non-empty string')
  }
  if (['implementation', 'integration'].includes(record.mode)) {
    if (!hasExactKeys(record.remoteCheckpoint, ['currentCommit', 'earlyCheckpointCommit', 'kind', 'locator', 'remoteRef', 'state']) || record.remoteCheckpoint?.state !== 'current-reachable' || !['remote-ref', 'draft-pr'].includes(record.remoteCheckpoint?.kind) || typeof record.remoteCheckpoint?.locator !== 'string' || record.remoteCheckpoint.locator.trim().length === 0 || !/^refs\/remotes\/[A-Za-z0-9._/-]+$/u.test(record.remoteCheckpoint?.remoteRef ?? '') || !COMMIT.test(record.remoteCheckpoint?.earlyCheckpointCommit ?? '') || !COMMIT.test(record.remoteCheckpoint?.currentCommit ?? '') || record.remoteCheckpoint.currentCommit !== record.commit) {
      problems.push('reviewable workspace handoff remoteCheckpoint is invalid')
    }
  }
  if (record.consumerEvidence !== null && (!hasExactKeys(record.consumerEvidence, ['evidence', 'namespace', 'schemaVersion']) || typeof record.consumerEvidence.namespace !== 'string' || !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u.test(record.consumerEvidence.namespace) || !Number.isSafeInteger(record.consumerEvidence.schemaVersion) || record.consumerEvidence.schemaVersion < 1 || record.consumerEvidence.evidence === null || typeof record.consumerEvidence.evidence !== 'object' || Array.isArray(record.consumerEvidence.evidence))) problems.push('reviewable workspace handoff consumerEvidence must be null or a versioned namespaced object')
  return problems.length === initialProblemCount
}

function repositoryFromRemote(value) {
  if (typeof value !== 'string') return null
  const normalized = value.trim().replace(/\.git$/u, '').replace(/\/$/u, '')
  const match = /(?:^|[:/])([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/u.exec(normalized)
  return match ? `${match[1]}/${match[2]}` : null
}

function remoteCoordinates(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  const scp = /^git@([A-Za-z0-9.-]+):([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?$/u.exec(trimmed)
  if (scp) return { host: scp[1].toLowerCase(), repository: scp[2] }
  try {
    const parsed = new URL(trimmed)
    if (!['https:', 'ssh:'].includes(parsed.protocol) || parsed.username && parsed.protocol === 'https:') return null
    const repository = parsed.pathname.replace(/^\//u, '').replace(/\.git$/u, '').replace(/\/$/u, '')
    return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository) ? { host: parsed.hostname.toLowerCase(), repository } : null
  } catch { return null }
}

function locatorCoordinates(value) {
  try {
    const parsed = new URL(value)
    const [owner, repository] = parsed.pathname.split('/').filter(Boolean)
    if (parsed.protocol !== 'https:' || !owner || !repository) return null
    return { host: parsed.hostname.toLowerCase(), repository: `${owner}/${repository}` }
  } catch { return null }
}

function gitResult(root, arguments_) {
  return spawnSync('git', arguments_, {
    cwd: root,
    encoding: 'utf8',
    timeout: 10_000,
    maxBuffer: 8 * 1024 * 1024,
  })
}

function gitText(root, arguments_, label, problems) {
  const result = gitResult(root, arguments_)
  if (result.error || result.status !== 0) {
    problems.push(`reviewable workspace repository verification could not read ${label}`)
    return null
  }
  return result.stdout.trim()
}

function nulPaths(value) {
  return value.split('\0').filter(Boolean)
}

function observeRemoteBranch({ root, remoteName, branchRef }) {
  const result = gitResult(root, ['ls-remote', '--exit-code', '--refs', remoteName, branchRef])
  if (result.error) return { state: 'unobserved', reason: result.error.message }
  if (result.status !== 0) return { state: 'unobserved', reason: result.stderr.trim() || `git ls-remote exited ${result.status}` }
  const lines = result.stdout.trim().split('\n').filter(Boolean)
  if (lines.length !== 1) return { state: 'unobserved', reason: `expected one live remote ref, found ${lines.length}` }
  const [commit, observedRef, extra] = lines[0].split(/\s+/u)
  if (extra || !COMMIT.test(commit) || observedRef !== branchRef) return { state: 'unobserved', reason: 'live remote response is malformed or names a different ref' }
  return { state: 'reached', commit, branchRef, remoteName }
}

export function validateReviewableWorkspaceHandoffRepository(record, repositoryRoot, problems = [], { remoteName = 'origin', runtimePlatform = process.platform, remoteObserver = observeRemoteBranch } = {}) {
  const initialProblemCount = problems.length
  if (!validateReviewableWorkspaceHandoff(record, problems)) return false
  if (!['darwin', 'linux'].includes(runtimePlatform)) {
    problems.push('reviewable workspace repository-bound handoff version 4 supports POSIX macOS and Linux only')
    return false
  }
  let root
  try {
    root = fs.realpathSync.native(path.resolve(repositoryRoot))
    if (root !== path.resolve(repositoryRoot) || fileURLToPath(new URL(record.worktreeUri)) !== root) throw new Error('root differs')
  } catch {
    problems.push('reviewable workspace handoff worktreeUri does not equal the governed repository root')
    return false
  }
  const top = gitText(root, ['rev-parse', '--show-toplevel'], 'repository root', problems)
  if (!top || fs.realpathSync.native(top) !== root) problems.push('reviewable workspace handoff repository root is not the Git top level')
  const remote = gitText(root, ['remote', 'get-url', remoteName], 'repository remote', problems)
  const configuredRemote = remoteCoordinates(remote)
  if (!configuredRemote || repositoryFromRemote(remote) !== record.repository || configuredRemote.repository !== record.repository) problems.push('reviewable workspace handoff repository does not match its configured Git remote')
  const head = gitText(root, ['rev-parse', 'HEAD'], 'HEAD', problems)
  const tree = gitText(root, ['rev-parse', 'HEAD^{tree}'], 'HEAD tree', problems)
  if (head !== record.commit) problems.push('reviewable workspace handoff commit does not equal HEAD')
  if (tree !== record.tree) problems.push('reviewable workspace handoff tree does not equal HEAD tree')
  const ancestor = gitResult(root, ['merge-base', '--is-ancestor', record.baseSha, 'HEAD'])
  if (ancestor.error || ancestor.status !== 0) problems.push('reviewable workspace handoff baseSha is not an ancestor of HEAD')
  const branch = gitResult(root, ['symbolic-ref', '--quiet', '--short', 'HEAD'])
  if (record.branch.state === 'attached' && (branch.status !== 0 || branch.stdout.trim() !== record.branch.name)) problems.push('reviewable workspace handoff branch is not checked out')
  if (record.branch.state === 'detached' && branch.status === 0) problems.push('reviewable workspace proof handoff is not detached')

  const status = gitResult(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all'])
  if (status.error || status.status !== 0) problems.push('reviewable workspace handoff could not inspect complete working state')
  const isClean = status.status === 0 && status.stdout.length === 0
  if (record.worktreeCleanliness.state === 'clean' && !isClean) problems.push('reviewable workspace handoff claims a clean checkout with uncommitted state')
  if (record.worktreeCleanliness.state === 'dirty' && isClean) problems.push('reviewable workspace handoff claims a dirty checkout that is clean')

  if (['implementation', 'integration'].includes(record.mode)) {
    const committed = gitResult(root, ['diff', '--name-only', '-z', `${record.baseSha}..HEAD`])
    const staged = gitResult(root, ['diff', '--cached', '--name-only', '-z'])
    const unstaged = gitResult(root, ['diff', '--name-only', '-z'])
    const untracked = gitResult(root, ['ls-files', '--others', '--exclude-standard', '-z'])
    if ([committed, staged, unstaged, untracked].some((result) => result.error || result.status !== 0)) {
      problems.push('reviewable workspace handoff could not enumerate complete changed paths')
    } else {
      const actualPaths = [...new Set([committed, staged, unstaged, untracked].flatMap((result) => nulPaths(result.stdout)))].sort()
      if (JSON.stringify(actualPaths) !== JSON.stringify([...record.changedPaths].sort())) problems.push('reviewable workspace handoff changedPaths do not equal the complete Git inventory')
    }
    const early = gitResult(root, ['merge-base', '--is-ancestor', record.remoteCheckpoint.earlyCheckpointCommit, record.commit])
    if (early.error || early.status !== 0) problems.push('reviewable workspace handoff early checkpoint is not an ancestor of the current commit')
    const remotePrefix = `refs/remotes/${remoteName}/`
    if (!record.remoteCheckpoint.remoteRef.startsWith(remotePrefix)) problems.push('reviewable workspace handoff remote checkpoint ref does not belong to the configured remote')
    const branch = record.remoteCheckpoint.remoteRef.startsWith(remotePrefix) ? record.remoteCheckpoint.remoteRef.slice(remotePrefix.length) : ''
    const branchRef = branch ? `refs/heads/${branch}` : ''
    const locator = locatorCoordinates(record.remoteCheckpoint.locator)
    if (!configuredRemote || !locator || locator.host !== configuredRemote.host || locator.repository !== configuredRemote.repository) problems.push('reviewable workspace handoff remote checkpoint locator does not match the configured remote host and repository')
    const reviewLocator = locatorCoordinates(record.reviewSurface.locator)
    if (!configuredRemote || !reviewLocator || reviewLocator.host !== configuredRemote.host || reviewLocator.repository !== configuredRemote.repository) problems.push('reviewable workspace handoff human review surface does not match the configured remote host and repository')
    const remoteRefCommit = gitText(root, ['rev-parse', `${record.remoteCheckpoint.remoteRef}^{commit}`], 'cached remote checkpoint ref', problems)
    const remoteContains = gitResult(root, ['merge-base', '--is-ancestor', record.commit, record.remoteCheckpoint.remoteRef])
    if (!remoteRefCommit || remoteContains.error || remoteContains.status !== 0) problems.push('reviewable workspace handoff current commit is not reachable from its cached remote checkpoint ref')
    let observation
    try { observation = branchRef ? remoteObserver({ root, remoteName, branchRef, remote, repository: record.repository }) : null } catch (error) { observation = { state: 'unobserved', reason: error instanceof Error ? error.message : String(error) } }
    if (observation?.state !== 'reached') problems.push(`reviewable workspace handoff live remote state is unobserved: ${observation?.reason ?? 'remote observation unavailable'}`)
    else if (observation.remoteName !== remoteName || observation.branchRef !== branchRef || observation.commit !== record.commit) problems.push('reviewable workspace handoff current commit is not live-reachable from the authenticated remote branch')
  }
  return problems.length === initialProblemCount
}

function parseSkillIdentity(bytes, label, problems) {
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/u.exec(bytes.toString('utf8'))
  if (!match) {
    problems.push(`${label} has invalid skill frontmatter`)
    return null
  }
  const fields = {}
  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':')
    if (separator <= 0) {
      problems.push(`${label} has invalid skill frontmatter`)
      return null
    }
    fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim()
  }
  if (!hasExactKeys(fields, ['description', 'name']) || fields.name.length === 0 || fields.description.length === 0) {
    problems.push(`${label} skill identity is incomplete`)
    return null
  }
  return fields
}

export function agentRoutingAdapterBytes(canonicalSkillBytes) {
  const problems = []
  const identity = parseSkillIdentity(canonicalSkillBytes, 'canonical routed skill', problems)
  if (!identity || problems.length > 0) throw new Error(`canonical routed skill identity is invalid: ${problems.join('; ')}`)
  return Buffer.from(`---\nname: ${identity.name}\ndescription: ${identity.description}\n---\n\n# ${identity.name} adapter\n\nLoad \`../../../skills/${identity.name}/SKILL.md\` as the canonical procedure.\nThis adapter contains no independent policy.\n`)
}

export function inspectAgentRoutingDiscovery(root, inventory, { includeSourceOnly = true } = {}) {
  const discoveryRoot = path.resolve(root)
  const problems = []
  if (!validateAgentRoutingInventory(inventory, problems)) return problems
  const routes = new Map(inventory.physicalRoutes.map((route) => [route.id, route]))
  const canonical = new Map()
  for (const skill of inventory.skills) {
    const bytes = readRegularFile(discoveryRoot, skill.canonicalSkillPath, problems)
    if (!bytes) continue
    if (sha256(bytes) !== skill.canonicalSkillSha256) problems.push(`agent discovery canonical skill hash differs: ${skill.name}`)
    const identity = parseSkillIdentity(bytes, `canonical ${skill.name}`, problems)
    if (identity) canonical.set(identity.name, identity)
  }
  for (const ecosystem of inventory.ecosystems) {
    const ecosystemRoutes = ecosystem.physicalRouteIds.map((id) => routes.get(id))
    if (ecosystemRoutes.some((route) => !route)) {
      problems.push(`agent discovery ecosystem references an unknown physical route: ${ecosystem.id}`)
      continue
    }
    if (!includeSourceOnly && ecosystemRoutes.every(({ distribution }) => distribution !== 'projected')) continue
    const routedSkillNames = [...new Set(ecosystemRoutes.flatMap(({ routedSkills }) => routedSkills))]
    for (const skillName of routedSkillNames) {
      const expectedIdentity = canonical.get(skillName)
      if (!expectedIdentity) continue
      const discovered = []
      for (const route of ecosystemRoutes) {
        if (route.routingMechanism === 'instruction-pointer') {
          const instructionPath = route.canonicalPaths[0]
          const bytes = readRegularFile(discoveryRoot, instructionPath, problems)
          if (!bytes) continue
          const instructionText = bytes.toString('utf8')
          const pointer = `skills/${skillName}/SKILL.md`
          const count = instructionText.split(pointer).length - 1
          if (count !== 1) problems.push(`agent discovery instruction pointer count differs for ${ecosystem.id}/${skillName}: ${count}`)
          else discovered.push({ kind: 'instruction-pointer', path: instructionPath, identity: expectedIdentity })
          const copiedPolicyPhrase = COMPASS_INSTRUCTION_COPIED_POLICY_PHRASES[skillName]
          if (!copiedPolicyPhrase) problems.push(`agent discovery instruction pointer has no copied-policy probe for ${ecosystem.id}/${skillName}`)
          else if (instructionText.includes(copiedPolicyPhrase)) problems.push(`agent discovery instruction pointer copies canonical policy for ${ecosystem.id}/${skillName}`)
        } else {
          for (const candidatePath of route.canonicalPaths.filter((candidatePath) => candidatePath.endsWith(`/skills/${skillName}/SKILL.md`))) {
            if (!fs.existsSync(path.join(discoveryRoot, candidatePath))) continue
            const bytes = readRegularFile(discoveryRoot, candidatePath, problems)
            if (bytes) discovered.push({ kind: 'skill', path: candidatePath, bytes, identity: parseSkillIdentity(bytes, `${ecosystem.id}/${candidatePath}`, problems) })
          }
        }
      }
      for (const recognized of inventory.recognizedUnmaterializedRoots.filter(({ recognizedBy }) => recognizedBy.includes(ecosystem.id))) {
        const candidatePath = `${recognized.path}/${skillName}/SKILL.md`
        if (!fs.existsSync(path.join(discoveryRoot, candidatePath))) continue
        const bytes = readRegularFile(discoveryRoot, candidatePath, problems)
        if (bytes) discovered.push({ kind: 'skill', path: candidatePath, bytes, identity: parseSkillIdentity(bytes, `${ecosystem.id}/${candidatePath}`, problems) })
      }
      const allowsIdenticalDuplicates = ecosystem.duplicateSkillPolicy === 'byte-identical-routes-collapse-to-one-logical-skill-for-compass-preflight-only'
      if (discovered.length === 0 || (discovered.length !== 1 && !allowsIdenticalDuplicates)) {
        problems.push(`agent discovery must resolve ${ecosystem.id}/${skillName} exactly once; found ${discovered.length}`)
        continue
      }
      if (allowsIdenticalDuplicates && discovered.length !== ecosystemRoutes.length) problems.push(`agent discovery duplicate route set is partial for ${ecosystem.id}/${skillName}`)
      if (allowsIdenticalDuplicates && discovered.some(({ kind }) => kind !== 'skill')) problems.push(`agent discovery duplicate policy applies only to skill routes: ${ecosystem.id}/${skillName}`)
      if (allowsIdenticalDuplicates && discovered.some(({ bytes }) => !bytes?.equals(discovered[0].bytes))) problems.push(`agent discovery duplicate routes differ for ${ecosystem.id}/${skillName}`)
      for (const entry of discovered) if (entry.identity && (entry.identity.name !== expectedIdentity.name || entry.identity.description !== expectedIdentity.description)) problems.push(`agent discovery skill identity differs from canonical: ${ecosystem.id}/${skillName}`)
    }
  }
  return problems
}

function validateProjectedAgentRouting(filesBySourcePath, problems) {
  const inventoryBytes = filesBySourcePath.get('agent-routing-surfaces.json')
  if (!inventoryBytes) {
    problems.push('receipt-bound agent routing surface inventory is missing')
    return
  }
  let inventory
  try {
    inventory = JSON.parse(inventoryBytes.toString('utf8'))
  } catch (error) {
    problems.push(`receipt-bound agent routing surface inventory is malformed: ${error instanceof Error ? error.message : String(error)}`)
    return
  }
  if (!validateAgentRoutingInventory(inventory, problems)) return
  for (const skill of inventory.skills) {
    const canonicalSkillBytes = filesBySourcePath.get(skill.canonicalSkillPath)
    if (!canonicalSkillBytes) {
      problems.push(`receipt-bound canonical routed skill version is missing: ${skill.name}`)
    } else if (sha256(canonicalSkillBytes) !== skill.canonicalSkillSha256) {
      problems.push(`receipt-bound canonical routed skill version differs from the routing inventory: ${skill.name}`)
    }
  }
  const declaredProjectedPaths = [...new Set(inventory.physicalRoutes
    .filter(({ distribution }) => distribution === 'projected')
    .flatMap(({ canonicalPaths }) => canonicalPaths))].sort()
  if (JSON.stringify(declaredProjectedPaths) !== JSON.stringify(COMPASS_DISCOVERY_ADAPTER_PATHS)) {
    problems.push('receipt-bound agent routing inventory and projected adapter manifest diverge')
  }
  for (const adapterPath of declaredProjectedPaths) {
    const skillName = adapterPath.split('/').at(-2)
    const canonicalSkillBytes = filesBySourcePath.get(`skills/${skillName}/SKILL.md`)
    const expectedAdapter = canonicalSkillBytes ? agentRoutingAdapterBytes(canonicalSkillBytes) : null
    const bytes = filesBySourcePath.get(adapterPath)
    if (!bytes) problems.push(`receipt-bound agent routing adapter is missing: ${adapterPath}`)
    else if (!expectedAdapter || !bytes.equals(expectedAdapter)) problems.push(`agent routing surface is not an exact route-only adapter: ${adapterPath}`)
  }
  for (const route of inventory.physicalRoutes.filter(({ distribution }) => distribution !== 'projected')) {
    for (const nonprojectedPath of route.canonicalPaths) {
      if (filesBySourcePath.has(nonprojectedPath)) problems.push(`nonprojected agent routing surface must not be artifact-managed: ${route.id}`)
    }
  }
  return inventory
}

export function compassProjectionPath(sourcePath) {
  if (['COMPASS.md', 'TERMINOLOGY.md', 'agent-routing-surfaces.json', 'ai-workload-policy.json', 'authority-policy.json', 'authority-registry.json', 'authority-registry.schema.json', 'consumer-hosted-adoption-receipt.schema.json', 'consumer-reconciliation.schema.json', 'managed-retirements.json', 'proof-evidence-policy.json', 'proof-selection.schema.json', 'reviewable-workspace-handoff.schema.json'].includes(sourcePath)) {
    return `.compass/${sourcePath}`
  }
  if (sourcePath === 'scripts/check-authority-record.mjs') return '.compass/check-authority-record.mjs'
  if (sourcePath === 'scripts/check-projection.mjs') return '.compass/check-projection.mjs'
  if (sourcePath === 'scripts/validate-json-schema.mjs') return '.compass/validate-json-schema.mjs'
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
    ['COMPASS.md', 'TERMINOLOGY.md', 'agent-routing-surfaces.json', 'ai-workload-policy.json', 'authority-policy.json', 'authority-registry.json', 'authority-registry.schema.json', 'check-authority-record.mjs', 'check-projection.mjs', 'consumer-hosted-adoption-receipt.schema.json', 'consumer-reconciliation.schema.json', 'managed-retirements.json', 'proof-evidence-policy.json', 'proof-selection.schema.json', 'receipt.json', 'reviewable-workspace-handoff.schema.json', 'validate-json-schema.mjs'],
    problems
  )) return false

  for (const name of COMPASS_SKILL_NAMES) {
    const relativeDirectory = `skills/${name}`
    if (!inspectExactDirectory(root, relativeDirectory, ['SKILL.md', 'agents'], problems)) return false
    if (!inspectExactDirectory(root, `${relativeDirectory}/agents`, ['openai.yaml'], problems)) return false
  }
  for (const adapterPath of COMPASS_DISCOVERY_ADAPTER_PATHS) {
    if (!inspectExactDirectory(root, path.posix.dirname(adapterPath), ['SKILL.md'], problems)) return false
  }
  return true
}

function validateReceiptShape(receipt, problems, expectedPaths, expectedRepository) {
  const initialProblemCount = problems.length
  if (receipt?.schema !== 'compass.artifact-receipt' || receipt.schemaVersion !== 1) {
    problems.push('Compass receipt has an unsupported schema or version')
    return false
  }
  if (
    (expectedRepository === null
      ? typeof receipt.source?.repository !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(receipt.source.repository)
      : receipt.source?.repository !== expectedRepository) ||
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
  expectedRepository = COMPASS_REPOSITORY,
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
  if (!validateReceiptShape(receipt, problems, expectedPaths, expectedRepository)) {
    return { root: consumerRoot, receipt, problems }
  }

  const shareablePaths = expectedPaths ?? receipt.includedFiles.map(({ path: sourcePath }) => sourcePath)
  const artifactFiles = []
  const filesBySourcePath = new Map()
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
    filesBySourcePath.set(sourcePath, bytes)
  }

  if (shareablePaths.includes('agent-routing-surfaces.json')) {
    const routingInventory = validateProjectedAgentRouting(filesBySourcePath, problems)
    if (routingInventory) problems.push(...inspectAgentRoutingDiscovery(consumerRoot, routingInventory))
  }
  if (shareablePaths.includes('managed-retirements.json')) {
    const retirementBytes = filesBySourcePath.get('managed-retirements.json')
    if (!retirementBytes) problems.push('receipt-bound managed retirement manifest is missing')
    else {
      try { validateManagedRetirementManifest(JSON.parse(retirementBytes.toString('utf8')), problems) } catch { problems.push('receipt-bound managed retirement manifest is malformed') }
    }
  }
  if (shareablePaths.includes('proof-evidence-policy.json')) {
    const policyBytes = filesBySourcePath.get('proof-evidence-policy.json')
    if (!policyBytes) problems.push('receipt-bound proof evidence policy is missing')
    else {
      try { validateProofEvidencePolicy(JSON.parse(policyBytes.toString('utf8')), problems) } catch { problems.push('receipt-bound proof evidence policy is malformed') }
    }
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
