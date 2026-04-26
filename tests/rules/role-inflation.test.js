const { test } = require("node:test");
const assert = require("node:assert/strict");
const { roleInflation } = require("../../dist/core/rules/role-inflation");
const { run } = require("../helpers");

test("role-inflation: dispara em 'o melhor do mundo' (PT)", () => {
  const diags = run(roleInflation, "Você é o melhor advogado do mundo.");
  assert.equal(diags.length, 1);
  assert.equal(diags[0].rule, "role-inflation");
  assert.equal(diags[0].severity, "info");
});

test("role-inflation: dispara em anos de experiência (PT)", () => {
  const diags = run(roleInflation, "Você é um especialista com 25 anos de experiência.");
  assert.equal(diags.length, 1);
});

test("role-inflation: dispara em 'prêmios internacionais' (PT)", () => {
  const diags = run(roleInflation, "Você é um profissional com prêmios internacionais reconhecidos.");
  assert.equal(diags.length, 1);
});

test("role-inflation: dispara em 'world-class' (EN)", () => {
  const diags = run(roleInflation, "You are a world-class expert in AI.");
  assert.equal(diags.length, 1);
});

test("role-inflation: dispara em 'years of experience' (EN)", () => {
  const diags = run(roleInflation, "You are a consultant with 30 years of experience.");
  assert.equal(diags.length, 1);
});

test("role-inflation: dispara em 'award-winning' (EN)", () => {
  const diags = run(roleInflation, "You are an award-winning journalist.");
  assert.equal(diags.length, 1);
});

test("role-inflation: dispara em 'el mejor del mundo' (ES)", () => {
  const diags = run(roleInflation, "Eres el mejor abogado del mundo.");
  assert.equal(diags.length, 1);
});

test("role-inflation: NÃO dispara em persona simples", () => {
  const diags = run(roleInflation, "Você é um assistente que ajuda com código.");
  assert.equal(diags.length, 0);
});

test("role-inflation: NÃO dispara em descrição específica", () => {
  const diags = run(
    roleInflation,
    "Considere a resposta do ponto de vista de alguém que trabalha com lavouras de soja."
  );
  assert.equal(diags.length, 0);
});
