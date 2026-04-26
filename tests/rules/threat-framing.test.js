const { test } = require("node:test");
const assert = require("node:assert/strict");
const { threatFraming } = require("../../dist/core/rules/threat-framing");
const { run } = require("../helpers");

test("threat-framing: dispara em ameaça condicional (PT)", () => {
  const diags = run(
    threatFraming,
    "Se você falhar, as consequências serão desastrosas."
  );
  assert.equal(diags.length, 1);
  assert.equal(diags[0].rule, "threat-framing");
  assert.equal(diags[0].severity, "warning");
});

test("threat-framing: dispara em framing direto (PT)", () => {
  const diags = run(
    threatFraming,
    "Os resultados serão catastróficos se houver imprecisão."
  );
  assert.equal(diags.length, 1);
});

test("threat-framing: dispara em 'ou o usuário será prejudicado' (PT)", () => {
  const diags = run(
    threatFraming,
    "Admita suas limitações ou o usuário será prejudicado."
  );
  assert.equal(diags.length, 1);
});

test("threat-framing: dispara em ameaça condicional (EN)", () => {
  const diags = run(
    threatFraming,
    "If you fail, the results will be disastrous."
  );
  assert.equal(diags.length, 1);
});

test("threat-framing: dispara em blame framing (EN)", () => {
  const diags = run(
    threatFraming,
    "The system will crash and you will be responsible."
  );
  assert.equal(diags.length, 1);
});

test("threat-framing: dispara em ES", () => {
  const diags = run(
    threatFraming,
    "Si fallas, las consecuencias serán graves."
  );
  assert.equal(diags.length, 1);
});

test("threat-framing: NÃO dispara em descrição neutra", () => {
  const diags = run(
    threatFraming,
    "O sistema processa entradas e devolve saídas."
  );
  assert.equal(diags.length, 0);
});

test("threat-framing: NÃO dispara em orientação sem ameaça", () => {
  const diags = run(
    threatFraming,
    "Precisão importa aqui porque erros afetam a credibilidade."
  );
  assert.equal(diags.length, 0);
});
