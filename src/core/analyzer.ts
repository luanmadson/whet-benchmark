/**
 * Analyzer — o coordenador.
 *
 * Não detecta nada sozinho. Pega o texto, passa por cada regra registrada,
 * junta os resultados, calcula o score, e pede ao renderer pra gerar
 * o output elaborado.
 */

import type { AnalysisContext, AnalysisResult, Diagnostic } from "./models";
import { detectLanguage, splitIntoStatements } from "./models";
import { allRules } from "./rules";
import { render, detectPositiveTraits } from "./renderer";

/*=========================================
// Configuracao de score
=========================================*/

const SCORE_PENALTY: Record<string, number> = {
  error: 15,
  warning: 7,
  info: 3,
};

/*=========================================
// Funcao principal
=========================================*/

export function analyze(text: string): AnalysisResult {
  // 0. Computa contexto uma unica vez (compute-once)
  const ctx: AnalysisContext = {
    text,
    statements: splitIntoStatements(text),
    lang: detectLanguage(text),
  };

  // 1. Passa o texto por todas as regras
  const diagnostics: Diagnostic[] = [];

  for (const rule of allRules) {
    const found = rule.analyze(text, ctx);
    diagnostics.push(...found);
  }

  // 2. Ordena: errors primeiro, depois warnings, depois info
  const severityOrder = { error: 0, warning: 1, info: 2 };
  diagnostics.sort((a, b) => {
    const byPriority = severityOrder[a.severity] - severityOrder[b.severity];
    if (byPriority !== 0) return byPriority;
    // Dentro da mesma severidade, ordena por linha (globais no final)
    return (a.line ?? Infinity) - (b.line ?? Infinity);
  });

  // 3. Calcula score (começa em 100, desconta por problema)
  let score = 100;
  for (const d of diagnostics) {
    score -= SCORE_PENALTY[d.severity] ?? 0;
  }
  score = Math.max(0, Math.min(100, score));

  // 4. Gera output elaborado
  const output = render(diagnostics, score, text, ctx.lang);

  // 5. Detecta pontos positivos (relevante para prompts limpos)
  const positiveTraits = diagnostics.length === 0 ? detectPositiveTraits(text, ctx.lang) : [];

  return { score, diagnostics, output, originalText: text, positiveTraits };
}
