const { test } = require("node:test");
const assert = require("node:assert/strict");
const { redundantRepetition } = require("../../dist/core/rules/redundant-repetition");
const { run } = require("../helpers");

test("redundant-repetition: duas instruções no mesmo grupo semântico disparam", () => {
  const text = "Não invente informações.\nNão alucine.";
  const diags = run(redundantRepetition, text);
  assert.equal(diags.length, 1);
  assert.equal(diags[0].rule, "redundant-repetition");
  assert.equal(diags[0].severity, "warning");
});

test("redundant-repetition: uma única instrução não dispara", () => {
  const diags = run(redundantRepetition, "Não invente informações.");
  assert.equal(diags.length, 0);
});

test("redundant-repetition: três instruções no mesmo grupo geram um diagnóstico com três linhas", () => {
  const text = "Seja conciso.\nSeja breve.\nVá direto ao ponto.";
  const diags = run(redundantRepetition, text);
  assert.equal(diags.length, 1);
  assert.match(diags[0].original, /L1/);
  assert.match(diags[0].original, /L2/);
  assert.match(diags[0].original, /L3/);
});

test("redundant-repetition: grupos diferentes geram diagnósticos separados", () => {
  const text = [
    "Não invente dados.",
    "Apenas fatos reais.",
    "Seja conciso.",
    "Resposta curta.",
  ].join("\n");
  const diags = run(redundantRepetition, text);
  assert.equal(diags.length, 2);
});

test("redundant-repetition: dispara em inglês", () => {
  const text = "Be concise.\nKeep it short.";
  const diags = run(redundantRepetition, text);
  assert.equal(diags.length, 1);
});

test("redundant-repetition: dispara em espanhol", () => {
  const text = "No inventes información.\nNo alucines.";
  const diags = run(redundantRepetition, text);
  assert.equal(diags.length, 1);
});

test("redundant-repetition: instruções em grupos diferentes isoladas não disparam", () => {
  const text = "Não invente dados.\nSeja conciso.\nAjude o usuário.";
  const diags = run(redundantRepetition, text);
  assert.equal(diags.length, 0);
});
