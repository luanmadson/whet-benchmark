const { test } = require("node:test");
const assert = require("node:assert/strict");
const { unresolvedReference } = require("../../dist/core/rules/unresolved-reference");
const { run } = require("../helpers");

test("unresolved-reference: dispara em 'template em anexo' (PT)", () => {
  const diags = run(unresolvedReference, "Siga o template em anexo.");
  assert.equal(diags.length, 1);
  assert.equal(diags[0].rule, "unresolved-reference");
  assert.equal(diags[0].severity, "warning");
});

test("unresolved-reference: dispara em 'conforme o apêndice' (PT)", () => {
  const diags = run(unresolvedReference, "Conforme o anexo B, estruture a resposta.");
  assert.equal(diags.length, 1);
});

test("unresolved-reference: dispara em 'attached document' (EN)", () => {
  const diags = run(unresolvedReference, "Follow the attached document.");
  assert.equal(diags.length, 1);
});

test("unresolved-reference: dispara em 'appendix reference' (EN)", () => {
  const diags = run(unresolvedReference, "Refer to appendix A for details.");
  assert.equal(diags.length, 1);
});

test("unresolved-reference: dispara em 'anexo' (ES)", () => {
  const diags = run(unresolvedReference, "Consulte el anexo A para más detalles.");
  assert.equal(diags.length, 1);
});

test("unresolved-reference: NÃO dispara sem referência externa", () => {
  const diags = run(unresolvedReference, "Estruture a resposta em tópicos curtos.");
  assert.equal(diags.length, 0);
});
