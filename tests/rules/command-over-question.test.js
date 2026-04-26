const { test } = require("node:test");
const assert = require("node:assert/strict");
const { commandOverQuestion } = require("../../dist/core/rules/command-over-question");
const { run } = require("../helpers");

test("command-over-question: dispara em comando direto sem propósito (PT)", () => {
  const diags = run(commandOverQuestion, "Use TypeScript.");
  assert.equal(diags.length, 1);
  assert.equal(diags[0].rule, "command-over-question");
  assert.equal(diags[0].severity, "info");
});

test("command-over-question: NÃO dispara quando há 'porque'", () => {
  const diags = run(commandOverQuestion, "Use TypeScript porque o projeto já usa.");
  assert.equal(diags.length, 0);
});

test("command-over-question: NÃO dispara quando há 'para'", () => {
  const diags = run(commandOverQuestion, "Use TypeScript para manter consistência.");
  assert.equal(diags.length, 0);
});

test("command-over-question: dispara em negação sem propósito", () => {
  const diags = run(commandOverQuestion, "Não modifique arquivos de configuração.");
  assert.equal(diags.length, 1);
});

test("command-over-question: dispara em comando EN", () => {
  const diags = run(commandOverQuestion, "Add tests.");
  assert.equal(diags.length, 1);
});

test("command-over-question: NÃO dispara com tom sugestivo ('tende a')", () => {
  const diags = run(commandOverQuestion, "Usar TypeScript tende a funcionar melhor.");
  assert.equal(diags.length, 0);
});

test("command-over-question: NÃO dispara em pergunta", () => {
  const diags = run(commandOverQuestion, "Use o padrão mais adequado ao contexto?");
  assert.equal(diags.length, 0);
});

test("command-over-question: NÃO dispara em imperativo forte (já é imperative-overload)", () => {
  const diags = run(commandOverQuestion, "NUNCA modifique arquivos.");
  assert.equal(diags.length, 0);
});

test("command-over-question: NÃO dispara em persona", () => {
  const diags = run(commandOverQuestion, "Você é um assistente útil.");
  assert.equal(diags.length, 0);
});

test("command-over-question: dispara em ES", () => {
  const diags = run(commandOverQuestion, "Usa TypeScript.");
  assert.equal(diags.length, 1);
});
