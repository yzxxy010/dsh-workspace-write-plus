/**
 * dsh-workspace-write-plus — host half.
 *
 * The bundle patch inserts `workspace-write++` into ctx.permissionPresets so
 * the official picker / `/permission` command treat it like the other three.
 * This plugin then skips process-sandbox wrapping for allowlisted executables
 * while that preset is selected (Git Bash / MSYS mmap, named pipes).
 */

import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import z from '@deepseek-ai/schemastery'

export const name = 'dsh-workspace-write-plus'

export const inject = ['sandbox', 'permissionPresets']

function peerBases() {
  const bases = [import.meta.url]
  try { bases.push(pathToFileURL(join(process.cwd(), 'package.json')).href) } catch { /* ignore */ }
  const home = process.env.DSH_HOME
  if (home) {
    try { bases.push(pathToFileURL(join(home, 'profiles', 'web', 'package.json')).href) } catch { /* ignore */ }
  }
  try {
    bases.push(pathToFileURL(join(process.env.APPDATA || '', 'npm', 'node_modules', '@deepseek-ai', 'dsh', 'package.json')).href)
  } catch { /* ignore */ }
  return bases
}

async function importPeer(specifier) {
  let last
  for (const base of peerBases()) {
    try {
      const resolved = createRequire(base).resolve(specifier)
      return await import(pathToFileURL(resolved).href)
    } catch (error) {
      last = error
    }
  }
  throw last
}

export const PRESET_ID = 'workspace-write++'
export const SETTINGS_NAMESPACE = 'workspace-write-plus'

const TAG = '[workspace-write-plus]'

const PLUS_SPEC = {
  sandbox: 'workspace-write',
  approval: 'never',
  name: '工作区修改++',
  description: '可写工作区；放行的 Shell 跳过进程沙箱（Git Bash / MSYS 可用），不弹审批。',
}

const DEFAULT_RULES = ['bash', 'pwsh']

export const Config = z.object({
  rules: z.array(z.string()).default(DEFAULT_RULES.slice()).volatile(),
  allowFsOutside: z.boolean().default(false).volatile(),
})

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/\/+/g, '/').trim().toLowerCase()
}

function stripExe(value) {
  return String(value || '').replace(/\.exe$/i, '')
}

function globToRegExp(pattern) {
  let out = '^'
  let i = 0
  const p = String(pattern || '')
  while (i < p.length) {
    if (p[i] === '*' && p[i + 1] === '*') {
      if (p[i + 2] === '/') {
        out += '(?:.*/)?'
        i += 3
      } else {
        out += '.*'
        i += 2
      }
    } else if (p[i] === '*') {
      out += '[^/]*'
      i += 1
    } else if (p[i] === '?') {
      out += '[^/]'
      i += 1
    } else {
      out += p[i].replace(/[.+^${}()|[\]\\]/g, '\\$&')
      i += 1
    }
  }
  return new RegExp(out + '$')
}

function basenameOf(path) {
  const norm = normalizePath(path)
  const parts = norm.split('/')
  return parts[parts.length - 1] || norm
}

export function matchRule(rule, argv0) {
  const raw = normalizePath(rule)
  if (!raw) return false
  const full = normalizePath(argv0)
  if (!full) return false
  const base = stripExe(basenameOf(full))
  if (!raw.includes('/')) {
    const pat = stripExe(raw)
    try {
      return globToRegExp(pat).test(base)
    } catch {
      return pat === base
    }
  }
  try {
    if (globToRegExp(raw).test(full)) return true
    if (globToRegExp(stripExe(raw)).test(stripExe(full))) return true
  } catch {
    return raw === full
  }
  return false
}

function rulesFromValue(value) {
  if (value && Array.isArray(value.rules)) {
    return value.rules.map((item) => String(item || '').trim()).filter(Boolean)
  }
  if (!value || typeof value !== 'object') return DEFAULT_RULES.slice()
  const rules = []
  if (value.allowBash !== false) rules.push('bash')
  if (value.allowPwsh !== false) rules.push('pwsh')
  if (value.allowCmd === true) rules.push('cmd')
  return rules.length > 0 ? rules : DEFAULT_RULES.slice()
}

function readAllow(ctx) {
  try {
    const config = ctx.fiber && typeof ctx.fiber === 'object' ? ctx.fiber.config : undefined
    const value = config && typeof config === 'object' ? config : undefined
    return {
      rules: rulesFromValue(value),
      allowFsOutside: !!(value && value.allowFsOutside === true),
    }
  } catch {
    return { rules: DEFAULT_RULES.slice(), allowFsOutside: false }
  }
}

function matchesAllow(argv, allow) {
  const argv0 = argv && argv[0] ? String(argv[0]) : ''
  const rules = allow && Array.isArray(allow.rules) ? allow.rules : DEFAULT_RULES
  for (const rule of rules) {
    if (matchRule(rule, argv0)) return true
  }
  return false
}

function currentPreset(ctx, session) {
  const presets = ctx.permissionPresets
  if (!presets || !session) return ''
  try {
    return String(presets.current(session) || '')
  } catch {
    return ''
  }
}

function sessionFromPolicy(ctx, policy) {
  const sessions = ctx.get('sessions')
  if (!sessions) return undefined
  const sessionId = policy && typeof policy === 'object' ? policy.sessionId : undefined
  if (sessionId) {
    const found = sessions.get(sessionId)
    if (found) return found
  }
  const agents = ctx.get('agents')
  const initiator = agents && typeof agents.currentInitiator === 'function' ? agents.currentInitiator() : undefined
  if (initiator && initiator.id) return sessions.get(initiator.id)
  return undefined
}

function plusActive(ctx, policy) {
  const session = sessionFromPolicy(ctx, policy)
  if (!session) return false
  return currentPreset(ctx, session) === PRESET_ID
}

function ensurePreset(presets) {
  if (!presets || !presets.presets || typeof presets.presets !== 'object') return false
  const table = presets.presets
  if (table[PRESET_ID]) {
    table[PRESET_ID] = { ...table[PRESET_ID], ...PLUS_SPEC }
    return false
  }
  const ordered = {}
  const keys = Object.keys(table)
  let inserted = false
  for (const key of keys) {
    ordered[key] = table[key]
    if (key === 'workspace-write') {
      ordered[PRESET_ID] = { ...PLUS_SPEC }
      inserted = true
    }
  }
  if (!inserted) ordered[PRESET_ID] = { ...PLUS_SPEC }
  for (const key of Object.keys(table)) delete table[key]
  Object.assign(table, ordered)
  return true
}

export function apply(ctx) {
  ctx.effect(() => {
    const added = ensurePreset(ctx.permissionPresets)
    if (added) console.log(`${TAG} inserted preset ${PRESET_ID} into the live table`)
    else console.log(`${TAG} preset ${PRESET_ID} already in the table`)
    return () => {
      if (!added) return
      try {
        delete ctx.permissionPresets.presets[PRESET_ID]
      } catch {
        /* ignore */
      }
    }
  }, `${name}: ensure preset`)

  ctx.effect(() => {
    const sandbox = ctx.sandbox
    if (!sandbox || typeof sandbox.confine !== 'function') return () => {}
    const hadOwn = Object.prototype.hasOwnProperty.call(sandbox, 'confine')
    const original = sandbox.confine
    sandbox.confine = function confinePlus(argv, policy) {
      const allow = readAllow(ctx)
      const exe = basenameOf(argv && argv[0] ? String(argv[0]) : '')
      if (plusActive(ctx, policy) && matchesAllow(argv, allow)) {
        console.log(`${TAG} skip process sandbox for ${exe}`)
        return {
          argv: Array.from(argv),
          enforcement: 'full',
          denialSignatures: [],
          runnerFailureRules: [],
        }
      }
      return original.call(this, argv, policy)
    }
    return () => {
      if (hadOwn) sandbox.confine = original
      else delete sandbox.confine
    }
  }, `${name}: wrap sandbox.confine`)

  ctx.inject(['fs'], (fsCtx) => {
    const fs = fsCtx.fs
    if (!fs || typeof fs.writeText !== 'function' || typeof fs.editText !== 'function') return
    fsCtx.effect(() => {
      const hadWrite = Object.prototype.hasOwnProperty.call(fs, 'writeText')
      const hadEdit = Object.prototype.hasOwnProperty.call(fs, 'editText')
      const originalWrite = fs.writeText
      const originalEdit = fs.editText
      function widen(policy) {
        if (!policy || typeof policy !== 'object') return policy
        const allow = readAllow(ctx)
        if (!allow.allowFsOutside || !plusActive(ctx, policy)) return policy
        if (policy.mode === 'danger-full-access') return policy
        const next = { mode: 'danger-full-access', workspaceRoot: policy.workspaceRoot }
        if (policy.sessionId !== undefined) next.sessionId = policy.sessionId
        return next
      }
      fs.writeText = function writeTextPlus(target, content, expected, signal, sandboxPolicy) {
        return originalWrite.call(this, target, content, expected, signal, widen(sandboxPolicy))
      }
      fs.editText = function editTextPlus(target, edit, expected, signal, sandboxPolicy) {
        return originalEdit.call(this, target, edit, expected, signal, widen(sandboxPolicy))
      }
      return () => {
        if (hadWrite) fs.writeText = originalWrite
        else delete fs.writeText
        if (hadEdit) fs.editText = originalEdit
        else delete fs.editText
      }
    }, `${name}: wrap fs writes`)
  })

  ctx.inject(['systemPrompt'], (spCtx) => {
    const systemPrompt = spCtx.systemPrompt
    if (!systemPrompt || typeof systemPrompt.context !== 'function') return
    spCtx.effect(() => systemPrompt.context({
      name: 'workspace-write-plus',
      order: 880,
      text() {
        const allow = readAllow(ctx)
        const listed = allow.rules.length > 0 ? allow.rules.join(', ') : 'nothing'
        const extra = allow.allowFsOutside ? '; file writes outside the workspace are also allowed' : ''
        return [
          'A 工作区修改++ permission (table key workspace-write++) is available in the Permissions picker (same control as read-only / workspace-write / danger-full-access).',
          'While that preset is selected: file tools stay limited to the workspace unless the outside-workspace write allowlist is on; allowlisted shells skip the Windows process sandbox so Git Bash/MSYS mmap and named pipes work.',
          `Current process-sandbox wildcard rules: ${listed}${extra}.`,
          'A rule without a slash matches the executable basename (bash matches any bash.exe). * matches within one path segment; ** matches across directories.',
          'Do not request sandbox_permissions merely to run an allowlisted executable under this preset.',
        ].join(' ')
      },
    }), `${name}: prompt context`)
  })
}

