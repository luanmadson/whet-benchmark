const { test } = require("node:test");
const assert = require("node:assert/strict");
const { cognitiveOverload } = require("../../dist/core/rules/cognitive-overload");
const { run } = require("../helpers");

test("cognitive-overload: prompt curto não dispara", () => {
  const diags = run(cognitiveOverload, "Responda em português.");
  assert.equal(diags.length, 0);
});

test("cognitive-overload: 7 sentenças em uma linha dispara warning", () => {
  // Sentenças >10 chars (threshold interno do countInstructions)
  const text = [
    "Use o alpha.",
    "Use o bravo.",
    "Use o charlie.",
    "Use o delta.",
    "Use o echo.",
    "Use o foxtrot.",
    "Use o golf.",
  ].join(" ");
  const diags = run(cognitiveOverload, text);
  const counts = diags.find((d) => /instruções/.test(d.original) || /instructions/.test(d.original));
  assert.ok(counts, "deveria reportar contagem de instruções");
  assert.equal(counts.severity, "warning");
});

test("cognitive-overload: 11+ sentenças dispara error", () => {
  const text = [
    "Use o alpha.",
    "Use o bravo.",
    "Use o charlie.",
    "Use o delta.",
    "Use o echo.",
    "Use o foxtrot.",
    "Use o golf.",
    "Use o hotel.",
    "Use o india.",
    "Use o juliet.",
    "Use o kilo.",
    "Use o lima.",
  ].join(" ");
  const diags = run(cognitiveOverload, text);
  const counts = diags.find((d) => d.severity === "error");
  assert.ok(counts, "deveria disparar severity error");
});

test("cognitive-overload: texto muito longo (>3000 chars) dispara warning", () => {
  const text = "Frase média com conteúdo razoável. ".repeat(100);
  const diags = run(cognitiveOverload, text);
  const charDiag = diags.find((d) => /caracteres/.test(d.original) || /characters/.test(d.original));
  assert.ok(charDiag, "deveria reportar contagem de caracteres");
});

test("cognitive-overload: prompt estruturado tolera mais instruções", () => {
  const text = [
    "1. Primeiro passo do workflow.",
    "2. Segundo passo do workflow.",
    "3. Terceiro passo do workflow.",
    "4. Quarto passo do workflow.",
    "5. Quinto passo do workflow.",
    "6. Sexto passo do workflow.",
    "7. Sétimo passo do workflow.",
    "8. Oitavo passo do workflow.",
  ].join("\n");
  const diags = run(cognitiveOverload, text);
  const countDiag = diags.find((d) => /instruções/.test(d.original) || /instructions/.test(d.original));
  assert.ok(!countDiag, "prompts estruturados (numerados) devem tolerar 8 passos sem disparar");
});

test("cognitive-overload: persona não conta como instrução", () => {
  const text = "Você é um assistente especializado.\nResponda em português.";
  const diags = run(cognitiveOverload, text);
  assert.equal(diags.length, 0);
});
