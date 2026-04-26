const { test } = require("node:test");
const assert = require("node:assert/strict");
const { vagueInstruction } = require("../../dist/core/rules/vague-instruction");
const { run } = require("../helpers");

test("vague-instruction: dispara em 'seja profissional' (PT)", () => {
  const diags = run(vagueInstruction, "Seja profissional.");
  assert.equal(diags.length, 1);
  assert.equal(diags[0].rule, "vague-instruction");
  assert.equal(diags[0].severity, "info");
});

test("vague-instruction: dispara em 'seja eficiente' (PT)", () => {
  const diags = run(vagueInstruction, "Seja eficiente.");
  assert.equal(diags.length, 1);
});

test("vague-instruction: dispara em 'use bom senso' (PT)", () => {
  const diags = run(vagueInstruction, "Use bom senso.");
  assert.equal(diags.length, 1);
});

test("vague-instruction: dispara em 'be careful' (EN)", () => {
  const diags = run(vagueInstruction, "Be careful.");
  assert.equal(diags.length, 1);
});

test("vague-instruction: dispara em 'use your judgment' (EN)", () => {
  const diags = run(vagueInstruction, "Use your judgment.");
  assert.equal(diags.length, 1);
});

test("vague-instruction: dispara em 'follow best practices' (EN)", () => {
  const diags = run(vagueInstruction, "Follow best practices.");
  assert.equal(diags.length, 1);
});

test("vague-instruction: dispara em 'sea creativo' (ES)", () => {
  const diags = run(vagueInstruction, "Sea creativo al responder.");
  assert.equal(diags.length, 1);
});

test("vague-instruction: dispara em urgência artificial", () => {
  const diags = run(vagueInstruction, "Isso é extremamente importante.");
  assert.equal(diags.length, 1);
});

test("vague-instruction: instrução específica não dispara", () => {
  const diags = run(vagueInstruction, "Limite respostas a 3 parágrafos.");
  assert.equal(diags.length, 0);
});
