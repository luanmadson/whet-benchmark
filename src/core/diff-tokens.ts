/**
 * Token-by-token diff for the before/after of the diagnostic card.
 *
 * Input: two strings (`before` and `after`). Output: a sequence of
 * `{ type: 'equal' | 'removed' | 'added', text }` ops that can be
 * rendered as an inline diff in the style of `git diff` or Biome
 * `--write`. The point is that the user sees exactly which tokens
 * leave, enter, and stay when a rule suggests a rewrite.
 *
 * The algorithm is LCS (longest common subsequence) at the token
 * level: words, whitespace runs, and isolated punctuation are each
 * their own tokens. Pure — no React/DOM dependency.
 */

export type DiffOp = {
  type: "equal" | "removed" | "added";
  text: string;
};

/**
 * Tokenize preserving separators. A token is one of:
 *   — a run of letters/digits/underscore (Unicode-aware, covers PT/EN/ES accents)
 *   — a run of whitespace
 *   — a single punctuation/symbol character
 * The concatenation of tokens reconstructs the original string exactly.
 */
export function tokenize(s: string): string[] {
  const out = s.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu);
  return out ?? [];
}

/**
 * Computes a token-level diff between `before` and `after` via LCS.
 * Consecutive ops of the same type are coalesced to reduce fragmentation.
 */
export function diffTokens(before: string, after: string): DiffOp[] {
  const a = tokenize(before);
  const b = tokenize(after);
  const n = a.length;
  const m = b.length;

  // DP table: dp[i][j] = LCS length of a[i..] and b[j..]
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0)
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: "equal", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "removed", text: a[i] });
      i++;
    } else {
      ops.push({ type: "added", text: b[j] });
      j++;
    }
  }
  while (i < n) ops.push({ type: "removed", text: a[i++] });
  while (j < m) ops.push({ type: "added", text: b[j++] });

  // Coalesce consecutive ops of the same type
  const merged: DiffOp[] = [];
  for (const op of ops) {
    const last = merged[merged.length - 1];
    if (last && last.type === op.type) last.text += op.text;
    else merged.push({ type: op.type, text: op.text });
  }
  return merged;
}
