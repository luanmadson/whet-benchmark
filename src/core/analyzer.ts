/**
 * Analyzer — the coordinator.
 *
 * Doesn't detect anything on its own. Takes the text, passes it through
 * each registered rule, gathers the results, computes the score, and
 * asks the renderer to produce the elaborated output.
 */

import type { AnalysisContext, AnalysisResult, Diagnostic } from "./models";
import { detectLanguage, splitIntoStatements } from "./models";
import { allRules } from "./rules";
import { render, detectPositiveTraits } from "./renderer";

/*=========================================
// Score configuration
=========================================*/

const SCORE_PENALTY: Record<string, number> = {
  error: 15,
  warning: 7,
  info: 3,
};

/*=========================================
// Main entry
=========================================*/

export function analyze(text: string): AnalysisResult {
  // 0. Compute context once (compute-once)
  const ctx: AnalysisContext = {
    text,
    statements: splitIntoStatements(text),
    lang: detectLanguage(text),
  };

  // 1. Run the text through every rule
  const diagnostics: Diagnostic[] = [];

  for (const rule of allRules) {
    const found = rule.analyze(text, ctx);
    diagnostics.push(...found);
  }

  // 2. Sort: errors first, then warnings, then info
  const severityOrder = { error: 0, warning: 1, info: 2 };
  diagnostics.sort((a, b) => {
    const byPriority = severityOrder[a.severity] - severityOrder[b.severity];
    if (byPriority !== 0) return byPriority;
    // Within the same severity, sort by line (globals last)
    return (a.line ?? Infinity) - (b.line ?? Infinity);
  });

  // 3. Compute score (starts at 100, deducts per issue)
  let score = 100;
  for (const d of diagnostics) {
    score -= SCORE_PENALTY[d.severity] ?? 0;
  }
  score = Math.max(0, Math.min(100, score));

  // 4. Generate elaborated output
  const output = render(diagnostics, score, text, ctx.lang);

  // 5. Detect positive traits (relevant for clean prompts)
  const positiveTraits = diagnostics.length === 0 ? detectPositiveTraits(text, ctx.lang) : [];

  return { score, diagnostics, output, originalText: text, positiveTraits };
}
