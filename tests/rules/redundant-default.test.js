const { test } = require("node:test");
const assert = require("node:assert/strict");
const { redundantDefault } = require("../../dist/core/rules/redundant-default");
const { run } = require("../helpers");

test("redundant-default: dispara em 'seja útil' (PT)", () => {
  const diags = run(redundantDefault, "Seja útil.");
  assert.equal(diags.length, 1);
  assert.equal(diags[0].rule, "redundant-default");
  assert.equal(diags[0].severity, "info");
});

test("redundant-default: dispara em 'seja claro' (PT)", () => {
  const diags = run(redundantDefault, "Seja claro nas respostas.");
  assert.equal(diags.length, 1);
});

test("redundant-default: dispara em 'be helpful' (EN)", () => {
  const diags = run(redundantDefault, "Be helpful.");
  assert.equal(diags.length, 1);
  assert.match(diags[0].highlight, /be helpful/i);
});

test("redundant-default: dispara em 'do your best' (EN)", () => {
  const diags = run(redundantDefault, "Do your best.");
  assert.equal(diags.length, 1);
});

test("redundant-default: dispara em 'follow the instructions' (EN)", () => {
  const diags = run(redundantDefault, "Follow the instructions.");
  assert.equal(diags.length, 1);
});

test("redundant-default: dispara em 'sé útil' (ES)", () => {
  const diags = run(redundantDefault, "Sé útil.");
  assert.equal(diags.length, 1);
});

test("redundant-default: múltiplas linhas → múltiplos diagnósticos", () => {
  const diags = run(
    redundantDefault,
    "Seja útil.\nSeja claro.\nResponda com precisão."
  );
  assert.equal(diags.length, 3);
});

test("redundant-default: instrução específica não dispara", () => {
  const diags = run(redundantDefault, "Responda citando sempre a fonte da legislação.");
  assert.equal(diags.length, 0);
});
