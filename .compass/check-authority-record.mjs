#!/usr/bin/env node
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { isDeepStrictEqual } from 'node:util'
import { fileURLToPath } from 'node:url'
import { inflateRawSync } from 'node:zlib'
import { inspectCompassProjection } from './check-projection.mjs'
import { validateJsonSchema } from './validate-json-schema.mjs'

const COMMIT = /^[0-9a-f]{40}$/u
const SHA256 = /^[0-9a-f]{64}$/u
const CANDIDATE_ID = /^sta-[a-z0-9]+(?:-[a-z0-9]+)*$/u
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const REPOSITORY = /^(?!\.\.?\/)(?![^/]+\/\.\.?$)[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u
const SAFE_RELATIVE_PATH = /^(?!\/)(?!.*\/\/)(?!\.\.?$)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)[A-Za-z0-9._/-]+$/u
const ARTIFACT_NAME_TEMPLATE = /^(?=.*\{runId\})(?=.*\{attempt\})[A-Za-z0-9._-]*(?:\{(?:runId|attempt)\}[A-Za-z0-9._-]*)*$/u
const MAX_RECORD_BYTES = 1024 * 1024
const MAX_PROVIDER_JSON_BYTES = 2 * 1024 * 1024
const MAX_PROVIDER_ARCHIVE_BYTES = 64 * 1024 * 1024
const PROVIDER_DEADLINE_MS = 15_000
export const MAX_UPSTREAM_PROJECTION_ROOTS = 8
const GITHUB_ACTIONS_APP_ID = 15368
const GITHUB_ACTIONS_APP_SLUG = 'github-actions'
const GITHUB_ACTIONS_APP_OWNER = 'github'
const REQUIRED_IDENTITY_DIMENSIONS = Object.freeze([
  'sourceCommit',
  'sourceTree',
  'sourceFingerprintSha256',
  'artifactSha256',
  'artifactBytes',
  'validationReceiptSha256',
  'artifactReceiptSha256',
])
const RECEIPT_BINDING_KEYS = Object.freeze(['kind', 'path', 'schema', 'repository'])
const COMPASS_RECEIPT_BINDING = Object.freeze({
  kind: 'containing-projection-receipt',
  path: '.compass/receipt.json',
  schema: 'compass.artifact-receipt',
  repository: 'jasondockery/compass',
})
const modulePath = fileURLToPath(import.meta.url)

function exactKeys(value, expected, label, problems) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    problems.push(`${label} must be an object`)
    return false
  }
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    problems.push(`${label} has missing or unknown fields`)
    return false
  }
  return true
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function safeRelativePath(value) {
  return typeof value === 'string' && SAFE_RELATIVE_PATH.test(value) && path.posix.normalize(value) === value
}

function oneOf(value, allowed, label, problems) {
  if (!allowed.includes(value)) problems.push(`${label} is invalid`)
}

function validateExactIdentity(identity, label, problems) {
  if (!exactKeys(identity, REQUIRED_IDENTITY_DIMENSIONS, label, problems)) return
  if (!COMMIT.test(identity.sourceCommit) || !COMMIT.test(identity.sourceTree)) problems.push(`${label} commit or tree is invalid`)
  for (const key of ['sourceFingerprintSha256', 'artifactSha256', 'validationReceiptSha256', 'artifactReceiptSha256']) {
    if (!SHA256.test(identity[key])) problems.push(`${label} ${key} is invalid`)
  }
  if (!Number.isSafeInteger(identity.artifactBytes) || identity.artifactBytes < 1) problems.push(`${label} artifactBytes is invalid`)
}

function validateAuthoritySource(source, label, problems) {
  if (!exactKeys(source, ['repository', 'sourceCommit', 'sourceTree', 'sourceFingerprintSha256'], label, problems)) return
  if (!REPOSITORY.test(source.repository ?? '') || !COMMIT.test(source.sourceCommit ?? '') || !COMMIT.test(source.sourceTree ?? '') || !SHA256.test(source.sourceFingerprintSha256 ?? '')) {
    problems.push(`${label} is invalid`)
  }
}

function sameAuthoritySource(source, repository, identity) {
  return source?.repository === repository
    && source.sourceCommit === identity?.sourceCommit
    && source.sourceTree === identity?.sourceTree
    && source.sourceFingerprintSha256 === identity?.sourceFingerprintSha256
}

function validateTransitionIdentity(identity, label, problems) {
  if (!identity || typeof identity !== 'object' || Array.isArray(identity)) {
    problems.push(`${label} must be an object`)
    return
  }
  if (identity.kind === 'source') {
    if (!exactKeys(identity, ['kind', 'repository', 'commit'], label, problems)) return
    if (!nonEmpty(identity.repository) || !COMMIT.test(identity.commit)) problems.push(`${label} source identity is invalid`)
    return
  }
  if (identity.kind === 'containing-projection-receipt') {
    if (!exactKeys(identity, RECEIPT_BINDING_KEYS, label, problems)) return
    if (identity.path !== '.compass/receipt.json' || identity.schema !== 'compass.artifact-receipt' || !nonEmpty(identity.repository)) problems.push(`${label} containing receipt binding is invalid`)
    return
  }
  problems.push(`${label} kind is invalid`)
}

export function validateAuthorityPolicy(policy) {
  const problems = []
  const keys = [
    'schema', 'schemaVersion', 'term', 'skillIdentifier', 'reviewField', 'requiredReviewClasses',
    'lifecycle', 'candidateStates', 'localRepairStates', 'authorityReconciliationStates',
    'incorporationStates', 'consumerStates', 'relationships', 'candidateIdPattern',
    'authorities', 'newAuthorityPrerequisites', 'contracts', 'reviewTemplateFields',
  ]
  if (!exactKeys(policy, keys, 'authority policy', problems)) return problems
  if (policy.schema !== 'compass.shift-to-authority-policy' || policy.schemaVersion !== 2 || policy.term !== 'Shift to Authority') {
    problems.push('authority policy identity is invalid')
  }
  for (const [key, minimum] of [
    ['requiredReviewClasses', 1], ['lifecycle', 5], ['candidateStates', 5], ['localRepairStates', 3],
    ['authorityReconciliationStates', 3], ['incorporationStates', 4], ['consumerStates', 5],
    ['relationships', 3], ['newAuthorityPrerequisites', 1], ['reviewTemplateFields', 1],
  ]) {
    const values = policy[key]
    if (!Array.isArray(values) || values.length < minimum || values.some((value) => !nonEmpty(value)) || new Set(values).size !== values.length) {
      problems.push(`authority policy ${key} is invalid`)
    }
  }
  if (policy.candidateIdPattern !== CANDIDATE_ID.source) problems.push('authority policy candidate ID pattern is invalid')
  if (!policy.authorities || typeof policy.authorities !== 'object' || Array.isArray(policy.authorities)) problems.push('authority policy authorities are invalid')
  for (const [name, authority] of Object.entries(policy.authorities ?? {})) {
    if (!exactKeys(authority, ['repository', 'scope', 'requiresProductFrameworkProviderDeploymentIndependence'], `authority policy authority ${name}`, problems)) continue
    if (!REPOSITORY.test(authority.repository) || !nonEmpty(authority.scope) || typeof authority.requiresProductFrameworkProviderDeploymentIndependence !== 'boolean') problems.push(`authority policy authority ${name} is invalid`)
  }
  if (!exactKeys(policy.contracts, ['authorityRegistry', 'authorityRegistrySchema', 'consumerReconciliationSchema', 'consumerHostedAdoptionReceiptSchema', 'validator'], 'authority policy contracts', problems)) return problems
  for (const value of Object.values(policy.contracts)) if (!nonEmpty(value) || path.posix.isAbsolute(value) || value.includes('..')) problems.push('authority policy contract path is invalid')
  return problems
}

export function validateAuthorityRegistry(registry, policy) {
  const problems = [...validateAuthorityPolicy(policy)]
  if (!exactKeys(registry, ['schema', 'schemaVersion', 'authority', 'candidates', 'heldAuthoritySources', 'heldAuthorityIdentities'], 'authority registry', problems)) return problems
  if (registry.schema !== 'compass.shift-to-authority-registry' || registry.schemaVersion !== 5 || !NAME.test(registry.authority ?? '') || !Object.hasOwn(policy.authorities ?? {}, registry.authority)) {
    problems.push('authority registry identity is invalid')
  }
  const authorityRepository = policy.authorities?.[registry.authority]?.repository
  if (!Array.isArray(registry.candidates) || registry.candidates.length < 1) problems.push('authority registry candidates are missing')
  const ids = new Set()
  const legal = new Set(['local:nominated', 'nominated:accepted', 'accepted:issued', 'local:rejected', 'nominated:rejected', 'accepted:rejected'])
  for (const candidate of registry.candidates ?? []) {
    const label = `candidate ${String(candidate?.id)}`
    const keys = [
      'id', 'invariant', 'origin', 'evidence', 'affectedScope', 'localRepairStatus',
      'authorityReconciliation', 'incorporationStatus', 'proposedAuthority', 'ownershipReason',
      'consumerOwnedRemainder', 'candidateState', 'authorityIdentity', 'supersedes', 'transitionHistory',
    ]
    if (Object.hasOwn(candidate ?? {}, 'authorityEpochs')) keys.push('authorityEpochs', 'authorityEpochState', 'epochSelection')
    if (!exactKeys(candidate, keys, label, problems)) continue
    if (!CANDIDATE_ID.test(candidate.id) || ids.has(candidate.id)) problems.push(`${label} ID is invalid or duplicated`)
    ids.add(candidate.id)
    for (const key of ['invariant', 'ownershipReason', 'consumerOwnedRemainder']) if (!nonEmpty(candidate[key])) problems.push(`${label} ${key} is empty`)
    if (!Array.isArray(candidate.affectedScope) || candidate.affectedScope.length < 1 || candidate.affectedScope.some((value) => !nonEmpty(value))) problems.push(`${label} affectedScope is invalid`)
    if (!exactKeys(candidate.origin, ['repository', 'identity'], `${label} origin`, problems)) continue
    if (!nonEmpty(candidate.origin.repository)) problems.push(`${label} origin repository is invalid`)
    validateTransitionIdentity(candidate.origin.identity, `${label} origin identity`, problems)
    if (!Array.isArray(candidate.evidence) || candidate.evidence.length < 1) problems.push(`${label} evidence is missing`)
    for (const [index, evidence] of (candidate.evidence ?? []).entries()) {
      const evidenceLabel = `${label} evidence ${index + 1}`
      if (!exactKeys(evidence, ['id', 'type', 'repository', 'sourceCommit', 'summary'], evidenceLabel, problems)) continue
      if (!NAME.test(evidence.id) || !NAME.test(evidence.type) || !nonEmpty(evidence.repository) || !COMMIT.test(evidence.sourceCommit) || !nonEmpty(evidence.summary)) problems.push(`${evidenceLabel} is invalid`)
    }
    oneOf(candidate.localRepairStatus, policy.localRepairStates ?? [], `${label} localRepairStatus`, problems)
    oneOf(candidate.authorityReconciliation, policy.authorityReconciliationStates ?? [], `${label} authorityReconciliation`, problems)
    oneOf(candidate.incorporationStatus, policy.incorporationStates ?? [], `${label} incorporationStatus`, problems)
    oneOf(candidate.candidateState, policy.candidateStates ?? [], `${label} candidateState`, problems)
    if (!nonEmpty(candidate.proposedAuthority) || !Object.hasOwn(policy.authorities ?? {}, candidate.proposedAuthority)) problems.push(`${label} proposedAuthority is invalid`)
    if (candidate.supersedes !== null && !CANDIDATE_ID.test(candidate.supersedes)) problems.push(`${label} supersedes is invalid`)
    if (!Array.isArray(candidate.transitionHistory) || candidate.transitionHistory.length < 1) {
      problems.push(`${label} transition history is missing`)
      continue
    }
    let previous = null
    for (const [index, transition] of candidate.transitionHistory.entries()) {
      const transitionLabel = `${label} transition ${index + 1}`
      if (!exactKeys(transition, ['sequence', 'state', 'identity'], transitionLabel, problems)) continue
      if (transition.sequence !== index + 1) problems.push(`${transitionLabel} sequence is invalid`)
      oneOf(transition.state, policy.candidateStates ?? [], `${transitionLabel} state`, problems)
      validateTransitionIdentity(transition.identity, `${transitionLabel} identity`, problems)
      if (previous && !legal.has(`${previous}:${transition.state}`)) problems.push(`${transitionLabel} is an illegal ${previous} to ${transition.state} transition`)
      previous = transition.state
    }
    if (candidate.transitionHistory[0]?.state !== 'local' || previous !== candidate.candidateState) problems.push(`${label} current state does not match ordered transition history`)
    if (candidate.candidateState === 'issued') {
      if (!Object.hasOwn(candidate, 'authorityEpochs')) validateTransitionIdentity(candidate.authorityIdentity, `${label} authorityIdentity`, problems)
      if ((!Object.hasOwn(candidate, 'authorityEpochs') && candidate.authorityIdentity?.kind !== 'containing-projection-receipt') || candidate.authorityReconciliation !== 'complete' || candidate.incorporationStatus !== 'complete') {
        problems.push(`${label} issued state lacks exact receipt binding or completed authority work`)
      }
      if (candidate.authorityIdentity?.repository !== authorityRepository) problems.push(`${label} issued receipt repository does not match its authority policy`)
    } else if (candidate.authorityIdentity !== null) problems.push(`${label} non-issued state has an authorityIdentity`)
    if (Object.hasOwn(candidate, 'authorityEpochs')) {
      if (!Array.isArray(candidate.authorityEpochs) || candidate.authorityEpochs.length < 1) {
        problems.push(`${label} authority epochs are missing`)
      } else {
        const epochIdentities = new Set()
        let latestIssuedSequence = null
        let pendingSequence = null
        for (const [index, epoch] of candidate.authorityEpochs.entries()) {
          const epochLabel = `${label} authority epoch ${index + 1}`
          if (!exactKeys(epoch, ['sequence', 'state', 'invariant', 'canonicalSkillPath', 'canonicalSkillSha256', 'authorityIdentity', 'supersedesSequence'], epochLabel, problems)) continue
          if (epoch.sequence !== index + 1 || epoch.supersedesSequence !== (index === 0 ? null : index)) problems.push(`${epochLabel} sequence or supersession is invalid`)
          if (!['issued', 'pending-containing-receipt'].includes(epoch.state) || !nonEmpty(epoch.invariant) || !safeRelativePath(epoch.canonicalSkillPath) || !/^skills\/[a-z0-9]+(?:-[a-z0-9]+)*\/SKILL\.md$/u.test(epoch.canonicalSkillPath) || !SHA256.test(epoch.canonicalSkillSha256 ?? '')) problems.push(`${epochLabel} state or content is invalid`)
          const identity = epoch.authorityIdentity
          if (identity?.kind === 'exact-artifact-receipt') {
            if (!exactKeys(identity, ['kind', 'repository', ...REQUIRED_IDENTITY_DIMENSIONS], `${epochLabel} authorityIdentity`, problems)) continue
            if (identity.repository !== authorityRepository) problems.push(`${epochLabel} repository does not match its authority policy`)
            validateExactIdentity(Object.fromEntries(REQUIRED_IDENTITY_DIMENSIONS.map((key) => [key, identity[key]])), `${epochLabel} exact identity`, problems)
            if (epoch.state !== 'issued') problems.push(`${epochLabel} exact identity must be issued`)
            latestIssuedSequence = epoch.sequence
          } else {
            validateTransitionIdentity(identity, `${epochLabel} authorityIdentity`, problems)
            if (identity?.kind !== 'containing-projection-receipt' || identity?.repository !== authorityRepository || epoch.state !== 'pending-containing-receipt') problems.push(`${epochLabel} pending successor must bind the containing receipt`)
            if (pendingSequence !== null) problems.push(`${epochLabel} creates more than one pending authority epoch`)
            pendingSequence = epoch.sequence
          }
          const canonicalIdentity = canonicalJson(identity)
          if (epochIdentities.has(canonicalIdentity)) problems.push(`${epochLabel} duplicates an authority epoch identity`)
          epochIdentities.add(canonicalIdentity)
          if (index < candidate.authorityEpochs.length - 1 && epoch.state !== 'issued') problems.push(`${epochLabel} historical epoch is not issued`)
        }
        if (latestIssuedSequence === null) problems.push(`${label} authority epochs lack an issued epoch`)
        if (pendingSequence !== null && pendingSequence !== candidate.authorityEpochs.length) problems.push(`${label} pending authority epoch is not final`)
        const topLevelSequence = latestIssuedSequence
        if (!exactKeys(candidate.epochSelection, ['activeIssuedSequence', 'pendingSequence', 'topLevelSequence'], `${label} epochSelection`, problems) || candidate.epochSelection?.activeIssuedSequence !== latestIssuedSequence || candidate.epochSelection?.pendingSequence !== pendingSequence || candidate.epochSelection?.topLevelSequence !== topLevelSequence) problems.push(`${label} active, pending, or top-level authority epoch selection is invalid`)
        const topLevelEpoch = candidate.authorityEpochs.find(({ sequence }) => sequence === topLevelSequence)
        if (candidate.authorityEpochState !== topLevelEpoch?.state || topLevelEpoch?.invariant !== candidate.invariant || !isDeepStrictEqual(topLevelEpoch?.authorityIdentity, candidate.authorityIdentity)) problems.push(`${label} top-level authority epoch mirror is invalid`)
      }
    }
  }
  if (!Array.isArray(registry.heldAuthoritySources)) problems.push('authority registry held sources are missing')
  const heldSources = new Set()
  const observedIdentities = new Set()
  for (const [index, hold] of (registry.heldAuthoritySources ?? []).entries()) {
    const label = `held authority source ${index + 1}`
    if (!exactKeys(hold, ['source', 'disposition', 'reason', 'observedExactIdentities'], label, problems)) continue
    validateAuthoritySource(hold.source, `${label} identity`, problems)
    if (hold.source?.repository !== authorityRepository) problems.push(`${label} repository does not match its authority policy`)
    if (hold.disposition !== 'historical-not-adoptable' || !nonEmpty(hold.reason)) problems.push(`${label} disposition is invalid`)
    const sourceIdentity = canonicalJson(hold.source)
    if (heldSources.has(sourceIdentity)) problems.push(`${label} duplicates a held authority source`)
    heldSources.add(sourceIdentity)
    if (!Array.isArray(hold.observedExactIdentities)) problems.push(`${label} observed exact identities are missing`)
    for (const [observationIndex, identity] of (hold.observedExactIdentities ?? []).entries()) {
      const observationLabel = `${label} observed exact identity ${observationIndex + 1}`
      validateExactIdentity(identity, observationLabel, problems)
      if (!sameAuthoritySource(hold.source, hold.source?.repository, identity)) problems.push(`${observationLabel} does not match its held source`)
      const exactIdentity = canonicalJson(identity)
      if (observedIdentities.has(exactIdentity)) problems.push(`${observationLabel} duplicates observed exact evidence`)
      observedIdentities.add(exactIdentity)
    }
  }
  if (!Array.isArray(registry.heldAuthorityIdentities)) problems.push('authority registry held artifact identities are invalid')
  const heldIdentities = new Set()
  for (const [index, hold] of (registry.heldAuthorityIdentities ?? []).entries()) {
    const label = `held authority identity ${index + 1}`
    if (!exactKeys(hold, ['identity', 'scope', 'disposition', 'reason'], label, problems)) continue
    validateExactIdentity(hold.identity, `${label} identity`, problems)
    if (hold.scope !== 'artifact-receipt' || hold.disposition !== 'historical-not-adoptable' || !nonEmpty(hold.reason)) problems.push(`${label} disposition is invalid`)
    const exactIdentity = canonicalJson(hold.identity)
    if (heldIdentities.has(exactIdentity)) problems.push(`${label} duplicates a held authority identity`)
    if (observedIdentities.has(exactIdentity)) problems.push(`${label} duplicates source-hold observed evidence`)
    heldIdentities.add(exactIdentity)
  }
  return problems
}

function validateEvidenceContract(contract, label, problems) {
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
    problems.push(`${label} must be an object`)
    return
  }
  if (contract.kind === 'artifact') {
    if (!exactKeys(contract, ['kind', 'nameTemplate', 'path'], label, problems)) return
    if (!nonEmpty(contract.nameTemplate) || !ARTIFACT_NAME_TEMPLATE.test(contract.nameTemplate)) problems.push(`${label} artifact name template is invalid`)
    if (!safeRelativePath(contract.path)) problems.push(`${label} artifact path is invalid`)
    return
  }
  problems.push(`${label} kind is invalid`)
}

function validateAdoptionContract(contract, consumer, label, problems) {
  if (!exactKeys(contract, ['provider', 'repository', 'workflow', 'requiredGate', 'evidence'], label, problems)) return
  if (contract.provider !== 'github-actions' || contract.repository !== consumer?.repository || !nonEmpty(contract.workflow) || !nonEmpty(contract.requiredGate)) {
    problems.push(`${label} hosted authority is invalid`)
  }
  validateEvidenceContract(contract.evidence, `${label} evidence`, problems)
}

function validateConsumerTransitionHistory(item, label, policy, problems) {
  if (!Array.isArray(item.transitionHistory) || item.transitionHistory.length < 1) {
    problems.push(`${label} transition history is missing`)
    return
  }
  const states = []
  const legal = new Set(['awaiting-issue:pending-adoption', 'pending-adoption:adopted', 'pending-adoption:deferred', 'deferred:pending-adoption'])
  for (const [index, transition] of item.transitionHistory.entries()) {
    const transitionLabel = `${label} transition ${index + 1}`
    if (!exactKeys(transition, ['sequence', 'state'], transitionLabel, problems)) continue
    if (transition.sequence !== index + 1) problems.push(`${transitionLabel} sequence is invalid`)
    oneOf(transition.state, policy.consumerStates ?? [], `${transitionLabel} state`, problems)
    if (index > 0 && !legal.has(`${states[index - 1]}:${transition.state}`)) problems.push(`${transitionLabel} is an illegal consumer transition`)
    states.push(transition.state)
  }
  if (states.at(-1) !== item.consumerState) problems.push(`${label} current state does not match transition history`)
  if (item.consumerState === 'adopted' && (states.length < 3 || states.at(-2) !== 'pending-adoption' || states.at(-1) !== 'adopted')) problems.push(`${label} adopted state lacks a final pending-adoption to adopted transition`)
  if (item.consumerState === 'not-applicable' && JSON.stringify(states) !== JSON.stringify(['not-applicable'])) problems.push(`${label} not-applicable transition history is invalid`)
  if (item.consumerState !== 'not-applicable' && states[0] !== 'awaiting-issue') problems.push(`${label} transition history must start at awaiting-issue`)
}

function validateAdoptionEvidence(evidence, consumer, contract, label, problems) {
  if (!exactKeys(evidence, ['repository', 'commit', 'tree', 'hostedRun'], label, problems)) return
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) return
  if (evidence.repository !== consumer.repository || !COMMIT.test(evidence.commit) || !COMMIT.test(evidence.tree)) problems.push(`${label} consumer identity is invalid`)
  const run = evidence.hostedRun
  const runKeys = ['provider', 'repository', 'workflow', 'requiredGate', 'requiredJobId', 'requiredCheckId', 'conclusion', 'runId', 'attempt', 'headSha', 'evidence']
  if (!exactKeys(run, runKeys, `${label} hostedRun`, problems)) return
  if (run.provider !== contract.provider || run.repository !== contract.repository || run.repository !== evidence.repository || run.workflow !== contract.workflow || run.requiredGate !== contract.requiredGate || run.conclusion !== 'success') problems.push(`${label} hosted workflow or required gate is invalid`)
  if (!Number.isSafeInteger(run.runId) || run.runId < 1 || !Number.isSafeInteger(run.attempt) || run.attempt < 1 || !Number.isSafeInteger(run.requiredJobId) || run.requiredJobId < 1 || !Number.isSafeInteger(run.requiredCheckId) || run.requiredCheckId < 1 || run.headSha !== evidence.commit) problems.push(`${label} hosted run identity is invalid`)
  const actual = run.evidence
  const expected = contract.evidence
  if (expected?.kind === 'artifact') {
    if (!exactKeys(actual, ['kind', 'artifactId', 'name', 'path', 'artifactSha256', 'receiptSha256'], `${label} hosted artifact`, problems)) return
    const expectedName = expected.nameTemplate.replaceAll('{runId}', String(run.runId)).replaceAll('{attempt}', String(run.attempt))
    if (actual.kind !== 'artifact' || !Number.isSafeInteger(actual.artifactId) || actual.artifactId < 1 || actual.name !== expectedName || actual.path !== expected.path || !safeRelativePath(actual.path) || !SHA256.test(actual.artifactSha256) || !SHA256.test(actual.receiptSha256)) problems.push(`${label} hosted artifact binding is invalid`)
  } else problems.push(`${label} hosted evidence contract is invalid`)
}

export function validateConsumerReconciliation(record, policy) {
  const problems = [...validateAuthorityPolicy(policy)]
  if (!exactKeys(record, ['schema', 'schemaVersion', 'consumer', 'records'], 'consumer reconciliation', problems)) return problems
  if (record.schema !== 'compass.consumer-reconciliation' || record.schemaVersion !== 3) problems.push('consumer reconciliation identity is invalid')
  if (!exactKeys(record.consumer, ['name', 'repository', 'reconciliationPath', 'adoptionContract'], 'consumer identity', problems) || !NAME.test(record.consumer?.name ?? '') || !REPOSITORY.test(record.consumer?.repository ?? '') || !safeRelativePath(record.consumer?.reconciliationPath)) problems.push('consumer identity is invalid')
  else validateAdoptionContract(record.consumer.adoptionContract, record.consumer, 'consumer adoption contract', problems)
  if (!Array.isArray(record.records) || record.records.length < 1) problems.push('consumer reconciliation records are missing')
  const ids = new Set()
  for (const item of record.records ?? []) {
    const label = `consumer record ${String(item?.candidateId)}`
    const base = ['candidateId', 'relationship', 'consumerState', 'localReconciliation', 'transitionHistory']
    if (!item || typeof item !== 'object' || Array.isArray(item)) { problems.push(`${label} must be an object`); continue }
    const allowed = new Set([...base, 'authorityIdentity', 'authorityEpoch', 'viaAuthority', 'adoptionContract', 'adoptionEvidence', 'deferredDisposition', 'notApplicableReason'])
    if (Object.keys(item).some((key) => !allowed.has(key)) || base.some((key) => !Object.hasOwn(item, key))) problems.push(`${label} has missing or unknown fields`)
    if (!CANDIDATE_ID.test(item.candidateId) || ids.has(item.candidateId)) problems.push(`${label} candidate ID is invalid or duplicated`)
    ids.add(item.candidateId)
    oneOf(item.relationship, policy.relationships ?? [], `${label} relationship`, problems)
    oneOf(item.consumerState, policy.consumerStates ?? [], `${label} consumerState`, problems)
    oneOf(item.localReconciliation, ['pending', 'complete', 'not-required'], `${label} localReconciliation`, problems)
    if (Object.hasOwn(item, 'authorityEpoch')) {
      if (exactKeys(item.authorityEpoch, ['sequence', 'identity'], `${label} authorityEpoch`, problems)) {
        if (!Number.isSafeInteger(item.authorityEpoch.sequence) || item.authorityEpoch.sequence < 1) problems.push(`${label} authorityEpoch sequence is invalid`)
        validateExactIdentity(item.authorityEpoch.identity, `${label} authorityEpoch identity`, problems)
      }
    }
    validateConsumerTransitionHistory(item, label, policy, problems)
    if (['pending-adoption', 'adopted', 'deferred'].includes(item.consumerState)) {
      validateAdoptionContract(item.adoptionContract, record.consumer, `${label} adoptionContract`, problems)
    } else if (Object.hasOwn(item, 'adoptionContract')) problems.push(`${label} state has a forbidden adoptionContract`)
    if (item.relationship === 'direct') {
      validateExactIdentity(item.authorityIdentity, `${label} authorityIdentity`, problems)
      if (Object.hasOwn(item, 'viaAuthority') || Object.hasOwn(item, 'notApplicableReason')) problems.push(`${label} direct relationship has forbidden relationship fields`)
    } else if (item.relationship === 'via-authority') {
      if (!exactKeys(item.viaAuthority, ['name', 'identity'], `${label} viaAuthority`, problems)) continue
      if (!NAME.test(item.viaAuthority.name)) problems.push(`${label} via authority name is invalid`)
      validateExactIdentity(item.viaAuthority.identity, `${label} via authority identity`, problems)
      if (Object.hasOwn(item, 'authorityIdentity') || Object.hasOwn(item, 'notApplicableReason')) problems.push(`${label} via-authority relationship has forbidden relationship fields`)
    } else if (item.relationship === 'not-applicable') {
      if (item.consumerState !== 'not-applicable' || item.localReconciliation !== 'not-required' || !nonEmpty(item.notApplicableReason)) problems.push(`${label} not-applicable relationship lacks its reason and exact state`)
      for (const key of ['authorityIdentity', 'authorityEpoch', 'viaAuthority', 'adoptionContract', 'adoptionEvidence', 'deferredDisposition']) if (Object.hasOwn(item, key)) problems.push(`${label} not-applicable relationship has forbidden ${key}`)
      continue
    }
    if (item.consumerState === 'adopted') {
      if (item.localReconciliation !== 'complete') problems.push(`${label} adopted state lacks complete local reconciliation`)
      validateAdoptionEvidence(item.adoptionEvidence, record.consumer, item.adoptionContract, `${label} adoptionEvidence`, problems)
    } else if (Object.hasOwn(item, 'adoptionEvidence')) problems.push(`${label} non-adopted state has adoption evidence`)
    if (item.consumerState === 'deferred') {
      if (!exactKeys(item.deferredDisposition, ['reason', 'approvingOwner', 'exactScope', 'reviewOrExpirationDate', 'conformanceClaim'], `${label} deferredDisposition`, problems)) continue
      if (![item.deferredDisposition.reason, item.deferredDisposition.approvingOwner, item.deferredDisposition.exactScope, item.deferredDisposition.reviewOrExpirationDate].every(nonEmpty) || item.deferredDisposition.conformanceClaim !== false) problems.push(`${label} deferred disposition is invalid`)
    } else if (Object.hasOwn(item, 'deferredDisposition')) problems.push(`${label} non-deferred state has a deferred disposition`)
  }
  return problems
}

function resolveProjectionReceiptIdentity(receipt, receiptBytes, receiptPath, binding, problems) {
  if (!exactKeys(receipt, ['schema', 'schemaVersion', 'source', 'artifactSha256', 'artifactBytes', 'includedFiles', 'validation'], 'projection receipt', problems)) return null
  if (receipt.schema !== 'compass.artifact-receipt' || receipt.schemaVersion !== 1) problems.push('projection receipt schema is invalid')
  if (!exactKeys(receipt.source, ['repository', 'commit', 'tree', 'fingerprintSha256', 'dirty'], 'projection receipt source', problems)) return null
  if (receipt.source.repository !== binding?.repository || !COMMIT.test(receipt.source.commit) || !COMMIT.test(receipt.source.tree) || !SHA256.test(receipt.source.fingerprintSha256) || receipt.source.dirty !== false) problems.push('projection receipt source identity is invalid')
  if (!SHA256.test(receipt.artifactSha256) || !Number.isSafeInteger(receipt.artifactBytes) || receipt.artifactBytes < 1) problems.push('projection receipt artifact identity is invalid')
  if (!exactKeys(receipt.validation, ['result', 'receiptSha256', 'command'], 'projection receipt validation', problems) || receipt.validation?.result !== 'passed' || !SHA256.test(receipt.validation?.receiptSha256) || !nonEmpty(receipt.validation?.command)) problems.push('projection receipt validation identity is invalid')
  if (!Array.isArray(receipt.includedFiles) || receipt.includedFiles.length < 1) problems.push('projection receipt inventory is invalid')
  const normalized = path.resolve(receiptPath).split(path.sep).join('/')
  if (!normalized.endsWith(`/${binding?.path ?? ''}`)) problems.push(`projection receipt must be loaded from ${binding?.path ?? '.compass/receipt.json'}`)
  return {
    sourceCommit: receipt.source.commit,
    sourceTree: receipt.source.tree,
    sourceFingerprintSha256: receipt.source.fingerprintSha256,
    artifactSha256: receipt.artifactSha256,
    artifactBytes: receipt.artifactBytes,
    validationReceiptSha256: receipt.validation.receiptSha256,
    artifactReceiptSha256: sha256(receiptBytes),
  }
}

function validateReceiptFileBinding(receipt, relativePath, bytes, label, problems) {
  const entries = (receipt.includedFiles ?? []).filter((entry) => entry?.path === relativePath)
  if (entries.length !== 1 || !exactKeys(entries[0], ['path', 'sha256', 'bytes'], label, problems) || entries[0]?.sha256 !== sha256(bytes) || entries[0]?.bytes !== bytes.length) {
    problems.push(`${label} is not exactly bound by the containing projection receipt`)
  }
}

function exactIssuedEpochIdentity(repository, identity) {
  return { kind: 'exact-artifact-receipt', repository, ...identity }
}

function exactIdentityFromIssuedEpoch(identity) {
  return Object.fromEntries(REQUIRED_IDENTITY_DIMENSIONS.map((key) => [key, identity?.[key]]))
}

function authorityEpochRecord(candidate, authority, repository, epoch, authorityIdentity) {
  return {
    schema: 'compass.authority-epoch-resolution',
    schemaVersion: 1,
    authority,
    repository,
    candidateId: candidate.id,
    sequence: epoch.sequence,
    state: 'issued',
    invariant: epoch.invariant,
    canonicalSkillPath: epoch.canonicalSkillPath,
    canonicalSkillSha256: epoch.canonicalSkillSha256,
    supersedesSequence: epoch.supersedesSequence,
    authorityIdentity,
  }
}

function validateEpochSkillReceiptEntry(candidate, epoch, receipt, problems) {
  const entries = (receipt?.includedFiles ?? []).filter(({ path: includedPath }) => includedPath === epoch.canonicalSkillPath)
  if (entries.length !== 1 || !exactKeys(entries[0], ['path', 'sha256', 'bytes'], `authority candidate ${candidate.id} canonical skill receipt entry`, problems) || entries[0]?.sha256 !== epoch.canonicalSkillSha256 || !Number.isSafeInteger(entries[0]?.bytes) || entries[0].bytes < 1) {
    problems.push(`authority candidate ${candidate.id} authority epoch is not bound to its exact canonical skill in the containing receipt`)
    return false
  }
  return true
}

export function deriveAuthorityEpochResolution(candidate, authority, repository, identity, receipt, problems = []) {
  const pending = (candidate?.authorityEpochs ?? []).filter(({ state }) => state === 'pending-containing-receipt')
  if (pending.length !== 1 || candidate.authorityEpochs.at(-1) !== pending[0]) {
    problems.push(`authority candidate ${String(candidate?.id)} does not have exactly one final pending epoch to resolve`)
    return null
  }
  const epoch = pending[0]
  if (!validateEpochSkillReceiptEntry(candidate, epoch, receipt, problems)) return null
  return authorityEpochRecord(candidate, authority, repository, epoch, exactIssuedEpochIdentity(repository, identity))
}

function resolveAuthorityEpoch(candidate, authority, repository, identity, receipt, problems) {
  if ((candidate.authorityEpochs ?? []).some(({ state }) => state === 'pending-containing-receipt')) return deriveAuthorityEpochResolution(candidate, authority, repository, identity, receipt, problems)
  const epoch = candidate.authorityEpochs?.at(-1)
  if (!epoch || epoch.state !== 'issued' || epoch.authorityIdentity?.kind !== 'exact-artifact-receipt') {
    problems.push(`authority candidate ${String(candidate?.id)} does not have a resolvable active issued epoch`)
    return null
  }
  if (!validateEpochSkillReceiptEntry(candidate, epoch, receipt, problems)) return null
  return authorityEpochRecord(candidate, authority, repository, epoch, structuredClone(epoch.authorityIdentity))
}

export function validateAuthorityEpochResolution(record, candidate, authority, repository, identity, receipt) {
  const problems = []
  const expected = deriveAuthorityEpochResolution(candidate, authority, repository, identity, receipt, problems)
  const keys = ['schema', 'schemaVersion', 'authority', 'repository', 'candidateId', 'sequence', 'state', 'invariant', 'canonicalSkillPath', 'canonicalSkillSha256', 'supersedesSequence', 'authorityIdentity']
  if (!exactKeys(record, keys, 'authority epoch resolution', problems)) return problems
  if (expected && !isDeepStrictEqual(record, expected)) problems.push('authority epoch resolution does not equal the containing receipt-derived issued epoch')
  return problems
}

function sameExactIdentity(left, right) {
  return REQUIRED_IDENTITY_DIMENSIONS.every((key) => left?.[key] === right?.[key]) &&
    left && JSON.stringify(Object.keys(left).sort()) === JSON.stringify([...REQUIRED_IDENTITY_DIMENSIONS].sort())
}

function resolveGovernedRoot(root, label) {
  const requested = path.resolve(root)
  let canonical
  try { canonical = fs.realpathSync.native(requested) } catch (error) { throw new Error(`${label} is unavailable: ${error instanceof Error ? error.message : String(error)}`) }
  if (canonical !== requested) throw new Error(`${label} must not use a symlinked or aliased root`)
  let current = path.parse(canonical).root
  for (const segment of canonical.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment)
    const stat = fs.lstatSync(current)
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`${label} ancestor must be a regular non-symlink directory: ${current}`)
  }
  return canonical
}

function governedFile(root, relativePath, label) {
  if (!safeRelativePath(relativePath)) throw new Error(`${label} path is invalid`)
  let current = root
  const segments = relativePath.split('/')
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment)
    const stat = fs.lstatSync(current)
    if (stat.isSymbolicLink() || (index < segments.length - 1 ? !stat.isDirectory() : !stat.isFile())) throw new Error(`${label} path must contain only regular non-symlink ancestors and file`)
  }
  return current
}

function loadAuthorityProjection(projectionRoot, { canonicalCompass = false, expectedAuthority = null, expectedRepository = null } = {}) {
  let root
  try { root = resolveGovernedRoot(projectionRoot, canonicalCompass ? 'Compass projection root' : 'upstream projection root') } catch (error) {
    return { root: path.resolve(projectionRoot), problems: [error instanceof Error ? error.message : String(error)] }
  }
  const inspected = inspectCompassProjection(root, canonicalCompass
    ? undefined
    : { expectedPaths: null, checkManagedNamespaces: false, expectedRepository })
  const problems = inspected.problems.map((problem) => `projection integrity: ${problem}`)
  let policyDocument
  let registryDocument
  let receiptDocument
  let consumerSchemaDocument
  let hostedReceiptSchemaDocument
  try {
    policyDocument = parseJsonDocument(governedFile(root, '.compass/authority-policy.json', 'authority policy'))
    registryDocument = parseJsonDocument(governedFile(root, '.compass/authority-registry.json', 'authority registry'))
    receiptDocument = parseJsonDocument(governedFile(root, '.compass/receipt.json', 'authority receipt'))
    consumerSchemaDocument = parseJsonDocument(governedFile(root, '.compass/consumer-reconciliation.schema.json', 'consumer reconciliation schema'))
    hostedReceiptSchemaDocument = parseJsonDocument(governedFile(root, '.compass/consumer-hosted-adoption-receipt.schema.json', 'hosted receipt schema'))
  } catch (error) {
    problems.push(`authority projection is incomplete: ${error instanceof Error ? error.message : String(error)}`)
    return { root, problems }
  }
  const policy = policyDocument.value
  const registry = registryDocument.value
  const receipt = receiptDocument.value
  const consumerSchema = consumerSchemaDocument.value
  const hostedReceiptSchema = hostedReceiptSchemaDocument.value
  problems.push(...validateAuthorityRegistry(registry, policy))
  validateReceiptFileBinding(receipt, 'authority-policy.json', policyDocument.bytes, 'projected authority policy', problems)
  validateReceiptFileBinding(receipt, 'authority-registry.json', registryDocument.bytes, 'projected authority registry', problems)
  const bindings = (registry.candidates ?? [])
    .filter((candidate) => candidate.candidateState === 'issued')
    .map((candidate) => candidate.transitionHistory?.at(-1)?.identity)
  const binding = bindings[0]
  if (!binding || bindings.some((candidateBinding) => !isDeepStrictEqual(candidateBinding, binding))) {
    problems.push('issued candidates do not share one containing projection receipt binding')
  }
  const identity = resolveProjectionReceiptIdentity(receipt, receiptDocument.bytes, receiptDocument.path, binding, problems)
  const epochResolutions = new Map()
  if (identity) {
    const repository = policy.authorities?.[registry.authority]?.repository
    for (const candidate of registry.candidates ?? []) {
      if (!candidate.authorityEpochs) continue
      const resolution = resolveAuthorityEpoch(candidate, registry.authority, repository, identity, receipt, problems)
      if (resolution) epochResolutions.set(candidate.id, resolution)
    }
  }
  if (identity && (registry.heldAuthoritySources ?? []).some((hold) => sameAuthoritySource(hold.source, binding?.repository, identity))) problems.push('containing projection source is historical-not-adoptable')
  if (identity && (registry.heldAuthorityIdentities ?? []).some((hold) => sameExactIdentity(hold.identity, identity))) problems.push('containing projection identity is historical-not-adoptable')
  if (canonicalCompass && registry.authority !== 'compass') problems.push('canonical Compass registry authority must be compass')
  if (canonicalCompass && !isDeepStrictEqual(binding, COMPASS_RECEIPT_BINDING)) problems.push('canonical Compass receipt binding is invalid')
  if (expectedAuthority && registry.authority !== expectedAuthority) problems.push(`upstream registry authority must be ${expectedAuthority}`)
  if (expectedAuthority && policy.authorities?.[expectedAuthority]?.repository !== expectedRepository) problems.push(`upstream policy authority ${expectedAuthority} does not match its trusted repository`)
  if (expectedRepository && binding?.repository !== expectedRepository) problems.push('upstream issued receipt binding does not match its trusted repository')
  return { root, policy, registry, receipt, consumerSchema, hostedReceiptSchema, identity, binding, epochResolutions, problems }
}

function validateHostedReceipt(receipt, item, reconciliationPath, receiptSchema, label, problems) {
  const evidence = item.adoptionEvidence
  const run = evidence.hostedRun
  for (const problem of validateJsonSchema(receipt, receiptSchema)) problems.push(`${label} downloaded receipt schema: ${problem}`)
  if (!exactKeys(receipt, ['schema', 'schemaVersion', 'consumer', 'hostedRun', 'artifact', 'result'], `${label} downloaded receipt`, problems)) return
  if (receipt.schema !== 'compass.consumer-hosted-adoption-receipt' || receipt.schemaVersion !== 1 || receipt.result !== 'passed') problems.push(`${label} downloaded receipt identity is invalid`)
  if (!exactKeys(receipt.consumer, ['repository', 'commit', 'tree', 'reconciliationPath'], `${label} downloaded receipt consumer`, problems) || receipt.consumer?.repository !== evidence.repository || receipt.consumer?.commit !== evidence.commit || receipt.consumer?.tree !== evidence.tree || receipt.consumer?.reconciliationPath !== reconciliationPath) problems.push(`${label} downloaded receipt consumer identity is invalid`)
  const hostedKeys = ['provider', 'repository', 'workflow', 'requiredGate', 'conclusion', 'runId', 'attempt', 'headSha']
  if (!exactKeys(receipt.hostedRun, hostedKeys, `${label} downloaded receipt hostedRun`, problems) || hostedKeys.some((key) => receipt.hostedRun?.[key] !== run[key])) problems.push(`${label} downloaded receipt hosted run does not match the reconciliation record`)
  if (!exactKeys(receipt.artifact, ['name', 'path'], `${label} downloaded receipt artifact`, problems) || receipt.artifact?.name !== run.evidence.name || receipt.artifact?.path !== run.evidence.path) problems.push(`${label} downloaded receipt artifact does not match the reconciliation record`)
}

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function extractReceiptFromZip(archive, receiptPath) {
  if (!Buffer.isBuffer(archive) || archive.length < 22 || archive.length > MAX_PROVIDER_ARCHIVE_BYTES) throw new Error('provider artifact archive exceeds its bounded ZIP contract')
  let eocd = -1
  for (let offset = archive.length - 22; offset >= Math.max(0, archive.length - 65_557); offset -= 1) {
    if (archive.readUInt32LE(offset) === 0x06054b50) { eocd = offset; break }
  }
  if (eocd < 0 || archive.readUInt16LE(eocd + 4) !== 0 || archive.readUInt16LE(eocd + 6) !== 0) throw new Error('provider artifact is not a single-disk ZIP archive')
  if (eocd + 22 + archive.readUInt16LE(eocd + 20) !== archive.length) throw new Error('provider artifact ZIP end record or comment is invalid')
  const entries = archive.readUInt16LE(eocd + 10)
  if (archive.readUInt16LE(eocd + 8) !== entries || entries < 1 || entries > 1024) throw new Error('provider artifact ZIP inventory is invalid')
  const centralSize = archive.readUInt32LE(eocd + 12)
  const centralOffset = archive.readUInt32LE(eocd + 16)
  if (centralOffset + centralSize !== eocd) throw new Error('provider artifact ZIP directory is out of bounds')
  let offset = centralOffset
  let totalUncompressed = 0
  let receipt = null
  const names = new Set()
  const localRanges = []
  for (let index = 0; index < entries; index += 1) {
    if (offset + 46 > archive.length || archive.readUInt32LE(offset) !== 0x02014b50) throw new Error('provider artifact ZIP entry is malformed')
    const flags = archive.readUInt16LE(offset + 8)
    const method = archive.readUInt16LE(offset + 10)
    const expectedCrc = archive.readUInt32LE(offset + 16)
    const compressedBytes = archive.readUInt32LE(offset + 20)
    const uncompressedBytes = archive.readUInt32LE(offset + 24)
    const nameBytes = archive.readUInt16LE(offset + 28)
    const extraBytes = archive.readUInt16LE(offset + 30)
    const commentBytes = archive.readUInt16LE(offset + 32)
    const externalAttributes = archive.readUInt32LE(offset + 38)
    const localOffset = archive.readUInt32LE(offset + 42)
    const end = offset + 46 + nameBytes + extraBytes + commentBytes
    if (end > archive.length || flags & 1 || ![0, 8].includes(method)) throw new Error('provider artifact ZIP entry uses an unsupported or encrypted representation')
    const name = archive.subarray(offset + 46, offset + 46 + nameBytes).toString('utf8')
    if (!safeRelativePath(name) || names.has(name) || ((externalAttributes >>> 16) & 0o170000) === 0o120000) throw new Error('provider artifact ZIP contains traversal, duplicate, or symlink entries')
    names.add(name)
    totalUncompressed += uncompressedBytes
    if (totalUncompressed > MAX_PROVIDER_ARCHIVE_BYTES) throw new Error('provider artifact ZIP expands beyond its bounded contract')
    if (localOffset + 30 > archive.length || archive.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('provider artifact ZIP local entry is malformed')
    const localFlags = archive.readUInt16LE(localOffset + 6)
    const localMethod = archive.readUInt16LE(localOffset + 8)
    const localCrc = archive.readUInt32LE(localOffset + 14)
    const localCompressedBytes = archive.readUInt32LE(localOffset + 18)
    const localUncompressedBytes = archive.readUInt32LE(localOffset + 22)
    const localNameBytes = archive.readUInt16LE(localOffset + 26)
    const localExtraBytes = archive.readUInt16LE(localOffset + 28)
    const dataOffset = localOffset + 30 + localNameBytes + localExtraBytes
    if (dataOffset > centralOffset) throw new Error('provider artifact ZIP local entry is inconsistent or out of bounds')
    const localName = archive.subarray(localOffset + 30, localOffset + 30 + localNameBytes).toString('utf8')
    if (localFlags !== flags || localMethod !== method || localName !== name || dataOffset + compressedBytes > centralOffset) throw new Error('provider artifact ZIP local entry is inconsistent or out of bounds')
    let localEnd = dataOffset + compressedBytes
    if (flags & 0x8) {
      const descriptorSignature = archive.readUInt32LE(localEnd)
      const descriptorOffset = descriptorSignature === 0x08074b50 ? localEnd + 4 : localEnd
      if (descriptorOffset + 12 > centralOffset || archive.readUInt32LE(descriptorOffset) !== expectedCrc || archive.readUInt32LE(descriptorOffset + 4) !== compressedBytes || archive.readUInt32LE(descriptorOffset + 8) !== uncompressedBytes) throw new Error('provider artifact ZIP data descriptor differs from the central entry')
      localEnd = descriptorOffset + 12
    } else if (localCrc !== expectedCrc || localCompressedBytes !== compressedBytes || localUncompressedBytes !== uncompressedBytes) {
      throw new Error('provider artifact ZIP local sizes or CRC differ from the central entry')
    }
    if (localRanges.some(([start, end]) => localOffset < end && localEnd > start)) throw new Error('provider artifact ZIP reuses or overlaps local entries')
    localRanges.push([localOffset, localEnd])
    if (name === receiptPath) {
      if (receipt) throw new Error('provider artifact ZIP contains duplicate receipt entries')
      const compressed = archive.subarray(dataOffset, dataOffset + compressedBytes)
      receipt = method === 0 ? Buffer.from(compressed) : inflateRawSync(compressed, { maxOutputLength: MAX_RECORD_BYTES })
      if (receipt.length !== uncompressedBytes || receipt.length > MAX_RECORD_BYTES || crc32(receipt) !== expectedCrc) throw new Error('provider artifact receipt bytes fail ZIP integrity')
    }
    offset = end
  }
  if (offset !== centralOffset + centralSize || !receipt) throw new Error('provider artifact does not contain the exact hosted receipt path')
  return receipt
}

async function readWithDeadline(promise, deadlineMs, label) {
  let timer
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} stream timed out`)), deadlineMs)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

async function readBoundedResponse(response, maximumBytes, label, deadlineMs) {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maximumBytes) throw new Error(`${label} exceeds its response bound`)
  const reader = response.body?.getReader()
  if (!reader) throw new Error(`${label} has no response body`)
  const chunks = []
  let total = 0
  const expiresAt = Date.now() + deadlineMs
  try {
    while (true) {
      const remainingMs = expiresAt - Date.now()
      if (remainingMs < 1) throw new Error(`${label} stream timed out`)
      const { done, value } = await readWithDeadline(reader.read(), remainingMs, label)
      if (done) break
      total += value.length
      if (total > maximumBytes) throw new Error(`${label} exceeds its response bound`)
      chunks.push(Buffer.from(value))
    }
    return Buffer.concat(chunks, total)
  } catch (error) {
    try { await reader.cancel() } catch {}
    throw error
  }
}

function validatePaginationHeader(header, requestedUrl) {
  if (!header) return
  for (const part of header.split(',')) {
    const match = part.trim().match(/^<([^>]+)>;\s*rel="(?:next|prev|first|last)"$/u)
    if (!match) throw new Error('GitHub provider pagination header is malformed')
    let target
    try { target = new URL(match[1]) } catch { throw new Error('GitHub provider pagination URL is invalid') }
    const fixedQuery = (url) => [...url.searchParams.entries()].filter(([key]) => key !== 'page').sort(([leftKey, leftValue], [rightKey, rightValue]) => leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue))
    const queryChanged = !isDeepStrictEqual(fixedQuery(target), fixedQuery(requestedUrl))
    if (target.origin !== 'https://api.github.com' || target.username || target.password || target.hash || target.pathname !== requestedUrl.pathname || queryChanged || target.searchParams.get('per_page') !== '100' || !/^[1-9]\d*$/u.test(target.searchParams.get('page') ?? '')) throw new Error('GitHub provider pagination escaped the authenticated API boundary')
  }
}

function remainingProviderTime(deadlineAt) {
  const remainingMs = deadlineAt - Date.now()
  if (!Number.isSafeInteger(deadlineAt) || remainingMs < 1) throw new Error('authenticated GitHub provider validation timed out')
  return remainingMs
}

async function githubApi(token, pathname, { binaryRedirect = false, allowPagination = false, deadlineAt = Date.now() + PROVIDER_DEADLINE_MS } = {}) {
  const url = new URL(pathname, 'https://api.github.com')
  if (url.origin !== 'https://api.github.com') throw new Error('provider request escaped the GitHub API origin')
  let response
  try {
    const signal = AbortSignal.timeout(remainingProviderTime(deadlineAt))
    response = await fetch(url, {
      redirect: 'manual',
      signal,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2026-03-10',
        'user-agent': 'compass-authority-adoption-validator',
      },
    })
  } catch {
    throw new Error('authenticated GitHub provider request is unavailable or timed out')
  }
  if (!response.headers.get('x-github-request-id')) throw new Error('GitHub provider response lacks authenticated request provenance')
  if (binaryRedirect) {
    if (![301, 302, 303, 307, 308].includes(response.status)) throw new Error('GitHub artifact download did not return one authenticated redirect')
    const location = response.headers.get('location')
    let target
    try { target = new URL(location) } catch { throw new Error('GitHub artifact redirect is invalid') }
    if (target.protocol !== 'https:' || target.username || target.password || target.hash) throw new Error('GitHub artifact redirect is unsafe')
    let downloaded
    try { downloaded = await fetch(target, { redirect: 'manual', signal: AbortSignal.timeout(remainingProviderTime(deadlineAt)) }) } catch { throw new Error('GitHub artifact archive is unavailable or timed out') }
    if (downloaded.status !== 200 || downloaded.headers.has('location')) throw new Error('GitHub artifact archive used an unexpected redirect or status')
    return readBoundedResponse(downloaded, MAX_PROVIDER_ARCHIVE_BYTES, 'GitHub artifact archive', remainingProviderTime(deadlineAt))
  }
  if (response.status !== 200 || response.headers.has('location')) throw new Error('GitHub provider response has an unexpected status or redirect')
  if (response.headers.has('link') && !allowPagination) throw new Error('GitHub provider response has unexpected pagination')
  if (allowPagination) validatePaginationHeader(response.headers.get('link'), url)
  const bytes = await readBoundedResponse(response, MAX_PROVIDER_JSON_BYTES, 'GitHub provider JSON', remainingProviderTime(deadlineAt))
  try {
    assertNoDuplicateJsonKeys(bytes.toString('utf8'))
    const value = JSON.parse(bytes.toString('utf8'))
    return allowPagination ? { value, hasPagination: response.headers.has('link') } : value
  } catch { throw new Error('GitHub provider response is not valid JSON') }
}

function repositoryApiBase(repository) {
  if (!REPOSITORY.test(repository)) throw new Error('consumer repository identifier is invalid')
  const [owner, name] = repository.split('/')
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`
  if (new URL(base, 'https://api.github.com').pathname !== base) throw new Error('consumer repository API path is invalid')
  return base
}

function parseProviderDate(value, label) {
  const milliseconds = Date.parse(value)
  if (!Number.isFinite(milliseconds)) throw new Error(`${label} is invalid`)
  return milliseconds
}

function expectedPendingItem(currentItem) {
  const prior = structuredClone(currentItem)
  prior.consumerState = 'pending-adoption'
  delete prior.adoptionEvidence
  prior.transitionHistory.pop()
  return prior
}

function parseProviderReconciliation(contents, current, policy, schema, label) {
  if (contents?.type !== 'file' || contents.encoding !== 'base64' || contents.path !== current.consumer.reconciliationPath || !COMMIT.test(contents.sha ?? '') || typeof contents.content !== 'string') throw new Error(`${label} GitHub reconciliation file response is invalid`)
  let bytes
  const encoded = contents.content.replaceAll(/\s/gu, '')
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(encoded)) throw new Error(`${label} GitHub reconciliation file is not canonical base64`)
  bytes = Buffer.from(encoded, 'base64')
  if (bytes.length < 1 || bytes.length > MAX_RECORD_BYTES) throw new Error(`${label} GitHub reconciliation file exceeds its bound`)
  let prior
  try {
    assertNoDuplicateJsonKeys(bytes.toString('utf8'))
    prior = JSON.parse(bytes.toString('utf8'))
  } catch { throw new Error(`${label} GitHub reconciliation file is invalid JSON`) }
  const schemaProblems = validateJsonSchema(prior, schema)
  const executableProblems = validateConsumerReconciliation(prior, policy)
  if (schemaProblems.length > 0 || executableProblems.length > 0) throw new Error(`${label} provider-proven pending reconciliation is invalid`)
  for (const key of ['name', 'repository', 'reconciliationPath']) {
    if (prior.consumer[key] !== current.consumer[key]) throw new Error(`${label} provider-proven consumer identity or canonical path differs from the current reconciliation`)
  }
  return prior
}

function validateProviderPriorCandidate(prior, currentItem, label) {
  const priorMatches = prior.records.filter(({ candidateId }) => candidateId === currentItem.candidateId)
  if (priorMatches.length !== 1 || !isDeepStrictEqual(priorMatches[0], expectedPendingItem(currentItem))) {
    throw new Error(`${label} adopted candidate changes more than the final transition and hosted evidence`)
  }
}

async function listRunArtifacts(token, base, runId, name, deadlineAt) {
  const endpoint = `${base}/actions/runs/${runId}/artifacts`
  const query = `name=${encodeURIComponent(name)}&per_page=100&page=1`
  const first = await githubApi(token, `${endpoint}?${query}`, { allowPagination: true, deadlineAt })
  const total = first.value.total_count
  if (!Number.isSafeInteger(total) || total < 1 || total > 1000 || !Array.isArray(first.value.artifacts)) throw new Error('GitHub artifact list is incomplete')
  const artifacts = [...first.value.artifacts]
  for (let page = 2; page <= Math.ceil(total / 100); page += 1) {
    const response = await githubApi(token, `${endpoint}?name=${encodeURIComponent(name)}&per_page=100&page=${page}`, { allowPagination: true, deadlineAt })
    if (response.value.total_count !== total || !Array.isArray(response.value.artifacts)) throw new Error('GitHub artifact list changed across pagination')
    artifacts.push(...response.value.artifacts)
  }
  if (artifacts.length !== total || new Set(artifacts.map(({ id }) => id)).size !== artifacts.length) throw new Error('GitHub artifact list is incomplete or duplicated')
  return artifacts
}

async function authenticateProviderAdoption(evidence, consumer, policy, consumerSchema, token, deadlineAt, label) {
  const run = evidence.hostedRun
  const artifactBinding = run.evidence
  const base = repositoryApiBase(run.repository)
  const request = (pathname, options = {}) => githubApi(token, pathname, { ...options, deadlineAt })
  const runEvidence = await request(`${base}/actions/runs/${run.runId}/attempts/${run.attempt}`)
  if (runEvidence.id !== run.runId || runEvidence.run_attempt !== run.attempt || runEvidence.head_sha !== run.headSha || runEvidence.path !== run.workflow || runEvidence.status !== 'completed' || runEvidence.conclusion !== 'success' || runEvidence.repository?.full_name !== run.repository) throw new Error(`${label} GitHub run identity or conclusion is invalid`)
  const commitEvidence = await request(`${base}/git/commits/${evidence.commit}`)
  if (commitEvidence.sha !== evidence.commit || commitEvidence.tree?.sha !== evidence.tree) throw new Error(`${label} GitHub commit tree identity is invalid`)
  const reconciliationApiPath = consumer.consumer.reconciliationPath.split('/').map(encodeURIComponent).join('/')
  const priorContents = await request(`${base}/contents/${reconciliationApiPath}?ref=${evidence.commit}`)
  const prior = parseProviderReconciliation(priorContents, consumer, policy, consumerSchema, label)
  const jobsPath = `${base}/actions/runs/${run.runId}/attempts/${run.attempt}/jobs`
  const firstJobs = await request(`${jobsPath}?per_page=100&page=1`, { allowPagination: true })
  const totalJobs = firstJobs.value.total_count
  if (!Number.isSafeInteger(totalJobs) || totalJobs < 1 || totalJobs > 1000 || !Array.isArray(firstJobs.value.jobs)) throw new Error(`${label} GitHub jobs response is incomplete`)
  const jobs = [...firstJobs.value.jobs]
  const pages = Math.ceil(totalJobs / 100)
  for (let page = 2; page <= pages; page += 1) {
    const response = await request(`${jobsPath}?per_page=100&page=${page}`, { allowPagination: true })
    if (response.value.total_count !== totalJobs || !Array.isArray(response.value.jobs)) throw new Error(`${label} GitHub jobs response changed across pagination`)
    jobs.push(...response.value.jobs)
  }
  if (jobs.length !== totalJobs || new Set(jobs.map(({ id }) => id)).size !== jobs.length) throw new Error(`${label} GitHub jobs response is incomplete or duplicated`)
  const matchingJobs = jobs.filter((job) => job?.id === run.requiredJobId)
  const job = matchingJobs[0]
  if (matchingJobs.length !== 1 || job.name !== run.requiredGate || job.run_id !== run.runId || job.run_attempt !== run.attempt || job.head_sha !== run.headSha || job.status !== 'completed' || job.conclusion !== 'success') throw new Error(`${label} GitHub required job is invalid`)
  const checkEvidence = await request(`${base}/check-runs/${run.requiredCheckId}`)
  if (checkEvidence.id !== run.requiredCheckId || checkEvidence.name !== run.requiredGate || checkEvidence.head_sha !== run.headSha || checkEvidence.status !== 'completed' || checkEvidence.conclusion !== 'success' || checkEvidence.app?.id !== GITHUB_ACTIONS_APP_ID || checkEvidence.app?.slug !== GITHUB_ACTIONS_APP_SLUG || checkEvidence.app?.owner?.login?.toLowerCase() !== GITHUB_ACTIONS_APP_OWNER || job.check_run_url !== checkEvidence.url) throw new Error(`${label} GitHub required check or app is invalid`)
  const artifactEvidence = await request(`${base}/actions/artifacts/${artifactBinding.artifactId}`)
  const namedArtifacts = await listRunArtifacts(token, base, run.runId, artifactBinding.name, deadlineAt)
  if (namedArtifacts.length !== 1 || namedArtifacts[0].id !== artifactBinding.artifactId) throw new Error(`${label} GitHub run does not have exactly one required artifact`)
  const listedArtifact = namedArtifacts[0]
  const sameArtifactFields = ['id', 'name', 'size_in_bytes', 'created_at', 'digest', 'expired'].every((key) => listedArtifact[key] === artifactEvidence[key]) && isDeepStrictEqual(listedArtifact.workflow_run, artifactEvidence.workflow_run)
  if (artifactEvidence.id !== artifactBinding.artifactId || artifactEvidence.name !== artifactBinding.name || artifactEvidence.expired !== false || artifactEvidence.workflow_run?.id !== run.runId || artifactEvidence.workflow_run?.head_sha !== run.headSha || artifactEvidence.digest !== `sha256:${artifactBinding.artifactSha256}` || !sameArtifactFields) throw new Error(`${label} GitHub artifact identity is invalid`)
  const jobStarted = parseProviderDate(job.started_at, `${label} required job start`)
  const jobCompleted = parseProviderDate(job.completed_at, `${label} required job completion`)
  const artifactCreated = parseProviderDate(artifactEvidence.created_at, `${label} artifact creation`)
  if (jobStarted > artifactCreated || artifactCreated > jobCompleted) throw new Error(`${label} GitHub artifact was not created during the required job attempt`)
  const archive = await request(`${base}/actions/artifacts/${artifactBinding.artifactId}/zip`, { binaryRedirect: true })
  if (artifactEvidence.size_in_bytes !== archive.length || sha256(archive) !== artifactBinding.artifactSha256) throw new Error(`${label} downloaded GitHub artifact size or digest is invalid`)
  const receiptBytes = extractReceiptFromZip(archive, artifactBinding.path)
  if (sha256(receiptBytes) !== artifactBinding.receiptSha256) throw new Error(`${label} downloaded hosted receipt digest is invalid`)
  let receipt
  try {
    assertNoDuplicateJsonKeys(receiptBytes.toString('utf8'))
    receipt = JSON.parse(receiptBytes.toString('utf8'))
  } catch {
    throw new Error(`${label} downloaded hosted receipt is invalid JSON`)
  }
  return { prior, receipt }
}

async function validateProviderAdoption(item, consumer, policy, consumerSchema, hostedReceiptSchema, token, deadlineAt, authenticatedEvidence) {
  const label = `consumer record ${String(item.candidateId)} adoption evidence`
  const cacheKey = canonicalJson({
    consumer: {
      name: consumer.consumer.name,
      repository: consumer.consumer.repository,
      reconciliationPath: consumer.consumer.reconciliationPath,
    },
    evidence: item.adoptionEvidence,
  })
  let authentication = authenticatedEvidence.get(cacheKey)
  if (!authentication) {
    authentication = authenticateProviderAdoption(item.adoptionEvidence, consumer, policy, consumerSchema, token, deadlineAt, label)
    authenticatedEvidence.set(cacheKey, authentication)
  }
  const { prior, receipt } = await authentication
  validateProviderPriorCandidate(prior, item, label)
  const problems = []
  validateHostedReceipt(receipt, item, consumer.consumer.reconciliationPath, hostedReceiptSchema, label, problems)
  if (problems.length > 0) throw new Error(problems[0])
}

export async function validateAuthorityBundle({
  projectionRoot,
  consumerRoot,
  reconciliationPath,
  upstreamProjectionRoots = [],
  providerToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN,
  providerDeadlineMs = PROVIDER_DEADLINE_MS,
}) {
  let canonicalUpstreamRoots
  try {
    canonicalUpstreamRoots = canonicalizeUpstreamProjectionRoots(upstreamProjectionRoots)
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)]
  }
  const authority = loadAuthorityProjection(projectionRoot, { canonicalCompass: true })
  const problems = [...authority.problems]
  if (!authority.policy || !authority.registry || !authority.identity) return problems
  let consumer
  try {
    const root = resolveGovernedRoot(consumerRoot, 'consumer root')
    consumer = parseJsonDocument(governedFile(root, reconciliationPath, 'consumer reconciliation')).value
  } catch (error) {
    return [...problems, error instanceof Error ? error.message : String(error)]
  }
  if (consumer.consumer?.reconciliationPath !== reconciliationPath) problems.push('consumer reconciliation path does not match its canonical record path')
  problems.push(...validateJsonSchema(consumer, authority.consumerSchema).map((problem) => `consumer reconciliation schema: ${problem}`))
  problems.push(...validateConsumerReconciliation(consumer, authority.policy))
  const candidates = new Map((authority.registry.candidates ?? []).map((candidate) => [candidate.id, candidate]))
  const upstream = canonicalUpstreamRoots.map((root) => {
    const discovered = loadAuthorityProjection(root)
    const authorityName = discovered.registry?.authority
    const expectedRepository = authority.policy.authorities?.[authorityName]?.repository
    if (!authorityName || !expectedRepository) return { ...discovered, problems: [...discovered.problems, 'upstream authority is not declared by canonical Compass policy'] }
    return loadAuthorityProjection(root, { expectedAuthority: authorityName, expectedRepository })
  })
  for (const bundle of upstream) problems.push(...bundle.problems.map((problem) => `upstream ${bundle.registry?.authority ?? bundle.root}: ${problem}`))
  for (const item of consumer.records ?? []) {
    const label = `consumer record ${String(item?.candidateId)}`
    const candidate = candidates.get(item.candidateId)
    if (!candidate) {
      problems.push(`${label} does not exist in the containing authority registry`)
      continue
    }
    if (candidate.candidateState !== 'issued') problems.push(`${label} candidate is not issued`)
    if (!isDeepStrictEqual(candidate.transitionHistory?.at(-1)?.identity, authority.binding)) problems.push(`${label} candidate is not bound to the containing projection receipt`)
    if (item.relationship === 'direct') {
      const resolution = authority.epochResolutions?.get(item.candidateId)
      if (candidate.authorityEpochs) {
        if (!resolution) problems.push(`${label} pending authority epoch is unresolved by the containing projection receipt`)
        else if (!exactKeys(item.authorityEpoch, ['sequence', 'identity'], `${label} authorityEpoch`, problems) || item.authorityEpoch?.sequence !== resolution.sequence || !sameExactIdentity(item.authorityEpoch?.identity, exactIdentityFromIssuedEpoch(resolution.authorityIdentity))) problems.push(`${label} authorityEpoch does not bind the resolved issued sequence and artifact identity`)
      } else if (Object.hasOwn(item, 'authorityEpoch')) problems.push(`${label} has an authorityEpoch for a candidate without epoch history`)
      if ((authority.registry.heldAuthoritySources ?? []).some((hold) => sameAuthoritySource(hold.source, candidate.authorityIdentity?.repository, item.authorityIdentity))) problems.push(`${label} references a historical-not-adoptable authority source`)
      if ((authority.registry.heldAuthorityIdentities ?? []).some((hold) => sameExactIdentity(item.authorityIdentity, hold.identity))) problems.push(`${label} references a historical-not-adoptable authority identity`)
      if (!sameExactIdentity(item.authorityIdentity, authority.identity)) problems.push(`${label} direct authority identity does not equal the containing projection receipt`)
    }
    if (item.relationship === 'via-authority') {
      const matching = upstream.filter((bundle) => bundle.registry?.authority === item.viaAuthority?.name)
      if (matching.length !== 1) problems.push(`${label} requires exactly one matching upstream authority bundle`)
      else {
        const upstreamCandidate = (matching[0].registry.candidates ?? []).find(({ id }) => id === item.candidateId)
        if (!upstreamCandidate || upstreamCandidate.candidateState !== 'issued' || !isDeepStrictEqual(upstreamCandidate.transitionHistory?.at(-1)?.identity, matching[0].binding)) problems.push(`${label} candidate is not issued by the upstream authority bundle`)
        if (!sameExactIdentity(item.viaAuthority.identity, matching[0].identity)) problems.push(`${label} via-authority identity does not equal the upstream projection receipt`)
        const upstreamResolution = matching[0].epochResolutions?.get(item.candidateId)
        if (upstreamCandidate?.authorityEpochs && (!upstreamResolution || !exactKeys(item.authorityEpoch, ['sequence', 'identity'], `${label} authorityEpoch`, problems) || item.authorityEpoch?.sequence !== upstreamResolution.sequence || !sameExactIdentity(item.authorityEpoch?.identity, exactIdentityFromIssuedEpoch(upstreamResolution.authorityIdentity)))) problems.push(`${label} authorityEpoch does not bind the upstream resolved issued sequence and artifact identity`)
        if (!upstreamCandidate?.authorityEpochs && Object.hasOwn(item, 'authorityEpoch')) problems.push(`${label} has an authorityEpoch for a candidate without upstream epoch history`)
      }
    }
    if (!authority.policy.relationships?.includes(item.relationship)) problems.push(`${label} relationship is not declared by policy`)
  }
  if (problems.length > 0) return problems
  const adopted = (consumer.records ?? []).filter((item) => item.consumerState === 'adopted')
  if (adopted.length > 0 && !nonEmpty(providerToken)) return ['provider provenance: an actions-read GitHub token is required']
  const deadlineMs = Number.isSafeInteger(providerDeadlineMs) && providerDeadlineMs > 0 ? Math.min(providerDeadlineMs, PROVIDER_DEADLINE_MS) : PROVIDER_DEADLINE_MS
  const deadlineAt = Date.now() + deadlineMs
  const authenticatedEvidence = new Map()
  for (const item of adopted) {
    try { await validateProviderAdoption(item, consumer, authority.policy, authority.consumerSchema, authority.hostedReceiptSchema, providerToken, deadlineAt, authenticatedEvidence) } catch (error) {
      problems.push(`provider provenance: ${error instanceof Error ? error.message : String(error)}`)
      break
    }
  }
  return problems
}

export function canonicalizeUpstreamProjectionRoots(roots, resolver = (root) => resolveGovernedRoot(root, 'upstream projection root')) {
  if (!Array.isArray(roots)) throw new Error('upstream projection roots must be an array')
  if (roots.length > MAX_UPSTREAM_PROJECTION_ROOTS) {
    throw new Error(`at most ${MAX_UPSTREAM_PROJECTION_ROOTS} upstream projection roots are supported`)
  }
  const seen = new Set()
  const canonical = []
  for (const root of roots) {
    if (!nonEmpty(root)) throw new Error('upstream projection roots must be non-empty strings')
    const resolved = resolver(root)
    if (seen.has(resolved)) throw new Error(`duplicate canonical upstream projection root: ${resolved}`)
    seen.add(resolved)
    canonical.push(resolved)
  }
  return canonical
}

export function renderReviewTemplate(policy) {
  return `${policy.reviewField}:\n- none\n\nCandidate fields (one or more; never combine with none):\n${policy.reviewTemplateFields.map((field) => `- ${field}: <value>`).join('\n')}\n`
}

export function assertNoDuplicateJsonKeys(text) {
  let index = 0
  const whitespace = /\s/u
  const skip = () => { while (whitespace.test(text[index] ?? '')) index += 1 }
  const string = () => {
    const start = index
    if (text[index] !== '"') throw new Error('expected JSON string')
    index += 1
    while (index < text.length) {
      if (text[index] === '\\') { index += 2; continue }
      if (text[index] === '"') { index += 1; return JSON.parse(text.slice(start, index)) }
      index += 1
    }
    throw new Error('unterminated JSON string')
  }
  const value = () => {
    skip()
    if (text[index] === '{') {
      index += 1
      const keys = new Set()
      skip()
      if (text[index] === '}') { index += 1; return }
      while (true) {
        skip()
        const key = string()
        if (keys.has(key)) throw new Error(`duplicate JSON key: ${key}`)
        keys.add(key)
        skip()
        if (text[index] !== ':') throw new Error('expected JSON colon')
        index += 1
        value()
        skip()
        if (text[index] === '}') { index += 1; return }
        if (text[index] !== ',') throw new Error('expected JSON object separator')
        index += 1
      }
    }
    if (text[index] === '[') {
      index += 1
      skip()
      if (text[index] === ']') { index += 1; return }
      while (true) {
        value()
        skip()
        if (text[index] === ']') { index += 1; return }
        if (text[index] !== ',') throw new Error('expected JSON array separator')
        index += 1
      }
    }
    if (text[index] === '"') { string(); return }
    const scalar = text.slice(index).match(/^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/u)
    if (!scalar) throw new Error('invalid JSON value')
    index += scalar[0].length
  }
  value()
  skip()
  if (index !== text.length) throw new Error('unexpected trailing JSON content')
}

function parseJsonDocument(file) {
  const absolute = path.resolve(file)
  const stat = fs.lstatSync(absolute)
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`record must be a regular non-symlink file: ${absolute}`)
  if (stat.size > MAX_RECORD_BYTES) throw new Error(`record exceeds ${MAX_RECORD_BYTES} bytes: ${absolute}`)
  const bytes = fs.readFileSync(absolute)
  const text = bytes.toString('utf8')
  assertNoDuplicateJsonKeys(text)
  return { value: JSON.parse(text), bytes, path: absolute }
}

const CLI_VALUE_FIELDS = new Map([
  ['--projection-root', 'projectionRoot'],
  ['--consumer-root', 'consumerRoot'],
  ['--reconciliation-path', 'reconciliationPath'],
  ['--print-authority-epoch-resolution', 'printAuthorityEpochResolution'],
])

export function parseArguments(arguments_) {
  const options = { upstreamProjectionRoots: [] }
  const seenSingletons = new Set()
  for (let index = 0; index < arguments_.length; index += 1) {
    const key = arguments_[index]
    if (key === '--print-review-template') {
      if (seenSingletons.has(key)) throw new Error(`duplicate singleton argument: ${key}`)
      seenSingletons.add(key)
      options.printReviewTemplate = true
      continue
    }
    if (key !== '--upstream-projection-root' && !CLI_VALUE_FIELDS.has(key)) throw new Error(`unsupported argument: ${key}`)
    const value = arguments_[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`missing value for ${key}`)
    if (key === '--upstream-projection-root') {
      if (options.upstreamProjectionRoots.includes(value)) throw new Error(`duplicate upstream projection root: ${value}`)
      if (options.upstreamProjectionRoots.length >= MAX_UPSTREAM_PROJECTION_ROOTS) {
        throw new Error(`at most ${MAX_UPSTREAM_PROJECTION_ROOTS} upstream projection roots are supported`)
      }
      options.upstreamProjectionRoots.push(value)
    } else {
      if (seenSingletons.has(key)) throw new Error(`duplicate singleton argument: ${key}`)
      seenSingletons.add(key)
      options[CLI_VALUE_FIELDS.get(key)] = value
    }
    index += 1
  }
  if (!options.projectionRoot) throw new Error('missing --projection-root')
  const outputMode = options.printReviewTemplate || options.printAuthorityEpochResolution
  if (options.printReviewTemplate && options.printAuthorityEpochResolution) throw new Error('review-template and epoch-resolution output modes are mutually exclusive')
  if (outputMode && (options.consumerRoot || options.reconciliationPath || options.upstreamProjectionRoots.length > 0)) throw new Error('output mode cannot validate consumer records')
  if (!outputMode && !options.consumerRoot) throw new Error('missing --consumer-root')
  if (!outputMode && !options.reconciliationPath) throw new Error('missing --reconciliation-path')
  return options
}

function isMainModule() {
  try { return fs.realpathSync.native(path.resolve(process.argv[1])) === fs.realpathSync.native(modulePath) } catch { return false }
}

if (isMainModule()) {
  try {
    const options = parseArguments(process.argv.slice(2))
    if (options.printReviewTemplate) {
      const authority = loadAuthorityProjection(options.projectionRoot, { canonicalCompass: true })
      if (authority.problems.length > 0) throw new Error(authority.problems.join('; '))
      process.stdout.write(renderReviewTemplate(authority.policy))
    } else if (options.printAuthorityEpochResolution) {
      const authority = loadAuthorityProjection(options.projectionRoot, { canonicalCompass: true })
      if (authority.problems.length > 0) throw new Error(authority.problems.join('; '))
      const resolution = authority.epochResolutions.get(options.printAuthorityEpochResolution)
      if (!resolution) throw new Error(`candidate has no receipt-resolved pending epoch: ${options.printAuthorityEpochResolution}`)
      process.stdout.write(`${JSON.stringify(resolution, null, 2)}\n`)
    } else {
      const problems = await validateAuthorityBundle({
        projectionRoot: options.projectionRoot,
        consumerRoot: options.consumerRoot,
        reconciliationPath: options.reconciliationPath,
        upstreamProjectionRoots: options.upstreamProjectionRoots,
      })
      if (problems.length > 0) throw new Error(problems.join('; '))
      console.log(`Authority bundle valid: ${path.join(path.resolve(options.consumerRoot), options.reconciliationPath)}`)
    }
  } catch (error) {
    console.error(`check-authority-record: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
