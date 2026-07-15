// LD-04 (as amended by DECISIONS G-08): DEBUG-grammar pattern set, compiled once into an
// allow/deny template pair, matched with debug 4.4.3's linear-time template walk.
// The original compile-to-RegExp plan is ReDoS-vulnerable on multi-wildcard segments —
// the same reason debug itself abandoned regex matching in 4.4.0. Grammar parity is
// unchanged and still gated by the oracle table + differential property suite.

export interface Matcher {
  readonly source: string
  readonly allow: readonly string[]
  readonly deny: readonly string[]
}

export function compile(pattern: string): Matcher {
  const allow: string[] = []
  const deny: string[] = []
  for (const segment of pattern.trim().replace(/\s+/g, ',').split(',')) {
    if (!segment) continue
    if (segment.startsWith('-')) {
      deny.push(segment.slice(1))
    } else {
      allow.push(segment)
    }
  }
  return { source: pattern, allow, deny }
}

// debug 4.4.3's matchesTemplate, verbatim semantics: `*` wildcards with monotonic
// backtracking (O(n·m) worst case, no exponential blowup), all other chars literal.
function matchesTemplate(search: string, template: string): boolean {
  let si = 0
  let ti = 0
  let star = -1
  let mark = 0
  while (si < search.length) {
    if (ti < template.length && (template[ti] === search[si] || template[ti] === '*')) {
      if (template[ti] === '*') {
        star = ti
        mark = si
        ti++
      } else {
        si++
        ti++
      }
    } else if (star !== -1) {
      ti = star + 1
      mark++
      si = mark
    } else {
      return false
    }
  }
  while (ti < template.length && template[ti] === '*') ti++
  return ti === template.length
}

export function matches(matcher: Matcher, ns: string): boolean {
  for (const t of matcher.deny) {
    if (matchesTemplate(ns, t)) return false
  }
  for (const t of matcher.allow) {
    if (matchesTemplate(ns, t)) return true
  }
  return false
}
