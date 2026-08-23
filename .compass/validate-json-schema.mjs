import { isDeepStrictEqual } from 'node:util'

export const SUPPORTED_JSON_SCHEMA_DIALECT = 'https://json-schema.org/draft/2020-12/schema'
export const SUPPORTED_JSON_SCHEMA_KEYWORDS = Object.freeze([
  '$schema', '$id', '$defs', '$ref', '$comment',
  'title', 'description', 'default', 'examples', 'deprecated', 'readOnly', 'writeOnly',
  'type', 'const', 'enum', 'minimum', 'minLength', 'pattern', 'minItems', 'uniqueItems', 'items',
  'required', 'properties', 'additionalProperties', 'allOf', 'anyOf', 'oneOf', 'not',
  'if', 'then', 'else', 'x-compass-pathContainment', 'x-compass-normalizedFileUri', 'x-compass-equalFields',
])

const supportedKeywords = new Set(SUPPORTED_JSON_SCHEMA_KEYWORDS)

function resolveReference(root, reference) {
  if (!reference.startsWith('#/')) throw new Error(`unsupported JSON Schema reference: ${reference}`)
  return reference.slice(2).split('/').reduce((value, segment) => value?.[segment.replaceAll('~1', '/').replaceAll('~0', '~')], root)
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function matchesType(value, type) {
  if (type === 'object') return isObject(value)
  if (type === 'array') return Array.isArray(value)
  if (type === 'string') return typeof value === 'string'
  if (type === 'integer') return Number.isSafeInteger(value)
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value)
  if (type === 'boolean') return typeof value === 'boolean'
  if (type === 'null') return value === null
  return false
}

function pointerSegment(value) {
  return String(value).replaceAll('~', '~0').replaceAll('/', '~1')
}

function validateSchemaDocument(schema) {
  const problems = []
  const visitSchema = (current, location, root = false) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      problems.push(`${location} uses an unsupported boolean or non-object schema`)
      return
    }
    for (const keyword of Object.keys(current)) {
      if (!supportedKeywords.has(keyword)) problems.push(`${location} uses unsupported schema keyword ${keyword}`)
      if (!root && ['$schema', '$id'].includes(keyword)) problems.push(`${location} uses root-only schema keyword ${keyword}`)
    }
    for (const container of ['$defs', 'properties']) {
      const entries = current[container]
      if (entries === undefined) continue
      if (!entries || typeof entries !== 'object' || Array.isArray(entries)) {
        problems.push(`${location}/${pointerSegment(container)} is not a schema map`)
        continue
      }
      for (const [name, child] of Object.entries(entries)) {
        visitSchema(child, `${location}/${pointerSegment(container)}/${pointerSegment(name)}`)
      }
    }
    for (const keyword of ['items', 'not', 'if', 'then', 'else']) {
      if (current[keyword] === undefined) continue
      visitSchema(current[keyword], `${location}/${pointerSegment(keyword)}`)
    }
    if (current.additionalProperties !== undefined && typeof current.additionalProperties !== 'boolean') {
      problems.push(`${location}/additionalProperties must be boolean in the supported schema subset`)
    }
    if (current['x-compass-pathContainment'] !== undefined) {
      const rule = current['x-compass-pathContainment']
      if (!isObject(rule) || Object.keys(rule).sort().join(',') !== 'paths,scopes' || typeof rule.paths !== 'string' || typeof rule.scopes !== 'string') problems.push(`${location}/x-compass-pathContainment is invalid`)
    }
    if (current['x-compass-normalizedFileUri'] !== undefined && current['x-compass-normalizedFileUri'] !== true) problems.push(`${location}/x-compass-normalizedFileUri must be true`)
    if (current['x-compass-equalFields'] !== undefined && (!Array.isArray(current['x-compass-equalFields']) || current['x-compass-equalFields'].some((pair) => !Array.isArray(pair) || pair.length !== 2 || pair.some((field) => typeof field !== 'string' || !/^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*$/u.test(field))))) problems.push(`${location}/x-compass-equalFields is invalid`)
    for (const keyword of ['allOf', 'anyOf', 'oneOf']) {
      if (current[keyword] === undefined) continue
      if (!Array.isArray(current[keyword])) {
        problems.push(`${location}/${pointerSegment(keyword)} is not a schema array`)
        continue
      }
      current[keyword].forEach((child, index) => visitSchema(child, `${location}/${pointerSegment(keyword)}/${index}`))
    }
  }
  if (schema?.$schema !== SUPPORTED_JSON_SCHEMA_DIALECT) {
    problems.push(`#/$schema must declare ${SUPPORTED_JSON_SCHEMA_DIALECT}`)
  }
  visitSchema(schema, '#', true)
  return problems
}

export function validateJsonSchema(instance, schema) {
  const problems = validateSchemaDocument(schema)
  if (problems.length > 0) return problems
  const visit = (value, current, location) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      problems.push(`${location} has an invalid schema`)
      return
    }
    if (current.$ref) {
      const resolved = resolveReference(schema, current.$ref)
      if (resolved === undefined) problems.push(`${location} references a missing schema`)
      else visit(value, resolved, location)
    }
    if (Object.hasOwn(current, 'const') && !isDeepStrictEqual(value, current.const)) problems.push(`${location} does not equal its const`)
    if (Array.isArray(current.enum) && !current.enum.some((candidate) => isDeepStrictEqual(value, candidate))) problems.push(`${location} is outside its enum`)
    if (current.type && !matchesType(value, current.type)) {
      problems.push(`${location} is not type ${current.type}`)
      return
    }
    if (typeof value === 'string') {
      if (Number.isSafeInteger(current.minLength) && value.length < current.minLength) problems.push(`${location} is shorter than minLength`)
      if (current.pattern && !new RegExp(current.pattern, 'u').test(value)) problems.push(`${location} does not match its pattern`)
      if (current['x-compass-normalizedFileUri'] === true) {
        try {
          const parsed = new URL(value)
          if (parsed.protocol !== 'file:' || parsed.username || parsed.password || parsed.host || parsed.search || parsed.hash || parsed.href !== value || !parsed.pathname.startsWith('/')) problems.push(`${location} is not a normalized local file URI`)
        } catch {
          problems.push(`${location} is not a normalized local file URI`)
        }
      }
    }
    if (typeof value === 'number' && Number.isFinite(current.minimum) && value < current.minimum) problems.push(`${location} is below minimum`)
    if (Array.isArray(value)) {
      if (Number.isSafeInteger(current.minItems) && value.length < current.minItems) problems.push(`${location} has too few items`)
      if (current.uniqueItems === true && value.some((item, index) => value.slice(0, index).some((earlier) => isDeepStrictEqual(earlier, item)))) problems.push(`${location} has duplicate items`)
      if (current.items) value.forEach((item, index) => visit(item, current.items, `${location}/${index}`))
    }
    if (isObject(value)) {
      for (const required of current.required ?? []) if (!Object.hasOwn(value, required)) problems.push(`${location} is missing ${required}`)
      if (current.additionalProperties === false) {
        for (const key of Object.keys(value)) if (!Object.hasOwn(current.properties ?? {}, key)) problems.push(`${location} has unknown ${key}`)
      }
      for (const [key, child] of Object.entries(current.properties ?? {})) if (Object.hasOwn(value, key)) visit(value[key], child, `${location}/${key}`)
      const containment = current['x-compass-pathContainment']
      if (containment && Array.isArray(value[containment.paths]) && Array.isArray(value[containment.scopes])) {
        for (const candidate of value[containment.paths]) {
          if (!value[containment.scopes].some((scope) => candidate === scope || candidate.startsWith(`${scope}/`))) problems.push(`${location}/${containment.paths} contains a path outside ${containment.scopes}`)
        }
      }
      for (const [leftPath, rightPath] of current['x-compass-equalFields'] ?? []) {
        const read = (fieldPath) => fieldPath.split('.').reduce((candidate, field) => candidate?.[field], value)
        const left = read(leftPath)
        const right = read(rightPath)
        if (left !== undefined && right !== undefined && !isDeepStrictEqual(left, right)) problems.push(`${location}/${leftPath.replaceAll('.', '/')} does not equal ${rightPath}`)
      }
    }
    for (const child of current.allOf ?? []) visit(value, child, location)
    if (Array.isArray(current.anyOf)) {
      const accepted = current.anyOf.some((child) => validateSubschema(value, child))
      if (!accepted) problems.push(`${location} does not match anyOf`)
    }
    if (Array.isArray(current.oneOf)) {
      const count = current.oneOf.filter((child) => validateSubschema(value, child)).length
      if (count !== 1) problems.push(`${location} does not match exactly one oneOf branch`)
    }
    if (current.not && validateSubschema(value, current.not)) problems.push(`${location} matches forbidden schema`)
    if (current.if) visit(value, validateSubschema(value, current.if) ? current.then ?? {} : current.else ?? {}, location)
  }
  const validateSubschema = (value, subschema) => {
    const start = problems.length
    visit(value, subschema, '$probe')
    const accepted = problems.length === start
    problems.splice(start)
    return accepted
  }
  visit(instance, schema, '$')
  return problems
}
