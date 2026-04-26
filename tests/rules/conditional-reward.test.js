const { test } = require("node:test");
const assert = require("node:assert/strict");
const { conditionalReward } = require("../../dist/core/rules/conditional-reward");
const { run } = require("../helpers");

test("conditional-reward: dispara em gorjeta (PT)", () => {
  const diags = run(
    conditionalReward,
    "Vou te dar uma gorjeta de 200 reais se acertar."
  );
  assert.equal(diags.length, 1);
  assert.equal(diags[0].rule, "conditional-reward");
  assert.equal(diags[0].severity, "info");
});

test("conditional-reward: dispara em avaliação 5 estrelas (PT)", () => {
  const diags = run(
    conditionalReward,
    "Te dou cinco estrelas se a resposta for boa."
  );
  assert.equal(diags.length, 1);
});

test("conditional-reward: dispara em tip (EN)", () => {
  const diags = run(conditionalReward, "I'll tip you $500 if you do this well.");
  assert.equal(diags.length, 1);
});

test("conditional-reward: dispara em five stars (EN)", () => {
  const diags = run(conditionalReward, "I'll give you five stars if you're accurate.");
  assert.equal(diags.length, 1);
});

test("conditional-reward: dispara em propina (ES)", () => {
  const diags = run(
    conditionalReward,
    "Te daré una propina de 100 dólares si lo haces bien."
  );
  assert.equal(diags.length, 1);
});

test("conditional-reward: NÃO dispara em orientação sem recompensa", () => {
  const diags = run(
    conditionalReward,
    "A precisão importa porque afeta a credibilidade."
  );
  assert.equal(diags.length, 0);
});
