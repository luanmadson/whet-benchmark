const { test } = require("node:test");
const assert = require("node:assert/strict");
const { toneDomainMismatch } = require("../../dist/core/rules/tone-domain-mismatch");
const { run } = require("../helpers");

test("tone-domain-mismatch: dispara em jurídico + tom casual (PT)", () => {
  const text =
    "Você é um advogado especializado em direito trabalhista.\nUse um tom casual.";
  const diags = run(toneDomainMismatch, text);
  assert.equal(diags.length, 1);
  assert.equal(diags[0].rule, "tone-domain-mismatch");
  assert.equal(diags[0].severity, "warning");
});

test("tone-domain-mismatch: dispara em saúde + emojis (PT)", () => {
  const text =
    "Você ajuda pacientes com sintomas e triagem médica.\nUse emojis para ficar mais amigável.";
  const diags = run(toneDomainMismatch, text);
  assert.equal(diags.length, 1);
});

test("tone-domain-mismatch: dispara em finanças + casual (EN)", () => {
  const text =
    "You advise on investment portfolios and asset allocation.\nUse a casual tone.";
  const diags = run(toneDomainMismatch, text);
  assert.equal(diags.length, 1);
});

test("tone-domain-mismatch: dispara em contábil + gírias (PT)", () => {
  const text =
    "Você ajuda com contabilidade e cálculos tributários.\nPode usar gírias para ficar mais leve.";
  const diags = run(toneDomainMismatch, text);
  assert.equal(diags.length, 1);
});

test("tone-domain-mismatch: NÃO dispara em domínio não-sensível + casual", () => {
  const text =
    "Você ajuda com programação em geral.\nUse um tom casual e descontraído.";
  const diags = run(toneDomainMismatch, text);
  assert.equal(diags.length, 0);
});

test("tone-domain-mismatch: NÃO dispara em domínio sensível sem marcador casual", () => {
  const text = "Você é um advogado especializado em direito trabalhista.";
  const diags = run(toneDomainMismatch, text);
  assert.equal(diags.length, 0);
});
