const { test } = require("node:test");
const assert = require("node:assert/strict");
const { analyze } = require("../dist/core/analyzer");

test("analyzer: prompt limpo retorna score 100", () => {
  const result = analyze(
    "Quando o usuário pedir análise de dados, considere que o contexto pode incluir séries temporais."
  );
  assert.equal(result.score, 100);
  assert.deepEqual(result.diagnostics, []);
});

test("analyzer: prompt limpo devolve positiveTraits", () => {
  const result = analyze(
    "Tende a funcionar melhor quando os outliers são sinalizados antes da interpretação."
  );
  assert.ok(Array.isArray(result.positiveTraits));
  assert.ok(result.positiveTraits.length > 0);
});

test("analyzer: prompt com problemas esvazia positiveTraits", () => {
  const result = analyze("SEMPRE responda. NUNCA desvie.");
  assert.deepEqual(result.positiveTraits, []);
});

test("analyzer: penalidade de warning = 7", () => {
  // Um único warning (imperative-overload "NUNCA") → 100 − 7 = 93
  const result = analyze("NUNCA modifique.");
  const warnings = result.diagnostics.filter((d) => d.severity === "warning").length;
  const errors = result.diagnostics.filter((d) => d.severity === "error").length;
  const infos = result.diagnostics.filter((d) => d.severity === "info").length;
  const expected = Math.max(0, 100 - warnings * 7 - errors * 15 - infos * 3);
  assert.equal(result.score, expected);
});

test("analyzer: score clamped entre 0 e 100", () => {
  const lotsOfErrors = "NUNCA A. NUNCA B. NUNCA C. NUNCA D. NUNCA E. NUNCA F. NUNCA G. NUNCA H. NUNCA I. NUNCA J. NUNCA K. NUNCA L. NUNCA M. NUNCA N. NUNCA O.";
  const result = analyze(lotsOfErrors);
  assert.ok(result.score >= 0);
  assert.ok(result.score <= 100);
});

test("analyzer: diagnósticos ordenados errors → warnings → infos", () => {
  const text = [
    "Você é o melhor advogado do mundo.",
    "NUNCA invente informação.",
    "Seja útil.",
    "Seja claro.",
    "Seja profissional.",
    "Use bom senso.",
    "Tenha atenção.",
    "Siga as instruções.",
    "Responda com precisão.",
    "Seja cuidadoso.",
    "Pense antes de responder.",
    "Faça o seu melhor.",
  ].join("\n");
  const result = analyze(text);
  const severityRank = { error: 0, warning: 1, info: 2 };
  for (let i = 1; i < result.diagnostics.length; i++) {
    const prev = severityRank[result.diagnostics[i - 1].severity];
    const curr = severityRank[result.diagnostics[i].severity];
    assert.ok(prev <= curr, `diagnóstico ${i} fora de ordem (${result.diagnostics[i - 1].severity} antes de ${result.diagnostics[i].severity})`);
  }
});

test("analyzer: devolve output (meta-prompt) e originalText", () => {
  const original = "NUNCA modifique.";
  const result = analyze(original);
  assert.equal(result.originalText, original);
  assert.ok(typeof result.output === "string");
  assert.ok(result.output.length > 0);
});

test("analyzer: score igual a 100 só quando não há diagnósticos", () => {
  const result = analyze("Seja útil.");
  assert.ok(result.diagnostics.length > 0);
  assert.ok(result.score < 100);
});
