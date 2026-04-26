const { test } = require("node:test");
const assert = require("node:assert/strict");
const { imperativeOverload } = require("../../dist/core/rules/imperative-overload");
const { run } = require("../helpers");

test("imperative-overload: dispara em SEMPRE (PT)", () => {
  const diags = run(imperativeOverload, "SEMPRE responda em português.");
  assert.equal(diags.length, 1);
  assert.equal(diags[0].rule, "imperative-overload");
  assert.equal(diags[0].severity, "warning");
  assert.match(diags[0].highlight, /SEMPRE/i);
});

test("imperative-overload: dispara em NUNCA (PT)", () => {
  const diags = run(imperativeOverload, "NUNCA invente dados.");
  assert.equal(diags.length, 1);
  assert.match(diags[0].highlight, /NUNCA/i);
});

test("imperative-overload: dispara em ALWAYS (EN)", () => {
  const diags = run(imperativeOverload, "You must ALWAYS verify before responding.");
  assert.ok(diags.length >= 1);
  const labels = diags.map((d) => d.highlight.toUpperCase());
  assert.ok(labels.some((l) => l.includes("ALWAYS")));
});

test("imperative-overload: dispara em NEVER (EN)", () => {
  const diags = run(imperativeOverload, "NEVER share user data.");
  assert.equal(diags.length, 1);
  assert.match(diags[0].highlight, /NEVER/i);
});

test("imperative-overload: dispara em SIEMPRE (ES)", () => {
  const diags = run(imperativeOverload, "SIEMPRE responde en español.");
  assert.ok(diags.length >= 1);
  assert.ok(diags.some((d) => /SIEMPRE/i.test(d.highlight)));
});

test("imperative-overload: múltiplos imperativos disparam múltiplos diagnósticos", () => {
  const diags = run(
    imperativeOverload,
    "SEMPRE cite fontes. NUNCA invente. É OBRIGATÓRIO usar markdown."
  );
  assert.ok(diags.length >= 3);
});

test("imperative-overload: exclui 'quase sempre' (hedge observacional)", () => {
  const diags = run(imperativeOverload, "Esse padrão quase sempre ocorre em prompts longos.");
  assert.equal(diags.length, 0);
});

test("imperative-overload: exclui DEVE em contexto descritivo de código", () => {
  const diags = run(imperativeOverload, "O código deve retornar um JSON válido.");
  assert.equal(diags.length, 0);
});

test("imperative-overload: inclui tip e reason", () => {
  const diags = run(imperativeOverload, "NUNCA responda sem contexto.");
  assert.ok(diags[0].tip && diags[0].tip.length > 0);
  assert.ok(diags[0].reason && diags[0].reason.length > 0);
});
