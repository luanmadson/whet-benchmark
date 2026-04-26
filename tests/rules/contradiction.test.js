const { test } = require("node:test");
const assert = require("node:assert/strict");
const { contradiction } = require("../../dist/core/rules/contradiction");
const { run } = require("../helpers");

test("contradiction: concisão vs exaustividade (PT)", () => {
  const text = "Seja extremamente conciso.\nInclua todo o histórico relevante.";
  const diags = run(contradiction, text);
  assert.equal(diags.length, 1);
  assert.equal(diags[0].rule, "contradiction");
  assert.equal(diags[0].severity, "warning");
});

test("contradiction: formal vs informal (PT)", () => {
  const text = "Use tom formal.\nSeja descontraído e use emojis.";
  const diags = run(contradiction, text);
  assert.equal(diags.length, 1);
});

test("contradiction: concisão vs exaustividade (EN)", () => {
  const text =
    "Be extremely concise.\nProvide exhaustive coverage of every edge case.";
  const diags = run(contradiction, text);
  assert.equal(diags.length, 1);
});

test("contradiction: velocidade vs profundidade (EN)", () => {
  const text = "Answer quickly.\nProvide a thorough analysis of the topic.";
  const diags = run(contradiction, text);
  assert.equal(diags.length, 1);
});

test("contradiction: idioma fixo vs idioma do usuário", () => {
  const text = "Respond only in English.\nAlways respond in the user's native language.";
  const diags = run(contradiction, text);
  assert.ok(diags.length >= 1, "deveria detectar conflito de idioma");
});

test("contradiction: apenas um lado não dispara", () => {
  const diags = run(contradiction, "Seja extremamente conciso.");
  assert.equal(diags.length, 0);
});

test("contradiction: múltiplos eixos geram múltiplos diagnósticos", () => {
  const text = [
    "Seja extremamente conciso.",
    "Inclua todo o histórico.",
    "Use tom formal.",
    "Seja descontraído e use emojis.",
  ].join("\n");
  const diags = run(contradiction, text);
  assert.ok(diags.length >= 2);
});
