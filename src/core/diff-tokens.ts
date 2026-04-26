/**
 * Diff token-a-token para o before/after do card de diagnóstico.
 *
 * Entrada: duas strings (`before` e `after`). Saída: sequência de operações
 * `{ type: 'equal' | 'removed' | 'added', text }` que pode ser renderizada
 * como diff inline estilo `git diff` ou Biome `--write`. A ideia é que o
 * usuário veja exatamente quais tokens saem, entram e permanecem quando
 * a regra sugere uma reformulação.
 *
 * O algoritmo é LCS (longest common subsequence) no nível de token: palavras,
 * runs de whitespace e pontuação isolada são tokens próprios. Puro — nenhuma
 * dependência de React/DOM.
 */

export type DiffOp = {
  type: "equal" | "removed" | "added";
  text: string;
};

/**
 * Tokeniza preservando separadores. Cada token é:
 *   — uma sequência de letras/dígitos/underscore (Unicode-aware, cobre acentos PT/EN/ES)
 *   — uma sequência de whitespace
 *   — um único caractere de pontuação/símbolo
 * A soma dos tokens reconstrói exatamente a string original.
 */
export function tokenize(s: string): string[] {
  const out = s.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu);
  return out ?? [];
}

/**
 * Computa o diff em nível de token entre `before` e `after` via LCS.
 * Ops consecutivos do mesmo tipo são coalescidos pra reduzir fragmentação.
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

  // Coalesce consecutivos do mesmo tipo
  const merged: DiffOp[] = [];
  for (const op of ops) {
    const last = merged[merged.length - 1];
    if (last && last.type === op.type) last.text += op.text;
    else merged.push({ type: op.type, text: op.text });
  }
  return merged;
}
