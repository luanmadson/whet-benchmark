const { test } = require("node:test");
const assert = require("node:assert/strict");
const { splitIntoStatements, detectLanguage } = require("../dist/core/models");

// ─── splitIntoStatements ──────────────────────────────────────

test("splitIntoStatements: uma instrução por linha", () => {
  const out = splitIntoStatements("Instrução A.\nInstrução B.\nInstrução C.");
  assert.equal(out.length, 3);
  assert.equal(out[0].line, 1);
  assert.equal(out[1].line, 2);
  assert.equal(out[2].line, 3);
});

test("splitIntoStatements: linha com múltiplas sentenças separa por ponto", () => {
  const out = splitIntoStatements("Primeira frase. Segunda frase. Terceira frase.");
  assert.equal(out.length, 3);
  // Todas vêm da linha 1
  for (const s of out) assert.equal(s.line, 1);
});

test("splitIntoStatements: ignora linhas em branco", () => {
  const out = splitIntoStatements("Linha A.\n\nLinha B.");
  assert.equal(out.length, 2);
});

test("splitIntoStatements: ignora comentários que começam com //", () => {
  const out = splitIntoStatements("// comentário\nInstrução real.");
  assert.equal(out.length, 1);
  assert.equal(out[0].text, "Instrução real.");
});

test("splitIntoStatements: ignora headers markdown que começam com #", () => {
  const out = splitIntoStatements("# Título\nConteúdo.");
  assert.equal(out.length, 1);
  assert.equal(out[0].text, "Conteúdo.");
});

test("splitIntoStatements: texto vazio retorna array vazio", () => {
  assert.deepEqual(splitIntoStatements(""), []);
});

// ─── detectLanguage ───────────────────────────────────────────

test("detectLanguage: identifica português", () => {
  assert.equal(detectLanguage("Você é um assistente que responda com clareza."), "pt");
});

test("detectLanguage: identifica inglês", () => {
  assert.equal(
    detectLanguage("You must always provide the correct answer with clarity."),
    "en"
  );
});

test("detectLanguage: identifica espanhol", () => {
  assert.equal(
    detectLanguage("Usted debe siempre asegurate de proporcionar instrucciones claras."),
    "es"
  );
});

test("detectLanguage: texto sem marcadores cai em PT por default", () => {
  assert.equal(detectLanguage("xxx yyy zzz"), "pt");
});
