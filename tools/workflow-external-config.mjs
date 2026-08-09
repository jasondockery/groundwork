const EXPRESSION_PATTERN = /\$\{\{([\s\S]*?)\}\}/g
const INPUT_ACCESS_PATTERN = /\binputs\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)/g

export function analyzeWorkflowExternalConfig(source) {
  const violations = []
  const lines = structuralLines(source, violations)
  collectForbiddenYamlReferences(lines, violations)
  collectForbiddenSecretInheritance(lines, violations)
  const jobs = collectJobs(lines, violations)
  const workflowCallInputs = collectWorkflowCallKeys(lines, 'inputs')
  const workflowCallSecrets = collectWorkflowCallKeys(lines, 'secrets')
  const usages = []
  const inputUsages = new Set()
  const cleaned = lines.map((line) => line.text).join('\n')

  for (const expression of cleaned.matchAll(EXPRESSION_PATTERN)) {
    const expressionOffset = expression.index ?? 0
    const expressionLine = lineAt(cleaned, expressionOffset)
    const job = jobs.find(({ start, end }) => expressionLine >= start && expressionLine < end)
    const body = expression[1] ?? ''
    for (const input of body.matchAll(INPUT_ACCESS_PATTERN)) {
      if (input[1]) inputUsages.add(input[1])
    }
    collectContextAccesses(
      body,
      expressionLine,
      job?.environment,
      workflowCallSecrets,
      usages,
      violations
    )
  }

  for (const condition of collectNakedIfExpressions(lines, jobs, violations)) {
    if (condition.expression.includes('${{')) continue
    collectContextAccesses(
      condition.expression,
      condition.line,
      condition.environment,
      workflowCallSecrets,
      usages,
      violations
    )
  }

  return {
    inputUsages: [...inputUsages],
    usages,
    violations,
    workflowCallInputs: [...workflowCallInputs],
    workflowCallSecrets: [...workflowCallSecrets],
  }
}

function structuralLines(source, violations) {
  if (source.includes('\0')) violations.push('workflow contains a NUL byte.')
  const result = []
  let block

  for (const [index, raw] of source.split('\n').entries()) {
    const indent = /^ */.exec(raw)?.[0].length ?? 0
    const blank = raw.trim().length === 0
    let blockPayload = false
    let blockOwnerLine

    if (block) {
      if (blank) {
        blockPayload = true
      } else {
        const contentIndent = block.contentIndent ?? block.explicitContentIndent
        if (contentIndent !== undefined) {
          blockPayload = indent >= contentIndent
        } else if (indent > block.entryIndent) {
          block.contentIndent = indent
          blockPayload = true
        }
        if (!blockPayload) block = undefined
      }
      if (blockPayload) blockOwnerLine = block.ownerLine
    }

    if (!blockPayload && /^ *\t/.test(raw)) {
      violations.push(`line ${index + 1}: tabs cannot indent workflow YAML.`)
    }

    let text = raw
    if (!blockPayload) {
      const stripped = stripYamlComment(raw)
      text = stripped.text
      if (stripped.error) violations.push(`line ${index + 1}: ${stripped.error}`)
      const blockHeader = /:[ \t]*([|>][^ \t]*)[ \t]*$/.exec(text)?.[1]
      if (blockHeader) {
        if (!isSupportedBlockScalarHeader(blockHeader)) {
          violations.push(`line ${index + 1}: unsupported YAML block scalar header ${blockHeader}.`)
        }
        const body = text.slice(indent)
        const entryIndent = indent + (body.startsWith('- ') ? 2 : 0)
        const indicator = /[1-9]/.exec(blockHeader)?.[0]
        block = {
          entryIndent,
          explicitContentIndent: indicator ? entryIndent + Number(indicator) : undefined,
          ownerLine: index,
        }
      }
    }
    result.push({ blockOwnerLine, blockPayload, indent, line: index, text })
  }
  return result
}

function collectJobs(lines, violations) {
  const jobsLines = lines.filter(
    ({ blockPayload, indent, text }) => !blockPayload && indent === 0 && /^jobs:\s*$/.test(text)
  )
  if (jobsLines.length !== 1) {
    violations.push(`workflow must contain exactly one top-level jobs mapping; found ${jobsLines.length}.`)
    return []
  }

  const jobsStart = jobsLines[0].line
  const jobsEnd =
    lines.find(
      ({ blockPayload, line, indent, text }) =>
        !blockPayload && line > jobsStart && indent === 0 && text.trim()
    )?.line ?? lines.length
  const headers = []
  for (const record of lines.slice(jobsStart + 1, jobsEnd)) {
    if (record.blockPayload) continue
    if (!record.text.trim()) continue
    if (record.indent < 2) continue
    if (record.indent === 2) {
      const mapping = mappingEntry(record.text, 2)
      if (!mapping || mapping.value) {
        violations.push(`line ${record.line + 1}: unsupported or malformed job mapping.`)
        continue
      }
      headers.push({ name: mapping.key, start: record.line })
    }
  }
  if (headers.length === 0) violations.push('workflow jobs mapping contains no supported jobs.')

  return headers.map((header, index) => {
    const end = headers[index + 1]?.start ?? jobsEnd
    return {
      ...header,
      end,
      environment: collectEnvironment(lines.slice(header.start + 1, end), violations),
    }
  })
}

function collectEnvironment(lines, violations) {
  const declarations = lines.filter((record) => {
    if (record.blockPayload) return false
    if (record.indent !== 4) return false
    return mappingEntry(record.text, 4)?.key === 'environment'
  })
  if (declarations.length > 1) {
    violations.push(`line ${declarations[1].line + 1}: job declares environment more than once.`)
    return undefined
  }
  const declaration = declarations[0]
  if (!declaration) return undefined
  const mapping = mappingEntry(declaration.text, 4)
  if (mapping?.value) return scalar(mapping.value, declaration.line, violations)

  const mappingEnd =
    lines.find(
      (record) =>
        !record.blockPayload &&
        record.line > declaration.line && record.text.trim() && record.indent <= declaration.indent
    )?.line ?? Number.POSITIVE_INFINITY
  const name = lines.find((record) => {
    if (
      record.blockPayload ||
      record.line <= declaration.line ||
      record.line >= mappingEnd ||
      record.indent !== declaration.indent + 2
    ) {
      return false
    }
    return mappingEntry(record.text, 6)?.key === 'name'
  })
  if (!name) {
    violations.push(`line ${declaration.line + 1}: environment mapping must contain a name.`)
    return undefined
  }
  return scalar(mappingEntry(name.text, 6)?.value ?? '', name.line, violations)
}

function collectNakedIfExpressions(lines, jobs, violations) {
  const conditions = []
  for (const record of lines) {
    if (record.blockPayload) continue
    const job = jobs.find(({ start, end }) => record.line >= start && record.line < end)
    if (!job) continue
    let body = record.text.slice(record.indent)
    if (body.startsWith('- ')) body = body.slice(2)
    const entry = mappingEntry(body, 0)
    if (entry?.key !== 'if') continue
    if (!entry.value) {
      violations.push(`line ${record.line + 1}: if must contain a non-empty expression.`)
      continue
    }
    if (/^[|>]/.test(entry.value)) {
      if (!isSupportedBlockScalarHeader(entry.value)) continue
      const block = lines
        .filter(
          (candidate) =>
            candidate.blockPayload &&
            candidate.blockOwnerLine === record.line &&
            candidate.line < job.end
        )
        .map((candidate) => candidate.text.trim())
        .join(' ')
      if (!block) {
        violations.push(`line ${record.line + 1}: if block must contain an expression.`)
        continue
      }
      conditions.push({ environment: job.environment, expression: block, line: record.line })
      continue
    }
    const expression = scalar(entry.value, record.line, violations)
    if (expression !== undefined) {
      conditions.push({ environment: job.environment, expression, line: record.line })
    }
  }
  return conditions
}

function collectForbiddenSecretInheritance(lines, violations) {
  for (const record of lines) {
    if (record.blockPayload) continue
    let body = record.text.slice(record.indent)
    if (body.startsWith('- ')) body = body.slice(2)
    const entry = mappingEntry(body, 0)
    if (entry?.key === 'secrets' && unquote(entry.value) === 'inherit') {
      violations.push(
        `line ${record.line + 1}: secrets: inherit is forbidden; declare every external secret explicitly.`
      )
    }
  }
}

function collectForbiddenYamlReferences(lines, violations) {
  for (const record of lines) {
    if (record.blockPayload) continue
    const reference = yamlReferenceToken(record.text)
    if (!reference) continue
    const kind = reference === '&' ? 'anchors' : 'aliases'
    violations.push(
      `line ${record.line + 1}: YAML ${kind} are forbidden in Groundwork workflows.`
    )
  }
}

function yamlReferenceToken(value) {
  let quote
  let escaped = false
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (quote === '"') {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = undefined
      continue
    }
    if (quote === "'") {
      if (character === "'" && value[index + 1] === "'") index += 1
      else if (character === quote) quote = undefined
      continue
    }
    if (
      (character === '"' || character === "'") &&
      (index === 0 || /[\s:[{,>-]/.test(value[index - 1]))
    ) {
      quote = character
      continue
    }
    if (
      (character === '&' || character === '*') &&
      /[^\s\[\]{},]/.test(value[index + 1] ?? '') &&
      yamlNodeStartsBefore(value, index)
    ) {
      return character
    }
  }
  return undefined
}

function yamlNodeStartsBefore(value, index) {
  const prefix = value.slice(0, index)
  return /^\s*(?:[-?]\s*)?$/.test(prefix) || /[:\[\]{},]\s*$/.test(prefix)
}

function isSupportedBlockScalarHeader(value) {
  return /^[|>](?:[1-9][+-]?|[+-][1-9]?)?$/.test(value)
}

function collectContextAccesses(
  expression,
  line,
  environment,
  workflowCallSecrets,
  usages,
  violations
) {
  let index = 0
  while (index < expression.length) {
    const character = expression[index]
    if (character === "'" || character === '"') {
      index = skipQuotedExpressionText(expression, index, character)
      continue
    }
    if (!/[A-Za-z_]/.test(character)) {
      index += 1
      continue
    }
    const identifier = /^[A-Za-z_][A-Za-z0-9_]*/.exec(expression.slice(index))?.[0]
    if (!identifier) {
      index += 1
      continue
    }
    const identifierEnd = index + identifier.length
    if (identifier !== 'secrets' && identifier !== 'vars') {
      index = identifierEnd
      continue
    }

    const access = parseStaticContextAccess(expression, identifierEnd)
    if (!access.name) {
      violations.push(`line ${line + 1}: ${access.error ?? `unsupported ${identifier} access`}.`)
      index = Math.max(identifierEnd, access.end)
      continue
    }
    usages.push({
      environment,
      reference: `${identifier}.${access.name}`,
      workflowCallInput: identifier === 'secrets' && workflowCallSecrets.has(access.name),
    })
    index = access.end
  }
}

function parseStaticContextAccess(expression, start) {
  let index = skipWhitespace(expression, start)
  if (expression[index] === '.') {
    index = skipWhitespace(expression, index + 1)
    const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(expression.slice(index))?.[0]
    return name
      ? { end: index + name.length, name }
      : { end: index + 1, error: 'static context dot access must name a setting' }
  }
  if (expression[index] === '[') {
    index = skipWhitespace(expression, index + 1)
    const quote = expression[index]
    if (quote !== "'" && quote !== '"') {
      return { end: index + 1, error: 'dynamic secrets/vars bracket access is forbidden' }
    }
    const endQuote = expression.indexOf(quote, index + 1)
    if (endQuote < 0) {
      return { end: expression.length, error: 'unterminated secrets/vars bracket access' }
    }
    const name = expression.slice(index + 1, endQuote)
    const closing = skipWhitespace(expression, endQuote + 1)
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || expression[closing] !== ']') {
      return { end: closing + 1, error: 'dynamic or malformed secrets/vars bracket access is forbidden' }
    }
    return { end: closing + 1, name }
  }
  return { end: index + 1, error: 'bare or indirect secrets/vars context access is forbidden' }
}

function skipWhitespace(value, start) {
  let index = start
  while (/\s/.test(value[index] ?? '')) index += 1
  return index
}

function skipQuotedExpressionText(value, start, quote) {
  let index = start + 1
  while (index < value.length) {
    if (value[index] === quote) {
      if (quote === "'" && value[index + 1] === "'") {
        index += 2
        continue
      }
      return index + 1
    }
    if (quote === '"' && value[index] === '\\') index += 1
    index += 1
  }
  return value.length
}

function collectWorkflowCallKeys(lines, kind) {
  const names = new Set()
  const onLine = lines.find(
    ({ blockPayload, indent, text }) =>
      !blockPayload && indent === 0 && mappingEntry(text, 0)?.key === 'on'
  )
  if (!onLine || mappingEntry(onLine.text, 0)?.value) return names
  const onEnd =
    lines.find(
      ({ blockPayload, line, indent, text }) =>
        !blockPayload && line > onLine.line && indent === 0 && text.trim()
    )?.line ?? lines.length
  const callLine = lines.find(
    ({ blockPayload, line, indent, text }) =>
      !blockPayload &&
      line > onLine.line &&
      line < onEnd &&
      indent === 2 &&
      mappingEntry(text, 2)?.key === 'workflow_call'
  )
  if (!callLine) return names
  const callEnd =
    lines.find(
      ({ blockPayload, line, indent, text }) =>
        !blockPayload &&
        line > callLine.line &&
        line < onEnd &&
        indent <= 2 &&
        text.trim()
    )?.line ?? onEnd
  const sectionLine = lines.find(
    ({ blockPayload, line, indent, text }) =>
      !blockPayload &&
      line > callLine.line &&
      line < callEnd &&
      indent === 4 &&
      mappingEntry(text, 4)?.key === kind
  )
  if (!sectionLine) return names
  const sectionEnd =
    lines.find(
      ({ blockPayload, line, indent, text }) =>
        !blockPayload &&
        line > sectionLine.line &&
        line < callEnd &&
        indent <= 4 &&
        text.trim()
    )?.line ?? callEnd
  for (const record of lines) {
    if (record.blockPayload) continue
    if (record.line <= sectionLine.line || record.line >= sectionEnd || record.indent !== 6) continue
    const entry = mappingEntry(record.text, 6)
    if (entry) names.add(entry.key)
  }
  return names
}

function mappingEntry(text, indent) {
  const body = text.slice(indent)
  const match = /^((?:[A-Za-z_][A-Za-z0-9_-]*)|(?:"(?:[^"\\]|\\.)+")|(?:'(?:[^']|'')+')):\s*(.*)$/.exec(body)
  if (!match) return undefined
  return { key: unquote(match[1]), value: match[2].trim() }
}

function scalar(raw, line, violations) {
  if (!raw) {
    violations.push(`line ${line + 1}: expected a non-empty scalar.`)
    return undefined
  }
  return unquote(raw)
}

function unquote(raw) {
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try {
      return JSON.parse(raw)
    } catch {
      return raw.slice(1, -1)
    }
  }
  if (raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1).replaceAll("''", "'")
  return raw
}

function stripYamlComment(raw) {
  let quote
  let escaped = false
  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index]
    if (quote === '"') {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = undefined
      continue
    }
    if (quote === "'") {
      if (character === "'" && raw[index + 1] === "'") index += 1
      else if (character === quote) quote = undefined
      continue
    }
    if (
      (character === '"' || character === "'") &&
      (index === 0 || /[\s:[{,>-]/.test(raw[index - 1]))
    ) {
      quote = character
    }
    else if (character === '#' && (index === 0 || /\s/.test(raw[index - 1]))) {
      return { text: raw.slice(0, index).trimEnd() }
    }
  }
  return quote ? { text: raw, error: 'unterminated quoted scalar.' } : { text: raw }
}

function lineAt(source, offset) {
  let line = 0
  for (let index = 0; index < offset; index += 1) if (source[index] === '\n') line += 1
  return line
}
