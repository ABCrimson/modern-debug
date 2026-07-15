// LD-06 color hash + pretty prefix construction. Everything here runs at bind time (§6);
// the per-call pretty path lives as specialized closures in index.ts.

// debug 4.4.3's 256-color palette (src/node.js, supports-color level >= 2), delta-encoded
// for the byte budget: start at 20, each char indexes the delta alphabet [1,5,11,13,15].
// The decoded array is asserted verbatim against the golden fixture in tests.
const DELTAS = [1, 5, 11, 13, 15]
export const COLORS: readonly number[] = (() => {
  let v = 20
  const out = [v]
  for (const ch of 'abababaaaaaaacabababaaaaaaacabadaeabadacaaaaaaaaaaaaababacaaaaaaaaaaaaababa') {
    // biome-ignore lint/suspicious/noAssignInExpressions: combined form minifies+compresses smaller (§8.5 budget)
    out.push((v += DELTAS[ch.charCodeAt(0) - 97] as number))
  }
  return out
})()

export function selectColor(ns: string): number {
  let hash = 0
  for (let i = 0; i < ns.length; i++) {
    hash = (hash << 5) - hash + ns.charCodeAt(i)
    hash |= 0
  }
  return COLORS[Math.abs(hash) % COLORS.length] as number
}

/** [namespace prefix incl. trailing space, ANSI open sequence ('' when colors off)]. */
export function prettyPrefix(ns: string, colors: boolean): readonly [pre: string, open: string] {
  if (!colors) return [`${ns} `, '']
  const open = `[38;5;${selectColor(ns)}`
  return [`${open};1m${ns}[0m `, open]
}
